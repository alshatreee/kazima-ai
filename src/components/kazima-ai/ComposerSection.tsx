import type { FormEvent } from "react";
import type { ModeCard } from "./types";

type ComposerSectionProps = {
  activeMode: ModeCard;
  text: string;
  context: string;
  showContext: boolean;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTextChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onToggleContext: () => void;
};

export function ComposerSection({
  activeMode,
  text,
  context,
  showContext,
  loading,
  onSubmit,
  onTextChange,
  onContextChange,
  onToggleContext,
}: ComposerSectionProps) {
  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            مساحة السؤال
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            اكتب السؤال كما سيبحث عنه الباحث داخل كاظمة
          </h3>
        </div>
        <span className="kazima-pill">الطبقة النشطة: {activeMode.label}</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-3">
            <label
              htmlFor="text-input"
              className="block text-sm font-medium text-[var(--foreground)]"
            >
              السؤال أو الاستعلام
            </label>
            <textarea
              id="text-input"
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="مثال: من هم أبرز طلاب المدرسة المباركية؟ أو: ماذا ذكرت كاظمة عن الشيخ يوسف بن عيسى القناعي؟"
              className="kazima-input h-56 resize-y"
              dir="rtl"
            />
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-[var(--line)] bg-[rgba(244,238,226,0.82)] p-4">
            <div>
              <div className="text-xs tracking-[0.2em] text-[var(--muted)]">
                ناتج هذا الوضع
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
                {activeMode.deliverable}
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleContext}
              className="flex w-full items-center justify-between rounded-[1.25rem] border border-[var(--line)] bg-white/70 px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:border-[rgba(139,106,59,0.3)]"
            >
              <span>إضافة هدف أو سياق للسؤال</span>
              <span className="text-[var(--accent-strong)]">
                {showContext ? "إخفاء" : "إظهار"}
              </span>
            </button>

            <div className="space-y-3 rounded-[1.25rem] bg-[rgba(48,74,64,0.06)] p-4">
              <div className="text-xs tracking-[0.2em] text-[var(--muted)]">
                منطق التشغيل
              </div>
              <p className="text-sm leading-7 text-[var(--foreground)]">
                يبدأ هذا الوضع من نتائج كاظمة أولًا، ثم يضيف طبقة الصياغة أو
                التحليل عند الحاجة فقط.
              </p>
            </div>
          </div>
        </div>

        {showContext ? (
          <div className="space-y-3">
            <label
              htmlFor="context-input"
              className="block text-sm font-medium text-[var(--foreground)]"
            >
              هدف السؤال أو السياق الإضافي
            </label>
            <textarea
              id="context-input"
              value={context}
              onChange={(event) => onContextChange(event.target.value)}
              placeholder="مثال: أريد إجابة تصلح كبداية بحث، أو أبحث عن المادة الأكثر صلة داخل كاظمة أولًا."
              className="kazima-input h-28 resize-y text-sm"
              dir="rtl"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span className="kazima-badge">استرجاع قبل التوليد</span>
            <span className="kazima-badge">مصادر واضحة</span>
            <span className="kazima-badge">ثقة ونطاق</span>
          </div>

          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="inline-flex items-center justify-center rounded-full bg-[var(--sage)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sage-deep)] disabled:cursor-not-allowed disabled:bg-[rgba(48,74,64,0.42)]"
          >
            {loading ? "جارٍ تجهيز النتيجة..." : `ابدأ ${activeMode.label}`}
          </button>
        </div>
      </form>
    </section>
  );
}
