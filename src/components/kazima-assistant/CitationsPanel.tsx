import type { CitationItem } from "./types";
import { Indicator } from "./Indicator";

type CitationsPanelProps = {
  citations: CitationItem[];
};

export function CitationsPanel({ citations }: CitationsPanelProps) {
  if (citations.length === 0) return null;

  return (
    <section className="kazima-panel rounded-[2rem] p-6 sm:p-7">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
            الاستشهادات
          </p>
          <h3 className="kazima-heading text-xl">مصادر من قاعدة كاظمة</h3>
        </div>
        <span className="kazima-badge">
          {citations.length} {citations.length === 1 ? "مصدر" : "مصادر"}
        </span>
      </div>

      {/* Citations List */}
      <div className="space-y-4">
        {citations.map((citation, index) => (
          <article
            key={citation.id}
            className="group rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-5 transition-all hover:border-[rgba(45,106,79,0.25)] hover:shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sage)] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="font-semibold text-[var(--fg)]">
                  {citation.label}
                </span>
              </div>
              <Indicator type="confidence" value={citation.confidence} />
            </div>
            
            <p className="text-sm leading-8 text-[var(--muted)]">
              {citation.excerpt}
            </p>
            
            {citation.note && (
              <p className="mt-3 border-t border-[var(--line)] pt-3 text-sm italic leading-7 text-[var(--muted)]">
                {citation.note}
              </p>
            )}

            {citation.url && (
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--gold)] transition-colors hover:text-[var(--gold-hover)]"
              >
                اقرأ المصدر الكامل
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
