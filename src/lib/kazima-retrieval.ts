 
import { prisma } from "./prisma";
import type {
    RetrievalFilters,
    SourceContentType,
    SourceExcerpt,
} from "./kazima-assistant-contract";
import {
    retrieveFromExternalSources,
} from "./kazima-external-sources";
import {
    isMostlyLatin,
    translateLatinQuery,
} from "./kazima-name-dictionary";

// ── Arabic text normalization (mirrors mukhtasar's normalize function) ────────
// mukhtasar pip package: https://github.com/alshatreee/mukhtasar
// Python preprocessing bridge: examples/kazima_integration.py in mukhtasar repo
const ARABIC_DIACRITICS_RE = /[\u064B-\u0652\u0670\u06D6-\u06ED]/g;
const ARABIC_TATWEEL_RE = /ـ+/g;
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


// ── Honorific stop-prefixes ──────────────────────────────────────────────
// Honorific titles ("الشيخ", "الإمام", "الدكتور", ...) are extremely common
// across the Kazima corpus, so when a user asks "من هو الشيخ يوسف بن عيسى
// القناعي؟" the bare token "الشيخ" dominates BM25-style scoring and pulls
// in unrelated sources (e.g. fatwa interviews about بدعة that mention
// "الشيخ X"). We strip these tokens from the keyword set entirely — both
// in their `ال`-prefixed and bare forms, post-Arabic-normalization.
//
// If you add a new honorific, ensure the form here is the post-
// `normalizeArabic` form (alef variants → ا, ة → ه, no diacritics).
const HONORIFIC_PREFIXES_NORMALIZED = new Set<string>([
  "الشيخ", "شيخ",
  "العلامه", "علامه",
  "الامام", "امام",
  "الدكتور", "دكتور",
  "الاستاذ", "استاذ",
  "السيد", "سيد",
  "الحاج", "حاج",
  "السلطان", "سلطان",
  "الامير", "امير",
  "الملك", "ملك",
  "الفقيه", "فقيه",
  "الحافظ", "حافظ",
  "المهندس", "مهندس",
  "الاديب", "اديب",
  "العالم", "عالم",
  "الشهيد", "شهيد",
]);

function isHonorific(normalizedToken: string): boolean {
  return HONORIFIC_PREFIXES_NORMALIZED.has(normalizedToken);
}

