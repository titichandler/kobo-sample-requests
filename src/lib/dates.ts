const MONTH_ABBREV = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export function formatDisplayDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  const month = MONTH_ABBREV[date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDisplayDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "—";
  return formatDisplayDate(isoDateTime);
}

export function displayFormulaCode(code: string): string {
  return code === "MANUAL" ? "—" : code;
}
