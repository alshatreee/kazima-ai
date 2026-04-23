"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { stripHtml, resolveContentRoute } from "@/lib/topic-helpers";

interface TopicItem {
  topicId: number;
  title: string;
  author: string;
  picture: string;
  contentShort: string;
  contentLong?: string;
  optionId: number;
  attributeId: number;
  publishedWhen: number;
  link: string;
  views: number;
}

export default function AuthorDetailPage() {
  const params = useParams();
  const [authorName, setAuthorName] = useState("");
  const [books, setBooks] = useState<TopicItem[]>([]);
  const [articles, setArticles] = useState<TopicItem[]>([]);
  const [bio, setBio] = useState<TopicItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params.id) return;

    const idStr = decodeURIComponent(String(params.id));
    const isNumericId = /^\d+$/.test(idStr);

    if (isNumericId) {
      fetch(`/api/topics/${idStr}`)
        .then((res) => {
          if (!res.ok) throw new Error("not found");
          return res.json();
        })
        .then((topic) => {
          setAuthorName(topic.author || topic.title);
          if (topic.optionId === 3) setBio(topic);
          return fetch(`/api/topics?author=${encodeURIComponent(topic.author || topic.title)}&limit=50`);
        })
        .then((res) => res.json())
        .then((data) => {
          const items: TopicItem[] = data.items || [];
          setBooks(items.filter((t) => t.optionId === 2));
          setArticles(items.filter((t) => t.optionId === 1));
        })
        .catch(() => setError("لم يتم العثور على المؤلف"))
        .finally(() => setLoading(false));
    } else {
      setAuthorName(idStr);
      fetch(`/api/topics?author=${encodeURIComponent(idStr)}&limit=50`)
        .then((res) => res.json())
        .then((data) => {
          const items: TopicItem[] = data.items || [];
          setBooks(items.filter((t) => t.optionId === 2));
          setArticles(items.filter((t) => t.optionId === 1));
          const biographyItem = items.find((t) => t.optionId === 3);
          if (biographyItem) {
            return fetch(`/api/topics/${biographyItem.topicId}`)
              .then((res) => res.json())
              .then(setBio);
          }
        })
        .catch(() => setError("لم يتم العثور على المؤلف"))
        .finally(() => setLoading(false));
    }
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

  if (error) {
    return (
      <div className="kz-detail-page" dir="rtl">
        <div className="kz-detail-error">
          <p>{error}</p>
          <Link href="/" className="kz-back-link">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const bioText = bio ? stripHtml(bio.contentLong || bio.contentShort || "") : "";

  return (
    <div className="kz-detail-page" dir="rtl">
      <header className="kz-detail-header">
        <Link href="/" className="kz-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          الرئيسية
        </Link>
      </header>

      <main className="kz-detail-content">
        <div className="kz-author-hero">
          <div className="kz-author-avatar">
            {bio?.picture ? (
              <img src={bio.picture} alt={authorName} />
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            )}
          </div>
          <h1 className="kz-page-title">{authorName}</h1>
          <div className="kz-author-stats">
            {books.length > 0 && <span className="kz-meta-tag">{books.length} كتاب</span>}
            {articles.length > 0 && <span className="kz-meta-tag">{articles.length} مقالة</span>}
          </div>
        </div>

        {bioText && (
          <section className="kz-detail-section">
            <h2 className="kz-section-title">نبذة عن المؤلف</h2>
            <p className="kz-reading-text">{bioText}</p>
          </section>
        )}

        {books.length > 0 && (
          <section className="kz-detail-section">
            <h2 className="kz-section-title">كتبه في المكتبة</h2>
            <div className="kz-books-grid">
              {books.map((book) => (
                <Link key={book.topicId} href={`/pages/book/${book.topicId}`} className="kz-book-card">
                  <div className="kz-book-card-cover">
                    {book.picture ? (
                      <img src={book.picture} alt={book.title} />
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                    )}
                  </div>
                  <h3>{book.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}

        {articles.length > 0 && (
          <section className="kz-detail-section">
            <h2 className="kz-section-title">مقالاته</h2>
            <div className="kz-related-grid">
              {articles.map((item) => (
                <Link key={item.topicId} href={`/pages/${resolveContentRoute(item.optionId)}/${item.topicId}`} className="kz-related-card">
                  <h3>{item.title}</h3>
                  <p>{stripHtml(item.contentShort || "").substring(0, 120)}...</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {books.length === 0 && articles.length === 0 && !bioText && (
          <div className="kz-detail-error">
            <p>لا يوجد محتوى مرتبط بهذا المؤلف حالياً</p>
          </div>
        )}
      </main>

      <footer className="search-footer"><p>منصة كاظمة البحثية &copy; 2025</p></footer>
    </div>
  );
}
