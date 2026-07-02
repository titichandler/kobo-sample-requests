import { getSql } from "./db";
import { isValidStageTransition } from "./formulaStage";
import {
  FORMULA_STAGE_CLASSIFY,
  FORMULA_STAGE_DONE,
  FORMULA_STAGE_FILL,
  FORMULA_STAGE_MAKE,
  REQUEST_NUMBER_PREFIX,
  REQUEST_STATUS_NEW,
  REQUEST_STATUS_SHIPPED,
} from "./types";
import type {
  CreateRequestPayload,
  FormulaOption,
  FormulaStage,
  ReadyToShipBatch,
  RequestBatch,
  RequestStatusCounts,
  RequestStatusFilter,
  RequestSummary,
  ReviewBoardData,
  SampleLine,
  ShippedBatchSummary,
  ShippingDetails,
} from "./types";
import { sendShipmentNotification, type SendShipmentEmailResult } from "./email";

function parseRequestNumberSuffix(value: string): number | null {
  if (!value.startsWith(REQUEST_NUMBER_PREFIX)) return null;
  const suffix = value.slice(REQUEST_NUMBER_PREFIX.length);
  if (suffix.length === 4 && /^\d+$/.test(suffix)) {
    return Number(suffix);
  }
  return null;
}

async function allocateNextRequestNumber(): Promise<string> {
  const sql = getSql();
  const rows = (await sql`
    SELECT DISTINCT request_number
    FROM sample_requests
    WHERE request_number <> ''
  `) as { request_number: string }[];

  let highest = 0;
  for (const row of rows) {
    const parsed = parseRequestNumberSuffix(row.request_number);
    if (parsed !== null) {
      highest = Math.max(highest, parsed);
    }
  }

  return `${REQUEST_NUMBER_PREFIX}${String(highest + 1).padStart(4, "0")}`;
}

