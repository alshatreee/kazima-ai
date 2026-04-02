type AssistantHeaderProps = {
  queryLength: number;
  sourcesCount: number;
};

export function AssistantHeader({
  queryLength,
  sourcesCount,
}: AssistantHeaderProps) {
  return (
    <header className="relative z-10 border-b border-[var(--line)] bg-[rgba(249,244,236,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            <span className="kazima-badge">مساعد كاظمة العلمي</span>
            <span className="kazima-badge">RAG + Claude</span>
          </div>
          <div className="space-y-2">
            <h1 className="kazima-display text-4xl leading-none sm:text-5xl">
              ذكاء كاظمة
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              مساعد بحثي موثق يعتمد على محتوى منصة كاظمة كمصدر أولي — استرجاع
              ذكي من قاعدة البيانات، تحليل بالذكاء الاصطناعي، واستشهادات مرتبطة
              بالمصادر.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[31rem]">
          <div className="kazima-panel rounded-[1.5rem] p-4 text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              أوضاع
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--sage)]">
              02
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              مختصر وبحثي مفصل
            </p>
          </div>
          <div className="kazima-panel rounded-[1.5rem] p-4 text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              المصادر
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--sage)]">
              {sourcesCount > 0
                ? sourcesCount.toLocaleString("ar-SA")
                : "RAG"}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              استرجاع من قاعدة كاظمة
            </p>
          </div>
          <div className="kazima-panel rounded-[1.5rem] p-4 text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              حجم السؤال
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--sage)]">
              {queryLength.toLocaleString("ar-SA")}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              حرف
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
