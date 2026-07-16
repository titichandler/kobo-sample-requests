"use client";

import { useEffect, useId, useState } from "react";

export type ShipBatchFormValues = {
  send_email: boolean;
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
  const [step, setStep] = useState<"email" | "details">("email");
  const [sendEmail, setSendEmail] = useState(true);
  const [carrier, setCarrier] = useState("FedEx");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");

  useEffect(() => {
    if (!requestNumber) return;
    setStep("email");
    setSendEmail(true);
    setCarrier("FedEx");
    setTrackingNumber("");
    setExpectedDeliveryDate("");
  }, [requestNumber]);

  if (!requestNumber) return null;

  function handleDetailsSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit({
      send_email: sendEmail,
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

        {step === "email" ? (
          <>
            <p className="type-muted mt-2">
              Do you want to send a confirmation email to the requester with tracking details?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting}
                onClick={() => {
                  setSendEmail(false);
                  setStep("details");
                }}
              >
                No, skip email
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={submitting}
                onClick={() => {
                  setSendEmail(true);
                  setStep("details");
                }}
              >
                Yes, send email
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="type-muted mt-2">
              Enter tracking and estimated delivery. These are saved on the request
              {sendEmail ? " and included in the email." : "."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleDetailsSubmit}>
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
                <span className="field-label">Estimated delivery (optional)</span>
                <input
                  className="field-input"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(event) => setExpectedDeliveryDate(event.target.value)}
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setStep("email")}
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting || !trackingNumber.trim()}
                >
                  {submitting
                    ? "Shipping..."
                    : sendEmail
                      ? "Ship and notify"
                      : "Ship without email"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
