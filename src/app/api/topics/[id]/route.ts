import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const topicId = parseInt(id, 10);
  if (isNaN(topicId)) {
    return NextResponse.json({ error: "معرّف غير صالح" }, { status: 400 });
  }

  if (!prisma) {
    return NextResponse.json({ error: "قاعدة البيانات غير متصلة" }, { status: 503 });
  }

  const topic = await prisma.topic.findUnique({
    where: { topicId },
  });

  if (!topic) {
    return NextResponse.json({ error: "المحتوى غير موجود" }, { status: 404 });
  }

  return NextResponse.json(topic);
}
