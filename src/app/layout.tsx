import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/components/cart/CartProvider";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Nutrilicious Food | Makan Sehat Hidup Lebih Kuat",
  description: "Platform katering sehat dengan sistem prediksi AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("font-sans", inter.variable)} suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
            <CartProvider>{children}</CartProvider>
            <Toaster richColors position="top-right" />
          </GoogleOAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