export async function ensureSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS formula_library (
      id SERIAL PRIMARY KEY,
      formula_code VARCHAR(64) NOT NULL UNIQUE,
      formula_name VARCHAR(255) NOT NULL,
      formula_type VARCHAR(64) NOT NULL DEFAULT ''
    )
  `;
  await sql`
    ALTER TABLE formula_library
    ADD COLUMN IF NOT EXISTS formula_type VARCHAR(64) NOT NULL DEFAULT ''
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sample_requests (
      id SERIAL PRIMARY KEY,
      request_number VARCHAR(12) NOT NULL,
      formula_code VARCHAR(64) NOT NULL,
      formula_name VARCHAR(255) NOT NULL,
      num_samples INTEGER NOT NULL,
      due_date DATE,
      destination VARCHAR(255) NOT NULL DEFAULT '',
      request_origin VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE sample_requests
    ADD COLUMN IF NOT EXISTS destination VARCHAR(255) NOT NULL DEFAULT ''
  `;
  await sql`
    ALTER TABLE sample_requests
    ADD COLUMN IF NOT EXISTS stage VARCHAR(20) NOT NULL DEFAULT 'classify'
  `;
  await sql`
    ALTER TABLE sample_requests
    ALTER COLUMN stage SET DEFAULT 'classify'
  `;
  await sql`
    UPDATE sample_requests AS sr
    SET stage = ${FORMULA_STAGE_DONE}
    FROM request_batches AS rb
    WHERE rb.request_number = sr.request_number
      AND rb.status = ${REQUEST_STATUS_SHIPPED}
      AND sr.stage <> ${FORMULA_STAGE_DONE}
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS request_batches (
      request_number VARCHAR(12) PRIMARY KEY,
      status VARCHAR(20) NOT NULL DEFAULT 'new',
      shipped_at TIMESTAMP,
      carrier VARCHAR(64),
      tracking_number VARCHAR(128),
      expected_delivery_date DATE,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE request_batches
    ADD COLUMN IF NOT EXISTS carrier VARCHAR(64)
  `;
  await sql`
    ALTER TABLE request_batches
    ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(128)
  `;
  await sql`
    ALTER TABLE request_batches
    ADD COLUMN IF NOT EXISTS expected_delivery_date DATE
  `;
  await sql`
    ALTER TABLE request_batches
    ADD COLUMN IF NOT EXISTS hidden_from_view_at TIMESTAMP
  `;
  await backfillMissingBatches();
}

async function backfillMissingBatches(): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO request_batches (request_number, status)
    SELECT DISTINCT request_number, ${REQUEST_STATUS_NEW}
    FROM sample_requests
    WHERE request_number <> ''
    ON CONFLICT (request_number) DO NOTHING
  `;
}

export async function listFormulas(): Promise<FormulaOption[]> {
  const sql = getSql();
  return (await sql`
    SELECT formula_code, formula_name, formula_type
    FROM formula_library
    ORDER BY formula_code
  `) as FormulaOption[];
}


export async function listActiveLinesByStage(
  stage: FormulaStage,
  search?: string,
): Promise<SampleLine[]> {
  const sql = getSql();
  const searchTerm = search?.trim() || null;

  return (await sql`
    SELECT
      sr.id,
      sr.request_number,
      sr.formula_code,
      sr.formula_name,
      sr.num_samples,
      sr.due_date::text,
      sr.destination,
      sr.request_origin,
      sr.email,
      sr.created_at::text,
      sr.stage
    FROM sample_requests sr
    LEFT JOIN request_batches rb ON rb.request_number = sr.request_number
    WHERE COALESCE(rb.status, ${REQUEST_STATUS_NEW}) <> ${REQUEST_STATUS_SHIPPED}
      AND sr.stage = ${stage}
      AND (${searchTerm}::text IS NULL OR (
        sr.request_number ILIKE '%' || ${searchTerm} || '%'
        OR sr.email ILIKE '%' || ${searchTerm} || '%'
        OR sr.request_origin ILIKE '%' || ${searchTerm} || '%'
        OR sr.destination ILIKE '%' || ${searchTerm} || '%'
        OR sr.formula_code ILIKE '%' || ${searchTerm} || '%'
        OR sr.formula_name ILIKE '%' || ${searchTerm} || '%'
      ))
    ORDER BY sr.created_at DESC, sr.request_number, sr.id
  `) as SampleLine[];
}

export async function listReadyToShipBatches(search?: string): Promise<ReadyToShipBatch[]> {
  const sql = getSql();
  const searchTerm = search?.trim() || null;

  return (await sql`
    WITH batch_lines AS (
      SELECT
        sr.request_number,
        MAX(sr.email) AS email,
        MAX(sr.request_origin) AS request_origin,
        MAX(sr.destination) AS destination,
        MAX(sr.created_at)::text AS created_at,
        COUNT(*)::int AS formula_count,
        COUNT(*) FILTER (WHERE sr.stage = ${FORMULA_STAGE_DONE})::int AS done_count
      FROM sample_requests sr
      LEFT JOIN request_batches rb ON rb.request_number = sr.request_number
      WHERE COALESCE(rb.status, ${REQUEST_STATUS_NEW}) <> ${REQUEST_STATUS_SHIPPED}
      GROUP BY sr.request_number
    )
    SELECT
      request_number,
      email,
      request_origin,
      destination,
      created_at,
      formula_count,
      done_count
    FROM batch_lines
    WHERE formula_count = done_count
      AND done_count > 0
      AND (${searchTerm}::text IS NULL OR (
        request_number ILIKE '%' || ${searchTerm} || '%'
        OR email ILIKE '%' || ${searchTerm} || '%'
        OR destination ILIKE '%' || ${searchTerm} || '%'
      ))
    ORDER BY created_at DESC
  `) as ReadyToShipBatch[];
}

export async function listShippedBatchSummaries(search?: string): Promise<ShippedBatchSummary[]> {
  const sql = getSql();
  const searchTerm = search?.trim() || null;

  return (await sql`
    WITH batch_lines AS (
      SELECT
        sr.request_number,
        MAX(sr.email) AS email,
        MAX(sr.destination) AS destination,
        COUNT(*)::int AS formula_count
      FROM sample_requests sr
      INNER JOIN request_batches rb ON rb.request_number = sr.request_number
      WHERE rb.status = ${REQUEST_STATUS_SHIPPED}
      GROUP BY sr.request_number
    )
    SELECT
      batch_lines.request_number,
      batch_lines.email,
      batch_lines.destination,
      rb.shipped_at::text AS shipped_at,
      batch_lines.formula_count,
      rb.carrier,
      rb.tracking_number,
      rb.expected_delivery_date::text AS expected_delivery_date
    FROM batch_lines
    INNER JOIN request_batches rb ON rb.request_number = batch_lines.request_number
    WHERE rb.hidden_from_view_at IS NULL
      AND rb.shipped_at IS NOT NULL
      AND rb.shipped_at >= NOW() - INTERVAL '2 months'
      AND (${searchTerm}::text IS NULL OR (
      batch_lines.request_number ILIKE '%' || ${searchTerm} || '%'
      OR batch_lines.email ILIKE '%' || ${searchTerm} || '%'
      OR batch_lines.destination ILIKE '%' || ${searchTerm} || '%'
    ))
    ORDER BY rb.shipped_at DESC NULLS LAST, batch_lines.request_number DESC
  `) as ShippedBatchSummary[];
}

export async function getReviewBoard(search?: string): Promise<ReviewBoardData> {
  const [classify, make, fill, done, readyToShip, shipped] = await Promise.all([
    listActiveLinesByStage(FORMULA_STAGE_CLASSIFY, search),
    listActiveLinesByStage(FORMULA_STAGE_MAKE, search),
    listActiveLinesByStage(FORMULA_STAGE_FILL, search),
    listActiveLinesByStage(FORMULA_STAGE_DONE, search),
    listReadyToShipBatches(search),
    listShippedBatchSummaries(search),
  ]);

  return { classify, make, fill, done, readyToShip, shipped };
}

export async function getSampleLine(lineId: number): Promise<SampleLine | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      id,
      request_number,
      formula_code,
      formula_name,
      num_samples,
      due_date::text,
      destination,
      request_origin,
      email,
      created_at::text,
      stage
    FROM sample_requests
    WHERE id = ${lineId}
  `) as SampleLine[];

  return rows[0] ?? null;
}

export async function updateLineStage(
  lineId: number,
  stage: FormulaStage,
): Promise<SampleLine> {
  const sql = getSql();
  const existing = await getSampleLine(lineId);
  if (!existing) {
    throw new Error("LINE_NOT_FOUND");
  }

  const batch = await getRequestBatch(existing.request_number);
  if (batch?.status === REQUEST_STATUS_SHIPPED) {
    throw new Error("BATCH_SHIPPED");
  }

  if (!isValidStageTransition(existing.stage, stage)) {
    throw new Error("INVALID_STAGE_TRANSITION");
  }

  const rows = (await sql`
    UPDATE sample_requests
    SET stage = ${stage}
    WHERE id = ${lineId}
    RETURNING
      id,
      request_number,
      formula_code,
      formula_name,
      num_samples,
      due_date::text,
      destination,
      request_origin,
      email,
      created_at::text,
      stage
  `) as SampleLine[];

  return rows[0];
}

export async function batchIsReadyToShip(requestNumber: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      COUNT(*)::int AS formula_count,
      COUNT(*) FILTER (WHERE stage = ${FORMULA_STAGE_DONE})::int AS done_count
    FROM sample_requests
    WHERE request_number = ${requestNumber}
  `) as { formula_count: number; done_count: number }[];

  const row = rows[0];
  return Boolean(row && row.formula_count > 0 && row.formula_count === row.done_count);
}

