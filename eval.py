"""Evaluation pipeline for resume extraction/normalization/gap analysis.

Usage:
    python3 eval.py --version v2 --verbose
"""

from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

from data_loader import DataLoader, GRADE_TO_PARAM_ORDINAL
from eval_metrics.faithfulness import rouge_l_faithfulness
from gap_analyzer import GapAnalyzer
from plan_generator import PlanGenerator
from resume_parser import ResumeParser


@dataclass
class SampleMetrics:
    sample_id: str
    extraction_precision: float
    extraction_recall: float
    extraction_f1: float
    normalization_accuracy: float
    gap_precision: float
    gap_recall: float
    gap_f1: float
    faithfulness_rouge_l: float
    faithful: bool
    latency_sec: float
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_cost_usd: float


def _set_metrics(predicted: List[str], expected: List[str]) -> Tuple[float, float, float]:
    pred = {s.strip() for s in predicted if s and s.strip()}
    exp = {s.strip() for s in expected if s and s.strip()}
    if not pred and not exp:
        return 1.0, 1.0, 1.0
    if not pred:
        return 0.0, 0.0, 0.0
    tp = len(pred & exp)
    precision = tp / len(pred) if pred else 0.0
    recall = tp / len(exp) if exp else 0.0
    if precision + recall == 0:
        f1 = 0.0
    else:
        f1 = 2 * precision * recall / (precision + recall)
    return precision, recall, f1


def _jaccard(predicted: List[str], expected: List[str]) -> float:
    pred = {s.strip() for s in predicted if s and s.strip()}
    exp = {s.strip() for s in expected if s and s.strip()}
    union = pred | exp
    if not union:
        return 1.0
    return len(pred & exp) / len(union)


