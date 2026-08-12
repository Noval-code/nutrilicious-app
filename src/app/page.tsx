import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { PricingSection } from "@/components/home/PricingSection";
import { AboutSection } from "@/components/home/AboutSection";
import { MenuCatalog } from "@/components/home/MenuCatalog";
import { PortionMenuSection } from "@/components/home/PortionMenuSection";
import dynamic from "next/dynamic";

// Lazy-load floating widgets — mereka bukan critical path dan cukup berat
const RAGChatbotWidget = dynamic(
  () => import("@/components/chat/RAGChatbotWidget").then((m) => ({ default: m.RAGChatbotWidget })),
  { ssr: false }
);
const CartWidget = dynamic(
  () => import("@/components/cart/CartWidget").then((m) => ({ default: m.CartWidget })),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <MenuCatalog />
        <PortionMenuSection />
        <PricingSection />
        <AboutSection />
      </main>
      <Footer />
      <CartWidget />
      <RAGChatbotWidget />
    </div>
  );
}
