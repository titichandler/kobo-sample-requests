"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { FormulaCombobox } from "@/components/FormulaCombobox";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useToast } from "@/components/ToastProvider";
import { MANUAL_CODE_PLACEHOLDER, type FormulaOption, type PendingSample } from "@/lib/types";
import { displayFormulaCode } from "@/lib/dates";

type EntryMode = "library" | "manual";

export function RequestForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [requestOrigin, setRequestOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [includeDueDate, setIncludeDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entryMode, setEntryMode] = useState<EntryMode>("library");
  const [formulas, setFormulas] = useState<FormulaOption[]>([]);
  const [selectedFormulaCode, setSelectedFormulaCode] = useState("");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [manualFormulaName, setManualFormulaName] = useState("");
  const [manualFormulaCode, setManualFormulaCode] = useState("");
  const [numSamples, setNumSamples] = useState(1);
  const [pendingSamples, setPendingSamples] = useState<PendingSample[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadFormulas() {
      const response = await fetch("/api/formulas");
      if (!response.ok) return;
      const data = (await response.json()) as { formulas: FormulaOption[] };
      setFormulas(data.formulas);
    }
    void loadFormulas();
  }, []);

  const totalSamples = useMemo(
    () => pendingSamples.reduce((sum, sample) => sum + sample.num_samples, 0),
    [pendingSamples],
  );

  function validateDetails(): string[] {
    const lineErrors: string[] = [];
    if (!contactName.trim()) lineErrors.push("Name is required.");
    if (!email.trim()) lineErrors.push("Email address is required.");
    if (!requestOrigin.trim()) lineErrors.push("Requested from is required.");
    if (!destination.trim()) lineErrors.push("Ship to is required.");
    return lineErrors;
  }

  function resolveLibraryFormula(): FormulaOption | undefined {
    const byCode = formulas.find((item) => item.formula_code === selectedFormulaCode);
    if (byCode) return byCode;

    const term = libraryQuery.trim().toLowerCase();
    if (!term) return undefined;

    return formulas.find((item) => {
      const display = `${item.formula_code} — ${item.formula_name}`.toLowerCase();
      return (
        item.formula_code.toLowerCase() === term ||
        item.formula_name.toLowerCase() === term ||
        display === term
      );
    });
  }

  function addSample() {
    setErrors([]);
    const libraryFormula = entryMode === "library" ? resolveLibraryFormula() : undefined;

    if (entryMode === "library" && libraryQuery.trim() && !libraryFormula) {
      const message =
        "That formula is not in the library. Switch to Enter manually to add it.";
      setErrors([message]);
      showToast(message, "error");
      return;
    }

    const sample =
      entryMode === "manual"
        ? {
            formula_code: manualFormulaCode.trim() || MANUAL_CODE_PLACEHOLDER,
            formula_name: manualFormulaName.trim(),
            num_samples: numSamples,
            entry_type: "Manual" as const,
          }
        : {
            formula_code: libraryFormula!.formula_code,
            formula_name: libraryFormula!.formula_name,
            num_samples: numSamples,
            entry_type: "Library" as const,
          };

    const lineErrors: string[] = [];
    if (!sample.formula_name) lineErrors.push("Formula name is required.");
    if (entryMode === "library" && !libraryFormula) {
      lineErrors.push("Select a formula from the library.");
    }
    if (sample.num_samples <= 0) {
      lineErrors.push("Number of samples must be greater than 0.");
    }
    if (lineErrors.length) {
      setErrors(lineErrors);
      return;
    }

    setPendingSamples((current) => [...current, sample]);
    setManualFormulaName("");
    setManualFormulaCode("");
    setSelectedFormulaCode("");
    setLibraryQuery("");
    setNumSamples(1);
    showToast("Sample added to request.");
  }

  function removeSample(index: number) {
    setPendingSamples((current) => current.filter((_, i) => i !== index));
  }

  function goToSamples() {
    const lineErrors = validateDetails();
    if (lineErrors.length) {
      setErrors(lineErrors);
      return;
    }
    setErrors([]);
    setStep(2);
  }

  function goToReview() {
    if (!pendingSamples.length) {
      setErrors(["Add at least one sample before continuing."]);
      return;
    }
    setErrors([]);
    setStep(3);
  }

  async function submitRequest() {
    const lineErrors = validateDetails();
    if (lineErrors.length) {
      setErrors(lineErrors);
      setStep(1);
      return;
    }
    if (!pendingSamples.length) {
      setErrors(["Add at least one sample before submitting."]);
      setStep(2);
      return;
    }

    setErrors([]);
    setSubmitting(true);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: contactName,
          email,
          request_origin: requestOrigin,
          destination,
          due_date: includeDueDate ? dueDate : null,
          samples: pendingSamples.map((sample) => ({
            formula_code: sample.formula_code,
            formula_name: sample.formula_name,
            num_samples: sample.num_samples,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrors(data.errors ?? [data.error ?? "Could not save request."]);
        return;
      }

      router.push(`/request/submitted/${data.request_number}`);
    } catch {
      setErrors(["Could not save request."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="type-caption flex flex-wrap gap-2" aria-label="Request steps">
        {[
          { id: 1 as const, label: "1. Details" },
          { id: 2 as const, label: "2. Samples" },
          { id: 3 as const, label: "3. Review" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={step === item.id ? "filter-chip-active" : "filter-chip"}
            onClick={() => {
              if (item.id === 2) goToSamples();
              else if (item.id === 3) goToReview();
              else setStep(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {step === 1 ? (
        <Card title="Request details">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="field-label">Name *</span>
              <input
                className="field-input"
                type="text"
                placeholder="First and last name"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">Email address *</span>
              <input
                className="field-input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">Requested from *</span>
              <input
                className="field-input"
                placeholder="e.g. Marketing, Sales, Internal R&D"
                value={requestOrigin}
                onChange={(event) => setRequestOrigin(event.target.value)}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="field-label">Ship to *</span>
              <input
                className="field-input"
                placeholder="e.g. UK Lab, External partner site"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              />
            </label>
            <div className="space-y-3 md:col-span-2">
              <label className="type-muted flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeDueDate}
                  onChange={(event) => setIncludeDueDate(event.target.checked)}
                />
                Set a due date (optional)
              </label>
              {includeDueDate ? (
                <label className="block max-w-xs">
                  <span className="field-label">Due date</span>
                  <input
                    className="field-input"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </label>
              ) : null}
            </div>
          </div>
          <div className="mt-6">
            <button type="button" className="btn-primary" onClick={goToSamples}>
              Continue to samples
            </button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <>
          <Card title="Add samples">
            <SegmentedControl
              ariaLabel="Sample entry mode"
              value={entryMode}
              options={[
                { value: "library", label: "From library" },
                { value: "manual", label: "Enter manually" },
              ]}
              onChange={(mode) => {
                setEntryMode(mode);
                if (mode === "library") {
                  setSelectedFormulaCode("");
                  setLibraryQuery("");
                }
              }}
            />

            <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                {entryMode === "manual" ? (
                  <>
                    <label className="block">
                      <span className="field-label">Formula name *</span>
                      <input
                        className="field-input"
                        value={manualFormulaName}
                        onChange={(event) => setManualFormulaName(event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Formula code (optional)</span>
                      <input
                        className="field-input"
                        value={manualFormulaCode}
                        onChange={(event) => setManualFormulaCode(event.target.value)}
                      />
                    </label>
                  </>
                ) : formulas.length ? (
                  <FormulaCombobox
                    formulas={formulas}
                    value={selectedFormulaCode}
                    onChange={setSelectedFormulaCode}
                    onQueryChange={setLibraryQuery}
                  />
                ) : (
                  <p className="notice">
                    No formulas in the database yet. Use manual entry, or run{" "}
                    <code className="font-mono text-xs">npm run seed:formulas</code> from the nextjs
                    folder.
                  </p>
                )}
              </div>
              <label className="block">
                <span className="field-label">Number of samples *</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  value={numSamples}
                  onChange={(event) => setNumSamples(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn-secondary" onClick={addSample}>
                Add sample to list
              </button>
              <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          </Card>

          <Card title="Samples in this request">
            {pendingSamples.length === 0 ? (
              <p className="type-muted">No samples added yet.</p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Entry</th>
                      <th>Formula code</th>
                      <th>Formula name</th>
                      <th>Samples</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSamples.map((sample, index) => (
                      <tr key={`${sample.formula_code}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{sample.entry_type}</td>
                        <td className="type-mono">{displayFormulaCode(sample.formula_code)}</td>
                        <td>{sample.formula_name}</td>
                        <td>{sample.num_samples}</td>
                        <td>
                          <button
                            type="button"
                            className="type-muted font-medium hover:text-ink"
                            onClick={() => removeSample(index)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary" onClick={goToReview}>
              Review and submit
            </button>
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <Card title="Review your request">
          <dl className="type-body-sm grid gap-4 md:grid-cols-2">
            <div>
              <dt className="dl-label">Name</dt>
              <dd className="mt-1 text-ink">{contactName}</dd>
            </div>
            <div>
              <dt className="dl-label">Email</dt>
              <dd className="mt-1 text-ink">{email}</dd>
            </div>
            <div>
              <dt className="dl-label">Requested from</dt>
              <dd className="mt-1 text-ink">{requestOrigin}</dd>
            </div>
            <div>
              <dt className="dl-label">Ship to</dt>
              <dd className="mt-1 text-ink">{destination}</dd>
            </div>
            <div>
              <dt className="dl-label">Due date</dt>
              <dd className="mt-1 text-ink">{includeDueDate ? dueDate : "Not set"}</dd>
            </div>
          </dl>

          <div className="mt-8">
            <h3 className="type-card-title mb-4">
              Samples ({pendingSamples.length} formulas · {totalSamples} total)
            </h3>
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
                  {pendingSamples.map((sample, index) => (
                    <tr key={`${sample.formula_code}-${index}`}>
                      <td>{index + 1}</td>
                      <td className="type-mono">{displayFormulaCode(sample.formula_code)}</td>
                      <td>{sample.formula_name}</td>
                      <td>{sample.num_samples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
              Back to samples
            </button>
          </div>
        </Card>
      ) : null}

      {errors.length > 0 ? (
        <div className="notice-error">
          <ul className="list-disc space-y-1 pl-5">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 3 && pendingSamples.length > 0 ? (
        <div className="sticky-submit-bar">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="type-muted">
              {pendingSamples.length} formulas · {totalSamples} samples ready to submit
            </p>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={submitting}
              onClick={() => void submitRequest()}
            >
              {submitting ? "Submitting..." : "Submit full request"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
