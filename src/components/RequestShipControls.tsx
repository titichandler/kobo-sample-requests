"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REQUEST_STATUS_NEW, REQUEST_STATUS_SHIPPED, type RequestStatus } from "@/lib/types";

type RequestShipControlsProps = {
  requestNumber: string;
  status: RequestStatus;
  compact?: boolean;
};

export function RequestShipControls({
  requestNumber,
  status,
  compact = false,
}: RequestShipControlsProps) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(nextStatus: RequestStatus) {
    setUpdating(true);
    setError("");
    try {
      const response = await fetch(`/api/requests/${requestNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error ?? "Could not update status.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update status.");
    } finally {
      setUpdating(false);
    }
  }

  const isShipped = status === REQUEST_STATUS_SHIPPED;

  if (compact) {
    return (
      <label className="inline-flex items-center gap-2 text-sm text-ink-muted">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-line text-ink focus:ring-ink"
          checked={isShipped}
          disabled={updating}
          onChange={(event) =>
            void setStatus(event.target.checked ? REQUEST_STATUS_SHIPPED : REQUEST_STATUS_NEW)
          }
          aria-label={`Mark ${requestNumber} as shipped`}
        />
        <span className="sr-only">Sent</span>
      </label>
    );
  }

  return (
    <div className="space-y-2">
      {isShipped ? (
        <button
          type="button"
          className="btn-secondary"
          disabled={updating}
          onClick={() => void setStatus(REQUEST_STATUS_NEW)}
        >
          {updating ? "Updating..." : "Mark as not shipped"}
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary"
          disabled={updating}
          onClick={() => void setStatus(REQUEST_STATUS_SHIPPED)}
        >
          {updating ? "Updating..." : "Mark as shipped"}
        </button>
      )}
      {error ? <p className="notice-error">{error}</p> : null}
    </div>
  );
}
