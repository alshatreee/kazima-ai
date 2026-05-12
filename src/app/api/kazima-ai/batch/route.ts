import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processKazimaAI } from "@/lib/kazima-ai";

// POST /api/kazima-ai/batch — Process multiple articles for entity extraction
//
// Admin-only. Requires header `X-Kazima-Admin-Token` matching
// `KAZIMA_ADMIN_TOKEN` in `.env`. `limit` is clamped to [1, 25] to bound
// model spend and DB writes per call.
export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get("x-kazima-admin-token");
    const expected = process.env.KAZIMA_ADMIN_TOKEN;
    if (!expected || !adminToken || adminToken !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    if (!prisma) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const rawLimit = Number(body.limit ?? 10);
    const rawOffset = Number(body.offset ?? 0);
    const limit = Math.min(25, Math.max(1, Number.isFinite(rawLimit) ? Math.trunc(rawLimit) : 10));
    const offset = Math.max(0, Number.isFinite(rawOffset) ? Math.trunc(rawOffset) : 0);

    // Fetch articles from database
    const topics = await prisma.topic.findMany({
      where: { active: 4 },
      take: limit,
      skip: offset,
      select: {
        topicId: true,
        title: true,
        contentShort: true,
        contentLong: true,
      },
    });

    const results = [];

    for (const topic of topics) {
      // Strip HTML tags from content
      const plainText = (topic.contentShort || topic.contentLong || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();

      if (!plainText || plainText.length < 20) continue;

      try {
        const aiResult = await processKazimaAI({
          mode: "extraction",
          text: plainText.substring(0, 3000), // Limit text length
          context: `عنوان المقال: ${topic.title}`,
        });

        // Parse JSON from AI result
        let entities;
        try {
          const jsonMatch = aiResult.result.match(/\{[\s\S]*\}/);
          entities = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch {
          entities = null;
        }

        if (entities) {
          // Store extracted entities
          const entityTypes = [
            "persons",
            "places",
            "tribes",
            "books",
            "dates",
          ];
          for (const type of entityTypes) {
            const items = entities[type] || [];
            for (const item of items) {
              const value =
                typeof item === "string"
                  ? item
                  : item.name || item.title || item.date || "";
              if (value) {
                await prisma.extractedEntity.create({
                  data: {
                    topicId: topic.topicId,
                    entityType: type,
                    entityValue: value.substring(0, 500),
                    confidence:
                      entities.confidence_level === "high"
                        ? 0.9
                        : entities.confidence_level === "medium"
                          ? 0.7
                          : 0.5,
                    sourceText: plainText.substring(0, 500),
                  },
                });
              }
            }
          }
        }

        results.push({
          topicId: topic.topicId,
          title: topic.title,
          status: "success",
          entities,
        });
      } catch (err) {
        results.push({
          topicId: topic.topicId,
          title: topic.title,
          status: "error",
          error: String(err),
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Batch processing error:", error);
    return NextResponse.json(
      { error: "خطأ في المعالجة الدفعية" },
      { status: 500 }
    );
  }
}
