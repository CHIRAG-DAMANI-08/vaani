"use client";

import { useEffect } from "react";
import Landing from "../components/landing/Landing";
import { Toaster } from "../components/ui/sonner";

export default function Home() {
  useEffect(() => {
    document.body.classList.add("landing-dark-body");
    return () => {
      document.body.classList.remove("landing-dark-body");
    };
  }, []);

  return (
    <>
      <Landing />
      <Toaster position="bottom-center" />
    </>
  );
}
