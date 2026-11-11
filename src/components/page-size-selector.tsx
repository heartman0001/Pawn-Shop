"use client";

import { Select } from "@/components/select";
import { PAGE_SIZE_OPTIONS } from "@/lib/page-size";

/** ตัวเลือก "จำนวนรายการต่อหน้า" — ใช้ร่วมกันทุกหน้ารายการ */
export function PageSizeSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-zinc-500">
      <span className="hidden sm:inline">แสดง</span>
      <Select
        value={String(value)}
        onChange={(next) => onChange(Number(next))}
        options={PAGE_SIZE_OPTIONS.map((n) => ({
          value: String(n),
          label: String(n),
        }))}
        size="sm"
        className="w-16"
        aria-label="จำนวนรายการต่อหน้า"
      />
      <span className="hidden sm:inline">ต่อหน้า</span>
    </label>
  );
}
