"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { displayFormulaCode, formatDisplayDateTime } from "@/lib/dates";
import { carrierTrackingUrl } from "@/lib/shipping";
import { stageActionLabel, STAGE_SECTION_STYLES } from "@/lib/formulaStage";
import {
  FORMULA_STAGE_CLASSIFY,
  FORMULA_STAGE_DONE,
  FORMULA_STAGE_FILL,
  FORMULA_STAGE_MAKE,
  REQUEST_STATUS_SHIPPED,
  type FormulaStage,
  type ReadyToShipBatch,
  type ReviewBoardData,
  type SampleLine,
  type ShippedBatchSummary,
} from "@/lib/types";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ShipBatchModal, type ShipBatchFormValues } from "@/components/ShipBatchModal";
import { useToast } from "@/components/ToastProvider";

type LineGroup = {
  request_number: string;
  created_at: string;
  lines: SampleLine[];
};

const SECTION_IDS = {
  classify: "board-classify",
  make: "board-make",
  fill: "board-fill",
  partialDone: "board-partial-done",
  ready: "board-ready",
  shipped: "board-shipped",
} as const;

function groupLines(lines: SampleLine[]): LineGroup[] {
  const groups: LineGroup[] = [];
  for (const line of lines) {
    const last = groups[groups.length - 1];
    if (last && last.request_number === line.request_number) {
      last.lines.push(line);
    } else {
      groups.push({
        request_number: line.request_number,
        created_at: line.created_at,
        lines: [line],
      });
    }
  }
  return groups;
}

function SectionHeader({
  id,
  title,
  count,
  styles,
}: {
  id: string;
  title: string;
  count: number;
  styles: { header: string; badge: string };
}) {
  return (
    <div id={id} className="mb-3 flex scroll-mt-24 items-center gap-3">
      <h2 className={`type-section-title ${styles.header}`}>{title}</h2>
      <span
        className={`type-badge inline-flex rounded-full border px-2 py-0.5 ${styles.badge}`}
      >
        {count}
      </span>
    </div>
  );
}

