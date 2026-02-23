import Stepper from './Stepper';

interface Props {
  step: number;
  showStepper?: boolean;
  children: React.ReactNode;
}

export default function Layout({ step, showStepper = true, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4">
          {showStepper && <Stepper current={step} />}
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
      </main>
      <footer className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        AI Career Pathfinder
      </footer>
    </div>
  );
}
