import { MODES } from "./data";
import type { Mode } from "./types";

type ModeSelectorProps = {
  mode: Mode;
  onSelect: (mode: Mode) => void;
};

export function ModeSelector({ mode, onSelect }: ModeSelectorProps) {
  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            أوضاع المعالجة
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            اختر عدسة القراءة المناسبة قبل الإرسال
          </h3>
        </div>
        <span className="kazima-badge">تجربة هجينة: وضوح + هوية</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MODES.map((item) => {
          const isActive = item.value === mode;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onSelect(item.value)}
              className={`rounded-[1.5rem] border px-4 py-4 text-right transition duration-200 ${
                isActive
                  ? "border-[rgba(139,106,59,0.4)] bg-[rgba(255,247,234,0.98)] shadow-[0_16px_30px_rgba(109,80,40,0.08)]"
                  : "border-[var(--line)] bg-[rgba(255,255,255,0.58)] hover:border-[rgba(139,106,59,0.22)] hover:bg-[rgba(255,251,244,0.86)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold text-[var(--foreground)]">
                  {item.label}
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[0.65rem] tracking-[0.16em] ${
                    isActive
                      ? "bg-[rgba(107,79,37,0.12)] text-[var(--accent-strong)]"
                      : "bg-[rgba(48,74,64,0.08)] text-[var(--muted)]"
                  }`}
                >
                  {item.cue}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {item.desc}
              </p>
              <div className="mt-3 inline-flex rounded-full bg-[rgba(48,74,64,0.08)] px-2.5 py-1 text-[0.7rem] font-medium text-[var(--sage)]">
                {item.cost}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
