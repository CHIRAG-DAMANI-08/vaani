const INGEST_PORT = 1935;

/**
 * RTMP ingest URL for OBS to connect to. Client-side only: derives the host
 * from the dashboard's own hostname, so it's localhost in local dev and the
 * deployed domain in production.
 */
export function getIngestBaseUrl(): string {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `rtmp://${host}:${INGEST_PORT}/live`;
}
