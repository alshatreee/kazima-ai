/**
 * Phase 2A — LLM synthesis layer.
 *
 * Takes a query + ranked snippets and asks Claude to produce a coherent
 * Arabic answer that cites sources by number, e.g. "...كما ذكر القناعي (1)(3)".
 *
 * The function deliberately exposes a thin, replaceable contract so the
 * scope guard / retrieval pipeline above it stays decoupled from any
 * particular model or prompt. To swap models, change `DEFAULT_MODEL`
 * below or pass `{ model }` in the options bag.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SourceExcerpt } from "./kazima-assistant-contract";

// ── Model selection ─────────────────────────────────────────────────────────
// Haiku is the cost-efficient default. Swap to claude-sonnet-4-6 for
// higher-quality long-form synthesis; expect ~5x cost.
export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
export const HIGH_QUALITY_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT =
  "أنت مساعد بحثي متخصص في التراث الكويتي. اقرأ المقاطع التالية وأجب على سؤال المستخدم بدقة بالعربية الفصحى. اذكر رقم المصدر بين قوسين هكذا (1)(2). إذا لم تكفِ المقاطع للإجابة، قل ذلك صراحة.";

// Anthropic per-1M-tokens pricing (USD) — used for cost telemetry only.
// Update if pricing changes.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
};

export interface SynthesisOptions {
  /** Override default Haiku model. */
  model?: string;
  /** Cap on top snippets passed to the model (default 6). */
  topK?: number;
  /** Max output tokens (default 800). */
  maxTokens?: number;
  /** Sampling temperature (default 0.3 — favours faithful synthesis). */
  temperature?: number;
}

export interface SynthesisUsage {
  inputTokens: number;
  outputTokens: number;
  /** Estimated USD cost of this single call. */
  costUsd: number;
  model: string;
}

export interface SynthesisResult {
  answer: string;
  /** 1-based source indices the model cited in the answer body. */
  citations: number[];
  usage: SynthesisUsage;
  /** True if the model declared the corpus insufficient. */
  insufficient: boolean;
}

/**
 * Build the numbered snippet block that goes into the user prompt.
 * Trims each snippet to a sane length so we don't blow the context window.
 */
function formatSnippets(snippets: SourceExcerpt[]): string {
  const SNIPPET_CAP = 600;
  return snippets
    .map((s, i) => {
      const body = (s.excerpt || "").trim();
      const trimmed =
        body.length > SNIPPET_CAP ? body.slice(0, SNIPPET_CAP) + "…" : body;
      const titleLine = s.title ? `العنوان: ${s.title}` : "";
      return `[${i + 1}] ${titleLine}\n${trimmed}`;
    })
    .join("\n\n");
}

function buildUserPrompt(query: string, snippets: SourceExcerpt[]): string {
  const block = formatSnippets(snippets);
  return [
    `سؤال المستخدم: ${query}`,
    "",
    "المقاطع المسترجعة من أرشيف كاظمة:",
    block,
    "",
    "اكتب إجابة موجزة ومتماسكة بالعربية الفصحى، مع الاستشهاد بأرقام المصادر بين قوسين هكذا (1)(2). لا تختلق معلومات غير موجودة في المقاطع. إن لم تكفِ المقاطع للإجابة، اذكر ذلك بوضوح.",
  ].join("\n");
}

const CITATION_REGEX = /\((\d{1,2})\)/g;
const INSUFFICIENT_PHRASES = [
  "لم أجد",
  "لا تتوفر",
  "لا توجد معلومات",
  "لا تكفي المقاطع",
  "لم تكفِ",
  "لم تكف",
  "لا أملك",
];

function parseCitations(text: string): number[] {
  const seen = new Set<number>();
  for (const m of text.matchAll(CITATION_REGEX)) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n > 0) seen.add(n);
  }
  return Array.from(seen).sort((a, b) => a - b);
}

function detectInsufficient(text: string): boolean {
  return INSUFFICIENT_PHRASES.some((p) => text.includes(p));
}

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model] || PRICING[DEFAULT_MODEL];
  return (
    (inputTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output
  );
}

/**
 * Run a single synthesis call. Caller is responsible for cost guards
 * (rate limit, cache, budget). See `lib/llm-cost-guards.ts`.
 */
export async function synthesizeAnswer(
  query: string,
  snippets: SourceExcerpt[],
  options: SynthesisOptions = {},
): Promise<SynthesisResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const model = options.model || DEFAULT_MODEL;
  const topK = options.topK ?? 6;
  const maxTokens = options.maxTokens ?? 800;
  const temperature = options.temperature ?? 0.3;

  // Dedup by sourceId (retrieval already dedups by URL/fingerprint, but
  // belt-and-braces here in case callers concat lists).
  const seenIds = new Set<string>();
  const top = snippets
    .filter((s) => {
      if (seenIds.has(s.sourceId)) return false;
      seenIds.add(s.sourceId);
      return true;
    })
    .slice(0, topK);

  if (top.length === 0) {
    return {
      answer:
        "لم أجد في الأرشيف ما يكفي للإجابة عن هذا السؤال. حاول إعادة صياغة السؤال أو ذكر اسم محدد.",
      citations: [],
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0, model },
      insufficient: true,
    };
  }

  const client = new Anthropic();
  const userPrompt = buildUserPrompt(query, top);

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  const answer = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;

  return {
    answer,
    citations: parseCitations(answer),
    usage: {
      inputTokens,
      outputTokens,
      costUsd: estimateCost(model, inputTokens, outputTokens),
      model,
    },
    insufficient: !answer || detectInsufficient(answer),
  };
}
