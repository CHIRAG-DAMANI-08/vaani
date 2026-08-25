"use client";

import { forwardRef, type ButtonHTMLAttributes, type SVGProps } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  ariaLabel: string;
  variant?: "default" | "danger";
}

const variantClasses: Record<string, string> = {
  default: "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-black/[0.04]",
  danger: "text-[var(--accent-red)]/60 hover:text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.08)]",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon: Icon, ariaLabel, variant = "default", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        className={`
          inline-flex items-center justify-center min-w-[44px] min-h-[44px]
          rounded-[12px] transition-all duration-150 ease-out
          disabled:opacity-40 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${className}
        `}
        {...props}
      >
        <Icon className="w-[18px] h-[18px]" weight="bold" />
      </button>
    );
  }
);

IconButton.displayName = "IconButton";