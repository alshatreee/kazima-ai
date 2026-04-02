export function LoadingSkeleton() {
  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
          جارٍ البحث والتحليل...
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
          يتم استرجاع المصادر وبناء الإجابة
        </h3>
      </div>

      <div className="space-y-4 rounded-[1.75rem] border border-[var(--line)] bg-white/60 p-6">
        <div className="flex gap-2">
          <div className="h-5 w-28 animate-pulse rounded-full bg-[rgba(48,74,64,0.1)]" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-[rgba(139,106,59,0.1)]" />
        </div>
        <div className="h-4 w-full animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
        <div className="h-4 w-[95%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
        <div className="h-4 w-[88%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
        <div className="h-4 w-[72%] animate-pulse rounded-full bg-[rgba(48,74,64,0.09)]" />
        <div className="mt-6 h-px bg-[var(--line)]" />
        <div className="h-4 w-40 animate-pulse rounded-full bg-[rgba(139,106,59,0.14)]" />
        <div className="h-4 w-full animate-pulse rounded-full bg-[rgba(48,74,64,0.07)]" />
        <div className="h-4 w-[92%] animate-pulse rounded-full bg-[rgba(48,74,64,0.07)]" />
      </div>
    </section>
  );
}
