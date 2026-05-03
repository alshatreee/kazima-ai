import type { FormEvent } from "react";
import type { AssistantMode } from "./types";
import { ModeToggle } from "./ModeToggle";

type QueryComposerProps = {
  mode: AssistantMode;
  query: string;
  loading: boolean;
  onModeChange: (mode: AssistantMode) => void;
  onQueryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const FEATURES = [
  { icon: "database", text: "استرجاع من قاعدة البيانات" },
  { icon: "ai", text: "تحليل بـ Claude" },
  { icon: "cite", text: "استشهادات موثقة" },
];

export function QueryComposer({
  mode,
  query,
  loading,
  onModeChange,
  onQueryChange,
  onSubmit,
}: QueryComposerProps) {
  return (
    <section className="kazima-panel rounded-[2rem] p-6 sm:p-7">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
            اسأل كاظمة
          </p>
          <h2 className="kazima-heading text-xl sm:text-2xl">
            اطرح سؤالك عن التراث الكويتي والخليجي
          </h2>
        </div>
        <ModeToggle mode={mode} onSelect={onModeChange} />
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="relative">
          <textarea
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="مثال: ما هي المدرسة المباركية؟ من هم أبرز علماء الكويت؟ ما تاريخ التعليم الديني في الخليج؟"
            className="kazima-input min-h-32 resize-y"
            dir="rtl"
          />
          {query.length > 0 && (
            <div className="absolute bottom-3 left-3 text-xs text-[var(--muted)]">
              {query.length} حرف
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Features */}
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((feature) => (
              <span key={feature.text} className="kazima-badge">
                {feature.text}
              </span>
            ))}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-[var(--sage)] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[var(--sage-deep)] hover:shadow-xl disabled:cursor-not-allowed disabled:bg-[rgba(48,74,64,0.4)] disabled:shadow-none"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>جارٍ البحث والتحليل...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>{mode === "research" ? "ابدأ البحث المفصل" : "ابدأ البحث"}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
