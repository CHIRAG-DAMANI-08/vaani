// src/lib/models/beta-membership.ts
import { Schema, model, models } from "mongoose";

const betaMembershipSchema = new Schema(
  {
    applicationEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    clerkUserId: {
      type: String,
      index: true,
      unique: true,
      sparse: true, // null allowed until claimed
      default: null,
    },
    status: {
      type: String,
      enum: ["approved", "revoked"],
      default: "approved",
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    conflictFlaggedAt: {
      type: Date,
      default: null,
    },
    conflictingClerkUserId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "beta_memberships",
  }
);

export const BetaMembership =
  models.BetaMembership || model("BetaMembership", betaMembershipSchema);