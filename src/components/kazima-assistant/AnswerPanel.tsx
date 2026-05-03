import type { AssistantResponse } from "./types";
import { Indicator } from "./Indicator";

type AnswerPanelProps = {
  response: AssistantResponse;
};

export function AnswerPanel({ response }: AnswerPanelProps) {
  const hasAnswer = response.answer.trim().length > 0;
  const hasSections = response.sections.length > 0;

  return (
    <section className="kazima-panel rounded-[2rem] p-6 sm:p-7">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
            إجابة المساعد
          </p>
          {response.summary && (
            <h3 className="kazima-heading max-w-xl text-xl leading-relaxed">
              {response.summary.length > 100
                ? response.summary.substring(0, 100) + "..."
                : response.summary}
            </h3>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Indicator type="scope" value={response.scope} />
          <Indicator type="confidence" value={response.confidence} />
        </div>
      </div>

      {/* Summary Box */}
      {response.summary && (
        <div className="mb-6 rounded-2xl bg-[rgba(45,106,79,0.06)] p-5 sm:p-6">
          <p className="text-[0.95rem] font-medium leading-9 text-[var(--fg)]">
            {response.summary}
          </p>
        </div>
      )}

      {/* Sections (Research Mode) */}
      {hasSections ? (
        <div className="space-y-5">
          {response.sections.map((section, index) => (
            <article
              key={section.title}
              className="group rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.65)] p-5 sm:p-6 transition-all hover:border-[var(--line-strong)] hover:shadow-sm"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sage)] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <h4 className="text-lg font-semibold text-[var(--sage)]">
                  {section.title}
                </h4>
              </div>
              <p className="whitespace-pre-wrap text-[0.92rem] leading-9 text-[var(--fg)]">
                {section.body}
              </p>
            </article>
          ))}
        </div>
      ) : hasAnswer ? (
        /* Plain Answer (Brief Mode) */
        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.8)] p-5 sm:p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="kazima-pill">نتيجة أولية قابلة للتحرير</span>
            <span className="kazima-pill">يفضل مراجعتها بشريًا</span>
          </div>
          <div className="kazima-scroll max-h-[36rem] overflow-auto whitespace-pre-wrap text-[0.95rem] leading-9 text-[var(--fg)]">
            {response.answer}
          </div>
        </div>
      ) : null}

      {/* Disclaimers */}
      {response.disclaimers && response.disclaimers.length > 0 && (
        <div className="mt-6 space-y-3">
          {response.disclaimers.map((disclaimer) => (
            <div
              key={disclaimer}
              className="flex items-start gap-3 rounded-xl border border-[rgba(139,106,59,0.15)] bg-[rgba(255,249,239,0.8)] px-5 py-4"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0 text-[var(--gold)]">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm leading-7 text-[var(--muted)]">
                {disclaimer}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
