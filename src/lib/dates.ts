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

export function formatEmailDeliveryDate(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  const weekday = date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  const day = date.getUTCDate();
  const month = date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  const ordinal = dayOrdinal(day);
  return `${weekday}, ${day}${ordinal} ${month} ${year}`;
}

function dayOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatDisplayDateTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "—";
  return formatDisplayDate(isoDateTime);
}

export function displayFormulaCode(code: string): string {
  return code === "MANUAL" ? "—" : code;
}
