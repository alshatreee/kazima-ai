import { METRICS } from "./data";
import type { ModeCard } from "./types";

type HeroSectionProps = {
  activeMode: ModeCard;
  textLength: number;
  resultLineCount: number;
};

export function HeroSection({
  activeMode,
  textLength,
  resultLineCount,
}: HeroSectionProps) {
  return (
    <>
      <header className="relative z-10 border-b border-[var(--line)] bg-[rgba(249,244,236,0.78)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <span className="kazima-badge">منصة كاظمة البحثية</span>
              <span className="kazima-badge">بحث مجاني + تحليل اختياري</span>
            </div>
            <div className="space-y-2">
              <h1 className="kazima-display text-4xl leading-none sm:text-5xl">
                مساعد كاظمة الهجين
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                واجهة بحثية تبدأ من محتوى كاظمة أولًا، ثم تضيف طبقة الذكاء
                الاصطناعي عند الحاجة فقط. الهدف هو الموثوقية، لا مجرد
                الانطباع.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[31rem]">
            {METRICS.map((metric) => (
              <div
                key={metric.label}
                className="kazima-panel rounded-[1.5rem] p-4 text-right"
              >
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  {metric.label}
                </div>
                <div className="mt-3 text-3xl font-semibold text-[var(--sage)]">
                  {metric.value}
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {metric.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="kazima-panel kazima-grid overflow-hidden rounded-[2rem] p-6 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_17rem]">
          <div className="space-y-5">
            <div className="space-y-3">
              <span className="kazima-badge">الوضع النشط الآن</span>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="kazima-display text-3xl sm:text-[2.5rem]">
                  {activeMode.label}
                </h2>
                <span className="kazima-pill">{activeMode.cue}</span>
                <span className="kazima-pill">{activeMode.cost}</span>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                {activeMode.desc}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="kazima-panel-muted rounded-[1.5rem] p-4">
                <div className="text-xs tracking-[0.2em] text-[var(--muted)]">
                  محور التنفيذ
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                  {activeMode.focus}
                </p>
              </div>
              <div className="kazima-panel-muted rounded-[1.5rem] p-4">
                <div className="text-xs tracking-[0.2em] text-[var(--muted)]">
                  المخرج المتوقع
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                  {activeMode.deliverable}
                </p>
              </div>
            </div>
          </div>

          <div className="kazima-panel-dark rounded-[1.75rem] p-5 text-[var(--accent-soft)]">
            <div className="text-xs tracking-[0.24em] text-[rgba(231,213,176,0.72)]">
              مؤشرات الجلسة
            </div>
            <div className="mt-6 grid gap-4">
              <div>
                <div className="text-xs text-[rgba(231,213,176,0.72)]">
                  طول السؤال الحالي
                </div>
                <div className="mt-1 text-3xl font-semibold text-white">
                  {textLength.toLocaleString("ar-SA")}
                </div>
              </div>
              <div className="h-px bg-[rgba(231,213,176,0.16)]" />
              <div>
                <div className="text-xs text-[rgba(231,213,176,0.72)]">
                  أسطر النتيجة
                </div>
                <div className="mt-1 text-3xl font-semibold text-white">
                  {resultLineCount.toLocaleString("ar-SA")}
                </div>
              </div>
              <div className="h-px bg-[rgba(231,213,176,0.16)]" />
              <div className="space-y-2 text-sm leading-7 text-[rgba(247,240,224,0.88)]">
                <p>المساعد يبدأ من كاظمة، لا من ذاكرة عامة أو تخمين.</p>
                <p>
                  إذا لم تتوفر طبقة الذكاء الاصطناعي، يبقى البحث المجاني شغالًا
                  ويعرض لك المصادر مباشرة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
