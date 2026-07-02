"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
import {
  formatRequestStatusForSummary,
  requestStatusBadgeClassForSummary,
} from "@/lib/requestStatus";
import { REQUEST_STATUS_SHIPPED, type RequestSummary } from "@/lib/types";
import { isVisibleInShippedView } from "@/lib/shippedVisibility";
import { TableSkeleton } from "@/components/TableSkeleton";

type ListFilter = "all" | "active" | "ready" | "shipped";

function formatStageProgress(request: RequestSummary): string {
  const parts: string[] = [];
  if (request.classify_count > 0) parts.push(`${request.classify_count} classify`);
  if (request.make_count > 0) parts.push(`${request.make_count} make`);
  if (request.fill_count > 0) parts.push(`${request.fill_count} fill`);
  if (request.done_count > 0) parts.push(`${request.done_count} done`);
  return parts.join(" · ") || "—";
}

function displayField(value: string): string {
  return value.trim() || "—";
}

function matchesFilter(request: RequestSummary, filter: ListFilter): boolean {
  const isReady =
    request.sample_count > 0 && request.done_count === request.sample_count;
  if (filter === "shipped") {
    return (
      request.status === REQUEST_STATUS_SHIPPED &&
      isVisibleInShippedView(request.shipped_at, request.hidden_from_view_at)
    );
  }
  if (filter === "ready") return isReady && request.status !== REQUEST_STATUS_SHIPPED;
  if (filter === "active") return request.status !== REQUEST_STATUS_SHIPPED && !isReady;
  return true;
}

const FILTERS: Array<{ id: ListFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "ready", label: "Ready to ship" },
  { id: "shipped", label: "Shipped" },
];

export function RequestsTable() {
  const router = useRouter();
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("status", "all");
      if (search) params.set("search", search);

      const response = await fetch(`/api/requests?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load");
      const data = (await response.json()) as { requests: RequestSummary[] };
      setRequests(data.requests);
    } catch {
      setError("Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filtered = useMemo(
    () => requests.filter((request) => matchesFilter(request, filter)),
    [requests, filter],
  );

  function openRequest(requestNumber: string) {
    router.push(`/requests/${requestNumber}`);
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? "filter-chip-active" : "filter-chip"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <input
            className="search-compact"
            type="search"
            placeholder="Search requests..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : error ? (
        <p className="notice-error">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="type-muted">No requests found.</p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((request) => (
              <button
                key={request.request_number}
                type="button"
                className="w-full rounded-lg border border-line bg-surface p-4 text-left shadow-sm transition hover:bg-surface-soft"
                onClick={() => openRequest(request.request_number)}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="type-mono font-semibold">{request.request_number}</span>
                  <span
                    className={`type-badge inline-flex rounded-full px-2.5 py-0.5 ${requestStatusBadgeClassForSummary(request.status, request.done_count, request.sample_count)}`}
                  >
                    {formatRequestStatusForSummary(request.status, request.done_count, request.sample_count)}
                  </span>
                </div>
                <p className="type-muted">{request.done_count} of {request.sample_count} done</p>
                <p className="type-body-sm mt-1">{displayField(request.destination)}</p>
                <p className="type-caption mt-1 text-ink-faint">{formatDisplayDateTime(request.created_at)}</p>
              </button>
            ))}
          </div>

          <div
            className="data-table data-table-wide hidden md:block"
            role="region"
            aria-label="All requests table"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th className="w-28">Request #</th>
                  <th className="w-32">Submitted</th>
                  <th className="min-w-[10rem]">Email</th>
                  <th className="min-w-[8rem]">Requested from</th>
                  <th className="min-w-[8rem]">Ship to</th>
                  <th className="w-28">Due date</th>
                  <th className="min-w-[8rem]">Progress</th>
                  <th className="w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((request) => (
                  <tr
                    key={request.request_number}
                    className="clickable-row"
                    onClick={() => openRequest(request.request_number)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openRequest(request.request_number);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    title={`Open ${request.request_number}`}
                  >
                    <td className="type-mono font-medium whitespace-nowrap">
                      {request.request_number}
                    </td>
                    <td className="whitespace-nowrap text-ink-muted">
                      {formatDisplayDateTime(request.created_at)}
                    </td>
                    <td className="break-all">{request.email}</td>
                    <td className="break-words">{displayField(request.request_origin)}</td>
                    <td className="break-words">{displayField(request.destination)}</td>
                    <td className="whitespace-nowrap">{formatDisplayDate(request.due_date)}</td>
                    <td className="type-muted" title={formatStageProgress(request)}>
                      {request.done_count} of {request.sample_count} done
                    </td>
                    <td>
                      <span
                        className={`type-badge inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 ${requestStatusBadgeClassForSummary(request.status, request.done_count, request.sample_count)}`}
                      >
                        {formatRequestStatusForSummary(
                          request.status,
                          request.done_count,
                          request.sample_count,
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
