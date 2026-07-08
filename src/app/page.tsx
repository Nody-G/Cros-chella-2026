import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HypeSection } from "@/components/landing/hype-section";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function Home() {
  return (
    <main className="pb-20">
      <HeroSection />
      <FeaturesSection />
      <HypeSection />
      <MobileNav />
    </main>
  );
}
