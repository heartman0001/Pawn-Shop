"use client";

import { create } from "zustand";

export interface CartEntry {
  /** key กันซ้ำ เช่น "product-abc" / "pawn-xyz" */
  key: string;
  kind: "product" | "pawn";
  id: string;
  name: string;
  /** รายละเอียดย่อย เช่น หมวดหมู่ หรือเลขสัญญา */
  meta?: string;
  unitPrice: number;
  image: string | null;
  /** จำนวนสูงสุดที่เพิ่มได้ (สินค้าทั่วไป = สต็อก, ของหลุดจำนำ = 1) */
  maxQty: number;
  qty: number;
}

interface PosCartState {
  items: CartEntry[];
  add: (entry: Omit<CartEntry, "qty">) => void;
  remove: (key: string) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  clear: () => void;
}

export const usePosCart = create<PosCartState>((set) => ({
  items: [],

  add: (entry) =>
    set((state) => {
      const existing = state.items.find((i) => i.key === entry.key);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.key === entry.key
              ? { ...i, qty: Math.min(i.qty + 1, i.maxQty) }
              : i
          ),
        };
      }
      // ของหลุดจำนำ: 1 สัญญา = 1 ชิ้น (แต่ขายหลายสัญญาพร้อมกันได้)
      return { items: [...state.items, { ...entry, qty: 1 }] };
    }),

  remove: (key) =>
    set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

  increment: (key) =>
    set((state) => ({
      // ของหลุดจำนำล็อกจำนวนไว้ที่ 1 ชิ้นเสมอ
      items: state.items.map((i) =>
        i.key === key && i.kind === "product"
          ? { ...i, qty: Math.min(i.qty + 1, i.maxQty) }
          : i
      ),
    })),

  decrement: (key) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.key === key ? { ...i, qty: Math.max(i.qty - 1, 1) } : i
      ),
    })),

  clear: () => set({ items: [] }),
}));
