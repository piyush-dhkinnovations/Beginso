import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: { absolute: 'Beginso · Forms, responses and insights for your team' },
  description: 'Build forms, collect responses, and turn them into insights your whole team can act on.',
};

export default function Home() {
  return (
    <main className="min-h-screen bg-(--bg-page) selection:bg-(--accent-soft-hover) selection:text-(--accent-soft-text)">
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
