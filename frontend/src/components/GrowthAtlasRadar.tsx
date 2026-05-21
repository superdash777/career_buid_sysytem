/**
 * Кастомный радар для Growth: два полигона с явной геометрией.
 * Recharts 3.x с несколькими Radar / несколькими RadarChart на странице давал
 * неверную привязку серий — при движении ползунка «ехало» целевое кольцо.
 */

const RAD = Math.PI / 180;

/** Как в recharts PolarUtils.polarToCartesian (углы в градусах). */
function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  return {
    x: cx + Math.cos(-RAD * angleDeg) * radius,
    y: cy + Math.sin(-RAD * angleDeg) * radius,
  };
}

function ringPoints(cx: number, cy: number, radius: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const angleDeg = 90 - (360 / n) * i;
    const p = polarToCartesian(cx, cy, radius, angleDeg);
    return `${p.x},${p.y}`;
  }).join(' ');
}

function valuePolygon(
  cx: number,
  cy: number,
  maxR: number,
  n: number,
  levels: number[],
): string {
  return levels
    .map((raw, i) => {
      const v = Math.min(5, Math.max(0, Number(raw) || 0));
      const r = (v / 5) * maxR;
      const angleDeg = 90 - (360 / n) * i;
      const p = polarToCartesian(cx, cy, r, angleDeg);
      return `${p.x},${p.y}`;
    })
    .join(' ');
}

export type GrowthAtlasRadarRow = { label: string; current: number; target: number };

export default function GrowthAtlasRadar({
  params,
  size = 240,
}: {
  params: GrowthAtlasRadarRow[];
  size?: number;
}) {
  const n = params.length;
  const pad = 8;
  const vb = size;
  const cx = vb / 2;
  const cy = vb / 2;
  const maxR = (vb / 2) * 0.7 - pad;

  if (n === 0) {
    return <div className="w-full max-w-full" style={{ height: size }} />;
  }

  const targets = params.map(p => p.target);
  const currents = params.map(p => p.current);

  return (
    <div className="pointer-events-none w-full max-w-full select-none" style={{ height: size }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${vb} ${vb}`} preserveAspectRatio="xMidYMid meet">
        {/* Сетка: уровни 1…5 */}
        {[1, 2, 3, 4, 5].map((lvl) => (
          <polygon
            key={lvl}
            points={ringPoints(cx, cy, (lvl / 5) * maxR, n)}
            fill="none"
            stroke="var(--line)"
            strokeWidth={0.75}
          />
        ))}
        {/* Лучи к вершинам */}
        {Array.from({ length: n }, (_, i) => {
          const angleDeg = 90 - (360 / n) * i;
          const outer = polarToCartesian(cx, cy, maxR, angleDeg);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--line)"
              strokeWidth={0.75}
            />
          );
        })}
        {/* Подписи осей */}
        {params.map((p, i) => {
          const angleDeg = 90 - (360 / n) * i;
          const labelR = maxR + pad + 2;
          const t = polarToCartesian(cx, cy, labelR, angleDeg);
          return (
            <text
              key={p.label}
              x={t.x}
              y={t.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--muted)"
              fontSize={9}
              style={{ fontFamily: 'inherit' }}
            >
              {p.label.length > 22 ? `${p.label.slice(0, 20)}…` : p.label}
            </text>
          );
        })}
        {/* Целевой контур (подложка) */}
        <polygon
          points={valuePolygon(cx, cy, maxR, n, targets)}
          fill="#5465ff"
          fillOpacity={0.08}
          stroke="#5465ff"
          strokeOpacity={0.4}
          strokeWidth={1.5}
        />
        {/* Текущий уровень (редактируется ползунком) */}
        <polygon
          points={valuePolygon(cx, cy, maxR, n, currents)}
          fill="#AFA9EC"
          fillOpacity={0.45}
          stroke="#5465ff"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
