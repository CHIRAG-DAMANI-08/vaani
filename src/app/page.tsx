import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { AudienceChanged } from "./components/AudienceChanged";
import { Marquee } from "./components/Marquee";
import { Mission } from "./components/Mission";
import { Solution } from "./components/Solution";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";
import { WaitlistModal } from "./components/WaitlistModal";
import { useLenis } from "./hooks/useLenis";

export default function Home() {
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
      <WaitlistModal />
    </div>
  );
}