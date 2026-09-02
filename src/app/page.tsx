import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import LogoMarquee from "@/components/landing/LogoMarquee";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StatsBar from "@/components/landing/StatsBar";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import FaqSection from "@/components/landing/FaqSection";
import BlogSection from "@/components/landing/BlogSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] selection:bg-[var(--primary-100)] selection:text-[var(--primary-900)]">
      <Navbar />
      <HeroSection />
      <LogoMarquee />
      <FeaturesSection />
      <StatsBar />
      <HowItWorksSection />
      <FaqSection />
      <BlogSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
