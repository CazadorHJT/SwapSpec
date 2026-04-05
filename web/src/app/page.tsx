"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { ModelShowcase } from "@/components/landing/model-showcase";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { StatsSection } from "@/components/landing/stats-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ComingSoonSection } from "@/components/landing/coming-soon-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ModelShowcase />
        <HowItWorksSection />
        <StatsSection />
        <PricingSection />
        <ComingSoonSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
