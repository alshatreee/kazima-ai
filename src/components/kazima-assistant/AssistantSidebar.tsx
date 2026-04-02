import {
  PIPELINE_STEPS,
  SCOPE_DESCRIPTIONS,
  CONFIDENCE_DESCRIPTIONS,
} from "./data";

export function AssistantSidebar() {
  return (
    <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      {/* Pipeline */}
      <section className="kazima-panel rounded-[2rem] p-5">
        <div className="mb-4">
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            كيف يعمل
          </p>
          <h3 className="mt-2 text-xl font-semibold">خط الأنابيب</h3>
        </div>
        <div className="space-y-3">
          {PIPELINE_STEPS.map((step, index) => (
            <div
              key={step}
              className="rounded-[1.35rem] border border-[var(--line)] bg-white/65 p-4"
            >
              <div className="text-xs tracking-[0.18em] text-[var(--accent-strong)]">
                خطوة {String(index + 1).padStart(2, "0")}
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
                {step}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Scope */}
      <section className="kazima-panel rounded-[2rem] p-5">
        <div className="mb-4">
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            مستويات النطاق
          </p>
          <h3 className="mt-2 text-xl font-semibold">مصدر الإجابة</h3>
        </div>
        <div className="space-y-3">
          {SCOPE_DESCRIPTIONS.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.35rem] border border-[var(--line)] bg-[rgba(255,255,255,0.62)] p-4"
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: item.dot }}
                />
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {item.label}
                </span>
              </div>
              <p className="text-sm leading-7 text-[var(--muted)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Confidence */}
      <section className="kazima-panel rounded-[2rem] p-5">
        <div className="mb-4">
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            درجات الثقة
          </p>
          <h3 className="mt-2 text-xl font-semibold">مقياس اليقين</h3>
        </div>
        <div className="space-y-3">
          {CONFIDENCE_DESCRIPTIONS.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.35rem] border border-[var(--line)] bg-[rgba(255,255,255,0.62)] p-4"
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: item.dot }}
                />
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {item.label}
                </span>
              </div>
              <p className="text-sm leading-7 text-[var(--muted)]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
