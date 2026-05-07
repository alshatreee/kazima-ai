 
/**
 * Phase 2A — Kazima assistant query API.
 *
 * Pipeline (in order):
 *   1. Validate request.
 *   2. Scope guard — reject obviously off-topic queries cheaply.
 *   3. Retrieval (DB + external) with English→Arabic NER and dedup.
 *   4. Synthesis — Claude Haiku reads top snippets and writes a
 *      coherent Arabic answer that cites source numbers.
 *
 * Cost guards live in `lib/llm-cost-guards.ts`:
 *   • Per-IP rate limit (10/min)
 *   • In-memory cache (1h TTL on normalized query)
 *   • Daily $5 budget (falls back to keyword-only when exceeded)
 */

import { NextRequest, NextResponse } from "next/server";
import type {
  AssistantQueryRequest,
  AssistantQueryResponse,
  AssistantResponseMode,
  CitationItem,
  ReadMoreItem,
} from "@/lib/kazima-assistant-contract";
import {
  clampMaxSources,
  createEmptyAssistantResponse,
  isAssistantAiMode,
  normalizeAssistantMode,
  validateAssistantQuery,
} from "@/lib/kazima-assistant-contract";
import { retrieveFromTopics } from "@/lib/kazima-retrieval";
import { classifyScope } from "@/lib/kazima-scope-guard";
import {
  synthesizeAnswer,
  type SynthesisResult,
} from "@/lib/llm-synthesis";
import {
  cacheKey,
  checkRateLimit,
  clientIpFromHeaders,
  getBudgetSnapshot,
  getCached,
  isBudgetExceeded,
  recordSpend,
  setCached,
} from "@/lib/llm-cost-guards";

function toDefaultCitations(
  sources: AssistantQueryResponse["retrieval"]["sources"],
): CitationItem[] {
  return sources.slice(0, 5).map((source, index) => ({
    id: `source-${index + 1}`,
    label: source.title,
    sourceId: source.sourceId,
    excerpt: source.excerpt,
    url: source.url,
    confidence: index < 2 ? "high" : "medium",
  }));
}

function toReadMore(
  sources: AssistantQueryResponse["retrieval"]["sources"],
): ReadMoreItem[] {
  return sources
    .filter((source): source is typeof source & { url: string } => Boolean(source.url))
    .slice(0, 5)
    .map((source) => ({
      title: source.title,
      url: source.url,
      type: source.type,
    }));
}

function buildRetrievalSummaryAnswer(
  query: string,
  mode: AssistantResponseMode,
  sourceCount: number,
  fallbackReason?: string,
): string {
  if (sourceCount === 0) {
    return mode === "retrieve"
      ? `لم أعثر في كاظمة على مواد كافية مرتبطة مباشرة بالسؤال: "${query}".`
      : `تعذر تقديم تحليل موثق لأن كاظمة لم تُرجع مواد كافية مرتبطة مباشرة بالسؤال: "${query}".`;
  }

  if (mode === "retrieve") {
    return `عُثر في كاظمة على ${sourceCount} مادة مرتبطة بسؤالك. أعرض لك أقرب النتائج مع مقتطفات وروابط متابعة من داخل المنصة.`;
  }

  if (fallbackReason) {
    return fallbackReason;
  }

  return `تم تجهيز مواد كاظمة المرتبطة بسؤالك تمهيدًا لتحليل ذكي موثق.`;
}

