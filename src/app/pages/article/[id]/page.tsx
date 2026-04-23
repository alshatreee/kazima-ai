"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { stripHtml, formatDate, resolveContentType } from "@/lib/topic-helpers";

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

interface RelatedItem {
  topicId: number;
  title: string;
  author: string;
  contentShort: string;
  optionId: number;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/topics/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setTopic(data);
        return fetch(`/api/topics?optionId=${data.optionId}&limit=5`);
      })
      .then((res) => res.json())
      .then((data) => {
        const items = (data.items || []).filter(
          (item: RelatedItem) => item.topicId !== parseInt(String(params.id), 10)
        );
        setRelated(items.slice(0, 4));
      })
      .catch(() => setError("لم يتم العثور على المقالة"))
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
          <p>{error || "لم يتم العثور على المقالة"}</p>
          <Link href="/" className="kz-back-link">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const longText = stripHtml(topic.contentLong || "");
  const shortText = stripHtml(topic.contentShort || "");
  const bodyText = longText || shortText;
  const dateStr = formatDate(topic.publishedWhen);
  const category = resolveContentType(topic.optionId);
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
        <div className="kz-article-header-block">
          <span className="kz-meta-tag kz-meta-tag--gold">{category}</span>
          <h1 className="kz-page-title">{topic.title}</h1>
          <div className="kz-article-meta">
            {topic.author && (
              <Link href={`/pages/author/${encodeURIComponent(topic.author)}`} className="kz-article-author">
                {topic.author}
              </Link>
            )}
            {dateStr && <span className="kz-meta-separator">{dateStr}</span>}
            <span className="kz-meta-separator">{topic.views} مشاهدة</span>
          </div>
        </div>

        {topic.picture && (
          <div className="kz-article-image">
            <img src={topic.picture} alt={topic.title} />
          </div>
        )}

        {bodyText && (
          <article className="kz-detail-section">
            <div className="kz-reading-text">{bodyText}</div>
          </article>
        )}

        {tags.length > 0 && (
          <div className="kz-tags-row">
            {tags.map((tag) => (
              <span key={tag} className="kz-meta-tag">{tag}</span>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <section className="kz-detail-section">
            <h2 className="kz-section-title">مقالات ذات صلة</h2>
            <div className="kz-related-grid">
              {related.map((item) => (
                <Link
                  key={item.topicId}
                  href={`/pages/article/${item.topicId}`}
                  className="kz-related-card"
                >
                  <h3>{item.title}</h3>
                  {item.author && <span className="kz-related-author">{item.author}</span>}
                  <p>{stripHtml(item.contentShort || "").substring(0, 120)}...</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="search-footer"><p>منصة كاظمة البحثية &copy; 2025</p></footer>
    </div>
  );
}
