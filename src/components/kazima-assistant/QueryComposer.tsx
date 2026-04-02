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

export function QueryComposer({
  mode,
  query,
  loading,
  onModeChange,
  onQueryChange,
  onSubmit,
}: QueryComposerProps) {
  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            اسأل كاظمة
          </p>
          <h3 className="mt-2 text-xl font-semibold">
            اطرح سؤالك عن التراث الكويتي والخليجي
          </h3>
        </div>
        <ModeToggle mode={mode} onSelect={onModeChange} />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="مثال: ما هي المدرسة المباركية؟ من هم أبرز علماء الكويت؟ ما تاريخ التعليم الديني في الخليج؟"
          className="kazima-input h-28 resize-y"
          dir="rtl"
        />

        <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
            <span className="kazima-badge">استرجاع من قاعدة البيانات</span>
            <span className="kazima-badge">تحليل بـ Claude</span>
            <span className="kazima-badge">استشهادات موثقة</span>
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center rounded-full bg-[var(--sage)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--sage-deep)] disabled:cursor-not-allowed disabled:bg-[rgba(48,74,64,0.42)]"
          >
            {loading
              ? "جارٍ البحث والتحليل..."
              : mode === "research"
                ? "ابدأ البحث المفصل"
                : "ابدأ البحث"}
          </button>
        </div>
      </form>
    </section>
  );
}
