interface GridBgProps {
  children: React.ReactNode;
  className?: string;
}

export default function GridBg({ children, className = '' }: GridBgProps) {
  return (
    <div className={`grid-bg relative ${className}`.trim()}>
      <div className="grid-bg-layer pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
