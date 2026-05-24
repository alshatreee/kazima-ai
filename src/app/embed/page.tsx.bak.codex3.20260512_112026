"use client";

import { type FormEvent, useState, useEffect } from "react";
import type { AssistantQueryResponse } from "@/lib/kazima-assistant-contract";

export default function EmbedSearch() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AssistantQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Notify parent iframe of height changes for auto-resize
  useEffect(() => {
    function postHeight() {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "kazima-resize", height }, "*");
    }
    const observer = new MutationObserver(postHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    postHeight();
    return () => observer.disconnect();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/kazima-assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          mode: "retrieve",
          includeReadMore: true,
          maxSources: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "حدث خطأ غير متوقع.");
        return;
      }

      setResult(data as AssistantQueryResponse);
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="embed-root" dir="rtl">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="embed-form">
        <div className="embed-bar">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ابحث في كاظمة..."
            className="embed-input"
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="embed-btn"
            aria-label="بحث"
          >
            {loading ? (
              <span className="embed-spinner" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="embed-results">
        {error && <div className="embed-error">{error}</div>}

        {loading && (
          <div className="embed-loading">
            <div className="embed-dot" />
            <div className="embed-dot" />
            <div className="embed-dot" />
          </div>
        )}

        {result && (
          <div className="embed-result-list">
            {result.summary && (
              <div className="embed-card embed-summary">{result.summary}</div>
            )}

            {result.answer && (
              <div className="embed-card">{result.answer}</div>
            )}

            {result.sections.length > 0 &&
              result.sections.map((section) => (
                <div key={`${section.title}-${section.body.slice(0, 15)}`} className="embed-card">
                  <strong>{section.title}</strong>
                  <p>{section.body}</p>
                </div>
              ))}

            {result.citations.length > 0 && (
              <div className="embed-citations">
                <div className="embed-citations-title">المصادر</div>
                {result.citations.map((c) => (
                  <div key={c.id} className="embed-cite">
                    <div className="embed-cite-label">{c.label}</div>
                    <div className="embed-cite-text">{c.excerpt}</div>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="embed-cite-link">
                        اقرأ المصدر ←
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {result.readMore.length > 0 && (
              <div className="embed-readmore">
                {result.readMore.map((item) => (
                  <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="embed-readmore-link">
                    {item.title}
                  </a>
                ))}
              </div>
            )}

            {result.followUpQuestions.length > 0 && (
              <div className="embed-followup">
                {result.followUpQuestions.map((q, i) => (
                  <button key={i} type="button" onClick={() => setText(q)} className="embed-followup-btn">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
