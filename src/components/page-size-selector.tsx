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
    <label className="flex items-center gap-1.5 text-xs text-zinc-500">
      แสดง
      <Select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-16 px-2 text-xs"
        aria-label="จำนวนรายการต่อหน้า"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </Select>
      ต่อหน้า
    </label>
  );
}
