import { prisma } from "./prisma";
import type {
  RetrievalFilters,
  SourceContentType,
  SourceExcerpt,
} from "./kazima-assistant-contract";

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
  return query
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

  return `/${normalized}`;
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

  const topResults = scored
    .filter((topic) => topic.score > 0)
    .filter((topic) => {
      if (!filters?.contentTypes?.length) return true;
      return filters.contentTypes.includes(resolveContentType(topic.optionId));
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, maxSources);

  const sources: SourceExcerpt[] = topResults.map((topic) => {
    const shortPlain = stripHtml(topic.contentShort || "");
    const excerpt = shortPlain.length > 280
      ? `${shortPlain.substring(0, 280)}...`
      : shortPlain;

    return {
      sourceId: `topic-${topic.topicId}`,
      title: topic.title,
      type: resolveContentType(topic.optionId),
      excerpt,
      url: `/pages/topics/index.php?topic_id=${topic.topicId}`,
      score: topic.score,
    };
  });

  return { sources, totalCandidates: topics.length };
}
