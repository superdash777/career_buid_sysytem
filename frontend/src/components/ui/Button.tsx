type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--blue-deep)] text-[#f8f4ec] border-[var(--blue-deep)] hover:bg-[#0f1934] hover:-translate-y-0.5',
  secondary:
    'bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[#efe9df] hover:-translate-y-0.5',
  ghost:
    'bg-transparent text-[var(--blue-deep)] border-transparent hover:bg-[#e8e2d8]',
};

export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[999px] border px-5 py-2.5',
        'font-[var(--font-mono)] text-[11px] uppercase tracking-[0.14em]',
        'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-red)]/50',
        'disabled:cursor-not-allowed disabled:opacity-55',
        variantClass[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
