const langs = [
  "हिन्दी",
  "தமிழ்",
  "తెలుగు",
  "ಕನ್ನಡ",
  "മലയാളം",
  "বাংলা",
  "मराठी",
  "ગુજરાતી",
  "ଓଡ଼ିଆ",
  "ਪੰਜਾਬੀ",
];

export const Marquee = () => {
  const items = [...langs, ...langs];
  return (
    <section
      className="relative py-10 md:py-14 border-y border-border/30 overflow-hidden"
      data-testid="marquee"
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee">
        {items.map((lang, i) => (
          <div key={i} className="flex items-center">
            <span className="text-3xl md:text-5xl font-serif italic text-foreground/70 px-8 md:px-12 whitespace-nowrap">
              {lang}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
          </div>
        ))}
      </div>
    </section>
  );
};
