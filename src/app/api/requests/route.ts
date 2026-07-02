import { NextResponse } from "next/server";
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
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not save request." },
      { status: 500 },
    );
  }
}
