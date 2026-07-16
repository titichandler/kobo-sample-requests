"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { TableSkeleton } from "@/components/TableSkeleton";
import { useToast } from "@/components/ToastProvider";
import type { FormulaRecord } from "@/lib/types";

type FormState = {
  formula_code: string;
  formula_name: string;
  formula_type: string;
};

const emptyForm: FormState = {
  formula_code: "",
  formula_name: "",
  formula_type: "",
};

export function FormulaLibraryAdmin() {
  const { showToast } = useToast();
  const [formulas, setFormulas] = useState<FormulaRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [adding, setAdding] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadFormulas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const response = await fetch(`/api/formulas/admin?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load");
      const data = (await response.json()) as { formulas: FormulaRecord[] };
      setFormulas(data.formulas);
    } catch {
      setError("Could not load formulas.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadFormulas();
  }, [loadFormulas]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setAdding(true);
    try {
      const response = await fetch("/api/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; formula?: FormulaRecord }
        | null;
      if (!response.ok) {
        showToast(data?.error ?? "Could not add formula.", "error");
        return;
      }
      setAddForm(emptyForm);
      showToast("Formula added.");
      await loadFormulas();
    } catch {
      showToast("Could not add formula.", "error");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(formula: FormulaRecord) {
    setEditingCode(formula.formula_code);
    setEditForm({
      formula_code: formula.formula_code,
      formula_name: formula.formula_name,
      formula_type: formula.formula_type,
    });
  }

  function cancelEdit() {
    setEditingCode(null);
    setEditForm(emptyForm);
  }

  async function handleSave(currentCode: string) {
    setSavingCode(currentCode);
    try {
      const response = await fetch(`/api/formulas/${encodeURIComponent(currentCode)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        showToast(data?.error ?? "Could not save formula.", "error");
        return;
      }
      showToast("Formula updated.");
      setEditingCode(null);
      setEditForm(emptyForm);
      await loadFormulas();
    } catch {
      showToast("Could not save formula.", "error");
    } finally {
      setSavingCode(null);
    }
  }

  async function handleDelete(formula: FormulaRecord) {
    const confirmed = window.confirm(
      `Remove ${formula.formula_code} from the library?\n\nExisting sample requests keep their saved formula names.`,
    );
    if (!confirmed) return;

    setDeletingCode(formula.formula_code);
    try {
      const response = await fetch(`/api/formulas/${encodeURIComponent(formula.formula_code)}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        showToast(data?.error ?? "Could not delete formula.", "error");
        return;
      }
      showToast("Formula removed from library.");
      if (editingCode === formula.formula_code) {
        cancelEdit();
      }
      await loadFormulas();
    } catch {
      showToast("Could not delete formula.", "error");
    } finally {
      setDeletingCode(null);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <Card title="Add formula">
        <form className="grid gap-4 md:grid-cols-[1fr_2fr_1fr_auto]" onSubmit={handleAdd}>
          <label className="block">
            <span className="field-label">Code *</span>
            <input
              className="field-input"
              value={addForm.formula_code}
              onChange={(event) =>
                setAddForm((current) => ({ ...current, formula_code: event.target.value }))
              }
              placeholder="e.g. KLG-129-EU"
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Name *</span>
            <input
              className="field-input"
              value={addForm.formula_name}
              onChange={(event) =>
                setAddForm((current) => ({ ...current, formula_name: event.target.value }))
              }
              placeholder="Formula name"
              required
            />
          </label>
          <label className="block">
            <span className="field-label">Type</span>
            <input
              className="field-input"
              value={addForm.formula_type}
              onChange={(event) =>
                setAddForm((current) => ({ ...current, formula_type: event.target.value }))
              }
              placeholder="Optional"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full md:w-auto" disabled={adding}>
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="type-muted">
          {loading ? "Loading…" : `${formulas.length} formula${formulas.length === 1 ? "" : "s"}`}
        </p>
        <div className="relative w-full sm:w-72">
          <input
            className="search-compact pl-3"
            type="search"
            placeholder="Search code, name, or type..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : error ? (
        <p className="notice-error">{error}</p>
      ) : formulas.length === 0 ? (
        <p className="type-muted">No formulas found.</p>
      ) : (
        <div className="data-table data-table-wide" role="region" aria-label="Formula library" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th className="w-36">Code</th>
                <th className="min-w-[12rem]">Name</th>
                <th className="w-36">Type</th>
                <th className="w-44">Actions</th>
              </tr>
            </thead>
            <tbody>
              {formulas.map((formula) => {
                const isEditing = editingCode === formula.formula_code;
                return (
                  <tr key={formula.id}>
                    {isEditing ? (
                      <>
                        <td>
                          <input
                            className="field-input"
                            value={editForm.formula_code}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                formula_code: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="field-input"
                            value={editForm.formula_name}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                formula_name: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="field-input"
                            value={editForm.formula_type}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                formula_type: event.target.value,
                              }))
                            }
                          />
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-primary px-3 py-1.5 text-sm"
                              disabled={savingCode === formula.formula_code}
                              onClick={() => void handleSave(formula.formula_code)}
                            >
                              {savingCode === formula.formula_code ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost px-3 py-1.5 text-sm"
                              disabled={savingCode === formula.formula_code}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="type-mono font-medium whitespace-nowrap">
                          {formula.formula_code}
                        </td>
                        <td className="break-words">{formula.formula_name}</td>
                        <td className="text-ink-muted">{formula.formula_type || "—"}</td>
                        <td className="whitespace-nowrap">
                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              className="type-muted font-medium hover:text-ink"
                              onClick={() => startEdit(formula)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="type-muted font-medium hover:text-ink"
                              disabled={deletingCode === formula.formula_code}
                              onClick={() => void handleDelete(formula)}
                            >
                              {deletingCode === formula.formula_code ? "Removing..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
