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
    // TTS settings (cloud-synced, replaces localStorage)
    ttsSpeaker: {
      type: String,
      default: "shubh",
    },
    ttsPace: {
      type: Number,
      default: 1.0,
      min: 0.5,
      max: 2.0,
    },
    ttsSourceLang: {
      type: String,
      default: "auto",
    },
    // Stream configuration
    streamKeyEnc: {
      type: String,
      default: null,
    },
    streamKeyLast4: {
      type: String,
      maxlength: 4,
      default: null,
    },
    streamServerUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

export const User = models.User || model("User", userSchema);
