import type { CitationItem } from "./types";
import { Indicator } from "./Indicator";

type CitationsPanelProps = {
  citations: CitationItem[];
};

export function CitationsPanel({ citations }: CitationsPanelProps) {
  if (citations.length === 0) return null;

  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            الاستشهادات
          </p>
          <h3 className="mt-2 text-lg font-semibold">مصادر من قاعدة كاظمة</h3>
        </div>
        <span className="kazima-badge">
          {citations.length} {citations.length === 1 ? "مصدر" : "مصادر"}
        </span>
      </div>

      <div className="space-y-3">
        {citations.map((citation, index) => (
          <div
            key={citation.id}
            className="rounded-[1.25rem] border border-[var(--line)] bg-[rgba(255,255,255,0.65)] p-4 transition-colors hover:border-[rgba(139,106,59,0.3)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--foreground)]">
                [{index + 1}] {citation.label}
              </span>
              <Indicator type="confidence" value={citation.confidence} />
            </div>
            <p className="text-xs leading-7 text-[var(--muted)]">
              {citation.excerpt}
            </p>
            {citation.note ? (
              <p className="mt-2 text-xs italic leading-6 text-[var(--muted)]">
                {citation.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