function buildRetrievalOnlyResponse(
  request: AssistantQueryRequest,
  mode: AssistantResponseMode,
  retrieval: Awaited<ReturnType<typeof retrieveFromTopics>>,
  options?: {
    disclaimer?: string;
    preserveRequestedMode?: boolean;
    fallbackReason?: string;
  },
): AssistantQueryResponse {
  const sourceCount = retrieval.sources.length;
  const responseMode =
    options?.preserveRequestedMode && isAssistantAiMode(mode) ? mode : "retrieve";
  const fallback = createEmptyAssistantResponse(request.query, responseMode);

  const topItems = retrieval.sources
    .slice(0, 5)
    .map((source, index) => {
      const excerpt = source.excerpt.length > 220
        ? `${source.excerpt.substring(0, 220)}...`
        : source.excerpt;
      return `${index + 1}. ${source.title}\n${excerpt}`;
    })
    .join("\n\n");

  const disclaimers = [
    ...(options?.disclaimer ? [options.disclaimer] : []),
    ...(sourceCount === 0
      ? ["هذه النتيجة لا تكفي للجزم العلمي، وقد تحتاج إلى تحرير محتوى إضافي داخل كاظمة."]
      : []),
  ];

  return {
    ...fallback,
    mode: responseMode,
    scope: sourceCount > 0 ? "kazima_primary" : "needs_verification",
    confidence:
      sourceCount >= 3 ? "high" : sourceCount >= 1 ? "medium" : "low",
    answer: buildRetrievalSummaryAnswer(
      request.query,
      mode,
      sourceCount,
      options?.fallbackReason,
    ),
    summary:
      sourceCount > 0
        ? `تم العثور على ${sourceCount} نتيجة من كاظمة مرتبطة بالسؤال.`
        : "لم يتم العثور على نتائج كافية داخل كاظمة.",
    sections: [
      {
        title: sourceCount > 0 ? "أقرب المواد من كاظمة" : "نتيجة البحث",
        body:
          sourceCount > 0
            ? topItems
            : "جرّب إعادة صياغة السؤال باسم شخص أو مؤسسة أو كتاب أو مكان محدد.",
      },
    ],
    citations: toDefaultCitations(retrieval.sources),
    readMore: request.includeReadMore === false ? [] : toReadMore(retrieval.sources),
    followUpQuestions:
      sourceCount > 0
        ? [
            "هل تريد تلخيص هذه النتائج بإيجاز؟",
            "هل تريد تحويل هذه النتائج إلى إجابة بحثية موثقة؟",
          ]
        : [
            "هل تريد إعادة صياغة السؤال بكلمات أدق من كاظمة؟",
            "هل تبحث عن شخص أو مؤسسة أو مخطوط بعينه؟",
          ],
    disclaimers: disclaimers.length > 0 ? disclaimers : undefined,
    retrieval: {
      totalCandidates: retrieval.totalCandidates,
      returnedSources: sourceCount,
      sources: retrieval.sources,
      externalSourcesUsed: retrieval.externalSourcesUsed ?? false,
    },
  };
}

function buildOutOfScopeResponse(
  request: AssistantQueryRequest,
  mode: AssistantResponseMode,
  decision: ReturnType<typeof classifyScope>,
): AssistantQueryResponse {
  const fallback = createEmptyAssistantResponse(request.query, mode);
  const message =
    decision.rejectionMessage ||
    "هذا المساعد متخصص في التراث الكويتي والخليجي.";
  const chips = decision.suggestedChips || [
    "المدرسة المباركية",
    "تاريخ الكويت",
    "آل صباح",
  ];

  return {
    ...fallback,
    mode,
    scope: "needs_verification",
    confidence: "high",
    answer: message,
    summary: "السؤال خارج نطاق منصة كاظمة.",
    sections: [
      {
        title: "اقتراحات للبحث في كاظمة",
        body: chips.map((c, i) => `${i + 1}. ${c}`).join("\n"),
      },
    ],
    citations: [],
    readMore: [],
    followUpQuestions: chips,
    disclaimers: ["تم رفض السؤال تلقائيًا لأن مفرداته خارج نطاق التراث الكويتي."],
    retrieval: {
      totalCandidates: 0,
      returnedSources: 0,
      sources: [],
      externalSourcesUsed: false,
    },
  };
}


/**
 * Derive a user-friendly summary line for the AnswerPanel header.
 *
 * The previous implementation used `\`تم تحليل N مصدر من كاظمة باستخدام
 * Claude (model)\`` which (a) leaks the model identifier into the UI and
 * (b) gives the user no signal about the actual answer. We now try to
 * extract the first sentence of the synthesized answer (stripping markdown
 * bold + numeric citation markers) and fall back to a clean count-only
 * line if the answer is unusable.
 */
