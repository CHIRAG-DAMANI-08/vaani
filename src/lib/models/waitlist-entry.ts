import { Schema, model, models } from "mongoose";

const waitlistSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      trim: true,
      default: null,
    },
    campaign: {
      type: String,
      trim: true,
      default: null,
    },
    referrer: {
      type: String,
      trim: true,
      default: null,
    },
    feature_interest: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "invited", "converted"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    collection: "waitlist_entries",
  }
);

export const WaitlistEntry =
  models.WaitlistEntry || model("WaitlistEntry", waitlistSchema);
