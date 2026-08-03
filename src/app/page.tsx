import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { TrustSection } from "@/components/landing/trust-section";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { DeveloperSection } from "@/components/landing/developer-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FutureVision } from "@/components/landing/future-vision";
import { CallToAction } from "@/components/landing/call-to-action";
import { Footer } from "@/components/landing/footer";

export default async function Home() {

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground relative selection:bg-primary/20 selection:text-primary overflow-x-hidden">
      <Navigation />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
        <Hero />
        <TrustSection />
        <FeatureGrid />
        <DeveloperSection />
        <SecuritySection />
        <FutureVision />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
