"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { UserDropdown } from "./UserDropdown";

export function Header() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          {/* Simple Leaf Icon as Logo Placeholder */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
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
                    <Button variant="ghost" className="hidden sm:flex">Masuk</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button>Daftar Mulai Sehat</Button>
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
