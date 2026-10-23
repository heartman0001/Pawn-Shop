"use client";

import { Select } from "@/components/ui";
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
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-16 px-2 text-base sm:h-8 sm:text-xs"
        aria-label="จำนวนรายการต่อหน้า"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
      <span className="hidden sm:inline">ต่อหน้า</span>
    </label>
  );
}
