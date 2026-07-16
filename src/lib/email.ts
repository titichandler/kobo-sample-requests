import { Resend } from "resend";
import { displayFormulaCode, formatEmailDeliveryDate } from "@/lib/dates";
import { carrierTrackingUrl } from "@/lib/shipping";
import type { SampleLine } from "@/lib/types";

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "send_failed"; message: string };

export type ShipmentEmailPayload = {
  requestNumber: string;
  recipientEmail: string;
  contactName: string;
  destination: string;
  carrier: string;
  trackingNumber: string;
  expectedDeliveryDate: string | null;
  lines: SampleLine[];
};

export type NewRequestEmailPayload = {
  requestNumber: string;
  contactName: string;
  email: string;
  requestOrigin: string;
  destination: string;
  dueDate: string | null;
  lines: SampleLine[];
};

const DEFAULT_TEAM_NOTIFY_EMAILS = [
  "udhamnaskar@koboproductsinc.com",
  "SNg@koboproductsinc.com",
  "TChandler@koboproductsinc.com",
];

function normalizeFromAddress(value: string | undefined): string {
  let from = (value ?? "").trim();
  // Strip wrapping quotes often pasted into Vercel / .env files
  from = from.replace(/^["'`]+|["'`]+$/g, "").trim();
  // Normalize odd spacing around angle brackets
  from = from.replace(/\s*<\s*/g, " <").replace(/\s*>\s*/g, ">").trim();
  return from;
}

function getResendClient(): { resend: Resend; from: string } | { error: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = normalizeFromAddress(process.env.RESEND_FROM);
  if (!apiKey || !from) {
    const missing = [
      !apiKey ? "RESEND_API_KEY" : null,
      !from ? "RESEND_FROM" : null,
    ].filter(Boolean);
    return {
      error: `${missing.join(" and ")} is not set. Add them in .env.local / Vercel and restart.`,
    };
  }

  const looksValid =
    /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/.test(from) ||
    /^.+\s<[^\s<>]+@[^\s<>]+\.[^\s<>]+>$/.test(from);
  if (!looksValid) {
    return {
      error:
        'RESEND_FROM must look like samples@requestsample.co.uk or Kobo Samples <samples@requestsample.co.uk> (no surrounding quotes).',
    };
  }

  return { resend: new Resend(apiKey), from };
}

function getTeamNotifyEmails(): string[] {
  const fromEnv = process.env.REQUEST_NOTIFY_EMAILS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
  }
  return DEFAULT_TEAM_NOTIFY_EMAILS;
}

function formatSampleLine(line: SampleLine): string {
  const code = displayFormulaCode(line.formula_code);
  return `${code} x ${line.num_samples}`;
}

function greetingName(contactName: string): string {
  const first = contactName.trim().split(/\s+/)[0];
  return first || "there";
}

function buildShipmentEmailHtml(payload: ShipmentEmailPayload): string {
  const trackingUrl = carrierTrackingUrl(payload.carrier, payload.trackingNumber);
  const expectedDelivery = formatEmailDeliveryDate(payload.expectedDeliveryDate);
  const sampleList = payload.lines
    .map((line) => `<li style="margin:4px 0;">${escapeHtml(formatSampleLine(line))}</li>`)
    .join("");

  return `
    <div style="font-family:system-ui,sans-serif;color:#171717;max-width:560px;line-height:1.5;">
      <p>Hi ${escapeHtml(greetingName(payload.contactName))},</p>
      <p>I have sent the following to you via ${escapeHtml(payload.carrier)}:</p>
      <ul style="padding-left:20px;margin:16px 0;">${sampleList}</ul>
      <p>
        <strong>${escapeHtml(payload.carrier)} Tracking:</strong>
        ${
          trackingUrl
            ? `<a href="${trackingUrl}">${escapeHtml(payload.trackingNumber)}</a>`
            : escapeHtml(payload.trackingNumber)
        }
      </p>
      ${
        expectedDelivery
          ? `<p><strong>Estimated Delivery:</strong> ${escapeHtml(expectedDelivery)}</p>`
          : ""
      }
      <p style="margin-top:24px;color:#737373;font-size:13px;">
        Request reference: ${escapeHtml(payload.requestNumber)} · Ship to: ${escapeHtml(payload.destination || "—")}
      </p>
    </div>
  `;
}

function buildShipmentEmailText(payload: ShipmentEmailPayload): string {
  const trackingUrl = carrierTrackingUrl(payload.carrier, payload.trackingNumber);
  const expectedDelivery = formatEmailDeliveryDate(payload.expectedDeliveryDate);
  const sampleLines = payload.lines.map((line) => formatSampleLine(line)).join("\n");

  return [
    `Hi ${greetingName(payload.contactName)},`,
    "",
    `I have sent the following to you via ${payload.carrier}:`,
    "",
    sampleLines,
    "",
    `${payload.carrier} Tracking: ${payload.trackingNumber}`,
    trackingUrl ? `Track: ${trackingUrl}` : "",
    expectedDelivery ? `Estimated Delivery: ${expectedDelivery}` : "",
    "",
    `Request reference: ${payload.requestNumber}`,
    `Ship to: ${payload.destination || "—"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildNewRequestEmailHtml(payload: NewRequestEmailPayload): string {
  const sampleRows = payload.lines
    .map(
      (line) =>
        `<tr>
          <td style="padding:8px 12px;border-top:1px solid #e5e5e5;font-family:monospace;">${escapeHtml(displayFormulaCode(line.formula_code))}</td>
          <td style="padding:8px 12px;border-top:1px solid #e5e5e5;">${escapeHtml(line.formula_name)}</td>
          <td style="padding:8px 12px;border-top:1px solid #e5e5e5;">${line.num_samples}</td>
        </tr>`,
    )
    .join("");

  return `
    <div style="font-family:system-ui,sans-serif;color:#171717;max-width:560px;line-height:1.5;">
      <p>A new sample request was submitted.</p>
      <p>
        <strong>Request:</strong> ${escapeHtml(payload.requestNumber)}<br />
        <strong>Name:</strong> ${escapeHtml(payload.contactName)}<br />
        <strong>Email:</strong> ${escapeHtml(payload.email)}<br />
        <strong>Requested from:</strong> ${escapeHtml(payload.requestOrigin)}<br />
        <strong>Ship to:</strong> ${escapeHtml(payload.destination)}
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 12px;background:#f5f5f5;">Code</th>
            <th style="text-align:left;padding:8px 12px;background:#f5f5f5;">Formula</th>
            <th style="text-align:left;padding:8px 12px;background:#f5f5f5;">Samples</th>
          </tr>
        </thead>
        <tbody>${sampleRows}</tbody>
      </table>
    </div>
  `;
}

function buildNewRequestEmailText(payload: NewRequestEmailPayload): string {
  const sampleLines = payload.lines
    .map((line) => `- ${displayFormulaCode(line.formula_code)} · ${line.formula_name} · ${line.num_samples}`)
    .join("\n");

  return [
    "A new sample request was submitted.",
    "",
    `Request: ${payload.requestNumber}`,
    `Name: ${payload.contactName}`,
    `Email: ${payload.email}`,
    `Requested from: ${payload.requestOrigin}`,
    `Ship to: ${payload.destination}`,
    "",
    "Samples:",
    sampleLines,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendShipmentNotification(
  payload: ShipmentEmailPayload,
): Promise<SendEmailResult> {
  const client = getResendClient();
  if ("error" in client) {
    return { ok: false, reason: "not_configured", message: client.error };
  }

  try {
    const { data, error } = await client.resend.emails.send({
      from: client.from,
      to: payload.recipientEmail,
      subject: `Your samples are on the way — ${payload.requestNumber}`,
      html: buildShipmentEmailHtml(payload),
      text: buildShipmentEmailText(payload),
    });

    if (error) {
      return { ok: false, reason: "send_failed", message: error.message };
    }
    return { ok: true, id: data?.id ?? "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send email.";
    return { ok: false, reason: "send_failed", message };
  }
}

export async function sendNewRequestNotification(
  payload: NewRequestEmailPayload,
): Promise<SendEmailResult> {
  const client = getResendClient();
  if ("error" in client) {
    return { ok: false, reason: "not_configured", message: client.error };
  }

  const recipients = getTeamNotifyEmails();
  if (!recipients.length) {
    return { ok: false, reason: "not_configured", message: "No team notify emails configured." };
  }

  try {
    const { data, error } = await client.resend.emails.send({
      from: client.from,
      to: recipients,
      subject: `New sample request — ${payload.requestNumber}`,
      html: buildNewRequestEmailHtml(payload),
      text: buildNewRequestEmailText(payload),
    });

    if (error) {
      return { ok: false, reason: "send_failed", message: error.message };
    }
    return { ok: true, id: data?.id ?? "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send email.";
    return { ok: false, reason: "send_failed", message };
  }
}

/** @deprecated Use SendEmailResult */
export type SendShipmentEmailResult = SendEmailResult;
