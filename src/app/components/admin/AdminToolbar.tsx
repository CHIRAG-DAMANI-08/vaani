"use client";

import { useState, FormEvent } from "react";
import { Search, Download, Filter } from "lucide-react";

interface AdminToolbarProps {
  status: string;
  onStatusChange: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onExport: () => void;
}

export function AdminToolbar({ status, onStatusChange, search, onSearchChange, onExport }: AdminToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  return (
    <div className="liquid-glass border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <form onSubmit={handleSubmit} className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
        <input
          type="search"
          placeholder="Search email, name..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] text-sm text-white outline-none focus:border-white/30 placeholder:text-neutral-600"
        />
      </form>

      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="liquid-glass border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-white outline-none focus:border-white/30 bg-white/[0.02] appearance-none"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="review">Review</option>
        </select>

        <button
          onClick={onExport}
          className="liquid-glass border border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-neutral-400 hover:text-white hover:border-white/25 transition-colors flex items-center gap-1.5"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
}