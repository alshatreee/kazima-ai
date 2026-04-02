import type { AssistantResponse } from "./types";
import { Indicator } from "./Indicator";

type AnswerPanelProps = {
  response: AssistantResponse;
};

export function AnswerPanel({ response }: AnswerPanelProps) {
  const hasAnswer = response.answer.trim().length > 0;
  const hasSections = response.sections.length > 0;

  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            إجابة المساعد
          </p>
          {response.summary ? (
            <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              {response.summary.length > 80
                ? response.summary.substring(0, 80) + "..."
                : response.summary}
            </h3>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Indicator type="scope" value={response.scope} />
          <Indicator type="confidence" value={response.confidence} />
        </div>
      </div>

      {/* Summary box */}
      {response.summary ? (
        <div className="mb-5 rounded-[1.5rem] bg-[rgba(48,74,64,0.05)] p-4 sm:p-5">
          <p className="text-sm font-medium leading-8 text-[var(--foreground)] sm:text-[0.95rem]">
            {response.summary}
          </p>
        </div>
      ) : null}

      {/* Sections (research mode) */}
      {hasSections ? (
        <div className="space-y-4">
          {response.sections.map((section) => (
            <div
              key={section.title}
              className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-4 sm:p-5"
            >
              <h4 className="mb-3 text-[0.95rem] font-semibold text-[var(--sage)]">
                {section.title}
              </h4>
              <p className="whitespace-pre-wrap text-sm leading-8 text-[var(--foreground)]">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      ) : hasAnswer ? (
        /* Plain answer (brief mode) */
        <div className="rounded-[1.75rem] border border-[var(--line)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="kazima-pill">نتيجة أولية قابلة للتحرير</span>
            <span className="kazima-pill">يفضل مراجعتها بشريًا</span>
          </div>
          <div className="kazima-scroll max-h-[34rem] overflow-auto whitespace-pre-wrap text-sm leading-8 text-[var(--foreground)] sm:text-[0.95rem]">
            {response.answer}
          </div>
        </div>
      ) : null}

      {/* Disclaimers */}
      {response.disclaimers && response.disclaimers.length > 0 ? (
        <div className="mt-5 space-y-2">
          {response.disclaimers.map((disclaimer) => (
            <div
              key={disclaimer}
              className="rounded-[1.25rem] border border-[rgba(139,106,59,0.14)] bg-[rgba(255,249,239,0.7)] px-4 py-3 text-xs leading-7 text-[var(--muted)]"
            >
              {disclaimer}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
