"use client";

import { easeOut } from "framer-motion";

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: easeOut },
  viewport: { once: true, margin: "-100px" },
});