function splitKeywords(query: string): string[] {
  // Normalize Arabic before splitting — same as mukhtasar.normalize()
  const tokens = normalizeArabic(query)
    .replace(NON_WORD_RE, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    // Drop honorific titles ("الشيخ", "الدكتور", ...) so they don't
    // dominate scoring and pollute results with unrelated authors.
    .filter((word) => !isHonorific(word));

  // Keep BOTH the original token and the ال-stripped form so we
  // recall titles whether the corpus stores "المدرسة" or "مدرسة".
  // Honorific check applied to both forms so e.g. "الشيخ" → "شيخ" is
  // also discarded.
  const expanded = new Set<string>();
  for (const t of tokens) {
    expanded.add(t);
    if (t.startsWith("ال") && t.length > 3) {
      const stripped = t.slice(2);
      if (!isHonorific(stripped)) expanded.add(stripped);
    }
  }
  return Array.from(expanded);
}

/**
 * Build the list of search keywords for a query.
 *
 * If the query is mostly Latin, look up known Arabic↔English name
 * mappings (Yusuf bin Issa Al-Qenaei → القناعي / يوسف بن عيسى القناعي,
 * etc.) and search using the canonical Arabic forms. Falls back to the
 * Latin tokens themselves so external English-language sources still
 * match.
 */
function buildKeywords(query: string): { keywords: string[]; usedTranslation: boolean } {
    const baseKeywords = splitKeywords(query);

  if (!isMostlyLatin(query)) {
    return { keywords: baseKeywords, usedTranslation: false };
  }

  const { arabicTerms } = translateLatinQuery(query);
  if (arabicTerms.length === 0) {
    return { keywords: baseKeywords, usedTranslation: false };
  }

  // Translate Arabic forms into searchable keywords (split + normalize).
  const translated: string[] = [];
  for (const term of arabicTerms) {
    for (const k of splitKeywords(term)) translated.push(k);
  }

  // Combine: translated Arabic first (preferred), original Latin second.
  const merged = new Set<string>([...translated, ...baseKeywords]);
  return { keywords: Array.from(merged), usedTranslation: true };
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
    optionId: number | null;
    attributeId: number | null;
    score: number;
}

export interface RetrievalResult {
    sources: SourceExcerpt[];
    totalCandidates: number;
    externalSourcesUsed?: boolean;
    translatedFromLatin?: boolean;
}

/**
 * Deduplicate retrieved sources.
 *
 * Two layers:
 *   (1) Same canonical URL → keep highest-scoring entry.
 *   (2) Highly similar excerpts (same article surfaced as multiple
 *       chunks) → keep one per excerpt fingerprint.
 */
function dedupSources(sources: SourceExcerpt[]): SourceExcerpt[] {
  const byUrl = new Map<string, SourceExcerpt>();
  for (const s of sources) {
    const canon = canonicalUrl(s.url);
    // Generic fallback URLs (no id) must not collapse different topics —
    // fall back to the unique sourceId as the dedup key in that case.
    const isGenericFallback =
      !canon || canon.endsWith("/pages/articles.php") || canon.endsWith("/articles.php");
    const key = isGenericFallback ? s.sourceId : canon;
    const prev = byUrl.get(key);
    if (!prev || s.score > prev.score) byUrl.set(key, s);
  }
  const urlDeduped = Array.from(byUrl.values());

  const byFingerprint = new Map<string, SourceExcerpt>();
  for (const s of urlDeduped) {
    const fp = fingerprint(s.title, s.excerpt);
    const prev = byFingerprint.get(fp);
    if (!prev || s.score > prev.score) byFingerprint.set(fp, s);
  }
  return Array.from(byFingerprint.values());
}

function canonicalUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url, "https://www.kazima.org");
    // Strip fragments and tracking params; keep host + pathname + sorted core query.
    const params = new URLSearchParams(u.search);
    const keep = ["id", "topic", "topicId", "page"];
    const sortedParams = keep
      .filter((k) => params.has(k))
      .map((k) => `${k}=${params.get(k)}`)
      .join("&");
    return `${u.hostname}${u.pathname}${sortedParams ? "?" + sortedParams : ""}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function fingerprint(title: string, excerpt: string): string {
  // Use a longer excerpt window so we only collapse genuine duplicates,
  // not different topics that share the same title prefix.
  const normTitle = normalizeArabic(title).toLowerCase().replace(/\s+/g, " ").trim();
  const normExcerpt = normalizeArabic(excerpt)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return normTitle + "::" + normExcerpt;
}

export async function retrieveFromTopics(
    query: string,
    maxSources: number,
    filters?: RetrievalFilters,
  ): Promise<RetrievalResult> {
    const { keywords, usedTranslation } = buildKeywords(query);
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
                    return filters.contentTypes.includes(resolveContentType(topic.optionId ?? 0));
          })
          .sort((left, right) => right.score - left.score)
          .slice(0, maxSources * 2);

      localSources = topLocal.map((topic) => {
              const shortPlain = stripHtml(topic.contentShort || "");
              const excerpt =
                        shortPlain.length > 280
                  ? shortPlain.substring(0, 280) + "..."
                          : shortPlain;

                                        return {
                                                  sourceId: "topic-" + topic.topicId,
                                                  title: topic.title,
                                                  type: resolveContentType(topic.optionId ?? 0),
                                                  excerpt,
                                                  url: (() => { const n = normalizeTopicUrl(topic.link); if (!n) return "https://www.kazima.org/pages/articles.php"; if (n.startsWith("http")) return n; if (n.includes("/pages/topics/")) return "https://www.kazima.org" + n; const slug = n.startsWith("/") ? n.slice(1) : n; return "https://www.kazima.org/pages/topics/" + slug + (slug.endsWith(".php") ? "" : ".php"); })(),
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

  // 4. Dedup (URL canonicalization + excerpt fingerprint)
  const deduped = dedupSources(merged);
  const finalSources = deduped.slice(0, maxSources);

  return {
        sources: finalSources,
        totalCandidates: totalCandidates + externalSources.length,
        externalSourcesUsed: externalUsed,
        translatedFromLatin: usedTranslation,
  };
}

