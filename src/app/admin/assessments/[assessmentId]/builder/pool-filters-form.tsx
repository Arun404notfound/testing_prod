"use client";

import { useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";

type PoolTab = "likert" | "triad" | "mcq";

export function PoolFiltersForm({
  tab,
  sentimentQ,
  attributeQ,
  groupCodeQ,
  attributeNames,
  showLikert,
  showTriad,
  showMcq,
}: {
  tab: PoolTab;
  sentimentQ: string;
  attributeQ: string;
  groupCodeQ: string;
  attributeNames: string[];
  showLikert: boolean;
  showTriad: boolean;
  showMcq: boolean;
}) {
  const [selectedTab, setSelectedTab] = useState<PoolTab>(tab);
  const isTriad = selectedTab === "triad";
  const isMcq = selectedTab === "mcq";

  return (
    <form method="GET" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm text-[#334155]">
        <span className="mb-1 block font-medium">Item type tab</span>
        <select
          name="tab"
          value={selectedTab}
          onChange={(e) => setSelectedTab(e.target.value as PoolTab)}
          className="tg-input w-full"
        >
          {showLikert ? <option value="likert">Likert pool</option> : null}
          {showTriad ? <option value="triad">Triad pool</option> : null}
          {showMcq ? <option value="mcq">MCQ pool</option> : null}
        </select>
      </label>
      <label className="text-sm text-[#334155]">
        <span className={`mb-1 block font-medium ${isMcq ? "text-[#94A3B8]" : ""}`}>Sentiment</span>
        <select name="sentiment" defaultValue={sentimentQ} disabled={isMcq} className="tg-input w-full disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0]">
          <option value="">All</option>
          <option value="POSITIVE">Positive</option>
          <option value="NEGATIVE">Negative</option>
        </select>
      </label>
      <label className="text-sm text-[#334155]">
        <span className="mb-1 block font-medium">Attribute (trait)</span>
        <SearchableSelect
          name="attribute"
          options={attributeNames}
          defaultValue={attributeQ}
          placeholder="Type to search…"
          allLabel="All attributes"
        />
      </label>
      <label className="text-sm text-[#334155]">
        <span className={`mb-1 block font-medium ${isTriad ? "" : "text-[#94A3B8]"}`}>Triad group code</span>
        <input
          name="groupCode"
          defaultValue={groupCodeQ}
          disabled={!isTriad}
          className="tg-input w-full disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:border-[#E2E8F0]"
          placeholder={isTriad ? "Triad tab" : "Only applies to Triad pool"}
        />
      </label>
      <div className="md:col-span-2 lg:col-span-4">
        <button type="submit" className="tg-button-primary text-sm">
          Apply filters
        </button>
      </div>
    </form>
  );
}
