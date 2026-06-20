"use client";

import { useState } from "react";

export default function CandidateDebugClickPage() {
  const [count, setCount] = useState(0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-lg font-semibold text-[#0F172A]">Candidate layout click test</h1>
      <p className="mb-4 text-sm text-[#64748B]">
        Counter should increase on each click. If it does not, something under CandidateAppShell is blocking pointer
        events.
      </p>
      <p className="mb-4 text-2xl font-bold tabular-nums text-[#0F172A]" data-testid="click-count">
        {count}
      </p>
      <button
        type="button"
        className="rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D9488]"
        onClick={() => setCount((c) => c + 1)}
      >
        Candidate Layout Click Test
      </button>
    </div>
  );
}
