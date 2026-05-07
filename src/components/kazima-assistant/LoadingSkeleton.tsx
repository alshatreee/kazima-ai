/**
 * Skeleton loader shown while the assistant is retrieving sources and
 * waiting on the Phase 2A Claude synthesis call (~5-8s end-to-end).
 *
 * Mirrors the AnswerPanel layout:
 *   • header + indicator pills row
 *   • "إجابة موجزة من Claude" placeholder card with 4 RTL skeleton bars
 *   • a divider then 3 source-card stubs
 *
 * Pure Tailwind animate-pulse — no external deps. Right-aligned for
 * Arabic flow so the transition into the real answer feels seamless.
 */
export function LoadingSkeleton() {
  return (
    <section dir="rtl" className="kazima-panel rounded-[2rem] p-5 text-right sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
            جارٍ البحث والتحليل...
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            يتم استرجاع المصادر وبناء الإجابة من Claude
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-[rgba(48,74,64,0.10)]" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-[rgba(139,106,59,0.10)]" />
        </div>
      </div>

      {/* Synthesis-answer skeleton — mirrors AnswerPanel's "إجابة موجزة" card */}
      <div className="mb-5 rounded-[1.75rem] border border-[var(--line)] bg-[rgba(255,255,255,0.85)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="h-6 w-36 animate-pulse rounded-full bg-[rgba(48,74,64,0.10)]" />
          <div className="h-6 w-32 animate-pulse rounded-full bg-[rgba(139,106,59,0.10)]" />
        </div>
        <div className="space-y-3">
          {/* 4 RTL skeleton bars representing answer paragraphs */}
          <div className="ml-auto h-4 w-full animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
          <div className="ml-auto h-4 w-[94%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
          <div className="ml-auto h-4 w-[88%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
          <div className="ml-auto h-4 w-[68%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
        </div>
      </div>

      {/* Source-card stubs */}
      <div className="space-y-3">
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-4">
          <div className="mb-3 h-4 w-44 animate-pulse rounded-full bg-[rgba(139,106,59,0.16)]" />
          <div className="mb-2 h-3.5 w-full animate-pulse rounded-full bg-[rgba(48,74,64,0.07)]" />
          <div className="h-3.5 w-[86%] animate-pulse rounded-full bg-[rgba(48,74,64,0.07)]" />
        </div>
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-4">
          <div className="mb-3 h-4 w-52 animate-pulse rounded-full bg-[rgba(139,106,59,0.16)]" />
          <div className="mb-2 h-3.5 w-full animate-pulse rounded-full bg-[rgba(48,74,64,0.07)]" />
          <div className="h-3.5 w-[78%] animate-pulse rounded-full bg-[rgba(48,74,64,0.07)]" />
        </div>
        <div className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-4">
          <div className="mb-3 h-4 w-40 animate-pulse rounded-full bg-[rgba(139,106,59,0.16)]" />
          <div className="h-3.5 w-[92%] animate-pulse rounded-full bg-[rgba(48,74,64,0.07)]" />
        </div>
      </div>
    </section>
  );
}
