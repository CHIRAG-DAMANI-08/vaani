export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, margin: "-100px" as const },
  transition: { duration: 0.7, ease: "easeOut" as const, delay },
});
