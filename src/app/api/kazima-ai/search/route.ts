import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/kazima-ai/search?q=...&type=... — Search extracted entities
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const entityType = searchParams.get("type") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");

  try {
    const entities = await prisma.extractedEntity.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        entityValue: { contains: query },
      },
      take: limit,
      orderBy: { confidence: "desc" },
    });

    // Group by entity type
    const grouped: Record<string, typeof entities> = {};
    for (const entity of entities) {
      if (!grouped[entity.entityType]) {
        grouped[entity.entityType] = [];
      }
      grouped[entity.entityType].push(entity);
    }

    return NextResponse.json({
      total: entities.length,
      query,
      entityType: entityType || "all",
      results: grouped,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "خطأ في البحث" }, { status: 500 });
  }
}
