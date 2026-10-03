"use client";

import { useEffect, useState } from "react";
import { PAGE_SIZE_COOKIE, PAGE_SIZE_COOKIE_MAX_AGE } from "@/lib/page-size";

/**
 * จำนวนรายการต่อหน้าที่จำไว้ใน cookie ร่วมกับหน้าอื่น
 * ค่าตั้งต้นมาจาก server (อ่าน cookie) — เปลี่ยนค่าแล้วเขียนลง cookie อัตโนมัติ
 */
export function usePageSize(initial: number) {
  const [pageSize, setPageSize] = useState(initial);

  useEffect(() => {
    document.cookie = `${PAGE_SIZE_COOKIE}=${pageSize}; path=/; max-age=${PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`;
  }, [pageSize]);

  return [pageSize, setPageSize] as const;
}
