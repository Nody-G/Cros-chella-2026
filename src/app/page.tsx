import { HeroSection } from "@/components/landing/hero-section";
import { AttendanceSection } from "@/components/landing/attendance-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function Home() {
  return (
    <main className="pb-20">
      <HeroSection />
      <AttendanceSection />
      <FeaturesSection />
      <MobileNav />
    </main>
  );
}
