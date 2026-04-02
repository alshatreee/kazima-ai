export type AssistantMode = "brief" | "research";

export type AssistantScope =
  | "kazima_primary"
  | "kazima_primary_plus_context"
  | "general_knowledge"
  | "needs_verification";

export type ConfidenceLevel = "high" | "medium" | "low";

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
  type?: string;
}

export interface SourceExcerpt {
  sourceId: string;
  title: string;
  type: string;
  excerpt: string;
  url?: string;
  score: number;
}

export interface RetrievalSummary {
  totalCandidates?: number;
  returnedSources: number;
  sources: SourceExcerpt[];
}

export interface AssistantResponse {
  query: string;
  normalizedQuery?: string;
  mode: AssistantMode;
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