export function ReviewBoard() {
  const { showToast } = useToast();
  const [board, setBoard] = useState<ReviewBoardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [shippedOpen, setShippedOpen] = useState(false);
  const [shipTarget, setShipTarget] = useState<string | null>(null);
  const [shippingSubmitting, setShippingSubmitting] = useState(false);

  const loadBoard = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setInitialLoading(true);
    }
    setError("");
    try {
      const response = await fetch("/api/review-board");
      if (!response.ok) throw new Error("Failed to load");
      const data = (await response.json()) as ReviewBoardData;
      setBoard(data);
    } catch {
      setError("Could not load review board.");
    } finally {
      if (!options?.silent) {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const readyRequestNumbers = useMemo(
    () => new Set(board?.readyToShip.map((batch) => batch.request_number) ?? []),
    [board?.readyToShip],
  );

  const partialDoneLines = useMemo(
    () => board?.done.filter((line) => !readyRequestNumbers.has(line.request_number)) ?? [],
    [board?.done, readyRequestNumbers],
  );

  const jumpLinks = useMemo(() => {
    if (!board) return [];
    const links: Array<{ id: string; label: string; count: number }> = [];
    if (board.classify.length) links.push({ id: SECTION_IDS.classify, label: "Classify", count: board.classify.length });
    if (board.make.length) links.push({ id: SECTION_IDS.make, label: "Make", count: board.make.length });
    if (board.fill.length) links.push({ id: SECTION_IDS.fill, label: "Fill", count: board.fill.length });
    if (partialDoneLines.length) links.push({ id: SECTION_IDS.partialDone, label: "Done (in progress)", count: partialDoneLines.length });
    if (board.readyToShip.length) links.push({ id: SECTION_IDS.ready, label: "Ready to ship", count: board.readyToShip.length });
    if (board.shipped.length) links.push({ id: SECTION_IDS.shipped, label: "Shipped", count: board.shipped.length });
    return links;
  }, [board, partialDoneLines.length]);

  async function setLineStage(lineId: number, stage: FormulaStage, successMessage: string) {
    const response = await fetch(`/api/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (response.ok) {
      showToast(successMessage);
      await loadBoard({ silent: true });
      return;
    }
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    showToast(data?.error ?? "Could not update formula.", "error");
  }

  async function advanceLine(lineId: number) {
    const response = await fetch(`/api/lines/${lineId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advance: true }),
    });
    if (response.ok) {
      showToast("Formula marked done.");
      await loadBoard({ silent: true });
      return;
    }
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    showToast(data?.error ?? "Could not advance formula.", "error");
  }

  async function submitShipment(requestNumber: string, values: ShipBatchFormValues) {
    setShippingSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${requestNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: REQUEST_STATUS_SHIPPED,
          carrier: values.carrier,
          tracking_number: values.tracking_number,
          expected_delivery_date: values.expected_delivery_date || null,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        email_sent?: boolean;
        email_warning?: string | null;
      } | null;

      if (!response.ok) {
        showToast(data?.error ?? "Could not ship batch.", "error");
        return;
      }

      setShipTarget(null);
      if (data?.email_sent) {
        showToast(`${requestNumber} shipped. Confirmation email sent.`);
      } else if (data?.email_warning) {
        showToast(
          `${requestNumber} shipped, but email was not sent: ${data.email_warning}`,
          "error",
        );
      } else {
        showToast(`${requestNumber} shipped.`);
      }
      await loadBoard({ silent: true });
    } catch {
      showToast("Could not ship batch.", "error");
    } finally {
      setShippingSubmitting(false);
    }
  }

  async function hideShippedBatch(requestNumber: string) {
    const response = await fetch(`/api/requests/${requestNumber}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hide_from_view: true }),
    });
    if (response.ok) {
      showToast(`${requestNumber} removed from shipped view.`);
      await loadBoard({ silent: true });
      return;
    }
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    showToast(data?.error ?? "Could not remove from view.", "error");
  }

  function classifySuccessMessage(stage: FormulaStage): string {
    if (stage === FORMULA_STAGE_MAKE) return "Moved to Make.";
    if (stage === FORMULA_STAGE_FILL) return "Moved to Fill.";
    return "Marked done.";
  }

  return (
    <div className="min-w-0 space-y-8">
      {initialLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : error ? (
        <p className="notice-error">{error}</p>
      ) : board ? (
        <>
          {jumpLinks.length > 1 ? (
            <nav className="board-jump-nav" aria-label="Jump to section">
              {jumpLinks.map((link) => (
                <a key={link.id} href={`#${link.id}`} className="board-jump-link">
                  {link.label} ({link.count})
                </a>
              ))}
            </nav>
          ) : null}

          {board.classify.length > 0 ? (
            <ClassifySection
              lines={board.classify}
              onClassify={(lineId, stage) =>
                void setLineStage(lineId, stage, classifySuccessMessage(stage))
              }
            />
          ) : null}

          {board.make.length > 0 ? (
            <StageSection
              sectionId={SECTION_IDS.make}
              title="Make"
              stage={FORMULA_STAGE_MAKE}
              lines={board.make}
              onAdvance={(lineId) => void advanceLine(lineId)}
            />
          ) : null}

          {board.fill.length > 0 ? (
            <StageSection
              sectionId={SECTION_IDS.fill}
              title="Fill"
              stage={FORMULA_STAGE_FILL}
              lines={board.fill}
              onAdvance={(lineId) => void advanceLine(lineId)}
            />
          ) : null}

          {partialDoneLines.length > 0 ? (
            <StageSection
              sectionId={SECTION_IDS.partialDone}
              title="Done (waiting on batch)"
              stage={FORMULA_STAGE_DONE}
              lines={partialDoneLines}
              onAdvance={() => undefined}
              showActions={false}
            />
          ) : null}

          {board.readyToShip.length > 0 ? (
            <ReadyToShipSection batches={board.readyToShip} onShip={(requestNumber) => setShipTarget(requestNumber)} />
          ) : null}

          {board.shipped.length > 0 ? (
            <ShippedSection
              batches={board.shipped}
              open={shippedOpen}
              onToggle={() => setShippedOpen((value) => !value)}
              onHide={(requestNumber) => void hideShippedBatch(requestNumber)}
            />
          ) : null}

          {jumpLinks.length === 0 ? (
            <p className="type-muted">
              No active work on the board. You are all caught up.
            </p>
          ) : null}
        </>
      ) : null}

      <ShipBatchModal
        requestNumber={shipTarget}
        submitting={shippingSubmitting}
        onClose={() => {
          if (!shippingSubmitting) setShipTarget(null);
        }}
        onSubmit={(values) => {
          if (shipTarget) void submitShipment(shipTarget, values);
        }}
      />
    </div>
  );
}

