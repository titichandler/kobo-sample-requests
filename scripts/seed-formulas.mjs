/**
 * Import formula codes, names, and types from EU FORMULAS DATABASE.xlsx into Neon.
 *
 * Excel layout:
 *   Row 1 — column titles
 *   Row 2+ — data (column B = code, C = name, D = type)
 *
 * Usage:
 *   npm run seed:formulas
 *   npm run seed:formulas -- "C:\path\to\EU FORMULAS DATABASE.xlsx"
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(scriptDir, "..");

function loadEnvLocal() {
  const envPath = join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    // .env.local wins over inherited shell variables for local scripts.
    process.env[key] = value;
  }
}

loadEnvLocal();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set. Add it to nextjs/.env.local");
  process.exit(1);
}

if (/@host(\/|$|\?)/i.test(databaseUrl)) {
  console.error(
    "DATABASE_URL in .env.local is still the placeholder.\n\n" +
      "Replace it with your real Neon connection string, for example:\n" +
      "  DATABASE_URL=postgresql://user:pass@ep-xxxx.eu-west-2.aws.neon.tech/neondb?sslmode=require\n\n" +
      "Get it from:\n" +
      "  • Neon dashboard → Connection string\n" +
      "  • Streamlit Cloud → your app → Secrets → DATABASE_URL",
  );
  process.exit(1);
}

const defaultExcelPath = resolve(projectRoot, "..", "EU FORMULAS DATABASE.xlsx");
const excelPath = process.argv[2] ? resolve(process.argv[2]) : defaultExcelPath;

if (!existsSync(excelPath)) {
  console.error(`Excel file not found: ${excelPath}`);
  process.exit(1);
}

const workbook = XLSX.read(readFileSync(excelPath), { type: "buffer" });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const formulas = [];
for (const row of rows.slice(1)) {
  const formula_code = String(row[1] ?? "").trim();
  const formula_name = String(row[2] ?? "").trim();
  const formula_type = String(row[3] ?? "").trim();
  if (formula_code && formula_name) {
    formulas.push({ formula_code, formula_name, formula_type });
  }
}

if (!formulas.length) {
  console.error("No formulas found in the Excel file.");
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS formula_library (
    id SERIAL PRIMARY KEY,
    formula_code VARCHAR(64) NOT NULL UNIQUE,
    formula_name VARCHAR(255) NOT NULL,
    formula_type VARCHAR(64) NOT NULL DEFAULT ''
  )
`;

await sql`
  ALTER TABLE formula_library
  ADD COLUMN IF NOT EXISTS formula_type VARCHAR(64) NOT NULL DEFAULT ''
`;

let upserted = 0;
for (const formula of formulas) {
  await sql`
    INSERT INTO formula_library (formula_code, formula_name, formula_type)
    VALUES (${formula.formula_code}, ${formula.formula_name}, ${formula.formula_type})
    ON CONFLICT (formula_code) DO UPDATE
    SET
      formula_name = EXCLUDED.formula_name,
      formula_type = EXCLUDED.formula_type
  `;
  upserted += 1;
}

console.log(`Imported ${upserted} formulas from ${excelPath}`);
