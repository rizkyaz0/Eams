"use client";

import { LandingNav, LandingHero, LandingStats, LandingFeatures, LandingTestimonials, LandingCTA, LandingFooter } from "@/components/landing-components";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingFeatures />
        <LandingTestimonials />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
