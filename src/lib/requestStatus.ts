import {
  REQUEST_STATUS_NEW,
  REQUEST_STATUS_SHIPPED,
  type RequestStatus,
} from "@/lib/types";

export function formatRequestStatus(status: RequestStatus): string {
  return status === REQUEST_STATUS_SHIPPED ? "Shipped" : "Active";
}

export function requestStatusBadgeClass(status: RequestStatus): string {
  if (status === REQUEST_STATUS_SHIPPED) {
    return "border border-emerald-300 bg-emerald-50 text-emerald-900";
  }
  return "border border-red-200 bg-red-50 text-red-900";
}

export function requestStatusBadgeClassForSummary(
  status: RequestStatus,
  doneCount: number,
  sampleCount: number,
): string {
  if (status === REQUEST_STATUS_SHIPPED) {
    return "border border-emerald-300 bg-emerald-50 text-emerald-900";
  }
  if (sampleCount > 0 && doneCount === sampleCount) {
    return "border border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border border-red-200 bg-red-50 text-red-900";
}

export function formatRequestStatusForSummary(
  status: RequestStatus,
  doneCount: number,
  sampleCount: number,
): string {
  if (status === REQUEST_STATUS_SHIPPED) return "Shipped";
  if (sampleCount > 0 && doneCount === sampleCount) return "Ready to ship";
  return "Active";
}

export function normalizeRequestStatus(value: string | null | undefined): RequestStatus {
  return value === REQUEST_STATUS_SHIPPED ? REQUEST_STATUS_SHIPPED : REQUEST_STATUS_NEW;
}
