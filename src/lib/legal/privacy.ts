import type { LegalSection } from "@/lib/legal/content";
import { CONTACT_EMAIL } from "@/lib/legal/constants";

export const privacyUpdated = "August 8, 2026";

export const privacyIntro =
  "This Privacy Policy explains what information Vaani (\"we\", \"us\") collects, how we use it, who we share it with, and the choices you have. It applies to Vaani's website and services. Vaani is a live-streaming translation tool: it takes the audio of your live broadcast, converts your speech to text, translates it into the languages you choose, and routes the translated speech to the streaming destinations you configure (such as your own YouTube or Twitch channels).";

export const privacySections: LegalSection[] = [
  {
    id: "overview",
    heading: "Overview & who we are",
    body: [
      { type: "p", text: "Vaani is operated under the name \"Vaani\" and is based in India. [TODO: update with registered entity name and address when formed.]" },
      { type: "p", text: "This policy describes our practices as of August 8, 2026. We will update it as our services change." },
      { type: "list", items: [`Email for privacy questions: ${CONTACT_EMAIL}`] },
    ],
  },
  {
    id: "collection",
    heading: "Information we collect",
    body: [
      { type: "h3", text: "Account information" },
      { type: "p", text: "We use Clerk to manage accounts. You can sign up with an email and password or with Google. We store only your Clerk user identifier in our database; we do not store your email address or name for signed-in users." },
      { type: "h3", text: "Service information" },
      {
        type: "list",
        items: [
          "Stream session details: when you go live, we record session start and end times, duration, the translation languages you selected, the number of audio chunks processed, and estimated usage and cost figures.",
          "Transcripts: we store the speech-to-text transcript of your speech from each session. These transcripts are visible to you in your dashboard and can be exported.",
          "Translations and generated speech are not stored. Translated audio is sent to your configured destinations and is not retained by us.",
        ],
      },
      { type: "h3", text: "Waitlist information" },
      { type: "p", text: "If you join the waitlist, we collect your email address and, if you provide it, your name and optional campaign or referrer details. We use this information to contact you about access." },
      { type: "h3", text: "Credentials you provide" },
      { type: "p", text: "To translate using your own accounts, you may provide a Sarvam AI API key, your OBS WebSocket connection details, and RTMP stream keys for your YouTube or Twitch destinations. These are encrypted before storage and are used only to provide the service." },
      { type: "h3", text: "Preferences" },
      { type: "p", text: "Your translation preferences (voice, pace, source language) are stored in your browser's local storage and are transmitted to our servers only to configure a live session. Your onboarding state is also stored locally." },
      { type: "h3", text: "Your broadcast content" },
      { type: "p", text: "Your live video and audio pass through our servers while you are live: the audio is processed in short segments to produce the translation, and the video is relayed to your configured destinations. We do not store your video or raw audio." },
    ],
  },
  {
    id: "use",
    heading: "How we use information",
    body: [
      {
        type: "list",
        items: [
          "To provide the service you request, including real-time translation and routing to your streaming destinations (contract performance).",
          "To authenticate you and protect your account and the service from abuse (legitimate interest / contract).",
          "To store and show you your session transcripts and statistics (contract).",
          "To send waitlist and account communications you have requested (consent).",
          "To meet our legal obligations and enforce our Terms of Service.",
          "To improve the service through aggregated, non-personal usage analysis (legitimate interest). We do not use your data for advertising personalization.",
        ],
      },
    ],
  },
  {
    id: "sharing",
    heading: "How we share information",
    body: [
      { type: "p", text: "We do not sell your personal information, and we do not share it for cross-context behavioral advertising. We share data only as needed to operate the service:" },
      {
        type: "list",
        items: [
          "Sarvam AI (api.sarvam.ai): receives your speech audio and the recognized text to produce translations and spoken audio. A third-party processor.",
          "Clerk: provides authentication and account management.",
          "MongoDB Atlas: hosts the database where your account, session, and waitlist data are stored.",
          "Resend: sends waitlist and service emails.",
          "YouTube, Twitch, and other destinations you configure: we push translated audio to the endpoints you provide. We do not control those services; their own privacy policies apply.",
          "Google Fonts: loads fonts for the website (your browser sends an IP address).",
        ],
      },
      { type: "p", text: "We may disclose information if required by law or legal process, or to protect the rights, property, or safety of Vaani, our users, or the public. In the event of a merger, acquisition, or asset sale, your information may be transferred as part of that transaction." },
    ],
  },
  {
    id: "content",
    heading: "Content you stream",
    body: [
      { type: "p", text: "You are responsible for the content you broadcast and for ensuring you have the rights to stream it. See our Terms of Service for the full acceptable-use rules." },
      { type: "p", text: `We store transcripts of your speech to power your session history. You can view and export them. We do not currently offer automated deletion; if you would like us to remove your transcripts or delete your data, email ${CONTACT_EMAIL} and we will process your request. We are working on self-serve account deletion.` },
    ],
  },
  {
    id: "cookies",
    heading: "Cookies and local storage",
    body: [
      {
        type: "list",
        items: [
          "A Clerk session cookie, required for authentication.",
          "A CSRF cookie (__vaani_csrf), set with HttpOnly and Secure attributes, used to protect against cross-site request forgery.",
        ],
      },
      { type: "p", text: "We do not use advertising or analytics cookies. If you disable cookies, parts of the service may not work." },
      { type: "p", text: "We also use browser local storage for non-sensitive preferences such as your translation voice and pace, and your onboarding status." },
    ],
  },
  {
    id: "security",
    heading: "Security",
    body: [
      { type: "p", text: "We take reasonable measures to protect your information: credentials (API keys, OBS passwords, stream keys) are encrypted at rest with AES-256-GCM, all web traffic is served over HTTPS, WebSocket connections are authenticated, and our logs redact secrets." },
      { type: "p", text: "No method of transmission or storage is completely secure. You are responsible for keeping your account credentials and stream keys confidential." },
    ],
  },
  {
    id: "retention",
    heading: "Data retention",
    body: [
      {
        type: "list",
        items: [
          "Waitlist information: kept until you ask us to delete it or the purpose ends.",
          "Session transcripts and statistics: kept while your account is active, and until you request deletion.",
          "Credentials you provide: kept until you remove them from your settings.",
        ],
      },
      { type: "p", text: `We are building self-serve tools to let you delete your data and account. Until then, email ${CONTACT_EMAIL} and we will honor deletion requests promptly.` },
    ],
  },
  {
    id: "rights",
    heading: "Your rights",
    body: [
      { type: "p", text: "Depending on where you live, you may have rights over your personal information." },
      { type: "h3", text: "If you are in the EU, UK, or elsewhere under the GDPR" },
      {
        type: "list",
        items: [
          "Access a copy of the personal information we hold about you.",
          "Correct inaccurate information.",
          "Request erasure of your personal information.",
          "Restrict or object to certain processing.",
          "Receive your data in a portable form.",
          "Lodge a complaint with your local data protection authority.",
        ],
      },
      { type: "h3", text: "If you are in California (CCPA/CPRA)" },
      {
        type: "list",
        items: [
          "Know what personal information we collect and how we use and share it.",
          "Request deletion of your personal information.",
          "Request correction of inaccurate information.",
          "Opt out of the sale or sharing of personal information — we do not sell or share personal information.",
          "Limit our use of sensitive personal information — credentials you provide are used solely to operate the service.",
          "Not be discriminated against for exercising these rights.",
          "Request information about disclosures for direct marketing purposes (California's Shine the Light law).",
        ],
      },
      { type: "h3", text: "How to exercise your rights" },
      { type: "p", text: `Email ${CONTACT_EMAIL} with your request. We will verify your identity and respond within the timeframes required by law (generally 30 days or less).` },
    ],
  },
  {
    id: "transfers",
    heading: "International data transfers",
    body: [
      { type: "p", text: "Vaani is based in India. Your information may be processed in India and by our service providers, which may operate in other countries (including the United States, the European Economic Area, and Singapore). Where required, we rely on appropriate safeguards such as the Standard Contractual Clauses approved by the European Commission." },
    ],
  },
  {
    id: "children",
    heading: "Children's privacy",
    body: [
      { type: "p", text: `Our services are not directed to children under 13, and we do not knowingly collect personal information from children. If you believe a child has provided us personal information, contact ${CONTACT_EMAIL} and we will delete it.` },
    ],
  },
  {
    id: "changes",
    heading: "Changes to this policy",
    body: [
      { type: "p", text: "We may update this policy from time to time. We will post the updated policy on this page and update the \"Last updated\" date. If we make material changes, we will provide notice through the service or by email." },
    ],
  },
  {
    id: "contact",
    heading: "Contact us",
    body: [
      { type: "p", text: `For questions about this policy or to exercise your rights, contact us at ${CONTACT_EMAIL}.` },
    ],
  },
];
