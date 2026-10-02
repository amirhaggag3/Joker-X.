'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { TAX_RATE } from '@/lib/constants';

export type CartItem = Product & { key: string; quantity: number; selectedSize: string; selectedColor: string };

type CartContextType = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  addItem: (product: Product, size?: string, color?: string, qty?: number) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, qty: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = 'joker-cart-v1';
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved) as CartItem[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const value = useMemo<CartContextType>(() => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = subtotal * TAX_RATE;
    return {
      items,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotal,
      tax,
      total: subtotal + tax,
      addItem: (product, size, color, qty = 1) => {
        const selectedSize = size ?? product.sizes[0];
        const selectedColor = color ?? product.colors[0];
        const key = `${product.id}-${selectedSize}-${selectedColor}`;
        setItems((cur) => {
          const found = cur.find((i) => i.key === key);
          if (found) {
            return cur.map((i) => (i.key === key ? { ...i, quantity: Math.min(product.stock, i.quantity + qty) } : i));
          }
          return [...cur, { ...product, key, quantity: Math.min(product.stock, qty), selectedSize, selectedColor }];
        });
      },
      removeItem: (key) => setItems((cur) => cur.filter((i) => i.key !== key)),
      updateQuantity: (key, qty) =>
        setItems((cur) =>
          qty <= 0 ? cur.filter((i) => i.key !== key) : cur.map((i) => (i.key === key ? { ...i, quantity: Math.min(i.stock, qty) } : i)),
        ),
      clearCart: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
