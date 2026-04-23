"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { stripHtml, formatDate } from "@/lib/topic-helpers";

interface Topic {
  topicId: number;
  title: string;
  author: string;
  picture: string;
  contentShort: string;
  contentLong: string;
  optionId: number;
  attributeId: number;
  publishedWhen: number;
  keywords: string;
  link: string;
  views: number;
  shortDescription: string;
  description: string;
}

const STATUS_MAP: Record<number, string> = {
  1: "مطبوع",
  2: "مخطوط",
  3: "محقق",
};

export default function BookDetailPage() {
  const params = useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/topics/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(setTopic)
      .catch(() => setError("لم يتم العثور على الكتاب"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="kz-detail-page" dir="rtl">
        <div className="kz-detail-loading">
          <div className="search-loading-dot" />
          <div className="search-loading-dot" />
          <div className="search-loading-dot" />
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="kz-detail-page" dir="rtl">
        <div className="kz-detail-error">
          <p>{error || "لم يتم العثور على الكتاب"}</p>
          <Link href="/" className="kz-back-link">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const shortText = stripHtml(topic.contentShort || "");
  const longText = stripHtml(topic.contentLong || "");
  const description = shortText || stripHtml(topic.shortDescription || topic.description || "");
  const dateStr = formatDate(topic.publishedWhen);
  const tags = topic.keywords ? topic.keywords.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="kz-detail-page" dir="rtl">
      <header className="kz-detail-header">
        <Link href="/" className="kz-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          الرئيسية
        </Link>
      </header>

      <main className="kz-detail-content">
        <div className="kz-book-hero">
          <div className="kz-book-cover">
            {topic.picture ? (
              <img src={topic.picture} alt={topic.title} />
            ) : (
              <div className="kz-book-cover-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
              </div>
            )}
          </div>

          <div className="kz-book-info">
            <h1 className="kz-page-title">{topic.title}</h1>

            {topic.author && (
              <Link href={`/pages/author/${encodeURIComponent(topic.author)}`} className="kz-book-author">
                {topic.author}
              </Link>
            )}

            <div className="kz-meta-tags">
              {dateStr && <span className="kz-meta-tag">{dateStr}</span>}
              <span className="kz-meta-tag">{STATUS_MAP[topic.attributeId] || "كتب ومخطوطات"}</span>
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="kz-meta-tag kz-meta-tag--gold">{tag}</span>
              ))}
            </div>

            <div className="kz-book-actions">
              <button
                type="button"
                className="kz-btn kz-btn--save"
                onClick={() => setSaved(!saved)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                {saved ? "تم الحفظ" : "حفظ في المفضلة"}
              </button>
            </div>
          </div>
        </div>

        {description && (
          <section className="kz-detail-section">
            <h2 className="kz-section-title">الوصف</h2>
            <p className="kz-detail-text">{description}</p>
          </section>
        )}

        {longText && longText !== shortText && (
          <section className="kz-detail-section">
            <h2 className="kz-section-title">المحتوى</h2>
            <div className="kz-detail-text kz-reading-text">{longText}</div>
          </section>
        )}

        <section className="kz-detail-section">
          <h2 className="kz-section-title">معلومات الكتاب</h2>
          <dl className="kz-info-grid">
            {topic.author && <><dt>المؤلف</dt><dd>{topic.author}</dd></>}
            {dateStr && <><dt>تاريخ النشر</dt><dd>{dateStr}</dd></>}
            <dt>المشاهدات</dt><dd>{topic.views}</dd>
            <dt>المعرّف</dt><dd>{topic.topicId}</dd>
          </dl>
        </section>
      </main>

      <footer className="search-footer"><p>منصة كاظمة البحثية &copy; 2025</p></footer>
    </div>
  );
}
