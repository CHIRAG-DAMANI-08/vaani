"use client";

import { useState, useEffect, useCallback } from "react";

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
      console.error("[csrf] Failed to fetch token:", err);
    }
  }, []);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  return { csrfToken, refreshToken: fetchToken };
}