function ClassifySection({
  lines,
  onClassify,
}: {
  lines: SampleLine[];
  onClassify: (
    lineId: number,
    stage: typeof FORMULA_STAGE_MAKE | typeof FORMULA_STAGE_FILL | typeof FORMULA_STAGE_DONE,
  ) => void;
}) {
  const styles = STAGE_SECTION_STYLES.classify;
  const groups = groupLines(lines);

  return (
    <section className={`review-section border-l-4 ${styles.border}`}>
      <SectionHeader id={SECTION_IDS.classify} title="Classify" count={lines.length} styles={styles} />
      <div className="data-table" role="region" aria-label="Classify table" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th className="w-28">Request #</th>
              <th className="w-36">Submitted</th>
              <th className="min-w-[12rem]">Formula</th>
              <th className="w-16">Qty</th>
              <th className="min-w-[10rem]">Classify as</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.lines.map((line, index) => (
                <tr key={line.id}>
                  {index === 0 ? (
                    <>
                      <td rowSpan={group.lines.length} className="type-mono align-top font-medium whitespace-nowrap">
                        <Link href={`/requests/${group.request_number}`} className="hover:underline">
                          {group.request_number}
                        </Link>
                      </td>
                      <td rowSpan={group.lines.length} className="align-top whitespace-nowrap text-ink-muted">
                        {formatDisplayDateTime(group.created_at)}
                      </td>
                    </>
                  ) : null}
                  <td className="min-w-[12rem]">
                    <div className="type-mono">{displayFormulaCode(line.formula_code)}</div>
                    <div className="break-words text-ink-muted">{line.formula_name}</div>
                  </td>
                  <td className="whitespace-nowrap">{line.num_samples}</td>
                  <td className="whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-stage btn-stage-make"
                        aria-label={`Classify ${line.formula_name} as make`}
                        onClick={() => onClassify(line.id, FORMULA_STAGE_MAKE)}
                      >
                        Make
                      </button>
                      <button
                        type="button"
                        className="btn-stage btn-stage-fill"
                        aria-label={`Classify ${line.formula_name} as fill`}
                        onClick={() => onClassify(line.id, FORMULA_STAGE_FILL)}
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        className="btn-stage btn-stage-done"
                        aria-label={`Classify ${line.formula_name} as done`}
                        onClick={() => onClassify(line.id, FORMULA_STAGE_DONE)}
                      >
                        Done
                      </button>
                    </div>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StageSection({
  sectionId,
  title,
  stage,
  lines,
  onAdvance,
  showActions = true,
}: {
  sectionId: string;
  title: string;
  stage: FormulaStage;
  lines: SampleLine[];
  onAdvance: (lineId: number) => void;
  showActions?: boolean;
}) {
  const styles = STAGE_SECTION_STYLES[stage];
  const groups = groupLines(lines);
  const actionLabel = stageActionLabel(stage);

  return (
    <section className={`review-section border-l-4 ${styles.border}`}>
      <SectionHeader id={sectionId} title={title} count={lines.length} styles={styles} />
      <div className="data-table" role="region" aria-label={`${title} table`} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th className="w-28">Request #</th>
              <th className="w-36">Submitted</th>
              <th className="min-w-[12rem]">Formula</th>
              <th className="w-16">Qty</th>
              {showActions && actionLabel ? <th className="w-28">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) =>
              group.lines.map((line, index) => (
                <tr key={line.id}>
                  {index === 0 ? (
                    <>
                      <td rowSpan={group.lines.length} className="type-mono align-top font-medium whitespace-nowrap">
                        <Link href={`/requests/${group.request_number}`} className="hover:underline">
                          {group.request_number}
                        </Link>
                      </td>
                      <td rowSpan={group.lines.length} className="align-top whitespace-nowrap text-ink-muted">
                        {formatDisplayDateTime(group.created_at)}
                      </td>
                    </>
                  ) : null}
                  <td className="min-w-[12rem]">
                    <div className="type-mono">{displayFormulaCode(line.formula_code)}</div>
                    <div className="break-words text-ink-muted">{line.formula_name}</div>
                  </td>
                  <td className="whitespace-nowrap">{line.num_samples}</td>
                  {showActions && actionLabel ? (
                    <td className="whitespace-nowrap">
                      <button
                        type="button"
                        className="btn-stage"
                        aria-label={`Mark ${line.formula_name} as done`}
                        onClick={() => onAdvance(line.id)}
                      >
                        {actionLabel}
                      </button>
                    </td>
                  ) : null}
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReadyToShipSection({
  batches,
  onShip,
}: {
  batches: ReadyToShipBatch[];
  onShip: (requestNumber: string) => void;
}) {
  const styles = STAGE_SECTION_STYLES.ready;

  return (
    <section className={`review-section border-l-4 ${styles.border}`}>
      <SectionHeader id={SECTION_IDS.ready} title="Ready to ship" count={batches.length} styles={styles} />
      <div className="data-table data-table-wide" role="region" aria-label="Ready to ship table" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th className="w-28">Request #</th>
              <th className="w-36">Submitted</th>
              <th className="min-w-[8rem]">Requested from</th>
              <th className="min-w-[8rem]">Ship to</th>
              <th className="min-w-[10rem]">Progress</th>
              <th className="w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.request_number}>
                <td className="type-mono font-medium whitespace-nowrap">
                  <Link href={`/requests/${batch.request_number}`} className="hover:underline">
                    {batch.request_number}
                  </Link>
                </td>
                <td className="whitespace-nowrap text-ink-muted">
                  {formatDisplayDateTime(batch.created_at)}
                </td>
                <td className="break-words">{batch.request_origin.trim() || "—"}</td>
                <td className="break-words">{batch.destination.trim() || "—"}</td>
                <td className="type-muted whitespace-nowrap">
                  {batch.done_count} of {batch.formula_count} formulas done
                </td>
                <td className="whitespace-nowrap">
                  <button
                    type="button"
                    className="btn-ship"
                    onClick={() => onShip(batch.request_number)}
                  >
                    Ship batch
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShippedSection({
  batches,
  open,
  onToggle,
  onHide,
}: {
  batches: ShippedBatchSummary[];
  open: boolean;
  onToggle: () => void;
  onHide: (requestNumber: string) => void;
}) {
  const router = useRouter();
  const styles = STAGE_SECTION_STYLES.shipped;
  const [hiding, setHiding] = useState<string | null>(null);

  async function handleHide(requestNumber: string) {
    setHiding(requestNumber);
    try {
      await onHide(requestNumber);
    } finally {
      setHiding(null);
    }
  }

  return (
    <section className={`review-section border-l-4 ${styles.border}`}>
      <button
        type="button"
        className="mb-3 flex w-full scroll-mt-24 items-center gap-3 text-left"
        id={SECTION_IDS.shipped}
        onClick={onToggle}
        aria-expanded={open}
      >
        <h2 className={`type-section-title ${styles.header}`}>Shipped</h2>
        <span className={`type-badge inline-flex rounded-full border px-2 py-0.5 ${styles.badge}`}>
          {batches.length}
        </span>
        <span className="type-caption ml-auto text-ink-faint">{open ? "Hide" : "Show"}</span>
      </button>
      <p className="type-caption mb-3 text-ink-faint">
        Shipped requests older than 2 months are hidden automatically.
      </p>

      {open ? (
        <div className="data-table data-table-wide" role="region" aria-label="Shipped requests table" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th className="w-28">Request #</th>
                <th className="w-36">Shipped</th>
                <th className="min-w-[8rem]">Ship to</th>
                <th className="min-w-[8rem]">Tracking</th>
                <th className="w-20">Formulas</th>
                <th className="w-32">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr
                  key={batch.request_number}
                  className="clickable-row"
                  onClick={() => router.push(`/requests/${batch.request_number}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/requests/${batch.request_number}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                >
                  <td className="type-mono font-medium whitespace-nowrap">{batch.request_number}</td>
                  <td className="whitespace-nowrap text-ink-muted">
                    {batch.shipped_at ? formatDisplayDateTime(batch.shipped_at) : "—"}
                  </td>
                  <td className="break-words">{batch.destination.trim() || "—"}</td>
                  <td className="type-mono text-sm">
                    {batch.tracking_number ? (
                      (() => {
                        const url =
                          batch.carrier && batch.tracking_number
                            ? carrierTrackingUrl(batch.carrier, batch.tracking_number)
                            : null;
                        return url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {batch.tracking_number}
                          </a>
                        ) : (
                          batch.tracking_number
                        );
                      })()
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap">{batch.formula_count}</td>
                  <td className="whitespace-nowrap">
                    <button
                      type="button"
                      className="type-muted font-medium hover:text-ink"
                      disabled={hiding === batch.request_number}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleHide(batch.request_number);
                      }}
                    >
                      {hiding === batch.request_number ? "Removing..." : "Remove from view"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
