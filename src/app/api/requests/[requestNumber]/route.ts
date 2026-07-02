import { NextResponse } from "next/server";
import {
  ensureSchema,
  getRequestBatch,
  getRequestLines,
  shipRequestWithNotification,
  updateRequestStatus,
} from "@/lib/requests";
import { normalizeRequestStatus } from "@/lib/requestStatus";
import {
  REQUEST_STATUS_NEW,
  REQUEST_STATUS_SHIPPED,
  type RequestStatus,
  type ShippingDetails,
} from "@/lib/types";

type RouteContext = { params: Promise<{ requestNumber: string }> };

function parseStatus(value: unknown): RequestStatus | null {
  if (value === REQUEST_STATUS_SHIPPED || value === REQUEST_STATUS_NEW) {
    return value;
  }
  return null;
}

function parseShippingDetails(body: Record<string, unknown>): ShippingDetails | null {
  const tracking_number =
    typeof body.tracking_number === "string" ? body.tracking_number.trim() : "";
  if (!tracking_number) return null;

  const carrier = typeof body.carrier === "string" && body.carrier.trim() ? body.carrier.trim() : "FedEx";
  const expected_delivery_date =
    typeof body.expected_delivery_date === "string" && body.expected_delivery_date.trim()
      ? body.expected_delivery_date.trim()
      : null;

  return { carrier, tracking_number, expected_delivery_date };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await ensureSchema();
    const { requestNumber } = await context.params;
    const lines = await getRequestLines(requestNumber);
    if (!lines.length) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    const batch = await getRequestBatch(requestNumber);
    return NextResponse.json({
      request_number: requestNumber,
      status: batch?.status ?? REQUEST_STATUS_NEW,
      shipped_at: batch?.shipped_at ?? null,
      carrier: batch?.carrier ?? null,
      tracking_number: batch?.tracking_number ?? null,
      expected_delivery_date: batch?.expected_delivery_date ?? null,
      lines,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load request." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureSchema();
    const { requestNumber } = await context.params;
    const lines = await getRequestLines(requestNumber);
    if (!lines.length) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const status = parseStatus(body.status);
    if (!status) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    if (status === REQUEST_STATUS_SHIPPED) {
      const shipping = parseShippingDetails(body);
      if (!shipping) {
        return NextResponse.json(
          { error: "Tracking number is required to ship." },
          { status: 400 },
        );
      }

      const { batch, email } = await shipRequestWithNotification(requestNumber, shipping);

      return NextResponse.json({
        request_number: requestNumber,
        status: normalizeRequestStatus(batch.status),
        shipped_at: batch.shipped_at,
        carrier: batch.carrier,
        tracking_number: batch.tracking_number,
        expected_delivery_date: batch.expected_delivery_date,
        email_sent: email.ok,
        email_warning: email.ok ? null : email.message,
      });
    }

    const batch = await updateRequestStatus(requestNumber, REQUEST_STATUS_NEW);
    return NextResponse.json({
      request_number: requestNumber,
      status: normalizeRequestStatus(batch.status),
      shipped_at: batch.shipped_at,
      carrier: batch.carrier,
      tracking_number: batch.tracking_number,
      expected_delivery_date: batch.expected_delivery_date,
      email_sent: false,
      email_warning: null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_READY_TO_SHIP") {
      return NextResponse.json(
        { error: "All formulas must be done before shipping." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "TRACKING_REQUIRED") {
      return NextResponse.json(
        { error: "Tracking number is required to ship." },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not update request status." },
      { status: 500 },
    );
  }
}
