const langs = [
  "हिन्दी",
  "Español",
  "தமிழ்",
  "Français",
  "中文",
  "العربية",
  "Português",
  "తెలుగు",
  "日本語",
  "Deutsch",
  "한국어",
  "Русский",
];

export const Marquee = () => {
  const items = [...langs, ...langs];
  return (
    <section
      className="relative py-10 md:py-14 border-y border-[var(--landing-border)] overflow-hidden"
      data-testid="marquee"
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee">
        {items.map((lang, i) => (
          <div
            key={`${lang}-${i}`}
            className="flex items-center gap-6 px-6 text-2xl md:text-3xl font-medium tracking-tight text-[var(--landing-fg)]/20"
          >
            <span>{lang}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--landing-fg)]/15" />
          </div>
        ))}
      </div>
    </section>
  );
};
