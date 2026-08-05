const links = ["Privacy", "Terms", "Contact"];

export const Footer = () => {
  return (
    <footer
      className="py-12 px-8 md:px-28 flex flex-col md:flex-row items-center justify-between gap-4"
      data-testid="footer"
    >
      <p className="text-muted-foreground text-sm">
        © 2026 vaani. All rights reserved.
      </p>
      <div className="flex items-center gap-8">
        {links.map((link) => (
          <a
            key={link}
            href="#"
            className="text-muted-foreground text-sm hover:text-foreground transition-colors duration-300"
            data-testid={`footer-link-${link.toLowerCase()}`}
          >
            {link}
          </a>
        ))}
      </div>
    </footer>
  );
};
