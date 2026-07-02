import { Resend } from "resend";
import { formatDisplayDate } from "@/lib/dates";
import { carrierTrackingUrl } from "@/lib/shipping";
import type { SampleLine } from "@/lib/types";

export type ShipmentEmailPayload = {
  requestNumber: string;
  recipientEmail: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  expectedDeliveryDate: string | null;
  lines: SampleLine[];
};

function buildShipmentEmailHtml(payload: ShipmentEmailPayload): string {
  const trackingUrl = carrierTrackingUrl(payload.carrier, payload.trackingNumber);
  const expectedDelivery = payload.expectedDeliveryDate
    ? formatDisplayDate(payload.expectedDeliveryDate)
    : null;

  const sampleRows = payload.lines
    .map(
      (line) =>
        `<tr>
          <td style="padding:8px 12px;border-top:1px solid #e5e5e5;font-family:monospace;">${escapeHtml(line.formula_code === "MANUAL" ? "—" : line.formula_code)}</td>
          <td style="padding:8px 12px;border-top:1px solid #e5e5e5;">${escapeHtml(line.formula_name)}</td>
          <td style="padding:8px 12px;border-top:1px solid #e5e5e5;">${line.num_samples}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:system-ui,sans-serif;color:#171717;max-width:560px;line-height:1.5;">
      <p>Hello,</p>
      <p>Your lab sample request <strong>${escapeHtml(payload.requestNumber)}</strong> has been shipped and is on its way.</p>
      <p><strong>Ship to:</strong> ${escapeHtml(payload.destination || "—")}</p>
      <p>
        <strong>Carrier:</strong> ${escapeHtml(payload.carrier)}<br />
        <strong>Tracking number:</strong> ${escapeHtml(payload.trackingNumber)}
        ${trackingUrl ? `<br /><a href="${trackingUrl}">Track your shipment</a>` : ""}
      </p>
      ${expectedDelivery ? `<p><strong>Expected delivery:</strong> ${escapeHtml(expectedDelivery)}</p>` : ""}
      <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 12px;background:#f5f5f5;">Code</th>
            <th style="text-align:left;padding:8px 12px;background:#f5f5f5;">Formula</th>
            <th style="text-align:left;padding:8px 12px;background:#f5f5f5;">Samples</th>
          </tr>
        </thead>
        <tbody>${sampleRows}</tbody>
      </table>
      <p style="margin-top:24px;color:#737373;font-size:13px;">This is an automated message from Kobo sample requests.</p>
    </div>
  `;
}

function buildShipmentEmailText(payload: ShipmentEmailPayload): string {
  const trackingUrl = carrierTrackingUrl(payload.carrier, payload.trackingNumber);
  const expectedDelivery = payload.expectedDeliveryDate
    ? formatDisplayDate(payload.expectedDeliveryDate)
    : null;

  const sampleLines = payload.lines
    .map((line) => {
      const code = line.formula_code === "MANUAL" ? "—" : line.formula_code;
      return `- ${code} · ${line.formula_name} · ${line.num_samples} sample(s)`;
    })
    .join("\n");

  return [
    "Hello,",
    "",
    `Your lab sample request ${payload.requestNumber} has been shipped and is on its way.`,
    "",
    `Ship to: ${payload.destination || "—"}`,
    `Carrier: ${payload.carrier}`,
    `Tracking number: ${payload.trackingNumber}`,
    trackingUrl ? `Track: ${trackingUrl}` : "",
    expectedDelivery ? `Expected delivery: ${expectedDelivery}` : "",
    "",
    "Samples:",
    sampleLines,
    "",
    "This is an automated message from Kobo sample requests.",
  ]
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type SendShipmentEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "send_failed"; message: string };

export async function sendShipmentNotification(
  payload: ShipmentEmailPayload,
): Promise<SendShipmentEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey || !from) {
    const missing = [
      !apiKey ? "RESEND_API_KEY" : null,
      !from ? "RESEND_FROM" : null,
    ].filter(Boolean);
    return {
      ok: false,
      reason: "not_configured",
      message: `${missing.join(" and ")} is not set in .env.local. Restart the server after saving.`,
    };
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: payload.recipientEmail,
      subject: `Your samples are on the way — ${payload.requestNumber}`,
      html: buildShipmentEmailHtml(payload),
      text: buildShipmentEmailText(payload),
    });

    if (error) {
      return {
        ok: false,
        reason: "send_failed",
        message: error.message,
      };
    }

    return { ok: true, id: data?.id ?? "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send email.";
    return { ok: false, reason: "send_failed", message };
  }
}
