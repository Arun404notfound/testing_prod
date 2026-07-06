"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Type-to-filter dropdown for a plain GET <form>. Renders a text input plus a
 * hidden input (`name`) that carries the actual submitted value, so it drops
 * into any server-rendered filter form without extra plumbing. The option
 * list is rendered via a portal into document.body (positioned with
 * getBoundingClientRect) so it isn't clipped by an ancestor's overflow-hidden.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "Search…",
  allLabel = "All",
}: {
  name: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
  allLabel?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [selected, setSelected] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));

  function updatePosition() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  function openDropdown() {
    updatePosition();
    setOpen(true);
    setHighlight(0);
  }

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onScrollOrResize() {
      updatePosition();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updatePosition is stable enough for this listener's lifetime
  }, [open]);

  function choose(value: string) {
    setSelected(value);
    setQuery(value);
    setOpen(false);
  }

  function clear() {
    setSelected("");
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openDropdown();
      setHighlight((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) choose(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim() === "") setSelected("");
          openDropdown();
        }}
        onFocus={openDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="tg-input w-full"
      />
      <input type="hidden" name={name} value={selected} />
      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <ul
              style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
              className="z-50 max-h-56 overflow-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg"
            >
              <li
                onClick={clear}
                className={`cursor-pointer px-3 py-1.5 hover:bg-blue-50 ${selected === "" ? "font-semibold text-[#2563EB]" : ""}`}
              >
                {allLabel}
              </li>
              {filtered.length === 0 ? (
                <li className="px-3 py-1.5 text-slate-400">No matches</li>
              ) : (
                filtered.map((opt, i) => (
                  <li
                    key={opt}
                    onClick={() => choose(opt)}
                    className={`cursor-pointer px-3 py-1.5 hover:bg-blue-50 ${i === highlight ? "bg-blue-50" : ""} ${
                      selected === opt ? "font-semibold text-[#2563EB]" : ""
                    }`}
                  >
                    {opt}
                  </li>
                ))
              )}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
