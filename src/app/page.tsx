"use client";

import { type FormEvent, useState } from "react";
import type { AssistantQueryResponse } from "@/lib/kazima-assistant-contract";
import dynamic from "next/dynamic";

// تحميل ديناميكي للمكونات الثقيلة (لا يبطئ تحميل الصفحة)
const KuwaitMap = dynamic(() => import("@/components/KuwaitMap"), { ssr: false });
const InteractivePdfViewer = dynamic(() => import("@/components/InteractivePdfViewer"), { ssr: false });

interface LocationPoint {
  name: string;
  type: string;
  lat: number;
  lng: number;
  context?: string;
}

interface GoogleBookResult {
  id: string;
  title: string;
  author: string;
  summary: string;
  date: string;
  thumbnail: string;
  link: string;
}

type ExtendedResponse = AssistantQueryResponse & {
  locations?: LocationPoint[];
};

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ExtendedResponse | null>(null);
  const [googleBooks, setGoogleBooks] = useState<GoogleBookResult[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    setGoogleBooks([]);
    setSelectedPdf(null);

    try {
      // بحث متوازي: كاظمة + كتب جوجل
      const [kazimaRes, booksRes] = await Promise.all([
        fetch("/api/kazima-assistant/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text.trim(), mode: "research", includeReadMore: true, maxSources: 5 }),
        }),
        fetch(`/api/google-books?q=${encodeURIComponent(text.trim())}`).catch(() => null),
      ]);

      const kazimaData = await kazimaRes.json();
      if (!kazimaRes.ok) {
        setError(kazimaData.error || "حدث خطأ غير متوقع أثناء المعالجة.");
        return;
      }
      setResult(kazimaData as ExtendedResponse);

      if (booksRes && booksRes.ok) {
        const booksData = await booksRes.json();
        setGoogleBooks(booksData.results || []);
      }
    } catch {
      setError("تعذر الاتصال بالخادم في الوقت الحالي.");
    } finally {
      setLoading(false);
    }
  }

  function handleFollowUp(question: string) {
    if (question.includes("تلخيص")) {
      setText(text);
      // Re-submit with brief mode via direct fetch
      submitWithMode("brief");
    } else if (question.includes("بحثية موثقة")) {
      submitWithMode("research");
    } else {
      setText(question);
    }
  }

  async function submitWithMode(mode: string) {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/kazima-assistant/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text.trim(), mode, includeReadMore: true, maxSources: 5 }),
      });
      const data = await res.json();
      if (res.ok) setResult(data as ExtendedResponse);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const hasLocations = (result?.locations?.length ?? 0) > 0;
  const hasBooks = googleBooks.length > 0;

  return (
    <div className="search-page" dir="rtl">
      {/* ═══ الشريط العلوي ═══ */}
      <header className="search-header">
        <div className="search-header-inner">
          <h1 className="search-logo">كاظمة</h1>
          <span className="search-subtitle">أرشيف التراث الكويتي والخليجي</span>
        </div>
      </header>

      {/* ═══ شريط البحث ═══ */}
      <div className="search-bar-wrapper">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="search-bar">
            <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="ابحث عن الشخصيات، الأماكن، أو الأحداث التاريخية..." className="search-input" dir="rtl" />
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
          <div className="search-results-grid">
            {/* ═══ العمود الرئيسي: التحليل + الخريطة ═══ */}
            <div className="search-results-main">
              {/* التحليل الأكاديمي */}
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

              {/* المصادر الموثقة */}
              {result.citations.length > 0 && (
                <div className="result-citations">
                  <h3 className="citations-title">المصادر الموثقة</h3>
                  {result.citations.map((citation) => (
                    <div key={citation.id} className="citation-card">
                      <div className="citation-label">{citation.label}</div>
                      <p className="citation-excerpt">{citation.excerpt}</p>
                      {citation.url && (<a href={citation.url} target="_blank" rel="noopener noreferrer" className="citation-link">اقرأ المصدر</a>)}
                    </div>
                  ))}
                </div>
              )}

              {/* الخريطة التفاعلية */}
              {hasLocations && (
                <div className="result-map-section">
                  <h3 className="citations-title">المواقع الجغرافية المذكورة</h3>
                  <KuwaitMap locations={result.locations!} />
                </div>
              )}

              {/* اقرأ المزيد */}
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

              {/* أسئلة متابعة */}
              {result.followUpQuestions.length > 0 && (
                <div className="result-followup">
                  {result.followUpQuestions.map((question, index) => (
                    <button key={index} type="button" onClick={() => handleFollowUp(question)} className="followup-btn">{question}</button>
                  ))}
                </div>
              )}
            </div>

            {/* ═══ العمود الجانبي: كتب جوجل + عارض PDF ═══ */}
            {(hasBooks || selectedPdf) && (
              <div className="search-results-sidebar">
                {/* عارض PDF */}
                {selectedPdf && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-header">
                      <h3>المخطوطة الأصلية</h3>
                      <button type="button" onClick={() => setSelectedPdf(null)} className="sidebar-close-btn">إغلاق</button>
                    </div>
                    <InteractivePdfViewer fileUrl={selectedPdf} searchQuery={text} />
                  </div>
                )}

                {/* كتب جوجل */}
                {hasBooks && (
                  <div className="sidebar-section sidebar-books">
                    <h3 className="sidebar-section-title">من مكتبة جوجل</h3>
                    <div className="books-list">
                      {googleBooks.slice(0, 5).map((book) => (
                        <div key={book.id} className="book-card">
                          <img src={book.thumbnail} alt={book.title} className="book-cover" loading="lazy" />
                          <div className="book-info">
                            <h4 className="book-title">{book.title}</h4>
                            <p className="book-author">{book.author}</p>
                            <p className="book-date">{book.date}</p>
                            <a href={book.link} target="_blank" rel="noopener noreferrer" className="book-link">معاينة الكتاب</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* الحالة الفارغة */}
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
