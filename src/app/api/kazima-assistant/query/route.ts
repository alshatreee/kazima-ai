import Anthropic from "@anthropic-ai/sdk";
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
import {
  buildScholarUserPrompt,
  KAZIMA_SCHOLAR_SYSTEM_PROMPT,
} from "@/lib/kazima-scholar-prompts";

const AI_MODEL = "claude-sonnet-4-20250514";

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
  aiFallback: boolean,
): string {
  if (sourceCount === 0) {
    return mode === "retrieve"
      ? `لم أعثر في كاظمة على مواد كافية مرتبطة مباشرة بالسؤال: "${query}".`
      : `تعذر تقديم تحليل موثق لأن كاظمة لم تُرجع مواد كافية مرتبطة مباشرة بالسؤال: "${query}".`;
  }

  if (mode === "retrieve") {
    return `عُثر في كاظمة على ${sourceCount} مادة مرتبطة بسؤالك. أعرض لك أقرب النتائج مع مقتطفات وروابط متابعة من داخل المنصة.`;
  }

  if (aiFallback) {
    return `عرضت لك أقرب المواد من كاظمة بدل التحليل الذكي، لأن طبقة الذكاء الاصطناعي غير متاحة حاليًا. يمكنك البدء من هذه النتائج ثم توسيعها لاحقًا.`;
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
  },
): AssistantQueryResponse {
  const sourceCount = retrieval.sources.length;
  const responseMode =
    options?.preserveRequestedMode && isAssistantAiMode(mode) ? mode : "retrieve";
  const fallback = createEmptyAssistantResponse(request.query, responseMode);
  const aiFallback = mode !== "retrieve";

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
    answer: buildRetrievalSummaryAnswer(request.query, mode, sourceCount, aiFallback),
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
    },
  };
}

function sanitizeAiResponse(
  rawJson: string,
): { answer: string; summary: string; sections: Array<{ title: string; body: string }> } {
  try {
    const parsed = JSON.parse(rawJson);
    return {
      answer: typeof parsed.answer === "string" ? parsed.answer : "",
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    };
  } catch {
    return {
      answer: rawJson,
      summary: "تم الحصول على النتيجة من طبقة الذكاء الاصطناعي.",
      sections: [],
    };
  }
}

function validateScope(value?: string): string {
  const validScopes = [
    "kazima_primary",
    "kazima_primary_plus_context",
    "general_knowledge",
    "needs_verification",
  ];
  return validScopes.includes(value) ? value : "needs_verification";
}

function validateConfidence(value?: string): string {
  const validConfidences = ["high", "medium", "low"];
  return validConfidences.includes(value) ? value : "medium";
}

export async function GET() {
  return NextResponse.json({
    apiVersion: "1.0.0",
    modes: ["retrieve", "brief", "research"],
    description: "Kazima Assistant hybrid query API",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateAssistantQuery(body);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "طلب غير صالح",
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    const {
      query,
      mode: requestMode,
      userIntent,
      maxSources: requestMaxSources,
      includeReadMore,
    } = validation.data;

    const mode = normalizeAssistantMode(requestMode);
    const maxSources = clampMaxSources(requestMaxSources);

    const retrieval = await retrieveFromTopics(query, maxSources);

    if (mode === "retrieve") {
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval),
      );
    }

    const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
    if (!hasApiKey || retrieval.sources.length === 0) {
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval, {
          preserveRequestedMode: true,
        }),
      );
    }

    const client = new Anthropic();
    const sourcesText = retrieval.sources
      .map(
        (source, index) =>
          `[${index + 1}] ${source.title}\n${source.excerpt}`,
      )
      .join("\n\n");

    const userPrompt = buildScholarUserPrompt(query, userIntent, sourcesText);

    const aiResponse = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: KAZIMA_SCHOLAR_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const aiContent = aiResponse.content[0];
    if (aiContent.type !== "text") {
      return NextResponse.json(
        buildRetrievalOnlyResponse(validation.data, mode, retrieval, {
          preserveRequestedMode: true,
        }),
      );
    }

    const sanitized = sanitizeAiResponse(aiContent.text);

    return NextResponse.json({
      query,
      mode,
      scope: validateScope("kazima_primary_plus_context"),
      confidence: validateConfidence("high"),
      answer: sanitized.answer,
      summary:
        sanitized.summary ||
        `تم تحليل ${retrieval.sources.length} مصدر من كاظمة باستخدام الذكاء الاصطناعي.`,
      sections: sanitized.sections,
      citations: toDefaultCitations(retrieval.sources),
      readMore:
        includeReadMore === false ? [] : toReadMore(retrieval.sources),
      followUpQuestions: [
        "هل تريد تعميق هذا التحليل؟",
        "هل تريد استكشاف جوانب أخرى من الموضوع؟",
      ],
      retrieval: {
        totalCandidates: retrieval.totalCandidates,
        returnedSources: retrieval.sources.length,
        sources: retrieval.sources,
      },
    } as AssistantQueryResponse);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الطلب." },
      { status: 500 },
    );
  }
}
