export const SHIPPED_VIEW_RETENTION_MONTHS = 2;

export function isVisibleInShippedView(
  shippedAt: string | null | undefined,
  hiddenFromViewAt: string | null | undefined,
): boolean {
  if (hiddenFromViewAt) return false;
  if (!shippedAt) return true;

  const shippedDate = new Date(shippedAt);
  if (Number.isNaN(shippedDate.getTime())) return true;

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - SHIPPED_VIEW_RETENTION_MONTHS);
  return shippedDate >= cutoff;
}
