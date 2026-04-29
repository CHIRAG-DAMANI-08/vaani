import { Schema, model, models } from "mongoose";
import { LANGUAGE_REGISTRY } from "@/lib/language-registry";

/**
 * Channel model — represents a single language output channel.
 *
 * Each channel belongs to a user (via clerkId) and defines:
 *  - A target language (e.g. "hi" for Hindi)
 *  - An RTMP stream key for the output OBS/YouTube/Twitch target
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
    rtmpKey: {
      type: String,
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
