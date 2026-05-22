import { Header } from "@/components/layout/Header";
import { HeroSection } from "@/components/home/HeroSection";
import { PricingSection } from "@/components/home/PricingSection";
import { MenuCatalog } from "@/components/home/MenuCatalog";
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
        <PricingSection />
      </main>
      <footer className="border-t bg-slate-50 py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6 text-center text-muted-foreground">
          <p>© 2026 Nutrilicious Food. Cita Rasa Alam, Presisi Gizi Masa Depan.</p>
        </div>
      </footer>
      <CartWidget />
      <RAGChatbotWidget />
    </div>
  );
}
