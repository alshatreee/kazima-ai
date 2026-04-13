import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    hasDbUrl: !!process.env.DATABASE_URL,
  };

  try {
    const docCount = await prisma.sourceDocument.count();
    const chunkCount = await prisma.sourceChunk.count();
    const scholarCount = await prisma.sanadNode.count();

    results.connected = true;
    results.success = true;
    results.documentCount = docCount;
    results.chunkCount = chunkCount;
    results.scholarCount = scholarCount;
  } catch (err: unknown) {
    const error = err as Error;
    results.error = error.message;
    results.connected = false;
  }

  return NextResponse.json(results);
}
