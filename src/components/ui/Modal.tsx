"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { IconButton } from "./IconButton";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!items || items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-[fade-in_150ms_ease]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-desc" : undefined}
        className="relative z-[101] w-full max-w-md glass-modal p-6 animate-[fade-slide-up_200ms_ease-out_forwards]"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2
              id="modal-title"
              className="font-syne font-bold text-[18px] text-[var(--text-primary)]"
            >
              {title}
            </h2>
            {description && (
              <p
                id="modal-desc"
                className="font-dm-sans text-[13px] text-[var(--text-tertiary)] mt-1"
              >
                {description}
              </p>
            )}
          </div>
          <IconButton icon={X} ariaLabel="Close dialog" onClick={onClose} />
        </div>
        <div className="text-[var(--text-secondary)]">{children}</div>
        {footer && <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-black/5">{footer}</div>}
      </div>
    </div>
  );
}
