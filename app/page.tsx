"use client";

import { LandingHero, LandingFeatures } from "@/components/landing-components";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main>
        <LandingHero />
        <LandingFeatures />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12">
        <div className="container px-4 mx-auto text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} EAMS. Enterprise Asset Management System.</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
