/**
 * Validate a Sarvam API key by making the cheapest possible call.
 * Uses the translate endpoint with a tiny payload.
 *
 * The key is sent as `api-subscription-key` header per Sarvam docs.
 * A 2xx response means the key is valid.
 * A 401/403 means the key is invalid.
 * Network errors / 5xx / timeout means Sarvam is unreachable.
 */

const SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate";
const TIMEOUT_MS = 5000;

export type SarvamValidationResult =
  | { valid: true }
  | { valid: false; error: "KEY_INVALID" | "SARVAM_UNREACHABLE" };

export async function validateSarvamKey(
  key: string
): Promise<SarvamValidationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(SARVAM_TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": key,
      },
      body: JSON.stringify({
        input: "hello",
        source_language_code: "en-IN",
        target_language_code: "hi-IN",
        mode: "classic-colloquial",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // 2xx → key is valid
    if (response.ok) {
      return { valid: true };
    }

    // 401 or 403 → key is not valid
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "KEY_INVALID" };
    }

    // 5xx → Sarvam is having issues
    if (response.status >= 500) {
      return { valid: false, error: "SARVAM_UNREACHABLE" };
    }

    // Any other error (400, 404, 422, etc.) from Sarvam
    // If we got an auth-related status, treat as invalid key
    // Otherwise treat as unreachable (defensive)
    return { valid: false, error: "SARVAM_UNREACHABLE" };
  } catch (error: unknown) {
    clearTimeout(timeout);

    // AbortError = timeout, other = network failures
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[sarvam] Validation call timed out after 5s");
    } else {
      console.error("[sarvam] Validation call failed:", error);
    }

    return { valid: false, error: "SARVAM_UNREACHABLE" };
  }
}
