import { Schema, model, models } from "mongoose";

const userSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sarvamKeyEnc: {
      type: String,
      default: null,
    },
    sarvamKeyLast4: {
      type: String,
      maxlength: 4,
      default: null,
    },
    sarvamKeyUpdatedAt: {
      type: Date,
      default: null,
    },
    obsHost: {
      type: String,
      default: null,
    },
    obsPort: {
      type: Number,
      default: null,
    },
    obsPasswordEnc: {
      type: String,
      default: null,
    },
    obsCredentialsUpdatedAt: {
      type: Date,
      default: null,
    },
    onboardingComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

export const User = models.User || model("User", userSchema);
