export function EmptyState() {
  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
          نتائج البحث
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
          ستظهر الإجابة هنا مع المصادر والاستشهادات
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-[1.75rem] border border-dashed border-[rgba(139,106,59,0.24)] bg-[rgba(255,249,239,0.84)] p-6">
          <span className="kazima-badge">الوضع المختصر</span>
          <p className="text-sm leading-7 text-[var(--muted)]">
            إجابة مباشرة مع استشهادات قصيرة ودرجة ثقة واضحة.
          </p>
        </div>
        <div className="space-y-3 rounded-[1.75rem] border border-dashed border-[rgba(48,74,64,0.18)] bg-[rgba(239,245,242,0.7)] p-6">
          <span className="kazima-pill">الوضع البحثي</span>
          <p className="text-sm leading-7 text-[var(--muted)]">
            إجابة مفصلة بأقسام: تعريف، سياق تاريخي، أعلام، ملاحظات علمية.
          </p>
        </div>
      </div>
    </section>
  );
}
