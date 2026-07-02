import { NextResponse } from "next/server";
import { advanceFormulaStage, isFormulaStage } from "@/lib/formulaStage";
import { ensureSchema, getSampleLine, updateLineStage } from "@/lib/requests";
import type { FormulaStage } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

function parseLineId(value: string): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

function parseStage(value: unknown): FormulaStage | null {
  if (typeof value !== "string" || !isFormulaStage(value)) return null;
  return value;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureSchema();
    const { id: idParam } = await context.params;
    const lineId = parseLineId(idParam);
    if (!lineId) {
      return NextResponse.json({ error: "Invalid line id." }, { status: 400 });
    }

    const body = (await request.json()) as { stage?: unknown; advance?: unknown };
    let stage = parseStage(body.stage);

    if (!stage && body.advance === true) {
      const existing = await getSampleLine(lineId);
      if (!existing) {
        return NextResponse.json({ error: "Line not found." }, { status: 404 });
      }
      stage = advanceFormulaStage(existing.stage);
      if (!stage) {
        return NextResponse.json({ error: "Choose Make or Fill first." }, { status: 400 });
      }
    }

    if (!stage) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }

    const line = await updateLineStage(lineId, stage);
    return NextResponse.json({ line });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "LINE_NOT_FOUND") {
        return NextResponse.json({ error: "Line not found." }, { status: 404 });
      }
      if (error.message === "BATCH_SHIPPED") {
        return NextResponse.json(
          { error: "This request has already been shipped." },
          { status: 409 },
        );
      }
      if (error.message === "INVALID_STAGE_TRANSITION") {
        return NextResponse.json({ error: "That stage change is not allowed." }, { status: 400 });
      }
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not update line stage." },
      { status: 500 },
    );
  }
}
