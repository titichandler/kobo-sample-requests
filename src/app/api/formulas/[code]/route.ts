import { NextResponse } from "next/server";
import { deleteFormula, updateFormula } from "@/lib/formulas";
import { formulaErrorResponse, parseFormulaInput } from "@/lib/formulaApi";
import { ensureSchema } from "@/lib/requests";

type RouteContext = { params: Promise<{ code: string }> };

function decodeFormulaCode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Update formula — reviewer only (middleware). */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureSchema();
    const { code: codeParam } = await context.params;
    const currentCode = decodeFormulaCode(codeParam).trim();
    if (!currentCode) {
      return NextResponse.json({ error: "Formula code is required." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const input = parseFormulaInput(body);
    if (!input) {
      return NextResponse.json(
        { error: "formula_code and formula_name are required." },
        { status: 400 },
      );
    }

    const formula = await updateFormula(currentCode, input);
    return NextResponse.json({ formula });
  } catch (error) {
    return formulaErrorResponse(error);
  }
}

/** Delete formula — reviewer only (middleware). */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await ensureSchema();
    const { code: codeParam } = await context.params;
    const code = decodeFormulaCode(codeParam).trim();
    if (!code) {
      return NextResponse.json({ error: "Formula code is required." }, { status: 400 });
    }

    await deleteFormula(code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return formulaErrorResponse(error);
  }
}
