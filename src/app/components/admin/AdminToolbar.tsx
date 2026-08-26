"use client";

import { useState, useEffect, FormEvent } from "react";
import { MagnifyingGlass, DownloadSimple, ArrowsClockwise, Funnel } from "@phosphor-icons/react";

interface AdminToolbarProps {
  status: string;
  onStatusChange: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onExport: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminToolbar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  onExport,
  onRefresh,
  isRefreshing = false,
}: AdminToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  return (
    <div className="liquid-glass border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-lg">
      <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
        <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
        <input
          type="search"
          placeholder="Search by email or name..."
          value={localSearch}
          onChange={(e) => {
            setLocalSearch(e.target.value);
            if (e.target.value === "") {
              onSearchChange("");
            }
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-full border border-white/10 bg-white/[0.03] text-xs font-sans text-white outline-none focus:border-white/30 placeholder:text-neutral-500 transition-all"
        />
      </form>

      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh application list"
            className="liquid-glass border border-white/10 hover:border-white/25 rounded-full px-3.5 py-2 text-xs font-sans text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ArrowsClockwise size={13} className={isRefreshing ? "animate-spin text-[#2DD4BF]" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        <div className="relative">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="liquid-glass border border-white/10 hover:border-white/25 rounded-full px-4 py-2 text-xs font-sans font-medium text-white outline-none focus:border-white/30 bg-neutral-900 cursor-pointer transition-all pr-8 appearance-none"
          >
            <option value="all" className="bg-neutral-900 text-white">All Statuses</option>
            <option value="pending" className="bg-neutral-900 text-amber-300">Pending</option>
            <option value="approved" className="bg-neutral-900 text-[#2DD4BF]">Approved</option>
            <option value="rejected" className="bg-neutral-900 text-red-400">Rejected</option>
            <option value="review" className="bg-neutral-900 text-blue-400">Review</option>
          </select>
          <Funnel size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={onExport}
          title="Export applications as CSV"
          className="liquid-glass border border-white/10 hover:border-white/25 rounded-full px-3.5 py-2 text-xs font-sans text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <DownloadSimple size={13} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}