def _estimate_tokens(text: str) -> int:
    # Лёгкая приближённая оценка.
    return max(1, len((text or "").strip()) // 4)


def _estimate_cost_usd(
    input_tokens: int,
    output_tokens: int,
    input_price_per_1m: float,
    output_price_per_1m: float,
) -> float:
    return (input_tokens / 1_000_000) * input_price_per_1m + (output_tokens / 1_000_000) * output_price_per_1m


def _load_dataset(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("eval_dataset.json должен содержать список объектов")
    return data


def _run_resume_pipeline(
    version: str,
    parser: ResumeParser,
    resume_text: str,
    skills_dicts: List[Dict[str, Any]],
) -> Dict[str, Any]:
    if version == "v1":
        names = [(s.get("Навык") or s.get("name") or "").strip() for s in skills_dicts]
        names = [n for n in names if n]
        legacy = parser._legacy_parse_skills(resume_text, names)  # noqa: SLF001
        skills = []
        for s in legacy.get("skills", []):
            name = (s.get("name") or "").strip()
            if not name:
                continue
            skills.append({"name": name, "level": int(s.get("level") or 1)})
        return {"skills": skills, "used_fallback": False}
    return parser.parse_skills_v2(resume_text, skills_dicts)


def _build_user_skills(parsed_skills: List[Dict[str, Any]], atlas_param_names: List[str]) -> Dict[str, int]:
    # Для eval используем внутреннюю шкалу 1..3.
    user_skills: Dict[str, int] = {}
    for s in parsed_skills:
        name = (s.get("name") or "").strip()
        if not name:
            continue
        lvl = s.get("level", 1)
        try:
            lvl = int(lvl)
        except Exception:
            lvl = 1
        lvl = max(1, min(3, lvl))
        if name not in user_skills or lvl > user_skills[name]:
            user_skills[name] = lvl

    # Чтобы gap-анализ для growth совпадал с API-логикой.
    cur_param_ordinal = GRADE_TO_PARAM_ORDINAL.get("Middle", 2)
    for p in atlas_param_names:
        user_skills.setdefault(p, cur_param_ordinal)
    return user_skills


def _build_reference_tasks(data_loader: DataLoader, gap_names: List[str], target_grade: str = "Middle") -> str:
    chunks: List[str] = []
    for name in gap_names:
        detail = data_loader.get_skill_detail(name, target_grade)
        if not detail:
            continue
        tasks = (detail.get("tasks") or "").strip()
        if tasks:
            chunks.append(f"{name}: {tasks}")
    return "\n".join(chunks)


def run_eval(
    dataset: List[Dict[str, Any]],
    version: str,
    verbose: bool,
    input_price_per_1m: float,
    output_price_per_1m: float,
) -> Dict[str, Any]:
    data_loader = DataLoader()
    parser = ResumeParser()
    analyzer = GapAnalyzer()
    plan_gen = PlanGenerator()
    atlas_param_names = list(data_loader.atlas_map.keys())

    per_sample: List[SampleMetrics] = []

    for row in dataset:
        sample_id = str(row.get("id", "unknown"))
        resume_text = str(row.get("resume_text", ""))
        expected_skills = [str(x) for x in row.get("expected_skills", [])]
        expected_gaps = [str(x) for x in row.get("expected_gaps", [])]
        target_role = str(row.get("target_role", "")).strip() or "Менеджер продукта"

        started = time.perf_counter()
        parsed = _run_resume_pipeline(version, parser, resume_text, data_loader.skills)
        latency = time.perf_counter() - started
        parsed_skills = parsed.get("skills", []) or []
        predicted_skills = [(s.get("name") or "").strip() for s in parsed_skills if s.get("name")]

        p, r, f1 = _set_metrics(predicted_skills, expected_skills)
        normalization_acc = _jaccard(predicted_skills, expected_skills)

        user_skills = _build_user_skills(parsed_skills, atlas_param_names)
        target_internal = data_loader.get_internal_role_name(target_role)
        reqs = data_loader.get_role_requirements(target_internal, "Middle")
        structured = analyzer.analyze_structured(user_skills, reqs, atlas_param_names, data_loader.atlas_map)
        predicted_gaps = [g.get("name", "") for g in structured.get("skill_gaps", []) if g.get("name")]

        gp, gr, gf1 = _set_metrics(predicted_gaps, expected_gaps)

        # Faithfulness: сравниваем план с задачами из clean_skills.json.
        gap_basis = expected_gaps if expected_gaps else predicted_gaps[:8]
        reference_tasks = _build_reference_tasks(data_loader, gap_basis, target_grade="Middle")
        if plan_gen.client:
            candidate_plan = plan_gen.generate_plan_702010(
                scenario_type="eval",
                step1_markdown="",
                target_name=target_role,
                context="Только для оценки faithfulness.",
                skill_context=reference_tasks,
                strong_skills=[],
                gap_summary={"skill_gaps": [{"name": n, "delta": 1} for n in gap_basis]},
            )
        else:
            candidate_plan = reference_tasks
        faithfulness = rouge_l_faithfulness(candidate_plan, reference_tasks)
        faithful = faithfulness > 0.3

        # Оценка cost (упрощённо): текст резюме + выход parser.
        input_tokens = _estimate_tokens(resume_text)
        output_tokens = _estimate_tokens(json.dumps(parsed_skills, ensure_ascii=False))
        # v2 использует больше LLM-вызовов.
        if version == "v2":
            input_tokens *= 3
            output_tokens *= 3
        est_cost = _estimate_cost_usd(
            input_tokens,
            output_tokens,
            input_price_per_1m=input_price_per_1m,
            output_price_per_1m=output_price_per_1m,
        )

        m = SampleMetrics(
            sample_id=sample_id,
            extraction_precision=p,
            extraction_recall=r,
            extraction_f1=f1,
            normalization_accuracy=normalization_acc,
            gap_precision=gp,
            gap_recall=gr,
            gap_f1=gf1,
            faithfulness_rouge_l=faithfulness,
            faithful=faithful,
            latency_sec=latency,
            estimated_input_tokens=input_tokens,
            estimated_output_tokens=output_tokens,
            estimated_cost_usd=est_cost,
        )
        per_sample.append(m)

        if verbose:
            print(
                f"[{sample_id}] F1={f1:.3f}, norm_acc={normalization_acc:.3f}, "
                f"gap_f1={gf1:.3f}, faith={faithfulness:.3f}, latency={latency:.2f}s"
            )

    def avg(fn):
        return sum(fn(x) for x in per_sample) / len(per_sample) if per_sample else 0.0

    summary = {
        "samples": len(per_sample),
        "extraction": {
            "precision": avg(lambda x: x.extraction_precision),
            "recall": avg(lambda x: x.extraction_recall),
            "f1": avg(lambda x: x.extraction_f1),
        },
        "normalization_accuracy": avg(lambda x: x.normalization_accuracy),
        "gap_detection": {
            "precision": avg(lambda x: x.gap_precision),
            "recall": avg(lambda x: x.gap_recall),
            "f1": avg(lambda x: x.gap_f1),
        },
        "faithfulness": {
            "avg_rouge_l": avg(lambda x: x.faithfulness_rouge_l),
            "faithful_rate": avg(lambda x: 1.0 if x.faithful else 0.0),
            "threshold": 0.3,
        },
        "latency_sec_avg": avg(lambda x: x.latency_sec),
        "cost": {
            "total_usd": sum(x.estimated_cost_usd for x in per_sample),
            "avg_usd_per_sample": avg(lambda x: x.estimated_cost_usd),
            "total_input_tokens": int(sum(x.estimated_input_tokens for x in per_sample)),
            "total_output_tokens": int(sum(x.estimated_output_tokens for x in per_sample)),
        },
    }

    return {
        "version": version,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "summary": summary,
        "samples": [asdict(x) for x in per_sample],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", choices=["v1", "v2"], default="v2")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--dataset", default="eval_dataset.json")
    parser.add_argument("--input-price-per-1m", type=float, default=5.0)
    parser.add_argument("--output-price-per-1m", type=float, default=15.0)
    args = parser.parse_args()

    dataset_path = Path(args.dataset).resolve()
    dataset = _load_dataset(dataset_path)
    result = run_eval(
        dataset=dataset,
        version=args.version,
        verbose=args.verbose,
        input_price_per_1m=args.input_price_per_1m,
        output_price_per_1m=args.output_price_per_1m,
    )

    out_dir = Path("eval_results")
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    out_file = out_dir / f"{ts}_{args.version}.json"
    out_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
    print(f"\nСохранено: {out_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
