"use client";

import { useEffect, useId, useState } from "react";

export type ShipBatchFormValues = {
  carrier: string;
  tracking_number: string;
  expected_delivery_date: string;
};

type ShipBatchModalProps = {
  requestNumber: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: ShipBatchFormValues) => void;
};

export function ShipBatchModal({
  requestNumber,
  submitting,
  onClose,
  onSubmit,
}: ShipBatchModalProps) {
  const titleId = useId();
  const [carrier, setCarrier] = useState("FedEx");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");

  useEffect(() => {
    if (!requestNumber) return;
    setCarrier("FedEx");
    setTrackingNumber("");
    setExpectedDeliveryDate("");
  }, [requestNumber]);

  if (!requestNumber) return null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      carrier,
      tracking_number: trackingNumber.trim(),
      expected_delivery_date: expectedDeliveryDate,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label="Close ship dialog"
        onClick={onClose}
        disabled={submitting}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-lg"
      >
        <h2 id={titleId} className="type-card-title">
          Ship {requestNumber}
        </h2>
        <p className="type-muted mt-2">
          Enter shipping details. The requester will receive a confirmation email.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="field-label">Carrier</span>
            <input
              className="field-input"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder="FedEx"
            />
          </label>
          <label className="block">
            <span className="field-label">Tracking number *</span>
            <input
              className="field-input"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="FedEx tracking number"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="field-label">Expected delivery (optional)</span>
            <input
              className="field-input"
              type="date"
              value={expectedDeliveryDate}
              onChange={(event) => setExpectedDeliveryDate(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting || !trackingNumber.trim()}>
              {submitting ? "Shipping..." : "Ship and notify"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
