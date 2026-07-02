import { NextResponse } from "next/server";
import { ensureSchema, getReviewBoard } from "@/lib/requests";

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const board = await getReviewBoard(search);
    return NextResponse.json(board);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load review board." },
      { status: 500 },
    );
  }
}
