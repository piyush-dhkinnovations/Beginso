import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProductMockup from "@/components/landing/ProductMockup";
import StatsBar from "@/components/landing/StatsBar";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CtaSection from "@/components/landing/CtaSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white selection:bg-brand-100 selection:text-brand-900">
      <Navbar />
      <HeroSection />
      <ProductMockup />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
