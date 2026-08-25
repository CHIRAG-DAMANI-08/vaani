"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { CaretDown } from "@phosphor-icons/react";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  options: { value: string; label: string }[];
}

export function Select({
  id,
  label,
  error,
  hint,
  required,
  options,
  className = "",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="w-full">
      <label
        htmlFor={selectId}
        className="block font-dm-sans text-[13px] font-semibold text-[var(--text-primary)] mb-1.5"
      >
        {label}
        {required && <span className="text-[var(--accent-red)] ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          className={`
            glass-input appearance-none pr-10 cursor-pointer
            ${error ? "!border-[var(--accent-red)]/40" : ""}
            ${className}
          `}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <CaretDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" weight="bold" />
      </div>
      {error && (
        <p
          id={`${selectId}-error`}
          role="alert"
          aria-live="polite"
          className="mt-1.5 text-[12px] font-dm-sans text-[var(--accent-red)] animate-[fade-in_150ms_ease]"
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${selectId}-hint`} className="mt-1.5 text-[12px] font-dm-sans text-[var(--text-tertiary)]">
          {hint}
        </p>
      )}
    </div>
  );
}