function deriveSynthesisSummary(
  answer: string,
  sourceCount: number,
  insufficient: boolean,
): string {
  if (insufficient) return "لم تكفِ المقاطع المسترجعة لإجابة موثقة.";

  const cleaned = (answer || "")
    // Drop markdown bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    // Drop heading hashes at line starts
    .replace(/^#{1,6}\s+/gm, "")
    // Drop numeric citation markers like (1)(2)
    .replace(/\((\d{1,2})\)/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return sourceCount > 0
      ? `استنادًا إلى ${sourceCount} مصادر من كاظمة.`
      : "تم بناء الإجابة من كاظمة.";
  }

  // First sentence: split on Arabic / Latin sentence terminators.
  const firstSentenceMatch = cleaned.match(/^[^.!?؟\n]{1,160}[.!?؟]?/);
  let summary = (firstSentenceMatch ? firstSentenceMatch[0] : cleaned).trim();

  // Hard cap so the header doesn't wrap awkwardly.
  if (summary.length > 110) summary = summary.slice(0, 107).trim() + "...";
  return summary;
}


function buildSynthesizedResponse(
  request: AssistantQueryRequest,
  mode: AssistantResponseMode,
  retrieval: Awaited<ReturnType<typeof retrieveFromTopics>>,
  synthesis: SynthesisResult,
): AssistantQueryResponse {
  const sourceCount = retrieval.sources.length;
  const fallback = createEmptyAssistantResponse(request.query, mode);

  return {
    ...fallback,
    mode,
    scope: synthesis.insufficient
      ? "needs_verification"
      : "kazima_primary_plus_context",
    confidence: synthesis.insufficient
      ? "low"
      : sourceCount >= 3
        ? "high"
        : "medium",
    answer: synthesis.answer,
    summary: deriveSynthesisSummary(
      synthesis.answer,
      sourceCount,
      synthesis.insufficient,
    ),
    // Phase 2A keeps sections empty — the synthesis answer is the panel.
    sections: [],
    citations: toDefaultCitations(retrieval.sources),
    readMore:
      request.includeReadMore === false ? [] : toReadMore(retrieval.sources),
    followUpQuestions: synthesis.insufficient
      ? [
          "هل تريد إعادة صياغة السؤال؟",
          "هل تبحث عن شخص أو مؤسسة بعينها؟",
        ]
      : [
          "هل تريد تعميق هذا التحليل؟",
          "هل تريد استكشاف جوانب أخرى من الموضوع؟",
        ],
    retrieval: {
      totalCandidates: retrieval.totalCandidates,
      returnedSources: sourceCount,
      sources: retrieval.sources,
      externalSourcesUsed: retrieval.externalSourcesUsed ?? false,
    },
  };
}

export async function GET() {
  const budget = getBudgetSnapshot();
  return NextResponse.json({
    apiVersion: "2.0.0",
    modes: ["retrieve", "brief", "research"],
    description:
      "Kazima Assistant query API — scope guard + retrieval + Claude synthesis (Phase 2A)",
    budget,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateAssistantQuery(body);
    if (!validation.ok) {
      return NextResponse.json(
        { error: "طلب غير صالح", details: validation.errors },
        { status: 400 },
      );
    }

    const {
      query,
      mode: requestMode,
      maxSources: requestMaxSources,
    } = validation.data;
    const mode = normalizeAssistantMode(requestMode);
    const maxSources = clampMaxSources(requestMaxSources);

    // ── Scope guard (Phase 1) ─────────────────────────────────────────────
    const scopeDecision = classifyScope(query);
    if (!scopeDecision.inScope) {
      return NextResponse.json(
        buildOutOfScopeResponse(validation.data, mode, scopeDecision),
      );
    }

    // ── Rate limit (Phase 2A cost guard) ──────────────────────────────────
    const ip = clientIpFromHeaders(request.headers);
    const limit = checkRateLimit(ip);
    if (!limit.allowed && isAssistantAiMode(mode)) {
      // Soft-fail: degrade to retrieve-only with notice rather than 429.
      const retrieval = await retrieveFromTopics(query, maxSources);
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval, {
          preserveRequestedMode: true,
          disclaimer:
            "تم تجاوز الحد المسموح من طلبات الذكاء الاصطناعي لهذه الدقيقة. عرضنا لك نتائج البحث المباشر بدلاً من ذلك.",
        }),
      );
    }

    // ── Retrieval (Phase 1) ───────────────────────────────────────────────
    const retrieval = await retrieveFromTopics(query, maxSources);

    if (mode === "retrieve") {
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval),
      );
    }

    // ── No API key or no sources — fall back to retrieve-only ─────────────
    const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
    if (!hasApiKey || retrieval.sources.length === 0) {
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval, {
          preserveRequestedMode: true,
          fallbackReason: !hasApiKey
            ? "طبقة الذكاء الاصطناعي غير متاحة (API key مفقود)؛ نعرض لك أقرب النتائج المباشرة."
            : undefined,
        }),
      );
    }

    // ── Daily budget guard ────────────────────────────────────────────────
    if (isBudgetExceeded()) {
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval, {
          preserveRequestedMode: true,
          disclaimer:
            "تم تجاوز ميزانية الذكاء الاصطناعي لهذا اليوم؛ سنعود تلقائيًا غدًا. نعرض الآن نتائج البحث المباشر.",
        }),
      );
    }

    // ── Cache hit? ────────────────────────────────────────────────────────
    const ck = cacheKey(query, mode);
    const cached = getCached(ck);
    if (cached) {
      return NextResponse.json(
        buildSynthesizedResponse(validation.data, mode, retrieval, cached),
      );
    }

    // ── Synthesize ────────────────────────────────────────────────────────
    let synthesis: SynthesisResult;
    try {
      synthesis = await synthesizeAnswer(query, retrieval.sources);
    } catch (err) {
      console.error("[query] synthesis failed:", err);
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval, {
          preserveRequestedMode: true,
          disclaimer:
            "تعذّر استدعاء طبقة الذكاء الاصطناعي مؤقتًا؛ نعرض لك نتائج البحث المباشر.",
        }),
      );
    }

    recordSpend(synthesis.usage.costUsd);
    setCached(ck, synthesis);

    return NextResponse.json(
      buildSynthesizedResponse(validation.data, mode, retrieval, synthesis),
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب." },
      { status: 500 },
    );
  }
}

