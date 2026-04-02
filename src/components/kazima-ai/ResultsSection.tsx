import type { AssistantQueryResponse } from "@/lib/kazima-assistant-contract";
import type { ModeCard } from "./types";

type ResultsSectionProps = {
  activeMode: ModeCard;
  loading: boolean;
  result: AssistantQueryResponse | null;
  onCopy: () => void;
};

function scopeLabel(scope: AssistantQueryResponse["scope"]): string {
  switch (scope) {
    case "kazima_primary":
      return "من كاظمة مباشرة";
    case "kazima_primary_plus_context":
      return "من كاظمة مع ربط تفسيري";
    case "general_knowledge":
      return "معرفة عامة";
    default:
      return "يحتاج تحقق";
  }
}

function confidenceLabel(
  confidence: AssistantQueryResponse["confidence"],
): string {
  switch (confidence) {
    case "high":
      return "ثقة مرتفعة";
    case "medium":
      return "ثقة متوسطة";
    default:
      return "ثقة منخفضة";
  }
}

export function ResultsSection({
  activeMode,
  loading,
  result,
  onCopy,
}: ResultsSectionProps) {
  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            لوحة النتيجة
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            إجابة موثقة مبنية على طبقة كاظمة
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="kazima-badge">{activeMode.label}</span>
          <span className="kazima-badge">
            {result ? "نتيجة جاهزة" : "بانتظار السؤال"}
          </span>
          {result ? (
            <button
              type="button"
              onClick={onCopy}
              className="rounded-full border border-[var(--line)] bg-white/70 px-4 py-2 text-xs font-medium text-[var(--foreground)] transition hover:border-[rgba(139,106,59,0.3)] hover:bg-white"
            >
              نسخ النتيجة
            </button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 rounded-[1.75rem] border border-[var(--line)] bg-white/60 p-6">
          <div className="h-4 w-40 animate-pulse rounded-full bg-[rgba(139,106,59,0.14)]" />
          <div className="h-4 w-full animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
          <div className="h-4 w-[92%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
          <div className="h-4 w-[88%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
          <div className="h-4 w-[72%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
        </div>
      ) : result ? (
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-[var(--line)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="kazima-pill">{scopeLabel(result.scope)}</span>
              <span className="kazima-pill">
                {confidenceLabel(result.confidence)}
              </span>
              <span className="kazima-pill">
                {result.retrieval.returnedSources} مصادر معروضة
              </span>
            </div>

            <div className="space-y-4 text-sm leading-8 text-[var(--foreground)] sm:text-[0.95rem]">
              <div>
                <h4 className="mb-2 text-base font-semibold">الخلاصة</h4>
                <p>{result.summary}</p>
              </div>

              <div>
                <h4 className="mb-2 text-base font-semibold">الإجابة</h4>
                <p className="whitespace-pre-wrap">{result.answer}</p>
              </div>

              {result.sections.length > 0 ? (
                <div className="space-y-4">
                  {result.sections.map((section) => (
                    <div key={`${section.title}-${section.body.slice(0, 20)}`}>
                      <h4 className="mb-2 text-base font-semibold">
                        {section.title}
                      </h4>
                      <p className="whitespace-pre-wrap">{section.body}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {result.disclaimers?.length ? (
                <div className="rounded-[1.25rem] border border-[rgba(139,106,59,0.18)] bg-[rgba(255,248,239,0.88)] p-4 text-xs leading-6 text-[rgba(120,80,40,0.85)]">
                  {result.disclaimers.map((disclaimer, index) => (
                    <p key={index}>{disclaimer}</p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {result.citations.length > 0 ? (
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/50 p-6">
              <h4 className="mb-4 text-base font-semibold text-[var(--foreground)]">
                المصادر والاستشهادات
              </h4>
              <div className="space-y-3">
                {result.citations.map((citation) => (
                  <div
                    key={citation.id}
                    className="rounded-[1.25rem] border border-[rgba(48,74,64,0.12)] bg-[rgba(48,74,64,0.04)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {citation.label}
                        </p>
                        <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                          {citation.excerpt}
                        </p>
                      </div>
                      <span className="inline-flex whitespace-nowrap rounded-full bg-[var(--sage)] px-2 py-1 text-[0.65rem] font-semibold text-white">
                        {citation.confidence === "high"
                          ? "ثقة مرتفعة"
                          : citation.confidence === "medium"
                            ? "ثقة متوسطة"
                            : "ثقة منخفضة"}
                      </span>
                    </div>
                    {citation.url ? (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-[var(--accent-strong)] hover:underline"
                      >
                        اقرأ المصدر الكامل
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {result.readMore.length > 0 ? (
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-[rgba(237,246,239,0.76)] p-6">
              <h4 className="mb-4 text-base font-semibold text-[var(--foreground)]">
                اقرأ المزيد
              </h4>
              <div className="space-y-2">
                {result.readMore.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-[1rem] border border-[rgba(48,74,64,0.16)] bg-white/70 px-4 py-3 text-sm font-medium text-[var(--sage)] transition hover:border-[rgba(48,74,64,0.3)] hover:bg-white"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {result.followUpQuestions.length > 0 ? (
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/40 p-6">
              <h4 className="mb-4 text-base font-semibold text-[var(--foreground)]">
                أسئلة متابعة مقترحة
              </h4>
              <div className="space-y-2">
                {result.followUpQuestions.map((question, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-right rounded-[1rem] border border-[rgba(139,106,59,0.16)] bg-[rgba(255,248,239,0.72)] px-4 py-3 text-sm text-[var(--foreground)] transition hover:border-[rgba(139,106,59,0.3)] hover:bg-[rgba(255,248,239,0.95)]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/50 p-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            أرسل سؤالًا لترى نتيجة البحث موثقة من كاظمة
          </p>
        </div>
      )}
    </section>
  );
}
