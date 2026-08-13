"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { authFetch } from '@/lib/authFetch';
import { AddressModal, UserAddress } from '@/components/address/AddressModal';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  type?: 'package' | 'menu';
  name?: string;
  slug?: string;
  category?: string;
  order_type?: 'regular' | 'event';
  event_date?: string;
  event_time?: string;
  package_name: string;
  package_slug: string;
  duration: string;
  meal_type: string;
  price: string; // formatted price e.g. "150.000"
  original_price?: string;
  promo_price?: string;
  discount_percent?: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity' | 'package_name' | 'package_slug'> & Partial<Pick<CartItem, 'package_name' | 'package_slug'>>, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  // Address-related
  userAddress: UserAddress | null;
  openAddressModal: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

type CartInput = Omit<CartItem, 'id' | 'quantity' | 'package_name' | 'package_slug'> & Partial<Pick<CartItem, 'package_name' | 'package_slug'>>;

function normalizeCartItem(item: CartInput): Omit<CartItem, 'id' | 'quantity'> {
  const type = item.type || 'package';
  const name = item.name || item.package_name || '';
  const slug = item.slug || item.package_slug || name;
  return {
    ...item,
    type,
    name,
    slug,
    package_name: item.package_name || name,
    package_slug: item.package_slug || slug,
    duration: item.duration || '',
    meal_type: item.meal_type || '',
    price: item.price,
  };
}

function generateItemId(item: Omit<CartItem, 'id' | 'quantity'>): string {
  return [item.type || 'package', item.package_slug, item.duration, item.meal_type, item.order_type || '', item.event_date || '', item.event_time || '']
    .join('-')
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function priceToNumber(price: string): number {
  return parseInt(price.replace(/\./g, ''), 10) || 0;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ item: CartInput; quantity: number } | null>(null);
  const [hasFetchedProfile, setHasFetchedProfile] = useState(false);

  const { user, isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Fetch user profile (address) on login
  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      return;
    }
    async function fetchProfile() {
      if (isLoaded && isSignedIn && user?.id && !hasFetchedProfile) {
        try {
          const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/users/me`);
          if (res.ok) {
            const data = await res.json();
            if (!data.is_new && data.address && data.lat !== null && data.lng !== null) {
              setUserAddress({
                name: data.name,
                phone: data.phone,
                address: data.address,
                lat: data.lat,
                lng: data.lng,
              });
            } else {
              // User baru / belum punya alamat -> buka modal
              setIsAddressModalOpen(true);
            }
          }
        } catch (err) {
          console.error("Gagal mengambil profil:", err);
        } finally {
          setHasFetchedProfile(true);
        }
      }
    }
    fetchProfile();
  }, [isLoaded, isSignedIn, user, hasFetchedProfile, pathname]);

  const [isHydrated, setIsHydrated] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nutrilicious_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch { /* ignore */ }
    setIsHydrated(true);
  }, []);

  // Save cart to localStorage on change (only after hydration)
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('nutrilicious_cart', JSON.stringify(items));
  }, [items, isHydrated]);

  const doAddItem = useCallback((rawItem: CartInput, quantity = 1) => {
    const item = normalizeCartItem(rawItem);
    const id = generateItemId(item);
    setItems(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, id, quantity }];
    });
    setIsCartOpen(true);
  }, []);

  const addItem = useCallback((item: CartInput, quantity = 1) => {
    // Guard 1: Harus login dulu
    if (!isSignedIn) {
      toast.error("Silakan login terlebih dahulu untuk menambahkan ke keranjang.");
      router.push('/sign-in');
      return;
    }

    // Guard 2: Harus punya alamat
    if (!userAddress || !userAddress.address || userAddress.lat === null) {
      // Simpan item yang mau ditambahkan, lalu buka modal alamat
      setPendingItem({ item, quantity });
      setIsAddressModalOpen(true);
      return;
    }

    // Semua sudah aman → tambahkan ke keranjang
    doAddItem(item, quantity);
  }, [isSignedIn, userAddress, doAddItem, router]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem('nutrilicious_cart');
  }, []);

  const openAddressModal = useCallback(() => {
    setIsAddressModalOpen(true);
  }, []);

  const handleAddressSaved = useCallback((data: UserAddress) => {
    setUserAddress(data);
    setIsAddressModalOpen(false);

    // Jika ada item yang tertunda, tambahkan sekarang
    if (pendingItem) {
      doAddItem(pendingItem.item, pendingItem.quantity);
      setPendingItem(null);
    }
  }, [pendingItem, doAddItem]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, item) => sum + priceToNumber(item.price) * item.quantity, 0), [items]);

  const contextValue = useMemo(() => ({
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    isCartOpen,
    setIsCartOpen,
    userAddress,
    openAddressModal,
  }), [items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isCartOpen, userAddress, openAddressModal]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}

      {/* Address Modal - rendered globally */}
      <AddressModal
        isOpen={isAddressModalOpen && !pathname?.startsWith('/admin')}
        onClose={() => {
          setIsAddressModalOpen(false);
          setPendingItem(null);
        }}
        onSaved={handleAddressSaved}
        initialData={userAddress}
      />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
