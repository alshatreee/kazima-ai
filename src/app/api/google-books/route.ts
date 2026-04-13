import { NextRequest, NextResponse } from "next/server";
import { searchGoogleBooks } from "@/lib/google-books-connector";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchGoogleBooks(query.trim());
  return NextResponse.json({ results });
}
