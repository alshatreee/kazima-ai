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
  contentExtra: string;
  optionId: number;
  publishedWhen: number;
  keywords: string;
  link: string;
  views: number;
}

interface RelatedItem {
  topicId: number;
  title: string;
  contentShort: string;
  optionId: number;
}

function extractVideoUrl(content: string): string | null {
  const youtubeMatch = content.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  const vimeoMatch = content.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}

export default function VideoDetailPage() {
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
      .catch(() => setError("لم يتم العثور على الفيديو"))
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
          <p>{error || "لم يتم العثور على الفيديو"}</p>
          <Link href="/" className="kz-back-link">العودة للرئيسية</Link>
        </div>
      </div>
    );
  }

  const allContent = [topic.contentLong, topic.contentShort, topic.contentExtra, topic.link].join(" ");
  const videoUrl = extractVideoUrl(allContent);
  const descText = stripHtml(topic.contentShort || topic.contentLong || "");
  const dateStr = formatDate(topic.publishedWhen);

  return (
    <div className="kz-detail-page" dir="rtl">
      <header className="kz-detail-header">
        <Link href="/" className="kz-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          الرئيسية
        </Link>
      </header>

      <main className="kz-detail-content">
        {videoUrl ? (
          <div className="kz-video-player">
            <iframe
              src={videoUrl}
              title={topic.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="kz-video-placeholder">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <p>لا يتوفر مشغّل فيديو</p>
          </div>
        )}

        <div className="kz-article-header-block">
          <h1 className="kz-page-title">{topic.title}</h1>
          <div className="kz-article-meta">
            {topic.author && <span>{topic.author}</span>}
            {dateStr && <span className="kz-meta-separator">{dateStr}</span>}
            <span className="kz-meta-separator">{topic.views} مشاهدة</span>
          </div>
        </div>

        {descText && (
          <section className="kz-detail-section">
            <div className="kz-reading-text">{descText}</div>
          </section>
        )}

        {related.length > 0 && (
          <section className="kz-detail-section">
            <h2 className="kz-section-title">مقاطع ذات صلة</h2>
            <div className="kz-related-grid">
              {related.map((item) => (
                <Link key={item.topicId} href={`/pages/video/${item.topicId}`} className="kz-related-card">
                  <h3>{item.title}</h3>
                  <p>{stripHtml(item.contentShort || "").substring(0, 100)}...</p>
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
