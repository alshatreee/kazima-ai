import { NextRequest, NextResponse } from "next/server";
import { clampMaxSources } from "@/lib/kazima-assistant-contract";
import { retrieveFromTopics } from "@/lib/kazima-retrieval";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.query || typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json(
        { error: "حقل query مطلوب" },
        { status: 400 },
      );
    }

    const query = body.query.trim();
    const maxSources = clampMaxSources(body.maxSources);
    const filters = body.filters ?? undefined;

    const result = await retrieveFromTopics(query, maxSources, filters);

    return NextResponse.json({
      query,
      total: result.totalCandidates,
      returned: result.sources.length,
      results: result.sources,
    });
  } catch (error) {
    console.error("Retrieval error:", error);
    return NextResponse.json(
      { error: "خطأ في عملية الاسترجاع" },
      { status: 500 },
    );
  }
}