type RequestListFilters = {
  search?: string;
  origin?: string;
  destination?: string;
  status?: RequestStatusFilter;
};

function normalizeListFilters(filters?: RequestListFilters) {
  const status =
    filters?.status && filters.status !== "all" ? filters.status : null;

  return {
    search: filters?.search?.trim() || null,
    origin: filters?.origin?.trim() || null,
    destination: filters?.destination?.trim() || null,
    status,
  };
}

export async function getRequestStatusCounts(
  filters?: Omit<RequestListFilters, "status">,
): Promise<RequestStatusCounts> {
  const sql = getSql();
  const { search, origin, destination } = normalizeListFilters(filters);

  const rows = (await sql`
    WITH grouped AS (
      SELECT request_number
      FROM sample_requests
      WHERE (${search}::text IS NULL OR (
        request_number ILIKE '%' || ${search} || '%'
        OR email ILIKE '%' || ${search} || '%'
        OR request_origin ILIKE '%' || ${search} || '%'
        OR destination ILIKE '%' || ${search} || '%'
      ))
      AND (${origin}::text IS NULL OR request_origin ILIKE '%' || ${origin} || '%')
      AND (${destination}::text IS NULL OR destination ILIKE '%' || ${destination} || '%')
      GROUP BY request_number
    )
    SELECT
      COUNT(*) FILTER (
        WHERE COALESCE(request_batches.status, ${REQUEST_STATUS_NEW}) = ${REQUEST_STATUS_NEW}
      )::int AS new_count,
      COUNT(*) FILTER (
        WHERE COALESCE(request_batches.status, ${REQUEST_STATUS_NEW}) = ${REQUEST_STATUS_SHIPPED}
      )::int AS shipped_count,
      COUNT(*)::int AS all_count
    FROM grouped
    LEFT JOIN request_batches
      ON request_batches.request_number = grouped.request_number
  `) as {
    new_count: number;
    shipped_count: number;
    all_count: number;
  }[];

  const row = rows[0];
  return {
    new: row?.new_count ?? 0,
    shipped: row?.shipped_count ?? 0,
    all: row?.all_count ?? 0,
  };
}

