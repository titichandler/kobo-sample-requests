import { NextResponse } from "next/server";
import type { FormulaInput } from "@/lib/types";

export function parseFormulaInput(body: Record<string, unknown>): FormulaInput | null {
  if (typeof body.formula_code !== "string" || typeof body.formula_name !== "string") {
    return null;
  }
  return {
    formula_code: body.formula_code,
    formula_name: body.formula_name,
    formula_type: typeof body.formula_type === "string" ? body.formula_type : "",
  };
}

export function formulaErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return NextResponse.json({ error: "Could not update formula library." }, { status: 500 });
  }

  switch (error.message) {
    case "FORMULA_CODE_REQUIRED":
      return NextResponse.json({ error: "Formula code is required." }, { status: 400 });
    case "FORMULA_NAME_REQUIRED":
      return NextResponse.json({ error: "Formula name is required." }, { status: 400 });
    case "FORMULA_CODE_TOO_LONG":
      return NextResponse.json({ error: "Formula code is too long." }, { status: 400 });
    case "FORMULA_NAME_TOO_LONG":
      return NextResponse.json({ error: "Formula name is too long." }, { status: 400 });
    case "FORMULA_TYPE_TOO_LONG":
      return NextResponse.json({ error: "Formula type is too long." }, { status: 400 });
    case "FORMULA_CODE_EXISTS":
      return NextResponse.json({ error: "That formula code already exists." }, { status: 409 });
    case "FORMULA_NOT_FOUND":
      return NextResponse.json({ error: "Formula not found." }, { status: 404 });
    default:
      console.error(error);
      return NextResponse.json({ error: "Could not update formula library." }, { status: 500 });
  }
}
