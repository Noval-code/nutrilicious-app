"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { UserDropdown } from "./UserDropdown";

export function Header() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="https://res.cloudinary.com/daxxzeeyr/image/upload/v1779722843/WhatsApp_Image_2026-05-25_at_22.22.11-removebg-preview_1_uerl99.png"
            alt="Nutrilicious Logo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <span className="text-xl font-bold tracking-tight text-primary">
            Nutrilicious Food
          </span>
        </Link>
        <nav className="hidden gap-6 md:flex">
          <Link href="#menu-catalog" className="text-sm font-medium hover:text-primary transition-colors">
            Katalog Menu
          </Link>
          <Link href="#paket" className="text-sm font-medium hover:text-primary transition-colors">
            Paket Diet
          </Link>
          <Link href="#tentang" className="text-sm font-medium hover:text-primary transition-colors">
            Tentang Kami
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {isLoaded && (
            <>
              {isSignedIn ? (
                <UserDropdown />
              ) : (
                <>
                  <Link href="/sign-in">
                    <Button variant="ghost">Masuk</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button>Daftar</Button>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
