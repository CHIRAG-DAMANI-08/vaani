"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "./logger";

/**
 * Hook that fetches a CSRF token from /api/csrf on mount
 * and provides it for inclusion in fetch headers.
 */
export function useCSRF() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch("/api/csrf");
      if (res.ok) {
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      }
    } catch (err) {
      logger.warn({ err }, "CSRF token fetch failed");
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return { csrfToken, refreshToken: fetchToken };
}
