"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatBaht } from "@/lib/format";
import { cn } from "@/components/ui";

export type SaleItemRow = {
  productId: string | null;
  quantity: number;
  unitPrice: number;
  product: { name: string } | null;
  pawnContract: { itemName: string } | null;
};

export type SaleRow = {
  receiptNumber: string;
  items: SaleItemRow[];
};

export function SaleItemsAccordion({ sale }: { sale: SaleRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="-mx-1.5 flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-left font-medium text-zinc-600 transition-colors hover:bg-primary/10 hover:text-primary-dark"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-primary transition-transform",
            open && "rotate-180"
          )}
        />
        <span>ดูสินค้า ({sale.items.length} รายการ)</span>
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5 rounded-xl border-2 border-primary/10 bg-primary/5 p-2.5">
          {sale.items.map((it, i) => (
            <li
              key={it.productId ?? `pawn-${sale.receiptNumber}-${i}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="min-w-0 text-zinc-700">
                {it.product?.name ?? it.pawnContract?.itemName ?? "ไม่ทราบชื่อสินค้า"}
                <span className="ml-1 text-xs text-zinc-400">×{it.quantity}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold text-zinc-800">
                  {formatBaht(it.unitPrice * it.quantity)}
                </span>
                <span className="block text-xs text-zinc-400">
                  {formatBaht(it.unitPrice)} / ชิ้น
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
