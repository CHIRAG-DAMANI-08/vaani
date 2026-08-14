"use client";

import { useState } from "react";
import { LANG_BY_BCP47 } from "@/lib/language-registry";

interface InterestPillGroupProps {
  selected: string[];
  onChange: (languages: string[]) => void;
  className?: string;
}

const LANGUAGES = [
  { id: "hi", name: "Hindi", script: "हि" },
  { id: "ta", name: "Tamil", script: "த" },
  { id: "te", name: "Telugu", script: "తె" },
  { id: "kn", name: "Kannada", script: "ಕ" },
  { id: "mr", name: "Marathi", script: "मर" },
  { id: "bn", name: "Bengali", script: "ব" },
  { id: "gu", name: "Gujarati", script: "ગુ" },
  { id: "ml", name: "Malayalam", script: "മ" },
];

export function InterestPillGroup({ selected, onChange, className = "" }: InterestPillGroupProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label="Language interests">
      {LANGUAGES.map((lang) => {
        const isSelected = selected.includes(lang.id);
        return (
          <button
            key={lang.id}
            type="button"
            onClick={() => {
              const next = isSelected
                ? selected.filter((id) => id !== lang.id)
                : [...selected, lang.id];
              onChange(next);
            }}
            className={`
              liquid-glass border-white/10 rounded-full px-3 py-1.5 text-xs font-sans font-medium transition-all
              ${isSelected
                ? "bg-white text-black border-white shadow-sm"
                : "text-neutral-400 hover:text-white hover:border-white/25"
              }
            `}
            aria-pressed={isSelected}
          >
            <span className="font-serif italic mr-1">{lang.script}</span>
            {lang.name}
          </button>
        );
      })}
    </div>
  );
}