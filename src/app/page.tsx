"use client";

import { type FormEvent, useState } from "react";
import type { AssistantQueryResponse } from "@/lib/kazima-assistant-contract";

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
      if (!response.ok) { setError(data.error || "حدث خطأ غير متوقع أثناء المعالجة."); return; }
      setResult(data as AssistantQueryResponse);
    } catch { setError("تعذر الاتصال بالخادم في الوقت الحالي."); }
    finally { setLoading(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Auto-trigger research mode directly instead of retrieve-only
    await submitQuery(text, "research");
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
      <header className="search-header">
        <div className="search-header-inner">
          <h1 className="search-logo">كاظمة</h1>
          <span className="search-subtitle">أرشيف التراث الكويتي والخليجي</span>
        </div>
      </header>
      <div className="search-bar-wrapper">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-bar">
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="ابحث في كاظمة..." className="search-input" dir="rtl" />
            <button type="submit" disabled={loading || !text.trim()} className="search-btn" aria-label="بحث">
              {loading ? (<span className="search-spinner" />) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
      <main className="search-results-area">
        {error && (<div className="search-error">{error}</div>)}
        {loading && (<div className="search-loading"><div className="search-loading-dot" /><div className="search-loading-dot" /><div className="search-loading-dot" /></div>)}
        {result && (
          <div className="search-results">
            {result.summary && (<div className="result-summary"><p>{result.summary}</p></div>)}
            {result.answer && (<div className="result-answer"><p>{result.answer}</p></div>)}
            {result.sections.length > 0 && (
              <div className="result-sections">
                {result.sections.map((section) => (
                  <div key={`${section.title}-${section.body.slice(0, 20)}`} className="result-section-item">
                    <h3>{section.title}</h3><p>{section.body}</p>
                  </div>
                ))}
              </div>
            )}
            {result.citations.length > 0 && (
              <div className="result-citations">
                <h3 className="citations-title">المصادر</h3>
                {result.citations.map((citation) => (
                  <div key={citation.id} className="citation-card">
                    <div className="citation-label">{citation.label}</div>
                    <p className="citation-excerpt">{citation.excerpt}</p>
                    {citation.url && (<a href={citation.url} target="_blank" rel="noopener noreferrer" className="citation-link">اقرأ المصدر</a>)}
                  </div>
                ))}
              </div>
            )}
            {result.readMore.length > 0 && (
              <div className="result-readmore">
                <h3 className="citations-title">اقرأ المزيد</h3>
                <div className="readmore-links">
                  {result.readMore.map((item) => (
                    <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" className="readmore-link">{item.title}</a>
                  ))}
                </div>
              </div>
            )}
            {result.followUpQuestions.length > 0 && (
              <div className="result-followup">
                {result.followUpQuestions.map((question, index) => (
                  <button key={index} type="button" onClick={() => handleFollowUp(question)} className="followup-btn">{question}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {!loading && !result && !error && (
          <div className="search-empty">
            <p>ابحث عن أي شيء في أرشيف كاظمة</p>
            <div className="search-suggestions">
              <button type="button" onClick={() => setText("المدرسة المباركية")}>المدرسة المباركية</button>
              <button type="button" onClick={() => setText("الشيخ يوسف بن عيسى القناعي")}>الشيخ يوسف بن عيسى القناعي</button>
              <button type="button" onClick={() => setText("تاريخ الكويت")}>تاريخ الكويت</button>
            </div>
          </div>
        )}
      </main>
      <footer className="search-footer"><p>منصة كاظمة البحثية &copy; 2025</p></footer>
    </div>
  );
}
