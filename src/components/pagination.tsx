"use client";

// Pagination กลาง — เลย์เอาต์เดียวกับที่ใช้ในหน้า customers / manage / expenses / incomes
// ใช้ร่วมกันทุกหน้ารายการเพื่อไม่ให้โค้ดซ้ำ

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/components/ui";

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-primary/25 px-5 py-3">
      <button
        type="button"
        aria-label="หน้าก่อนหน้า"
        onClick={() => onPageChange(Math.max(page - 1, 1))}
        disabled={page <= 1}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark",
          page <= 1 && "pointer-events-none opacity-40"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-xs font-bold text-zinc-500">
        หน้า {page} / {totalPages}
      </span>
      <button
        type="button"
        aria-label="หน้าถัดไป"
        onClick={() => onPageChange(Math.min(page + 1, totalPages))}
        disabled={page >= totalPages}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/15 text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark",
          page >= totalPages && "pointer-events-none opacity-40"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** ขนาดต่อหน้า: desktop (ตาราง) 20 แถว / mobile (การ์ด) 10 ใบ */
export const DESKTOP_PAGE_SIZE = 20;
export const MOBILE_PAGE_SIZE = 10;
