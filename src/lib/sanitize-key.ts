export type SanitizeResult =
  | { ok: true; key: string }
  | { ok: false; code: "KEY_FORMAT_INVALID"; message: string };

const ALLOWED_CHARS = /^[a-zA-Z0-9_\-]+$/;
const SINGLE_CHAR_REPEAT = /^(.)\1+$/;
const FORBIDDEN_LITERALS = new Set([
  "null",
  "undefined",
  "true",
  "false",
]);

/**
 * Sanitize a raw API key string per PRD §6.2.
 *
 * Rules applied in order:
 *  1. Trim whitespace
 *  2. Length check (20–200)
 *  3. Character allowlist [a-zA-Z0-9_-]
 *  4. No internal whitespace
 *  5. No null bytes
 *  6. Pattern rejection (literals, single-char repeats)
 */
export function sanitizeKey(raw: unknown): SanitizeResult {
  if (typeof raw !== "string") {
    return {
      ok: false,
      code: "KEY_FORMAT_INVALID",
      message: "Key must be a string.",
    };
  }

  // Rule 1 — Trim
  const trimmed = raw.trim();

  // Rule 2 — Length
  if (trimmed.length < 20 || trimmed.length > 200) {
    return {
      ok: false,
      code: "KEY_FORMAT_INVALID",
      message: "Key must be between 20 and 200 characters.",
    };
  }

  // Rule 5 — No null bytes (check before charset so we get a specific error)
  if (trimmed.includes("\x00")) {
    return {
      ok: false,
      code: "KEY_FORMAT_INVALID",
      message: "Key contains invalid characters.",
    };
  }

  // Rule 4 — No internal whitespace
  if (/\s/.test(trimmed)) {
    return {
      ok: false,
      code: "KEY_FORMAT_INVALID",
      message: "Key must not contain spaces or whitespace.",
    };
  }

  // Rule 3 — Character allowlist
  if (!ALLOWED_CHARS.test(trimmed)) {
    return {
      ok: false,
      code: "KEY_FORMAT_INVALID",
      message:
        "Key should only contain letters, numbers, hyphens, and underscores.",
    };
  }

  // Rule 6 — Pattern rejection
  if (FORBIDDEN_LITERALS.has(trimmed.toLowerCase())) {
    return {
      ok: false,
      code: "KEY_FORMAT_INVALID",
      message: "Key value is not valid.",
    };
  }
  if (SINGLE_CHAR_REPEAT.test(trimmed)) {
    return {
      ok: false,
      code: "KEY_FORMAT_INVALID",
      message: "Key value is not valid.",
    };
  }

  return { ok: true, key: trimmed };
}
