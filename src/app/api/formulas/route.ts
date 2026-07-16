import { NextResponse } from "next/server";
import { createFormula, listFormulas } from "@/lib/formulas";
import { formulaErrorResponse, parseFormulaInput } from "@/lib/formulaApi";
import { ensureSchema } from "@/lib/requests";

/** Public list for the request form combobox. */
export async function GET() {
  try {
    await ensureSchema();
    const formulas = await listFormulas();
    return NextResponse.json({ formulas });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load formulas." }, { status: 500 });
  }
}

/** Create formula — reviewer only (middleware). */
export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseFormulaInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "formula_code and formula_name are required." },
        { status: 400 },
      );
    }

    const formula = await createFormula(input);
    return NextResponse.json({ formula }, { status: 201 });
  } catch (error) {
    return formulaErrorResponse(error);
  }
}
