import { ArrowRight, Target, BarChart3, ListChecks } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export default function Welcome({ onStart }: Props) {
  const bullets = [
    {
      icon: <Target className="h-6 w-6 text-indigo-600" />,
      text: 'Определим ваши сильные навыки и зоны роста',
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-indigo-600" />,
      text: 'Сопоставим с выбранной профессией и уровнем',
    },
    {
      icon: <ListChecks className="h-6 w-6 text-indigo-600" />,
      text: 'Сформируем понятный план в формате «делай раз \u2192 получай результат»',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-6 inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-100 text-3xl">
            🧭
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            AI Career Pathfinder
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-10 max-w-xl mx-auto">
            Соберите персональный план развития: что подтянуть, на что опереться
            и какие шаги сделать уже на этой неделе.
          </p>

          <div className="space-y-4 mb-10 max-w-md mx-auto text-left">
            {bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="mt-0.5 shrink-0 rounded-lg bg-indigo-50 p-2">{b.icon}</div>
                <p className="text-base text-slate-700 leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
            <button onClick={onStart} className="btn-primary text-lg px-8 py-4">
              Начать <ArrowRight className="h-5 w-5" />
            </button>
            <a
              href="#how-it-works"
              className="btn-secondary text-base"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Посмотреть, как это работает
            </a>
          </div>

          <p className="text-sm text-slate-400">
            Без регистрации. Можно загрузить резюме или заполнить навыки вручную.
          </p>
        </div>
      </div>

      <section id="how-it-works" className="border-t border-slate-100 bg-white py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Как это работает</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Выберите цель', desc: 'Укажите профессию, сценарий и грейд' },
              { step: '2', title: 'Добавьте навыки', desc: 'Загрузите резюме или введите вручную' },
              { step: '3', title: 'Получите план', desc: 'Персональные шаги роста за минуту' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
        AI Career Pathfinder
      </footer>
    </div>
  );
}
