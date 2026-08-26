import { useEffect, useMemo, useRef, useState } from "react";

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Non-selectable category this option is filed under (e.g. "Maestría — Trimestre N") — rendered as a header, never clickable. */
  group?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}

/**
 * Type-to-filter combobox — used where the user explicitly wants a
 * "selectable" picker over a long list (e.g. "Cursos adicionales", which
 * searches every course across every carrera). Unlike a native <select>,
 * typing narrows the list instead of jumping to a match. Options carrying a
 * `group` are rendered under a bold, non-clickable header for that group —
 * only the courses themselves are selectable, never the maestría/trimestre
 * label grouping them.
 */
export function SearchSelect({ options, value, onChange, placeholder = "Buscar…", emptyLabel = "Sin resultados" }: SearchSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.group?.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={containerRef} className="relative">
      <input
        className="w-full rounded-lg border border-isel-line bg-white px-3 py-2 text-sm text-isel-ink transition-colors duration-200 focus:border-isel-navy focus:outline-none focus:ring-2 focus:ring-isel-navy/15"
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full min-w-[18rem] overflow-y-auto rounded-lg border border-isel-line bg-white shadow-card-hover">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-isel-ink/40">{emptyLabel}</p>
          ) : (
            filtered.map((o, i) => {
              const showGroupHeader = o.group && o.group !== filtered[i - 1]?.group;
              return (
                <div key={o.value}>
                  {showGroupHeader && (
                    <div className="sticky top-0 bg-isel-paper px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-isel-navy/70">
                      {o.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-isel-paper ${
                      o.value === value ? "bg-isel-paper font-semibold text-isel-navy" : "text-isel-ink"
                    }`}
                  >
                    {o.label}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
