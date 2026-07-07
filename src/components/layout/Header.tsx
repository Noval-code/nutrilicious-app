"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { UserDropdown } from "./UserDropdown";

const navItems = [
  { href: "#menu-catalog", label: "Katalog Menu" },
  { href: "#pricing", label: "Paket" },
  { href: "#tentang", label: "Tentang Kami" },
];

export function Header() {
  const { isSignedIn, isLoaded } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2" onClick={closeMobileMenu}>
          <Image
            src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779722843/WhatsApp_Image_2026-05-25_at_22.22.11-removebg-preview_1_uerl99.png"
            alt="Nutrilicious Logo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="truncate text-lg font-bold tracking-tight text-primary sm:text-xl">
            Nutrilicious Food
          </span>
        </Link>

        <nav className="hidden gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-medium transition-colors hover:text-primary">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          {isLoaded && (
            <>
              {isSignedIn ? (
                <UserDropdown />
              ) : (
                <>
                  <Link href="/sign-in">
                    <Button variant="outline" className="border-primary px-5 font-semibold text-primary hover:bg-primary/10">Masuk</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button className="bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">Daftar</Button>
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 text-primary transition-colors hover:bg-primary/10 md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t bg-background shadow-lg md:hidden">
          <div className="container mx-auto space-y-4 px-4 py-4">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {isLoaded && (
              <div className="border-t pt-4">
                {isSignedIn ? (
                  <div className="flex justify-end">
                    <UserDropdown />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/sign-in" onClick={closeMobileMenu}>
                      <Button variant="outline" className="w-full border-primary font-semibold text-primary hover:bg-primary/10">Masuk</Button>
                    </Link>
                    <Link href="/sign-up" onClick={closeMobileMenu}>
                      <Button className="w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">Daftar</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
