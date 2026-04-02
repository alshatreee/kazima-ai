type FollowUpPanelProps = {
  questions: string[];
  onSelect: (question: string) => void;
};

export function FollowUpPanel({ questions, onSelect }: FollowUpPanelProps) {
  if (questions.length === 0) return null;

  return (
    <section className="kazima-panel rounded-[2rem] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-xs tracking-[0.2em] text-[var(--muted)]">
          أسئلة مقترحة
        </p>
        <h3 className="mt-2 text-lg font-semibold">تابع الاستكشاف</h3>
      </div>
      <div className="space-y-3">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className="block w-full rounded-[1.25rem] border border-[var(--line)] bg-[rgba(255,251,244,0.8)] px-4 py-3 text-right text-sm text-[var(--accent-strong)] transition hover:border-[rgba(139,106,59,0.3)] hover:bg-[rgba(255,247,234,0.95)]"
          >
            {question}
          </button>
        ))}
      </div>
    </section>
  );
}
