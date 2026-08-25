"use client";

import { useId, useState, forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      id,
      label,
      error,
      hint,
      required,
      icon,
      type,
      className = "",
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block font-dm-sans text-[13px] font-semibold text-[var(--text-primary)] mb-1.5"
        >
          {label}
          {required && <span className="text-[var(--accent-red)] ml-0.5">*</span>}
        </label>
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={`
              glass-input
              ${icon ? "pl-10" : ""}
              ${isPassword ? "pr-12" : ""}
              ${error ? "!border-[var(--accent-red)]/40 !shadow-[0_0_0_3px_rgba(239,68,68,0.08)]" : ""}
              ${className}
            `}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-[8px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              {showPassword ? <EyeSlash className="w-4 h-4" weight="bold" /> : <Eye className="w-4 h-4" weight="bold" />}
            </button>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            aria-live="polite"
            className="mt-1.5 text-[12px] font-dm-sans text-[var(--accent-red)] animate-[fade-in_150ms_ease]"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-[12px] font-dm-sans text-[var(--text-tertiary)]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);
