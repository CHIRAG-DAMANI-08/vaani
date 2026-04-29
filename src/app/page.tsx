import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { LogoMarquee } from "./components/LogoMarquee";
import { FeaturesSection } from "./components/FeaturesSection";
import { PlatformStack } from "./components/PlatformStack";
import { SamvaadDemo } from "./components/SamvaadDemo";
import { SecuritySection } from "./components/SecuritySection";
import { DeploymentSection } from "./components/DeploymentSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { ResearchSection } from "./components/ResearchSection";
import { CTABanner } from "./components/CTABanner";
import { Footer } from "./components/Footer";
import { WaitlistModal } from "./components/WaitlistModal";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <LogoMarquee />
        <FeaturesSection />
        <PlatformStack />
        <SamvaadDemo />
        <SecuritySection />
        <DeploymentSection />
        <TestimonialsSection />
        <ResearchSection />
        <CTABanner />
      </main>
      <Footer />
      <WaitlistModal />
    </>
  );
}
