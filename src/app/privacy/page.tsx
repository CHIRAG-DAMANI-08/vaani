"use client";

import { ContentPageShell } from "@/app/components/ContentPageShell";
import { LegalDocument } from "@/lib/legal/content";
import { privacyIntro, privacySections, privacyUpdated } from "@/lib/legal/privacy";

export default function PrivacyPage() {
  return (
    <ContentPageShell>
      <LegalDocument
        title="Privacy Policy"
        updated={privacyUpdated}
        intro={privacyIntro}
        sections={privacySections}
      />
    </ContentPageShell>
  );
}
