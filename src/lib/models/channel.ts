import { Schema, model, models } from "mongoose";
import { LANGUAGE_REGISTRY } from "@/lib/language-registry";
import { encryptValue, decryptValue } from "@/lib/encryption";

/**
 * Channel model — represents a single language output channel.
 *
 * Each channel belongs to a user (via clerkId) and defines:
 *  - A target language (e.g. "hi" for Hindi)
 *  - An RTMP stream key (encrypted at rest) for the output OBS/YouTube/Twitch target
 *  - An enabled/disabled state
 */

const channelSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    languageId: {
      type: String,
      required: true,
      enum: LANGUAGE_REGISTRY.map((l) => l.id),
    },
    languageName: {
      type: String,
      required: true,
    },
    script: {
      type: String,
      required: true,
    },
    /** Encrypted RTMP key (AES-256-GCM). Use the `rtmpKey` virtual to read/write plaintext. */
    rtmpKeyEnc: {
      type: String,
      default: null,
    },
    /** Last 4 chars of the RTMP key for display purposes. */
    rtmpKeyLast4: {
      type: String,
      maxlength: 4,
      default: null,
    },
    rtmpKeyUpdatedAt: {
      type: Date,
      default: null,
    },
    rtmpUrl: {
      type: String,
      default: null,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "channels",
  }
);

/**
 * Virtual: write plaintext via `channel.rtmpKey = "..."` and it auto-encrypts.
 * Read via `channel.rtmpKey` and it auto-decrypts.
 */
channelSchema.virtual("rtmpKey").get(function (this: { rtmpKeyEnc?: string | null }) {
  return this.rtmpKeyEnc ? decryptValue(this.rtmpKeyEnc) : null;
}).set(function (this: { rtmpKeyEnc?: string | null; rtmpKeyLast4?: string | null; rtmpKeyUpdatedAt?: Date | null }, plaintext: string | null) {
  if (!plaintext) {
    this.rtmpKeyEnc = null;
    this.rtmpKeyLast4 = null;
    this.rtmpKeyUpdatedAt = null;
    return;
  }
  this.rtmpKeyEnc = encryptValue(plaintext);
  this.rtmpKeyLast4 = plaintext.slice(-4);
  this.rtmpKeyUpdatedAt = new Date();
});

/** Virtual: boolean indicating whether an RTMP key is configured. */
channelSchema.virtual("hasRtmpKey").get(function (this: { rtmpKeyEnc?: string | null }) {
  return !!this.rtmpKeyEnc;
});

// Ensure virtuals are included in JSON output
channelSchema.set("toJSON", { virtuals: true });
channelSchema.set("toObject", { virtuals: true });

// Compound unique index — one channel per language per user
channelSchema.index({ clerkId: 1, languageId: 1 }, { unique: true });

export const Channel =
  models.Channel || model("Channel", channelSchema);

/**
 * Supported language definitions dynamically derived from registry.
 */
export const SUPPORTED_LANGUAGES = LANGUAGE_REGISTRY.map(l => ({
  id: l.id,
  name: l.name,
  script: l.nativeName,
  color: `var(--lang-${l.name.toLowerCase()}, #F5821F)`,
}));
