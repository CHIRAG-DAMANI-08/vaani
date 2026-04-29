import { Schema, model, models } from "mongoose";

/**
 * Session model — represents a completed streaming session.
 *
 * Persists session statistics, cost, duration, languages,
 * and the final transcript for historical review and export.
 */

const sessionSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      required: true,
    },
    durationMs: {
      type: Number,
      required: true,
    },
    activeLanguages: {
      type: [String],
      required: true,
    },
    chunksProcessed: {
      type: Number,
      required: true,
      default: 0,
    },
    estimatedCostINR: {
      type: Number,
      required: true,
      default: 0,
    },
    transcript: {
      type: [String],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "sessions",
  }
);

// Index for fetching past sessions ordered by newest first
sessionSchema.index({ clerkId: 1, startedAt: -1 });

export const Session =
  models.Session || model("Session", sessionSchema);
