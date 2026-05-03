type AssistantHeaderProps = {
  queryLength: number;
  sourcesCount: number;
};

const STATS = [
  {
    key: "modes",
    label: "الأوضاع",
    getValue: () => "02",
    description: "مختصر وبحثي مفصل",
  },
  {
    key: "sources",
    label: "المصادر",
    getValue: (count: number) => (count > 0 ? count.toLocaleString("ar-SA") : "RAG"),
    description: "استرجاع من قاعدة كاظمة",
  },
  {
    key: "query",
    label: "حجم السؤال",
    getValue: (length: number) => length.toLocaleString("ar-SA"),
    description: "حرف",
  },
];

export function AssistantHeader({
  queryLength,
  sourcesCount,
}: AssistantHeaderProps) {
  return (
    <header className="relative z-10 border-b border-[var(--line)] bg-[rgba(249,244,236,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Brand Section */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="kazima-badge">مساعد كاظمة العلمي</span>
            <span className="kazima-pill">RAG + Claude</span>
          </div>
          
          <div className="space-y-2">
            <h1 className="kazima-display text-4xl leading-tight sm:text-5xl">
              ذكاء كاظمة
            </h1>
            <p className="max-w-2xl text-sm leading-8 text-[var(--muted)] sm:text-base">
              مساعد بحثي موثق يعتمد على محتوى منصة كاظمة كمصدر أولي — استرجاع
              ذكي من قاعدة البيانات، تحليل بالذكاء الاصطناعي، واستشهادات مرتبطة
              بالمصادر.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[32rem]">
          {STATS.map((stat, index) => (
            <div
              key={stat.key}
              className="kazima-panel rounded-2xl p-4 text-right transition-all hover:shadow-md"
            >
              <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
                {stat.label}
              </div>
              <div className="mt-3 text-3xl font-bold text-[var(--sage)]">
                {index === 1 ? stat.getValue(sourcesCount) : 
                 index === 2 ? stat.getValue(queryLength) : 
                 stat.getValue(0)}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
