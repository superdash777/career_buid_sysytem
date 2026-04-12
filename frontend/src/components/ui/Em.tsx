interface EmProps {
  children: React.ReactNode;
  className?: string;
}

export default function Em({ children, className = '' }: EmProps) {
  return <em className={`editorial-em not-italic ${className}`.trim()}>{children}</em>;
}
