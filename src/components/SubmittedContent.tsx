"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { useToast } from "@/components/ToastProvider";
import { copyText } from "@/lib/clipboard";
import { displayFormulaCode, formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
import type { SampleLine } from "@/lib/types";

export function SubmittedContent({
  requestNumber,
  header,
  lines,
}: {
  requestNumber: string;
  header: SampleLine;
  lines: SampleLine[];
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyReference() {
    const ok = await copyText(requestNumber);
    if (ok) {
      setCopied(true);
      showToast("Reference number copied.");
      window.setTimeout(() => setCopied(false), 2000);
      return;
    }

    showToast("Could not copy automatically. Select the number and use Ctrl+C.", "error");
  }

  return (
    <>
      <div className="notice-success mb-8">
        <p className="font-medium">Thank you — your request is in the queue.</p>
        <p className="type-body-sm mt-2">
          Reference number:{" "}
          <strong className="type-mono select-all text-base font-semibold">{requestNumber}</strong>
        </p>
        <button
          type="button"
          className="btn-secondary mt-4 border-emerald-300 bg-white hover:bg-emerald-50"
          onClick={() => void copyReference()}
        >
          {copied ? "Copied" : "Copy reference number"}
        </button>
      </div>

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
              <dd className="mt-1 text-ink">{header.destination}</dd>
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
          </dl>
        </Card>
      </div>

      <Card title="Samples" className="overflow-hidden">
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Formula code</th>
                <th>Formula name</th>
                <th>Samples</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td className="type-mono">{displayFormulaCode(line.formula_code)}</td>
                  <td>{line.formula_name}</td>
                  <td>{line.num_samples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-8">
        <Link href="/request/new" className="btn-primary">
          Submit another request
        </Link>
      </div>
    </>
  );
}
