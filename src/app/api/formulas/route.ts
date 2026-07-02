import { NextResponse } from "next/server";
import { ensureSchema, listFormulas } from "@/lib/requests";

export async function GET() {
  try {
    await ensureSchema();
    const formulas = await listFormulas();
    return NextResponse.json({ formulas });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load formulas." },
      { status: 500 },
    );
  }
}
