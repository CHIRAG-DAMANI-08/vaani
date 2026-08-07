"use client";

import { ContentPageShell } from "@/app/components/ContentPageShell";
import { LegalDocument } from "@/lib/legal/content";
import { termsIntro, termsSections, termsUpdated } from "@/lib/legal/terms";

export default function TermsPage() {
  return (
    <ContentPageShell>
      <LegalDocument
        title="Terms of Service"
        updated={termsUpdated}
        intro={termsIntro}
        sections={termsSections}
      />
    </ContentPageShell>
  );
}