export async function listRequestSummaries(
  filters?: RequestListFilters,
): Promise<RequestSummary[]> {
  const sql = getSql();
  const { search, origin, destination, status } = normalizeListFilters(filters);

  return (await sql`
    WITH grouped AS (
      SELECT
        request_number,
        MAX(email) AS email,
        MAX(request_origin) AS request_origin,
        MAX(destination) AS destination,
        MAX(due_date)::text AS due_date,
        MAX(created_at)::text AS created_at,
        COUNT(*)::int AS sample_count,
        SUM(num_samples)::int AS total_samples,
        COUNT(*) FILTER (WHERE stage = ${FORMULA_STAGE_CLASSIFY})::int AS classify_count,
        COUNT(*) FILTER (WHERE stage = ${FORMULA_STAGE_MAKE})::int AS make_count,
        COUNT(*) FILTER (WHERE stage = ${FORMULA_STAGE_FILL})::int AS fill_count,
        COUNT(*) FILTER (WHERE stage = ${FORMULA_STAGE_DONE})::int AS done_count
      FROM sample_requests
      WHERE (${search}::text IS NULL OR (
        request_number ILIKE '%' || ${search} || '%'
        OR email ILIKE '%' || ${search} || '%'
        OR request_origin ILIKE '%' || ${search} || '%'
        OR destination ILIKE '%' || ${search} || '%'
      ))
      AND (${origin}::text IS NULL OR request_origin ILIKE '%' || ${origin} || '%')
      AND (${destination}::text IS NULL OR destination ILIKE '%' || ${destination} || '%')
      GROUP BY request_number
    )
    SELECT
      grouped.request_number,
      grouped.email,
      grouped.request_origin,
      grouped.destination,
      grouped.due_date,
      grouped.created_at,
      grouped.sample_count,
      grouped.total_samples,
      grouped.classify_count,
      grouped.make_count,
      grouped.fill_count,
      grouped.done_count,
      COALESCE(request_batches.status, ${REQUEST_STATUS_NEW}) AS status,
      request_batches.shipped_at::text AS shipped_at,
      request_batches.hidden_from_view_at::text AS hidden_from_view_at
    FROM grouped
    LEFT JOIN request_batches
      ON request_batches.request_number = grouped.request_number
    WHERE (${status}::text IS NULL OR COALESCE(request_batches.status, ${REQUEST_STATUS_NEW}) = ${status})
    ORDER BY grouped.created_at DESC
  `) as RequestSummary[];
}

export async function getRequestLines(requestNumber: string): Promise<SampleLine[]> {
  const sql = getSql();
  return (await sql`
    SELECT
      id,
      request_number,
      formula_code,
      formula_name,
      num_samples,
      due_date::text,
      destination,
      request_origin,
      email,
      created_at::text,
      stage
    FROM sample_requests
    WHERE request_number = ${requestNumber}
    ORDER BY id
  `) as SampleLine[];
}

