import pino from "pino";

// ── Browser-safe no-op logger ───────────────────────────────────────────────
// Pino's transport() and worker threads are Node.js-only. When this module
// gets bundled into a client chunk (e.g. via WaitlistModal), we return a
// silent no-op logger so the browser never calls pino.transport().

const isServer = typeof window === "undefined";

function createNoopLogger(): pino.Logger {
  const noop = () => noopLogger;
  const noopLogger = {
    trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop,
    child: () => noopLogger,
    level: "silent",
  } as unknown as pino.Logger;
  return noopLogger;
}

// ── Shared config ────────────────────────────────────────────────────────────
const redact = {
  paths: [
    "sarvamKeyEnc",
    "obsPasswordEnc",
    "*.sarvamKeyEnc",
    "*.obsPasswordEnc",
    "password",
    "*.password",
    "rtmpKey",
    "*.rtmpKey",
  ],
  censor: "[redacted]",
};

const serializers = {
  err: pino.stdSerializers.err,
  error: pino.stdSerializers.err,
};

// ── Singleton ───────────────────────────────────────────────────────────────
// Cache on globalThis to survive Next.js hot-reload and module re-evaluation.
const globalAny = globalThis as any;

if (!globalAny.__vaaniLogger) {
  if (!isServer) {
    // Browser — no real logging
    globalAny.__vaaniLogger = createNoopLogger();
  } else {
    const isDev = process.env.NODE_ENV !== "production";
    const level = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");

    // Dev: pretty-print to stdout only (single target, no duplication)
    // Prod: raw JSON to stdout only (for log aggregation)
    const baseLogger = isDev
      ? pino(
          { level, redact, serializers },
          pino.transport({
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname",
            },
          })
        )
      : pino({ level, redact, serializers });

    globalAny.__vaaniLogger = baseLogger;
  }
}

// ── Exported logger ─────────────────────────────────────────────────────────
export const logger: pino.Logger = globalAny.__vaaniLogger;

/** Create a child logger with bound context (e.g., { userId, seq }). */
export function childLogger(context: object): pino.Logger {
  return logger.child(context);
}
