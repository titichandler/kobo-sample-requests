export function carrierTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const normalized = carrier.trim().toLowerCase();
  const tracking = encodeURIComponent(trackingNumber.trim());
  if (!tracking) return null;
  if (normalized.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${tracking}`;
  }
  return null;
}
