import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { AudienceChanged } from "./components/AudienceChanged";
import { Marquee } from "./components/LogoMarquee";
import { Mission } from "./components/Mission";
import { Solution } from "./components/Solution";
import { CTABanner } from "./components/CTABanner";
import { Footer } from "./components/Footer";
import { WaitlistModal } from "./components/WaitlistModal";

export default function Home() {
  return (
    <div className="landing-dark">
      <Navbar />
      <main>
        <HeroSection />
        <AudienceChanged />
        <Marquee />
        <Mission />
        <Solution />
        <CTABanner />
      </main>
      <Footer />
      <WaitlistModal />
    </div>
  );
}
