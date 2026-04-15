interface DataPoint {
  param: string;
  current: number;
  target: number;
}

interface Props {
  data: DataPoint[];
  size?: number;
}

const LEVELS = 5;

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return { x: cx + r * Math.sin(angleRad), y: cy - r * Math.cos(angleRad) };
}

function polygonPoints(cx: number, cy: number, r: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n;
    const { x, y } = polarToCartesian(cx, cy, r, angle);
    return `${x},${y}`;
  }).join(' ');
}

function dataPolygon(cx: number, cy: number, maxR: number, values: number[], maxValue: number) {
  const n = values.length;
  return values
    .map((v, i) => {
      const angle = (2 * Math.PI * i) / n;
      const r = (v / maxValue) * maxR;
      const { x, y } = polarToCartesian(cx, cy, r, angle);
      return `${x},${y}`;
    })
    .join(' ');
}

export default function RadarChartSvg({ data, size = 220 }: Props) {
  if (!data.length) return null;

  const margin = 40;
  const svgSize = size + margin * 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const maxR = size / 2;
  const n = data.length;

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.current, d.target)),
    2,
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {Array.from({ length: LEVELS }, (_, i) => {
          const r = (maxR * (i + 1)) / LEVELS;
          return (
            <polygon
              key={`grid-${i}`}
              points={polygonPoints(cx, cy, r, n)}
              fill="none"
              stroke="var(--line)"
              strokeWidth={0.5}
            />
          );
        })}

        {data.map((_, i) => {
          const angle = (2 * Math.PI * i) / n;
          const { x, y } = polarToCartesian(cx, cy, maxR, angle);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--line)"
              strokeWidth={0.5}
            />
          );
        })}

        <polygon
          points={dataPolygon(cx, cy, maxR, data.map((d) => d.target), maxValue)}
          fill="none"
          stroke="#185FA5"
          strokeWidth={1.5}
          strokeDasharray="3,3"
          opacity={0.4}
        />

        <polygon
          points={dataPolygon(cx, cy, maxR, data.map((d) => d.current), maxValue)}
          fill="#B5D4F4"
          fillOpacity={0.35}
          stroke="#185FA5"
          strokeWidth={1.5}
        />

        {data.map((d, i) => {
          const angle = (2 * Math.PI * i) / n;
          const labelR = maxR + 16;
          const { x, y } = polarToCartesian(cx, cy, labelR, angle);
          const anchor =
            Math.abs(x - cx) < 1 ? 'middle' : x > cx ? 'start' : 'end';
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="central"
              className="text-[10px] fill-[var(--muted)]"
            >
              {d.param}
            </text>
          );
        })}
      </svg>
      <p className="text-[11px] text-[var(--muted)] text-center max-w-[280px] leading-snug">
        Синяя область — ваш уровень · Пунктир — требования целевого грейда
      </p>
    </div>
  );
}
