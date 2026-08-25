"use client";

import { useId, type KeyboardEvent } from "react";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  const id = useId();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!disabled) onChange(!checked);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="font-dm-sans text-[13px] font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        {description && (
          <span className="font-dm-sans text-[12px] text-[var(--text-tertiary)] mt-0.5">
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full
          transition-colors duration-200 ease-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-saffron)]/40 focus-visible:ring-offset-2
          disabled:opacity-40 disabled:cursor-not-allowed
          ${checked ? "bg-[var(--accent-saffron)]" : "bg-gray-200"}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-[20px] w-[20px] rounded-full bg-white shadow-sm
            transition-transform duration-200 ease-out mt-[3px]
            ${checked ? "translate-x-[23px]" : "translate-x-[3px]"}
          `}
        />
      </button>
    </div>
  );
}
