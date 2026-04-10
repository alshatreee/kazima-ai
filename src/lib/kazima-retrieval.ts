import { prisma } from "./prisma";
import type {
    RetrievalFilters,
    SourceContentType,
    SourceExcerpt,
} from "./kazima-assistant-contract";
import {
    retrieveFromExternalSources,
} from "./kazima-external-sources";

// ── Arabic text normalization (mirrors mukhtasar's normalize function) ────────
// mukhtasar pip package: https://github.com/alshatreee/mukhtasar
// Python preprocessing bridge: examples/kazima_integration.py in mukhtasar repo
const ARABIC_DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
const ARABIC_TATWEEL_RE = /\u0640+/g;
const ARABIC_ALEF_RE = /[إأآا]/g;
const ARABIC_TEH_MARBUTA_RE = /ة/g;
const ARABIC_YEH_RE = /[ىي]/g;

/**
 * Normalize Arabic text before passing to keyword search or embedding.
 * Strips diacritics and unifies alef / teh-marbuta / yeh variants —
 * mirrors mukhtasar.normalize() from the mukhtasar Python library.
 */
function normalizeArabic(text: string): string {
    return text
      .replace(ARABIC_DIACRITICS_RE, "")
      .replace(ARABIC_TATWEEL_RE, "")
      .replace(ARABIC_ALEF_RE, "ا")
      .replace(ARABIC_TEH_MARBUTA_RE, "ه")
      .replace(ARABIC_YEH_RE, "ي");
}

const HTML_TAG_RE = /<[^>]*>/g;
const NBSP_RE = /&nbsp;/g;
const MULTI_SPACE_RE = /\s{2,}/g;
const NON_WORD_RE = /[^\p{L}\p{N}]+/gu;

function stripHtml(html: string): string {
    return html
      .replace(HTML_TAG_RE, "")
      .replace(NBSP_RE, " ")
      .replace(MULTI_SPACE_RE, " ")
      .trim();
}

function splitKeywords(query: string): string[] {
    // Normalize Arabic before splitting — same as mukhtasar.normalize()
  return normalizeArabic(query)
      .replace(NON_WORD_RE, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2);
}

function resolveContentType(optionId: number): SourceContentType {
    switch (optionId) {
      case 2:
              return "manuscript";
      case 3:
              return "biography";
      default:
              return "article";
    }
}

function normalizeTopicUrl(link: string): string | undefined {
    const normalized = link.trim();
    if (!normalized) return undefined;
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
          return normalized;
    }
    if (normalized.startsWith("/")) {
          return normalized;
    }
    return "/" + normalized;
}

interface ScoredTopic {
    topicId: number;
    title: string;
    contentShort: string;
    contentLong: string;
    link: string;
    optionId: number;
    attributeId: number;
    score: number;
}

export interface RetrievalResult {
    sources: SourceExcerpt[];
    totalCandidates: number;
    externalSourcesUsed?: boolean;
}

export async function retrieveFromTopics(
    query: string,
    maxSources: number,
    filters?: RetrievalFilters,
  ): Promise<RetrievalResult> {
    const keywords = splitKeywords(query);
    if (keywords.length === 0) {
          return { sources: [], totalCandidates: 0 };
    }

  // 1. Local DB retrieval
  let localSources: SourceExcerpt[] = [];
    let totalCandidates = 0;

  if (prisma) {
        const whereClause: Record<string, unknown> = { active: 4 };

      if (filters?.optionIds?.length) {
              whereClause.optionId = { in: filters.optionIds };
      }
        if (filters?.attributeIds?.length) {
                whereClause.attributeId = { in: filters.attributeIds };
        }
        if (filters?.pageIds?.length) {
                whereClause.pageId = { in: filters.pageIds };
        }

      const orConditions = keywords.flatMap((keyword) => [
        { title: { contains: keyword } },
        { contentShort: { contains: keyword } },
        { contentLong: { contains: keyword } },
            ]);

      const topics = await prisma.topic.findMany({
              where: {
                        ...whereClause,
                        OR: orConditions,
              },
              take: maxSources * 4,
              select: {
                        topicId: true,
                        title: true,
                        contentShort: true,
                        contentLong: true,
                        link: true,
                        optionId: true,
                        attributeId: true,
              },
      });

      totalCandidates = topics.length;

      const scored: ScoredTopic[] = topics.map((topic) => {
              let score = 0;
              const titleLower = topic.title.toLowerCase();
              const shortPlain = stripHtml(topic.contentShort || "");
              const longPlain = stripHtml(topic.contentLong || "");

                                                     for (const keyword of keywords) {
                                                               const normalizedKeyword = keyword.toLowerCase();
                                                               if (titleLower.includes(normalizedKeyword)) score += 3;
                                                               if (shortPlain.includes(keyword)) score += 2;
                                                               if (longPlain.includes(keyword)) score += 1;
                                                     }

                                                     return { ...topic, score };
      });

      const topLocal = scored
          .filter((topic) => topic.score > 0)
          .filter((topic) => {
                    if (!filters?.contentTypes?.length) return true;
                    return filters.contentTypes.includes(resolveContentType(topic.optionId));
          })
          .sort((left, right) => right.score - left.score)
          .slice(0, maxSources);

      localSources = topLocal.map((topic) => {
              const shortPlain = stripHtml(topic.contentShort || "");
              const excerpt =
                        shortPlain.length > 280
                  ? shortPlain.substring(0, 280) + "..."
                          : shortPlain;

                                        return {
                                                  sourceId: "topic-" + topic.topicId,
                                                  title: topic.title,
                                                  type: resolveContentType(topic.optionId),
                                                  excerpt,
                                                  url:
                                                              "https://kazima.org/pages/topics/index.php?topic_id=" +
                                                              topic.topicId,
                                                  score: Math.min(topic.score / 10, 1.0),
                                        };
      });
  }

  // 2. External sources retrieval (Kuwaiti repositories)
  let externalSources: SourceExcerpt[] = [];
    let externalUsed = false;

  try {
        const externalMaxPerSource = Math.max(2, Math.floor(maxSources / 3));
        const rawExternal = await retrieveFromExternalSources(query, {
                maxPerSource: externalMaxPerSource,
                maxTotal: maxSources,
        });

      externalSources = rawExternal.map((ext) => ({
              sourceId:
                        "ext-" +
                        ext.sourceDomain +
                        "-" +
                        encodeURIComponent(ext.url).slice(-20),
              title: ext.title || ext.sourceName,
              type: "article" as SourceContentType,
              excerpt:
                        ext.content.length > 280
                  ? ext.content.substring(0, 280) + "..."
                          : ext.content,
              url: ext.url,
              score: ext.relevanceScore,
              ...(ext.sourceName ? { sourceLabel: ext.sourceName } : {}),
      }));

      externalUsed = externalSources.length > 0;
  } catch (err) {
        console.warn("[retrieval] External sources failed:", err);
  }

  // 3. Merge & rank
  const boostedLocal = localSources.map((s) => ({
        ...s,
        score: s.score * 1.2,
  }));

  const merged = [...boostedLocal, ...externalSources];
    merged.sort((a, b) => b.score - a.score);

  const finalSources = merged.slice(0, maxSources);

  return {
        sources: finalSources,
        totalCandidates: totalCandidates + externalSources.length,
        externalSourcesUsed: externalUsed,
  };
}
