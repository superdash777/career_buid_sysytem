# -*- coding: utf-8 -*-
"""NLP: стемминг и слой синонимов для маппинга навыков."""

import json
import re
from pathlib import Path
from typing import Optional, Set, Dict

# Ленивая инициализация стеммеров
_stemmer_ru = None
_stemmer_en = None
_synonym_map: Optional[Dict[str, str]] = None


def _has_cyrillic(text: str) -> bool:
    return bool(re.search(r"[а-яёА-ЯЁ]", text))


def _get_stemmers():
    """Ленивая загрузка стеммеров NLTK (русский и английский)."""
    global _stemmer_ru, _stemmer_en
    if _stemmer_ru is None:
        try:
            from nltk.stem.snowball import SnowballStemmer
            try:
                _stemmer_ru = SnowballStemmer("russian")
            except Exception:
                _stemmer_ru = SnowballStemmer("russian", ignore_stopwords=False)
            _stemmer_en = SnowballStemmer("english")
        except Exception as e:
            raise RuntimeError(
                f"Для стемминга нужен NLTK: pip install nltk && python -c \"import nltk; nltk.download('snowball_data')\". Ошибка: {e}"
            )
    return _stemmer_ru, _stemmer_en


def _stem_word(word: str, stemmer_ru, stemmer_en) -> str:
    """Стемминг одного слова в зависимости от языка."""
    w = word.strip()
    if not w:
        return w
    if _has_cyrillic(w):
        return stemmer_ru.stem(w.lower())
    return stemmer_en.stem(w.lower())


def normalize_for_search(text: str) -> str:
    """
    Нормализация текста для поиска: lower, trim, схлопывание пробелов,
    замена опечаток, стемминг по словам (русский/английский).
    """
    if not text or not isinstance(text, str):
        return ""
    t = text.strip().lower()
    t = " ".join(t.split())
    # Простые замены опечаток
    typo_map = {
        "питон": "python",
        "пайтон": "python",
        "дата саенс": "data science",
        "машин лернинг": "machine learning",
    }
    for wrong, right in typo_map.items():
        if wrong in t and right not in t:
            t = t.replace(wrong, right)
    try:
        stemmer_ru, stemmer_en = _get_stemmers()
        words = t.split()
        stemmed = [_stem_word(w, stemmer_ru, stemmer_en) for w in words]
        return " ".join(stemmed)
    except Exception:
        return t


def _load_synonym_map() -> Dict[str, str]:
    """Загружает словарь синонимов из data/skill_synonyms.json."""
    global _synonym_map
    if _synonym_map is not None:
        return _synonym_map
    path = Path(__file__).resolve().parent / "data" / "skill_synonyms.json"
    _synonym_map = {}
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            for k, v in raw.items():
                if k and v:
                    key = k.strip().lower()
                    _synonym_map[key] = v.strip()
                    # Нормализованная форма (стемм) для ключа — опционально, если стеммер доступен
                    try:
                        norm_key = normalize_for_search(k)
                        if norm_key and norm_key != key:
                            _synonym_map[norm_key] = v.strip()
                    except Exception:
                        pass
        except Exception:
            pass
    return _synonym_map


def resolve_to_canonical(user_input: str, canonical_set: Optional[Set[str]] = None) -> Optional[str]:
    """
    Сопоставление ввода пользователя с каноническим названием навыка.
    Сначала проверяется словарь синонимов (точное и нормализованное совпадение),
    затем по нормализованному (стемм) виду ключей словаря.
    Если canonical_set задан, возвращаемое значение должно входить в этот набор.
    """
    if not user_input or not str(user_input).strip():
        return None
    raw = str(user_input).strip()
    low = raw.lower()
    syn_map = _load_synonym_map()
    # Точное совпадение (нижний регистр)
    if low in syn_map:
        cand = syn_map[low]
        if canonical_set is None or cand in canonical_set:
            return cand
    # Нормализованное (стемм) совпадение
    try:
        norm = normalize_for_search(raw)
        if norm and norm in syn_map:
            cand = syn_map[norm]
            if canonical_set is None or cand in canonical_set:
                return cand
    except Exception:
        pass
    # Проверка по ключам словаря: может ввод совпал с ключом после нормализации
    try:
        norm_input = normalize_for_search(raw)
        for key, canonical in syn_map.items():
            if normalize_for_search(key) == norm_input:
                if canonical_set is None or canonical in canonical_set:
                    return canonical
    except Exception:
        pass
    return None


def get_canonical_skills_set():
    """Возвращает множество канонических названий навыков из DataLoader (ленивый импорт)."""
    try:
        from config import Config
        path = Path(Config.SKILLS_FILE)
        if not path.is_absolute():
            path = Path(__file__).resolve().parent / path
        with open(path, "r", encoding="utf-8") as f:
            skills = json.load(f)
        names = set()
        for s in skills:
            n = s.get("Навык") or s.get("name")
            if n:
                names.add(str(n).strip())
        return names
    except Exception:
        return set()
