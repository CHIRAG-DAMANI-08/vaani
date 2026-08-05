import useLenis from "../../hooks/useLenis";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { AudienceChanged } from "./AudienceChanged";
import { Marquee } from "./Marquee";
import { Mission } from "./Mission";
import { Solution } from "./Solution";
import { CTA } from "./CTA";
import { Footer } from "./Footer";

export default function Landing() {
  useLenis();
  return (
    <div className="grain relative bg-background text-foreground min-h-screen" data-testid="landing-page">
      <Navbar />
      <Hero />
      <AudienceChanged />
      <Marquee />
      <Mission />
      <Solution />
      <CTA />
      <Footer />
    </div>
  );
}
