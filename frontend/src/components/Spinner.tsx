import { Loader2 } from 'lucide-react';

interface Props {
  text?: string;
  subtext?: string;
}

export default function Spinner({ text, subtext }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      {text && <p className="text-base font-medium text-slate-700">{text}</p>}
      {subtext && <p className="text-sm text-slate-500">{subtext}</p>}
    </div>
  );
}