export async function getRequestBatch(requestNumber: string): Promise<RequestBatch | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      request_number,
      status,
      shipped_at::text,
      hidden_from_view_at::text,
      updated_at::text,
      carrier,
      tracking_number,
      expected_delivery_date::text
    FROM request_batches
    WHERE request_number = ${requestNumber}
  `) as RequestBatch[];

  return rows[0] ?? null;
}

export async function updateRequestStatus(
  requestNumber: string,
  status: typeof REQUEST_STATUS_NEW | typeof REQUEST_STATUS_SHIPPED,
  shipping?: ShippingDetails,
): Promise<RequestBatch> {
  const sql = getSql();

  if (status === REQUEST_STATUS_SHIPPED) {
    const ready = await batchIsReadyToShip(requestNumber);
    if (!ready) {
      throw new Error("NOT_READY_TO_SHIP");
    }

    const trackingNumber = shipping?.tracking_number?.trim() ?? "";
    if (!trackingNumber) {
      throw new Error("TRACKING_REQUIRED");
    }

    const carrier = shipping?.carrier?.trim() || "FedEx";
    const expectedDelivery = shipping?.expected_delivery_date?.trim() || null;

    const rows = (await sql`
      INSERT INTO request_batches (
        request_number,
        status,
        shipped_at,
        carrier,
        tracking_number,
        expected_delivery_date
      )
      VALUES (
        ${requestNumber},
        ${REQUEST_STATUS_SHIPPED},
        NOW(),
        ${carrier},
        ${trackingNumber},
        ${expectedDelivery}
      )
      ON CONFLICT (request_number) DO UPDATE
      SET
        status = ${REQUEST_STATUS_SHIPPED},
        shipped_at = NOW(),
        carrier = ${carrier},
        tracking_number = ${trackingNumber},
        expected_delivery_date = ${expectedDelivery},
        hidden_from_view_at = NULL,
        updated_at = NOW()
      RETURNING
        request_number,
        status,
        shipped_at::text,
        hidden_from_view_at::text,
        updated_at::text,
        carrier,
        tracking_number,
        expected_delivery_date::text
    `) as RequestBatch[];
    return rows[0];
  }

  const rows = (await sql`
    INSERT INTO request_batches (request_number, status)
    VALUES (${requestNumber}, ${REQUEST_STATUS_NEW})
    ON CONFLICT (request_number) DO UPDATE
    SET
      status = ${REQUEST_STATUS_NEW},
      shipped_at = NULL,
      carrier = NULL,
      tracking_number = NULL,
      expected_delivery_date = NULL,
      hidden_from_view_at = NULL,
      updated_at = NOW()
    RETURNING
      request_number,
      status,
      shipped_at::text,
      hidden_from_view_at::text,
      updated_at::text,
      carrier,
      tracking_number,
      expected_delivery_date::text
  `) as RequestBatch[];

  return rows[0];
}

export async function hideShippedBatchFromView(requestNumber: string): Promise<RequestBatch> {
  const sql = getSql();
  const batch = await getRequestBatch(requestNumber);
  if (!batch) {
    throw new Error("REQUEST_NOT_FOUND");
  }
  if (batch.status !== REQUEST_STATUS_SHIPPED) {
    throw new Error("NOT_SHIPPED");
  }

  const rows = (await sql`
    UPDATE request_batches
    SET
      hidden_from_view_at = NOW(),
      updated_at = NOW()
    WHERE request_number = ${requestNumber}
    RETURNING
      request_number,
      status,
      shipped_at::text,
      hidden_from_view_at::text,
      updated_at::text,
      carrier,
      tracking_number,
      expected_delivery_date::text
  `) as RequestBatch[];

  return rows[0];
}

export async function shipRequestWithNotification(
  requestNumber: string,
  shipping: ShippingDetails,
): Promise<{
  batch: RequestBatch;
  email: SendShipmentEmailResult;
}> {
  const lines = await getRequestLines(requestNumber);
  if (!lines.length) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  const batch = await updateRequestStatus(requestNumber, REQUEST_STATUS_SHIPPED, shipping);
  const header = lines[0];

  const email = await sendShipmentNotification({
    requestNumber,
    recipientEmail: header.email,
    destination: header.destination,
    carrier: batch.carrier ?? shipping.carrier,
    trackingNumber: batch.tracking_number ?? shipping.tracking_number,
    expectedDeliveryDate: batch.expected_delivery_date,
    lines,
  });

  return { batch, email };
}

export async function createRequest(payload: CreateRequestPayload): Promise<{
  request_number: string;
  lines: SampleLine[];
}> {
  const sql = getSql();
  const requestNumber = await allocateNextRequestNumber();
  const dueDate = payload.due_date || null;

  const lines: SampleLine[] = [];

  for (const sample of payload.samples) {
    const inserted = (await sql`
      INSERT INTO sample_requests (
        request_number,
        formula_code,
        formula_name,
        num_samples,
        due_date,
        destination,
        request_origin,
        email,
        stage
      ) VALUES (
        ${requestNumber},
        ${sample.formula_code.trim()},
        ${sample.formula_name.trim()},
        ${sample.num_samples},
        ${dueDate},
        ${payload.destination.trim()},
        ${payload.request_origin.trim()},
        ${payload.email.trim()},
        ${FORMULA_STAGE_CLASSIFY}
      )
      RETURNING
        id,
        request_number,
        formula_code,
        formula_name,
        num_samples,
        due_date::text,
        destination,
        request_origin,
        email,
        created_at::text,
        stage
    `) as SampleLine[];
    lines.push(inserted[0]);
  }

  await sql`
    INSERT INTO request_batches (request_number, status)
    VALUES (${requestNumber}, ${REQUEST_STATUS_NEW})
    ON CONFLICT (request_number) DO NOTHING
  `;

  return { request_number: requestNumber, lines };
}
