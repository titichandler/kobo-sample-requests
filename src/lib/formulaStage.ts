import {
  FORMULA_STAGE_CLASSIFY,
  FORMULA_STAGE_DONE,
  FORMULA_STAGE_FILL,
  FORMULA_STAGE_MAKE,
  type FormulaStage,
} from "@/lib/types";

export function isFormulaStage(value: string): value is FormulaStage {
  return (
    value === FORMULA_STAGE_CLASSIFY ||
    value === FORMULA_STAGE_MAKE ||
    value === FORMULA_STAGE_FILL ||
    value === FORMULA_STAGE_DONE
  );
}

export function normalizeFormulaStage(value: string | null | undefined): FormulaStage {
  if (value === FORMULA_STAGE_MAKE) return FORMULA_STAGE_MAKE;
  if (value === FORMULA_STAGE_FILL) return FORMULA_STAGE_FILL;
  if (value === FORMULA_STAGE_DONE) return FORMULA_STAGE_DONE;
  return FORMULA_STAGE_CLASSIFY;
}

export function isValidStageTransition(from: FormulaStage, to: FormulaStage): boolean {
  if (from === FORMULA_STAGE_CLASSIFY) {
    return (
      to === FORMULA_STAGE_MAKE || to === FORMULA_STAGE_FILL || to === FORMULA_STAGE_DONE
    );
  }
  if (from === FORMULA_STAGE_MAKE || from === FORMULA_STAGE_FILL) {
    return to === FORMULA_STAGE_DONE;
  }
  return false;
}

export function advanceFormulaStage(stage: FormulaStage): FormulaStage | null {
  if (stage === FORMULA_STAGE_MAKE || stage === FORMULA_STAGE_FILL) {
    return FORMULA_STAGE_DONE;
  }
  return null;
}

export function stageActionLabel(stage: FormulaStage): string | null {
  if (stage === FORMULA_STAGE_MAKE || stage === FORMULA_STAGE_FILL) {
    return "Mark done";
  }
  return null;
}

export function formatFormulaStage(stage: FormulaStage): string {
  if (stage === FORMULA_STAGE_CLASSIFY) return "Classify";
  if (stage === FORMULA_STAGE_MAKE) return "Make";
  if (stage === FORMULA_STAGE_FILL) return "Fill";
  return "Done";
}

export const STAGE_SECTION_STYLES: Record<
  FormulaStage | "ready" | "shipped",
  { border: string; header: string; badge: string }
> = {
  classify: {
    border: "border-l-neutral-500",
    header: "text-neutral-800",
    badge: "bg-neutral-100 text-neutral-900 border-neutral-200",
  },
  make: {
    border: "border-l-amber-500",
    header: "text-amber-800",
    badge: "bg-amber-50 text-amber-900 border-amber-200",
  },
  fill: {
    border: "border-l-blue-500",
    header: "text-blue-800",
    badge: "bg-blue-50 text-blue-900 border-blue-200",
  },
  done: {
    border: "border-l-emerald-500",
    header: "text-emerald-800",
    badge: "bg-emerald-50 text-emerald-900 border-emerald-200",
  },
  ready: {
    border: "border-l-emerald-500",
    header: "text-emerald-800",
    badge: "bg-emerald-50 text-emerald-900 border-emerald-200",
  },
  shipped: {
    border: "border-l-neutral-400",
    header: "text-ink-muted",
    badge: "border border-line bg-surface-soft text-ink-muted",
  },
};
