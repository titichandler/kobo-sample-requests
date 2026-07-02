import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import { PageShell } from "@/components/PageShell";
import { displayFormulaCode, formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
import { carrierTrackingUrl } from "@/lib/shipping";
import { formatFormulaStage, STAGE_SECTION_STYLES } from "@/lib/formulaStage";
import { ensureSchema, getRequestBatch, getRequestLines } from "@/lib/requests";
import {
  formatRequestStatus,
  formatRequestStatusForSummary,
  requestStatusBadgeClass,
  requestStatusBadgeClassForSummary,
} from "@/lib/requestStatus";
import {
  FORMULA_STAGE_CLASSIFY,
  FORMULA_STAGE_DONE,
  FORMULA_STAGE_FILL,
  FORMULA_STAGE_MAKE,
  REQUEST_STATUS_NEW,
  REQUEST_STATUS_SHIPPED,
} from "@/lib/types";

type PageProps = {
  params: Promise<{ requestNumber: string }>;
};

export default async function RequestDetailPage({ params }: PageProps) {
  await ensureSchema();
  const { requestNumber } = await params;
  const lines = await getRequestLines(requestNumber);
  const batch = await getRequestBatch(requestNumber);
  const status = batch?.status ?? REQUEST_STATUS_NEW;
  const doneCount = lines.filter((line) => line.stage === FORMULA_STAGE_DONE).length;
  const classifyCount = lines.filter((line) => line.stage === FORMULA_STAGE_CLASSIFY).length;
  const makeCount = lines.filter((line) => line.stage === FORMULA_STAGE_MAKE).length;
  const fillCount = lines.filter((line) => line.stage === FORMULA_STAGE_FILL).length;
  const isShipped = status === REQUEST_STATUS_SHIPPED;

  if (!lines.length) {
    notFound();
  }

  const header = lines[0];
  const trackingUrl =
    batch?.tracking_number && batch?.carrier
      ? carrierTrackingUrl(batch.carrier, batch.tracking_number)
      : null;

  return (
    <PageShell
      title={requestNumber}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "All requests", href: "/requests/all" },
        { label: requestNumber },
      ]}
      meta={
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`type-badge inline-flex rounded-full px-3 py-1 ${requestStatusBadgeClassForSummary(status, doneCount, lines.length)}`}
          >
            {formatRequestStatusForSummary(status, doneCount, lines.length)}
          </span>
          {batch?.shipped_at ? (
          <span className="type-muted">
            Shipped {formatDisplayDateTime(batch.shipped_at)}
          </span>
        ) : (
          <span>
              {doneCount} of {lines.length} formulas done
              {!isShipped && doneCount === lines.length ? " — ready to ship from review board" : ""}
              {classifyCount + makeCount + fillCount > 0 ? (
                <span className="text-ink-faint">
                  {" "}
                  · {classifyCount} classify · {makeCount} make · {fillCount} fill · {doneCount} done
                </span>
              ) : null}
            </span>
          )}
        </div>
      }
    >
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card title="Request summary">
          <dl className="type-body-sm grid gap-4">
            <div>
              <dt className="dl-label">Email</dt>
              <dd className="mt-1 text-ink">{header.email}</dd>
            </div>
            <div>
              <dt className="dl-label">Requested from</dt>
              <dd className="mt-1 text-ink">{header.request_origin}</dd>
            </div>
            <div>
              <dt className="dl-label">Ship to</dt>
              <dd className="mt-1 text-ink">{header.destination || "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card title="Dates">
          <dl className="type-body-sm grid gap-4">
            <div>
              <dt className="dl-label">Submitted</dt>
              <dd className="mt-1 text-ink">{formatDisplayDateTime(header.created_at)}</dd>
            </div>
            <div>
              <dt className="dl-label">Due date</dt>
              <dd className="mt-1 text-ink">{formatDisplayDate(header.due_date)}</dd>
            </div>
            <div>
              <dt className="dl-label">Batch status</dt>
              <dd className="mt-1">
                <span
                  className={`type-badge inline-flex rounded-full px-2.5 py-0.5 ${requestStatusBadgeClass(status)}`}
                >
                  {formatRequestStatus(status)}
                </span>
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {isShipped && batch ? (
        <Card title="Shipping" className="mb-6">
          <dl className="type-body-sm grid gap-4 md:grid-cols-2">
            <div>
              <dt className="dl-label">Carrier</dt>
              <dd className="mt-1 text-ink">{batch.carrier ?? "—"}</dd>
            </div>
            <div>
              <dt className="dl-label">Tracking number</dt>
              <dd className="type-mono mt-1 text-ink">
                {batch.tracking_number ? (
                  trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {batch.tracking_number}
                    </a>
                  ) : (
                    batch.tracking_number
                  )
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="dl-label">Expected delivery</dt>
              <dd className="mt-1 text-ink">{formatDisplayDate(batch.expected_delivery_date)}</dd>
            </div>
            <div>
              <dt className="dl-label">Shipped on</dt>
              <dd className="mt-1 text-ink">{formatDisplayDateTime(batch.shipped_at)}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      <Card title="Samples" className="overflow-hidden">
        <div className="data-table data-table-wide" role="region" aria-label="Sample lines table" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th className="w-28">Formula code</th>
                <th className="min-w-[10rem]">Formula name</th>
                <th className="w-24">Samples</th>
                <th className="w-28">Stage</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td className="type-mono whitespace-nowrap">
                    {displayFormulaCode(line.formula_code)}
                  </td>
                  <td className="break-words">{line.formula_name}</td>
                  <td className="whitespace-nowrap">{line.num_samples}</td>
                  <td>
                    <span
                      className={`type-badge inline-flex rounded-full border px-2.5 py-0.5 ${STAGE_SECTION_STYLES[line.stage].badge}`}
                    >
                      {formatFormulaStage(line.stage)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="type-muted mt-8 flex flex-wrap gap-4">
        <Link href="/requests" className="font-medium text-ink-muted hover:text-ink hover:underline">
          Review board
        </Link>
        <Link href="/requests/all" className="font-medium text-ink-muted hover:text-ink hover:underline">
          All requests
        </Link>
      </div>
    </PageShell>
  );
}
