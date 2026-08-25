import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { SearchSection } from "./components/SearchSection";
import { MissionSection } from "./components/MissionSection";
import { SolutionSection } from "./components/SolutionSection";
import { CTASection } from "./components/CTASection";
import { Footer } from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <SearchSection />
        <MissionSection />
        <SolutionSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
