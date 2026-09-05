"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Settings, ShoppingBag, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const displayName = user.name || user.email || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const email = user.email || "";

  const menuItems = [
    {
      label: "Pengaturan",
      sublabel: "Profil, password, alamat",
      icon: Settings,
      href: "/account/settings",
    },
    {
      label: "Pesanan Saya",
      sublabel: "Lacak status pesanan",
      icon: ShoppingBag,
      href: "/account/orders",
    },
  ];

  const handleSignOut = () => {
    setIsOpen(false);
    logout();
    router.push("/");
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
        id="user-menu-trigger"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#005D33] to-[#004d2a] flex items-center justify-center text-white font-bold text-sm ring-2 ring-[#005D33]/10 group-hover:ring-[#005D33]/30 transition-all">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-bold text-slate-800 leading-tight">{displayName}</p>
          <p className="text-[10px] font-semibold text-slate-400 leading-tight">Pelanggan</p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Header */}
          <div className="p-4 bg-gradient-to-r from-[#005D33] to-[#004d2a] text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-white font-black text-lg">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{displayName}</p>
                <p className="text-[11px] font-medium text-white/60 truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#e6f5ed] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-[#d6ebd8] flex items-center justify-center text-slate-400 group-hover:text-[#005D33] transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-[11px] font-medium text-slate-400 truncate">{item.sublabel}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Divider + Sign Out */}
          <div className="border-t border-gray-100 p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-red-50 transition-colors group"
              id="user-menu-signout"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-red-100 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-slate-500 group-hover:text-red-600 transition-colors">
                Keluar
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
