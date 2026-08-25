"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type SVGProps } from "react";
import { SpinnerGap } from "@phosphor-icons/react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ComponentType<SVGProps<SVGSVGElement>>;
  iconPosition?: "left" | "right";
  children?: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary:
    "bg-gradient-to-br from-[var(--accent-saffron)] to-[#E8690A] text-white shadow-[0_4px_14px_rgba(245,130,31,0.3)] hover:shadow-[0_6px_20px_rgba(245,130,31,0.35)] hover:-translate-y-px active:scale-[0.98]",
  secondary:
    "bg-transparent text-[var(--text-secondary)] border border-black/10 hover:border-black/18 hover:text-[var(--text-primary)] hover:bg-black/[0.03]",
  danger:
    "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.14)] hover:border-[rgba(239,68,68,0.3)]",
  ghost:
    "bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04]",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-2 text-[12px] min-h-[36px] rounded-[10px]",
  md: "px-5 py-2.5 text-[13px] min-h-[44px] rounded-[12px]",
  lg: "px-6 py-3 text-[14px] min-h-[48px] rounded-[14px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon: Icon,
      iconPosition = "left",
      disabled,
      children,
      className = "",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        className={`
          inline-flex items-center justify-center gap-2 font-dm-sans font-semibold
          transition-all duration-150 ease-out
          disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading && <SpinnerGap className="w-4 h-4 animate-spin" weight="bold" />}
        {!loading && Icon && iconPosition === "left" && <Icon className="w-4 h-4" weight="bold" />}
        {children}
        {!loading && Icon && iconPosition === "right" && <Icon className="w-4 h-4" weight="bold" />}
      </button>
    );
  }
);

Button.displayName = "Button";