import { NextResponse } from "next/server";
import {
  sendNewRequestNotification,
  sendRequestReceivedConfirmation,
} from "@/lib/email";
import {
  createRequest,
  ensureSchema,
  getRequestStatusCounts,
  listRequestSummaries,
} from "@/lib/requests";
import { validateCreateRequest } from "@/lib/validation";
import type { CreateRequestPayload, RequestStatusFilter } from "@/lib/types";

function parseStatusFilter(value: string | null): RequestStatusFilter {
  if (value === "shipped") return "shipped";
  if (value === "all") return "all";
  return "new";
}

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const listFilters = {
      search: searchParams.get("search") ?? undefined,
      origin: searchParams.get("origin") ?? undefined,
      destination: searchParams.get("destination") ?? undefined,
      status: parseStatusFilter(searchParams.get("status")),
    };
    const [requests, counts] = await Promise.all([
      listRequestSummaries(listFilters),
      getRequestStatusCounts(listFilters),
    ]);
    return NextResponse.json({ requests, counts });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not load requests." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as CreateRequestPayload;
    const errors = validateCreateRequest(payload);
    if (errors.length) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const result = await createRequest(payload);
    const header = result.lines[0];
    const emailPayload = {
      requestNumber: result.request_number,
      contactName: header.contact_name,
      email: header.email,
      requestOrigin: header.request_origin,
      destination: header.destination,
      dueDate: header.due_date,
      lines: result.lines,
    };

    const [teamNotify, requesterConfirm] = await Promise.all([
      sendNewRequestNotification(emailPayload),
      sendRequestReceivedConfirmation(emailPayload),
    ]);

    if (!teamNotify.ok) {
      console.warn("New request team email not sent:", teamNotify.message);
    }
    if (!requesterConfirm.ok) {
      console.warn("Requester confirmation email not sent:", requesterConfirm.message);
    }

    return NextResponse.json(
      {
        ...result,
        team_email_sent: teamNotify.ok,
        team_email_warning: teamNotify.ok ? null : teamNotify.message,
        requester_email_sent: requesterConfirm.ok,
        requester_email_warning: requesterConfirm.ok ? null : requesterConfirm.message,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save request." },
      { status: 500 },
    );
  }
}
