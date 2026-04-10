export const assistantResponseModes = [
  "retrieve",
  "brief",
  "research",
] as const;

export type AssistantResponseMode =
  (typeof assistantResponseModes)[number];

export const assistantScopes = [
  "kazima_primary",
  "kazima_primary_plus_context",
  "general_knowledge",
  "needs_verification",
] as const;

export type AssistantScope = (typeof assistantScopes)[number];

export const confidenceLevels = ["high", "medium", "low"] as const;

export type ConfidenceLevel = (typeof confidenceLevels)[number];

export const sourceContentTypes = [
  "article",
  "biography",
  "manuscript",
  "page",
  "institution",
  "timeline",
  "topic",
] as const;

export type SourceContentType = (typeof sourceContentTypes)[number];

export interface PageContext {
  pageId?: number;
  pageTitle?: string;
  pageType?: string;
  suggestedQuestions?: string[];
}

export interface RetrievalFilters {
  optionIds?: number[];
  attributeIds?: number[];
  pageIds?: number[];
  contentTypes?: SourceContentType[];
  verificationStates?: string[];
}

export interface AssistantQueryRequest {
  query: string;
  mode?: AssistantResponseMode;
  userIntent?: string;
  maxSources?: number;
  includeReadMore?: boolean;
  pageContext?: PageContext;
  filters?: RetrievalFilters;
}

export interface SourceExcerpt {
  sourceId: string;
  chunkId?: string;
  title: string;
  type: SourceContentType;
  excerpt: string;
  url?: string;
  score: number;
  sectionTitle?: string;
  pageNumber?: number;
  reasoning?: string;
  metadata?: {
    authorName?: string;
    publishedAt?: string;
    verificationState?: string;
    tags?: string[];
  };
}

export interface AnswerSection {
  title: string;
  body: string;
}

export interface CitationItem {
  id: string;
  label: string;
  sourceId: string;
  excerpt: string;
  url?: string;
  confidence: ConfidenceLevel;
  note?: string;
}

export interface ReadMoreItem {
  title: string;
  url: string;
  type?: SourceContentType;
}

export interface RetrievalSummary {
  totalCandidates?: number;
  returnedSources: number;
  sources: SourceExcerpt[];
  externalSourcesUsed?: boolean;
}

export interface AssistantQueryResponse {
  query: string;
  normalizedQuery?: string;
  mode: AssistantResponseMode;
  scope: AssistantScope;
  confidence: ConfidenceLevel;
  answer: string;
  summary: string;
  sections: AnswerSection[];
  citations: CitationItem[];
  readMore: ReadMoreItem[];
  followUpQuestions: string[];
  disclaimers?: string[];
  retrieval: RetrievalSummary;
  createdAt?: string;
}

export const DEFAULT_MAX_SOURCES = 5;
export const MIN_REQUIRED_CITATIONS = 1;

export function normalizeAssistantMode(
  value?: string,
): AssistantResponseMode {
  if (value === "retrieve") return "retrieve";
  return value === "research" ? "research" : "brief";
}

export function isAssistantAiMode(
  mode: AssistantResponseMode,
): mode is "brief" | "research" {
  return mode === "brief" || mode === "research";
}

export function clampMaxSources(value?: number): number {
  if (!value || Number.isNaN(value)) return DEFAULT_MAX_SOURCES;
  return Math.max(1, Math.min(10, Math.trunc(value)));
}

export interface AssistantQueryValidationError {
  field: string;
  message: string;
}

export function validateAssistantQuery(
  body: unknown,
): { ok: true; data: AssistantQueryRequest } | { ok: false; errors: AssistantQueryValidationError[] } {
  const errors: AssistantQueryValidationError[] = [];

  if (!body || typeof body !== "object") {
    return { ok: false, errors: [{ field: "body", message: "الطلب يجب أن يكون كائن JSON صالح" }] };
  }

  const obj = body as Record<string, unknown>;

  if (!obj.query || typeof obj.query !== "string" || obj.query.trim().length === 0) {
    errors.push({ field: "query", message: "حقل query مطلوب ولا يمكن أن يكون فارغًا" });
  }

  if (obj.mode !== undefined && typeof obj.mode === "string") {
    if (!assistantResponseModes.includes(obj.mode as AssistantResponseMode)) {
      errors.push({ field: "mode", message: `الوضع غير صالح: ${obj.mode}. القيم المقبولة: ${assistantResponseModes.join(", ")}` });
    }
  }

  if (obj.maxSources !== undefined) {
    if (typeof obj.maxSources !== "number" || Number.isNaN(obj.maxSources)) {
      errors.push({ field: "maxSources", message: "maxSources يجب أن يكون رقمًا" });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      query: (obj.query as string).trim(),
      mode: obj.mode as AssistantResponseMode | undefined,
      userIntent: obj.userIntent as string | undefined,
      maxSources: obj.maxSources as number | undefined,
      includeReadMore: obj.includeReadMore as boolean | undefined,
      pageContext: obj.pageContext as PageContext | undefined,
      filters: obj.filters as RetrievalFilters | undefined,
    },
  };
}

export function createEmptyAssistantResponse(
  query: string,
  mode: AssistantResponseMode = "brief",
): AssistantQueryResponse {
  return {
    query,
    mode,
    scope: "needs_verification",
    confidence: "low",
    answer: "",
    summary: "",
    sections: [],
    citations: [],
    readMore: [],
    followUpQuestions: [],
    retrieval: {
      returnedSources: 0,
      sources: [],
    },
  };
  }
