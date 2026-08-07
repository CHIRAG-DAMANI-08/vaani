"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "list"; items: string[] };

export type LegalSection = {
  id: string;
  heading: string;
  body: LegalBlock[];
};

const tocLink =
  "block py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-300";

/**
 * Renders a legal document from plain data: title, intro, and numbered
 * sections with an anchored table of contents. Content stays editable as
 * data (easy for a human/lawyer to review) without markup.
 */
export function LegalDocument({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <article>
      <motion.header {...fadeUp(0)} className="mb-14">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Last updated · {updated}
        </p>
        <h1 className="mb-6 font-serif text-4xl md:text-5xl text-foreground">{title}</h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">{intro}</p>
      </motion.header>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-12">
        {/* Table of contents — details disclosure on mobile, sticky rail on desktop */}
        <nav aria-label="Table of contents" className="mb-10 lg:sticky lg:top-28 lg:mb-0">
          <details className="lg:hidden rounded-2xl border border-white/10 bg-white/5">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
              On this page
            </summary>
            <ul className="space-y-1 px-4 pb-3">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={tocLink}>
                    {i + 1}. {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <div className="hidden lg:block">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              On this page
            </p>
            <ul className="space-y-1 border-l border-white/10 pl-4">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={tocLink}>
                    {i + 1}. {s.heading}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-14">
          {sections.map((s, i) => (
            <motion.section
              key={s.id}
              id={s.id}
              {...fadeUp((i % 4) * 0.05)}
              className="scroll-mt-28"
            >
              <h2 className="mb-5 font-serif text-2xl md:text-3xl text-foreground">
                <span className="text-muted-foreground">{i + 1}.</span> {s.heading}
              </h2>
              <div className="space-y-4">
                {s.body.map((block, j) => {
                  if (block.type === "h3") {
                    return (
                      <h3 key={j} className="pt-2 text-lg font-medium text-foreground">
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.type === "list") {
                    return (
                      <ul key={j} className="list-disc space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
                        {block.items.map((item, k) => (
                          <li key={k}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <p key={j} className="leading-relaxed text-muted-foreground">
                      {block.text}
                    </p>
                  );
                })}
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    </article>
  );
}
