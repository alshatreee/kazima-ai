import { prisma } from "./prisma";
import type {
    RetrievalFilters,
    SourceContentType,
    SourceExcerpt,
} from "./kazima-assistant-contract";
import {
    retrieveFromExternalSources,
} from "./kazima-external-sources";

// —— Arabic text normalization (mirrors mukhtasar's normalize function) ————————
// mukhtasar pip package: https://github.com/alshatreee/mukhtasar
// Python preprocessing bridge: examples/kazima_integration.py in mukhtasar repo
const ARABIC_DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
const ARABIC_TATWEEL_RE = /\u0640+/g;
const ARABIC_ALEF_RE = /[إأآا]/g;
const ARABIC_TEH_MARBUTA_RE = /ة/g;
const ARABIC_YEH_RE = /[يى]/g;

/**
 * Normalize Arabic text before passing to keyword search or embedding.
 * Strips diacritics and unifies alef / teh-marbuta / yeh variants –
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
    return normalizeArabic(query)
      .replace(NON_WORD_RE, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2);
}

export interface RetrievalResult {
    sources: SourceExcerpt[];
    totalCandidates: number;
    externalSourcesUsed?: boolean;
}

interface ScoredChunk {
    chunkId: number;
    documentId: number;
    documentTitle: string;
    documentType: string;
    documentSlug: string;
    sectionTitle: string | null;
    pageNumber: number | null;
    cleanText: string;
    authorName: string | null;
    sourceUrl: string | null;
    verificationState: string;
    score: number;
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

  // 1. Local DB retrieval using new SourceDocument + SourceChunk models
  let localSources: SourceExcerpt[] = [];
    let totalCandidates = 0;

  if (prisma) {
      // Build where clause for documents
      const docWhereClause: Record<string, unknown> = {};

      if (filters?.contentTypes?.length) {
          docWhereClause.type = { in: filters.contentTypes };
      }
      if (filters?.verificationStates?.length) {
          docWhereClause.verificationState = { in: filters.verificationStates };
      }

      // Search in SourceChunk using cleanText (free of tags and noise)
      const chunkOrConditions = keywords.flatMap((keyword) => [
        { cleanText: { contains: keyword } },
        { sectionTitle: { contains: keyword } },
      ]);

      // Also search in document-level fields
      const docOrConditions = keywords.flatMap((keyword) => [
        { title: { contains: keyword } },
        { searchableText: { contains: keyword } },
        { summary: { contains: keyword } },
      ]);

      // Retrieve chunks with their parent documents
      const chunks = await prisma.sourceChunk.findMany({
          where: {
              OR: [
                  // Chunks whose cleanText or sectionTitle match
                  ...chunkOrConditions,
                  // Chunks belonging to documents whose title/searchableText match
                  {
                      document: {
                          AND: [
                              docWhereClause,
                              { OR: docOrConditions },
                          ],
                      },
                  },
              ],
          },
          take: maxSources * 6,
          include: {
              document: {
                  select: {
                      id: true,
                      title: true,
                      type: true,
                      slug: true,
                      authorName: true,
                      sourceUrl: true,
                      verificationState: true,
                      summary: true,
                  },
              },
          },
      });

      totalCandidates = chunks.length;

      // Score each chunk based on keyword presence in cleanText and document title
      const scored: ScoredChunk[] = chunks.map((chunk) => {
          let score = 0;
          const titleNorm = normalizeArabic(chunk.document.title.toLowerCase());
          const cleanTextNorm = normalizeArabic(chunk.cleanText.toLowerCase());
          const sectionNorm = chunk.sectionTitle
              ? normalizeArabic(chunk.sectionTitle.toLowerCase())
              : "";

          for (const keyword of keywords) {
              const kw = keyword.toLowerCase();
              if (titleNorm.includes(kw)) score += 3;
              if (sectionNorm.includes(kw)) score += 2;
              if (cleanTextNorm.includes(kw)) score += 1;
          }

          return {
              chunkId: chunk.id,
              documentId: chunk.document.id,
              documentTitle: chunk.document.title,
              documentType: chunk.document.type,
              documentSlug: chunk.document.slug,
              sectionTitle: chunk.sectionTitle,
              pageNumber: chunk.pageNumber,
              cleanText: chunk.cleanText,
              authorName: chunk.document.authorName,
              sourceUrl: chunk.document.sourceUrl,
              verificationState: chunk.document.verificationState,
              score,
          };
      });

      const topLocal = scored
          .filter((chunk) => chunk.score > 0)
          .sort((left, right) => right.score - left.score)
          .slice(0, maxSources);

      localSources = topLocal.map((chunk) => {
          // Use cleanText for the excerpt (free of retrieval tags and noise)
          const cleanExcerpt = stripHtml(chunk.cleanText);
          const excerpt =
              cleanExcerpt.length > 280
                  ? cleanExcerpt.substring(0, 280) + "..."
                  : cleanExcerpt;

          const url = chunk.sourceUrl
              ? chunk.sourceUrl
              : `https://www.kazima.org/pages/topics/${chunk.documentSlug}`;

          return {
              sourceId: "doc-" + chunk.documentId,
              chunkId: "chunk-" + chunk.chunkId,
              title: chunk.documentTitle,
              type: chunk.documentType as SourceContentType,
              excerpt,
              url,
              score: Math.min(chunk.score / 10, 1.0),
              sectionTitle: chunk.sectionTitle ?? undefined,
              pageNumber: chunk.pageNumber ?? undefined,
              metadata: {
                  authorName: chunk.authorName ?? undefined,
                  verificationState: chunk.verificationState,
              },
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
