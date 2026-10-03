// ตัวเลือก "จำนวนรายการต่อหน้า" ที่ใช้ร่วมกันทั้ง server และ client
// เก็บค่าที่ผู้ใช้เลือกไว้ใน cookie เพื่อจำข้ามการเข้าชม

export const PAGE_SIZE_COOKIE = "page_size";

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export const DEFAULT_PAGE_SIZE = 20;

/** แปลงค่า (จาก URL หรือ cookie) เป็นจำนวนต่อหน้าที่ถูกต้อง — ค่าไม่ถูกต้อง → ค่าเริ่มต้น */
export function parsePageSize(value: string | number | null | undefined): number {
  const n = Number(value);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n)
    ? n
    : DEFAULT_PAGE_SIZE;
}

/** อายุ cookie 1 ปี */
export const PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
