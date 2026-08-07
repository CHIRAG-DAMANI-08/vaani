import type { LegalSection } from "@/lib/legal/content";
import { CONTACT_EMAIL, GOVERNING_JURISDICTION } from "@/lib/legal/constants";

export const termsUpdated = "August 8, 2026";

export const termsIntro =
  "These Terms of Service (\"Terms\") govern your access to and use of Vaani, a real-time multilingual translation service for live broadcasts. By creating an account or using the service, you agree to these Terms. Please read them carefully. If you do not agree, do not use the service.";

export const termsSections: LegalSection[] = [
  {
    id: "acceptance",
    heading: "Acceptance of these terms",
    body: [
      { type: "p", text: "These Terms form a binding agreement between you and Vaani (\"we\", \"us\"). You accept them by creating an account, accessing the service, or otherwise using it. Your use is also subject to our Privacy Policy, which is incorporated here by reference." },
    ],
  },
  {
    id: "service",
    heading: "The service",
    body: [
      { type: "p", text: "Vaani translates the audio of your live broadcast in real time. You connect your broadcasting software (for example, OBS) to our local ingest, choose your translation languages, and provide a Sarvam AI API key. We process your speech through speech-to-text, translation, and text-to-speech, and route the translated audio to the streaming destinations you configure (for example, your own YouTube or Twitch channels)." },
      { type: "p", text: "Access to the service is currently invite- and waitlist-based. We may offer the service free or for a fee, and we may change the service or its availability at any time, with notice where reasonably practicable." },
    ],
  },
  {
    id: "accounts",
    heading: "Accounts and credentials",
    body: [
      { type: "p", text: "You must create an account (via Clerk) to use the service. You are responsible for maintaining the confidentiality of your account and any credentials you provide, including your Sarvam AI API key, OBS connection details, and your stream keys. You are responsible for all activity that occurs under your account." },
      { type: "p", text: "You must not share credentials in a way that lets others use your paid allocations, and you must notify us immediately of any unauthorized use." },
    ],
  },
  {
    id: "content",
    heading: "Your content and license to us",
    body: [
      { type: "p", text: "You own (or have the necessary rights to) everything you broadcast through the service, including your video and audio. You are solely responsible for your content and for ensuring that broadcasting it does not violate any law or any third party's rights." },
      { type: "p", text: "To operate the service, you grant us a limited, non-exclusive, worldwide license to process, transmit, translate, and route your content — including sharing your speech audio with our translation provider to produce the translation. This license is only for providing and improving the service." },
      { type: "p", text: "We do not claim ownership of your content. We do not store your video or raw audio." },
    ],
  },
  {
    id: "acceptable-use",
    heading: "Acceptable use",
    body: [
      { type: "p", text: "You must not use the service to:" },
      {
        type: "list",
        items: [
          "Broadcast content that is unlawful, infringing, defamatory, obscene, hateful, harassing, or that promotes violence, terrorism, or illegal activity.",
          "Stream copyrighted material you do not own or have permission to stream.",
          "Impersonate any person or entity, or misrepresent your affiliation.",
          "Attempt to gain unauthorized access to the service, other users' accounts, or our systems.",
          "Interfere with or disrupt the service, or attempt to overload, probe, or scan it.",
          "Use the service to collect data about others without consent.",
        ],
      },
      { type: "p", text: "We may investigate violations and suspend or terminate accounts that breach these rules. Where you stream to third-party platforms (YouTube, Twitch), their policies also apply and may result in actions against your channel." },
    ],
  },
  {
    id: "third-party",
    heading: "Third-party services",
    body: [
      { type: "p", text: "The service depends on third-party providers, including Sarvam AI for translation, Clerk for authentication, MongoDB for data storage, and the streaming platforms (such as YouTube and Twitch) you connect. Those services have their own terms and privacy policies, and we are not responsible for them." },
      { type: "p", text: "You may incur charges from third parties (for example, Sarvam AI usage fees for your API key). Those charges are between you and the provider and are not billed by Vaani." },
    ],
  },
  {
    id: "fees",
    heading: "Fees",
    body: [
      { type: "p", text: "The service is currently provided on an invite basis and does not charge fees. We may introduce fees in the future. Any fees will be described before you incur them, and we will provide notice before changing terms for existing users." },
    ],
  },
  {
    id: "dmca",
    heading: "Copyright and DMCA",
    body: [
      { type: "p", text: "We respect intellectual property rights and expect our users to do the same. If you believe content available through the service infringes your copyright, you may send a notice to our designated agent at " + CONTACT_EMAIL + ", including:" },
      {
        type: "list",
        items: [
          "A description of the copyrighted work you claim is infringed.",
          "A description of where the allegedly infringing material is located.",
          "Your contact information.",
          "A statement that you have a good-faith belief the use is not authorized.",
          "A statement, under penalty of perjury, that the information is accurate and that you are the rights holder or authorized to act on their behalf.",
          "Your physical or electronic signature.",
        ],
      },
      { type: "p", text: "We may remove material that we reasonably believe infringes copyright and may terminate the accounts of repeat infringers." },
    ],
  },
  {
    id: "ip",
    heading: "Our intellectual property",
    body: [
      { type: "p", text: "Vaani's name, logo, software, documentation, and the design of the service are our intellectual property. Except for the rights expressly granted in these Terms, no other rights are granted to you, and all rights are reserved." },
    ],
  },
  {
    id: "disclaimers",
    heading: "Disclaimers",
    body: [
      { type: "p", text: "The service is provided \"as is\" and \"as available\", without warranties of any kind, express or implied, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted, error-free, or that translations will be accurate." },
      { type: "p", text: "Translation is provided by a third-party AI service, and translations may contain errors or omissions. You are responsible for any content you publish based on the translation." },
    ],
  },
  {
    id: "liability",
    heading: "Limitation of liability",
    body: [
      { type: "p", text: "To the maximum extent permitted by law, Vaani and its personnel shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenue, data, or goodwill, arising out of or related to your use of the service." },
      { type: "p", text: "Our total liability to you for all claims arising out of these Terms or the service shall not exceed the amount you paid us in the twelve (12) months preceding the claim. Because the service is currently free, this cap may be zero, and the preceding sentence shall apply to any paid use." },
    ],
  },
  {
    id: "indemnification",
    heading: "Indemnification",
    body: [
      { type: "p", text: "You agree to indemnify and hold harmless Vaani and its personnel from and against any claims, damages, liabilities, and expenses (including reasonable attorneys' fees) arising out of your content, your use of the service, or your breach of these Terms." },
    ],
  },
  {
    id: "termination",
    heading: "Termination",
    body: [
      { type: "p", text: "You may stop using the service at any time. We may suspend or terminate your access if you breach these Terms, if we believe your use poses a risk to the service or others, or for other reasons, with notice where practicable." },
      { type: "p", text: "On termination, your right to use the service ends. The provisions of these Terms that by their nature should survive — including content licenses, disclaimers, limitation of liability, and indemnification — will survive termination." },
    ],
  },
  {
    id: "changes",
    heading: "Changes to these terms",
    body: [
      { type: "p", text: "We may update these Terms from time to time. We will post the updated Terms on this page and update the \"Last updated\" date, and we will provide notice of material changes through the service or by email. Your continued use after changes take effect constitutes acceptance." },
    ],
  },
  {
    id: "governing-law",
    heading: "Governing law and disputes",
    body: [
      { type: "p", text: "These Terms are governed by the laws of " + GOVERNING_JURISDICTION + ", without regard to its conflict-of-law principles. [TODO: update with registered entity and courts when formed.] Any disputes will be resolved in the courts of " + GOVERNING_JURISDICTION + "." },
      { type: "p", text: "You may also have rights and remedies under consumer protection laws in your country, which these Terms do not limit." },
    ],
  },
  {
    id: "contact",
    heading: "Contact",
    body: [
      { type: "p", text: `For questions about these Terms, email ${CONTACT_EMAIL}.` },
    ],
  },
];
