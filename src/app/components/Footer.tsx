const links = ["Privacy", "Terms", "Contact"];

export const Footer = () => {
  return (
    <footer
      className="py-12 px-8 md:px-28 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[var(--landing-border)]"
      data-testid="footer"
    >
      <p className="text-[var(--landing-muted)] text-sm">
        © 2026 vaani. All rights reserved.
      </p>
      <div className="flex items-center gap-8">
        {links.map((label) => (
          <a
            key={label}
            href="#"
            className="text-sm text-[var(--landing-muted)] hover:text-[var(--landing-fg)] transition-colors duration-200"
          >
            {label}
          </a>
        ))}
      </div>
    </footer>
  );
};
