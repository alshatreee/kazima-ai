import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!prisma) {
    return NextResponse.json({ error: "قاعدة البيانات غير متصلة" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const author = searchParams.get("author");
  const optionId = searchParams.get("optionId");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  const where: Record<string, unknown> = { active: 4 };

  if (optionId) {
    where.optionId = parseInt(optionId, 10);
  }

  if (author) {
    where.author = { contains: author };
  }

  const topics = await prisma.topic.findMany({
    where,
    take: Math.min(limit, 100),
    orderBy: { topicId: "desc" },
    select: {
      topicId: true,
      title: true,
      author: true,
      picture: true,
      contentShort: true,
      optionId: true,
      attributeId: true,
      publishedWhen: true,
      link: true,
      views: true,
    },
  });

  return NextResponse.json({ items: topics, total: topics.length });
}
