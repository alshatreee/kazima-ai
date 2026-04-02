import { NextRequest, NextResponse } from "next/server";
import { processKazimaAI, validateMode } from "@/lib/kazima-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, text, context, previousResponse } = body;

    // Validate required fields
    if (!mode || !text) {
      return NextResponse.json(
        {
          error: "الحقول المطلوبة: mode و text",
          validModes: [
            "analysis",
            "extraction",
            "footnotes",
            "publication",
            "media",
            "review",
            "comparison",
            "error_detection",
            "manuscript_expert",
          ],
        },
        { status: 400 }
      );
    }

    // Validate mode
    if (!validateMode(mode)) {
      return NextResponse.json(
        {
          error: `الوضع غير صالح: ${mode}`,
          validModes: [
            "analysis",
            "extraction",
            "footnotes",
            "publication",
            "media",
            "review",
            "comparison",
            "error_detection",
            "manuscript_expert",
          ],
        },
        { status: 400 }
      );
    }

    // Process with Kazima AI
    const result = await processKazimaAI({
      mode,
      text,
      context,
      previousResponse,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Kazima AI Error:", error);
    return NextResponse.json(
      { error: "حدث خطأ في معالجة الطلب" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Kazima AI API - ذكاء كاظمة",
    version: "1.0.0",
    description:
      "نظام ذكاء اصطناعي متخصص في التراث الديني الخليجي وتحقيق المخطوطات",
    modes: {
      analysis: "تحليل نصي عميق — نقد النصوص وتحقيق المخطوطات",
      extraction: "استخراج بيانات منظمة — أعلام، أماكن، كتب، تواريخ",
      footnotes: "توليد حواشي علمية",
      publication: "تحويل إلى مقال أكاديمي جاهز للنشر",
      media: "تحويل إلى محتوى سوشيال ميديا (إنستغرام)",
      review: "مراجعة ذاتية ونقد للإجابة السابقة",
      comparison: "مقارنة بين تفسيرات أو أقوال مختلفة",
      error_detection: "كشف الأخطاء والتناقضات",
      manuscript_expert: "تحليل مخطوطات متقدم — فترة، مذهب، أنماط نسخ",
    },
    usage: {
      method: "POST",
      endpoint: "/api/kazima-ai",
      body: {
        mode: "analysis | extraction | footnotes | publication | media | review | comparison | error_detection | manuscript_expert",
        text: "النص المراد تحليله",
        context: "(اختياري) سياق إضافي",
        previousResponse: "(اختياري) للمراجعة الذاتية",
      },
    },
  });
}
