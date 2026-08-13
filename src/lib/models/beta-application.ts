// src/lib/models/beta-application.ts
import { Schema, model, models } from "mongoose";

const betaApplicationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    deviceHash: {
      type: String,
      index: true,
      default: null,
    },
    ipAddress: {
      type: String,
      index: true,
      default: null,
    },
    interests: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "review"],
      default: "pending",
      index: true,
    },
    reviewReason: {
      type: String,
      enum: ["device_cardinality", "ip_cardinality", "disposable_email", "test_email"],
      default: null,
    },
    normalizedEmail: {
      type: String,
      lowercase: true,
      trim: true,
      index: true,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "beta_applications",
  }
);

betaApplicationSchema.index({ normalizedEmail: 1 }, { unique: true, sparse: true });

export const BetaApplication =
  models.BetaApplication || model("BetaApplication", betaApplicationSchema);