// หมวดหมู่สินค้าคงที่ — เลือกได้เฉพาะจากรายการนี้
export const PRODUCT_CATEGORIES = [
  "สมาร์ทโฟนและแท็บเล็ต",
  "อุปกรณ์ชาร์จ",
  "อุปกรณ์เสียง",
  "อื่นๆ",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export function isProductCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

/** อันดับหมวดหมู่สำหรับเรียง (หมวดที่ไม่อยู่ในรายการไปไว้ท้ายสุด) */
export function categoryRank(category: string): number {
  const index = (PRODUCT_CATEGORIES as readonly string[]).indexOf(category);
  return index === -1 ? PRODUCT_CATEGORIES.length : index;
}
