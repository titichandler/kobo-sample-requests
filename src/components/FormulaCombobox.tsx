"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormulaOption } from "@/lib/types";

function formulaDisplay(formula: FormulaOption): string {
  return `${formula.formula_code} — ${formula.formula_name}`;
}

export function FormulaCombobox({
  formulas,
  value,
  onChange,
  onQueryChange,
}: {
  formulas: FormulaOption[];
  value: string;
  onChange: (formulaCode: string) => void;
  onQueryChange?: (query: string) => void;
}) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = formulas.find((formula) => formula.formula_code === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return formulas;
    return formulas.filter(
      (formula) =>
        formula.formula_code.toLowerCase().includes(term) ||
        formula.formula_name.toLowerCase().includes(term) ||
        formula.formula_type.toLowerCase().includes(term),
    );
  }, [formulas, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selected) {
      const display = formulaDisplay(selected);
      setQuery(display);
      onQueryChange?.(display);
    }
  }, [selected, onQueryChange]);

  function updateQuery(next: string) {
    setQuery(next);
    onQueryChange?.(next);
    if (selected) {
      const display = formulaDisplay(selected);
      if (next !== display) {
        onChange("");
      }
    } else {
      onChange("");
    }
  }

  function selectFormula(formulaCode: string) {
    onChange(formulaCode);
    const formula = formulas.find((item) => item.formula_code === formulaCode);
    const display = formula ? formulaDisplay(formula) : "";
    setQuery(display);
    onQueryChange?.(display);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block">
        <span className="field-label">Formula *</span>
        <input
          className="field-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder="Search by code or name..."
          value={query}
          onChange={(event) => {
            updateQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
              setOpen(true);
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlightIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlightIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && filtered[highlightIndex]) {
              event.preventDefault();
              selectFormula(filtered[highlightIndex].formula_code);
            }
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </label>
      {open && filtered.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-md border border-line bg-surface py-1 shadow-sm"
        >
          {filtered.map((formula, index) => (
            <li key={formula.formula_code} role="option" aria-selected={formula.formula_code === value}>
              <button
                type="button"
                className={
                  index === highlightIndex
                    ? "type-body-sm w-full bg-surface-soft px-3 py-2 text-left"
                    : "type-body-sm w-full px-3 py-2 text-left hover:bg-surface-soft"
                }
                onMouseEnter={() => setHighlightIndex(index)}
                onClick={() => selectFormula(formula.formula_code)}
              >
                <span className="font-mono text-ink">{formula.formula_code}</span>
                <span className="text-ink-muted"> — {formula.formula_name}</span>
                {formula.formula_type ? (
                  <span className="text-ink-faint"> ({formula.formula_type})</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query.trim() && filtered.length === 0 ? (
        <p className="type-muted absolute z-20 mt-1 w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 shadow-sm">
          No match in the library. Switch to Enter manually to add this formula.
        </p>
      ) : null}
    </div>
  );
}
