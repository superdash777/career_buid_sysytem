import { AlertTriangle, Info, XCircle, CheckCircle, X } from 'lucide-react';

type Variant = 'error' | 'warning' | 'info' | 'success';

interface Props {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const styles: Record<Variant, { bg: string; border: string; icon: string; iconEl: React.ReactNode }> = {
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-500',
    iconEl: <XCircle className="h-5 w-5" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-500',
    iconEl: <AlertTriangle className="h-5 w-5" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-500',
    iconEl: <Info className="h-5 w-5" />,
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-500',
    iconEl: <CheckCircle className="h-5 w-5" />,
  },
};

export default function Alert({ variant = 'error', title, children, onClose }: Props) {
  const s = styles[variant];
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${s.bg} ${s.border}`} role="alert">
      <div className={`mt-0.5 shrink-0 ${s.icon}`}>{s.iconEl}</div>
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="text-slate-700">{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
