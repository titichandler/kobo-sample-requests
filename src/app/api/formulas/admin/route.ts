import { NextResponse } from "next/server";
import { listFormulasAdmin } from "@/lib/formulas";
import { ensureSchema } from "@/lib/requests";

/** Reviewer-only formula library list with optional search. */
export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const formulas = await listFormulasAdmin(search);
    return NextResponse.json({ formulas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load formulas." }, { status: 500 });
  }
}
