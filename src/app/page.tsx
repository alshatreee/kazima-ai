"use client";

import { type FormEvent, useState } from "react";
import type { AssistantQueryResponse } from "@/lib/kazima-assistant-contract";

const SUGGESTIONS = [
  { text: "المدرسة المباركية", icon: "school" },
  { text: "الشيخ يوسف بن عيسى القناعي", icon: "person" },
  { text: "تاريخ الكويت", icon: "history" },
  { text: "المخطوطات الكويتية", icon: "book" },
];

const STATS = [
  { label: "مخطوط", value: "173+", icon: "manuscript" },
  { label: "عالم", value: "102", icon: "scholar" },
  { label: "دراسة", value: "602", icon: "study" },
];

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AssistantQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitQuery(queryText: string, mode: string) {
    if (!queryText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/kazima-assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText.trim(), mode, includeReadMore: true, maxSources: 5 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "حدث خطأ غير متوقع أثناء المعالجة.");
        return;
      }
      setResult(data as AssistantQueryResponse);
    } catch {
      setError("تعذر الاتصال بالخادم في الوقت الحالي.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitQuery(text, "retrieve");
  }

  function handleFollowUp(question: string) {
    if (question.includes("تلخيص")) {
      submitQuery(text, "brief");
    } else if (question.includes("بحثية موثقة")) {
      submitQuery(text, "research");
    } else {
      setText(question);
    }
  }

  return (
    <div className="search-page" dir="rtl">
      {/* Header */}
      <header className="search-header">
        <div className="search-header-inner">
          <h1 className="search-logo">كاظمة</h1>
          <p className="search-subtitle">أرشيف التراث الكويتي والخليجي</p>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="mx-auto flex max-w-md justify-center gap-6 px-4 pb-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-2xl font-semibold text-[var(--sage)]">{stat.value}</div>
            <div className="text-xs text-[var(--muted)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="search-bar-wrapper">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-bar">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ابحث في أرشيف كاظمة..."
              className="search-input"
              dir="rtl"
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="search-btn"
              aria-label="بحث"
            >
              {loading ? (
                <span className="search-spinner" />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <main className="search-results-area">
        {error && <div className="search-error">{error}</div>}

        {loading && (
          <div className="search-loading">
            <div className="search-loading-dot" />
            <div className="search-loading-dot" />
            <div className="search-loading-dot" />
          </div>
        )}

        {result && (
          <div className="search-results">
            {/* Summary */}
            {result.summary && (
              <div className="result-summary">
                <p>{result.summary}</p>
              </div>
            )}

            {/* Answer */}
            {result.answer && (
              <div className="result-answer">
                <p>{result.answer}</p>
              </div>
            )}

            {/* Sections */}
            {result.sections.length > 0 && (
              <div className="result-sections">
                {result.sections.map((section) => (
                  <article
                    key={`${section.title}-${section.body.slice(0, 20)}`}
                    className="result-section-item"
                  >
                    <h3>{section.title}</h3>
                    <p>{section.body}</p>
                  </article>
                ))}
              </div>
            )}

            {/* Citations */}
            {result.citations.length > 0 && (
              <section className="result-citations">
                <h3 className="citations-title">المصادر والمراجع</h3>
                {result.citations.map((citation, index) => (
                  <div key={citation.id} className="citation-card">
                    <div className="citation-label">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--sage)] text-white text-xs font-bold ml-2">
                        {index + 1}
                      </span>
                      {citation.label}
                    </div>
                    <p className="citation-excerpt">{citation.excerpt}</p>
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="citation-link"
                      >
                        اقرأ المصدر الكامل
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 17L17 7M17 7H7M17 7V17" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Read More */}
            {result.readMore.length > 0 && (
              <section className="result-readmore">
                <h3 className="citations-title">اقرأ المزيد</h3>
                <div className="readmore-links">
                  {result.readMore.map((item) => (
                    <a
                      key={item.url}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="readmore-link"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-3 flex-shrink-0">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      {item.title}
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Follow-up */}
            {result.followUpQuestions.length > 0 && (
              <div className="result-followup">
                {result.followUpQuestions.map((question, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleFollowUp(question)}
                    className="followup-btn"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !result && !error && (
          <div className="search-empty">
            <p>ابحث عن أي موضوع في أرشيف كاظمة للتراث الكويتي والخليجي</p>
            <div className="search-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.text}
                  type="button"
                  onClick={() => setText(suggestion.text)}
                >
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="search-footer">
        <p>منصة كاظمة البحثية &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
