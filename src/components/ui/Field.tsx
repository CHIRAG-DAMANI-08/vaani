"use client";

import { type ReactNode } from "react";
import { Input, type InputProps } from "./Input";

export interface FieldProps extends Omit<InputProps, "error"> {
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export function Field({ error, hint, trailing, ...inputProps }: FieldProps) {
  return (
    <div className="w-full">
      <Input error={error} hint={hint} {...inputProps} />
      {trailing && <div className="mt-2">{trailing}</div>}
    </div>
  );
}
