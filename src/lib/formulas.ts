import { getSql } from "@/lib/db";
import type { FormulaInput, FormulaOption, FormulaRecord } from "@/lib/types";

function normalizeFormulaInput(input: FormulaInput): {
  formula_code: string;
  formula_name: string;
  formula_type: string;
} {
  const formula_code = input.formula_code?.trim() ?? "";
  const formula_name = input.formula_name?.trim() ?? "";
  const formula_type = input.formula_type?.trim() ?? "";

  if (!formula_code) {
    throw new Error("FORMULA_CODE_REQUIRED");
  }
  if (!formula_name) {
    throw new Error("FORMULA_NAME_REQUIRED");
  }
  if (formula_code.length > 64) {
    throw new Error("FORMULA_CODE_TOO_LONG");
  }
  if (formula_name.length > 255) {
    throw new Error("FORMULA_NAME_TOO_LONG");
  }
  if (formula_type.length > 64) {
    throw new Error("FORMULA_TYPE_TOO_LONG");
  }

  return { formula_code, formula_name, formula_type };
}

/** Public list used by the request form combobox. */
export async function listFormulas(): Promise<FormulaOption[]> {
  const sql = getSql();
  return (await sql`
    SELECT formula_code, formula_name, formula_type
    FROM formula_library
    ORDER BY formula_code
  `) as FormulaOption[];
}

/** Admin list with id + optional search on code, name, or type. */
export async function listFormulasAdmin(search?: string): Promise<FormulaRecord[]> {
  const sql = getSql();
  const searchTerm = search?.trim() || null;

  return (await sql`
    SELECT id, formula_code, formula_name, formula_type
    FROM formula_library
    WHERE (${searchTerm}::text IS NULL OR (
      formula_code ILIKE '%' || ${searchTerm} || '%'
      OR formula_name ILIKE '%' || ${searchTerm} || '%'
      OR formula_type ILIKE '%' || ${searchTerm} || '%'
    ))
    ORDER BY formula_code
  `) as FormulaRecord[];
}

export async function getFormulaByCode(formulaCode: string): Promise<FormulaRecord | null> {
  const sql = getSql();
  const code = formulaCode.trim();
  if (!code) return null;

  const rows = (await sql`
    SELECT id, formula_code, formula_name, formula_type
    FROM formula_library
    WHERE formula_code = ${code}
  `) as FormulaRecord[];

  return rows[0] ?? null;
}

export async function createFormula(input: FormulaInput): Promise<FormulaRecord> {
  const sql = getSql();
  const formula = normalizeFormulaInput(input);

  try {
    const rows = (await sql`
      INSERT INTO formula_library (formula_code, formula_name, formula_type)
      VALUES (${formula.formula_code}, ${formula.formula_name}, ${formula.formula_type})
      RETURNING id, formula_code, formula_name, formula_type
    `) as FormulaRecord[];
    return rows[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("FORMULA_CODE_EXISTS");
    }
    throw error;
  }
}

export async function updateFormula(
  currentCode: string,
  input: FormulaInput,
): Promise<FormulaRecord> {
  const sql = getSql();
  const existingCode = currentCode.trim();
  if (!existingCode) {
    throw new Error("FORMULA_NOT_FOUND");
  }

  const existing = await getFormulaByCode(existingCode);
  if (!existing) {
    throw new Error("FORMULA_NOT_FOUND");
  }

  const formula = normalizeFormulaInput(input);

  try {
    const rows = (await sql`
      UPDATE formula_library
      SET
        formula_code = ${formula.formula_code},
        formula_name = ${formula.formula_name},
        formula_type = ${formula.formula_type}
      WHERE formula_code = ${existingCode}
      RETURNING id, formula_code, formula_name, formula_type
    `) as FormulaRecord[];

    if (!rows[0]) {
      throw new Error("FORMULA_NOT_FOUND");
    }
    return rows[0];
  } catch (error) {
    if (error instanceof Error && error.message === "FORMULA_NOT_FOUND") {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new Error("FORMULA_CODE_EXISTS");
    }
    throw error;
  }
}

export async function deleteFormula(formulaCode: string): Promise<void> {
  const sql = getSql();
  const code = formulaCode.trim();
  if (!code) {
    throw new Error("FORMULA_NOT_FOUND");
  }

  const rows = (await sql`
    DELETE FROM formula_library
    WHERE formula_code = ${code}
    RETURNING id
  `) as { id: number }[];

  if (!rows[0]) {
    throw new Error("FORMULA_NOT_FOUND");
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";
  return code === "23505" || message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique");
}
