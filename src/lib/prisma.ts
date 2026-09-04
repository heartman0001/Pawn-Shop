import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * ใช้ DATABASE_URL จาก .env ถ้าไม่ได้ตั้ง ให้ fallback ไปที่ prisma/dev.db
 * (สะดวกตอน dev run ทันทีโดยไม่ต้องแก้ .env — แนะนำให้ตั้ง .env ตาม README)
 */
let warnedFallback = false;

function resolveDatasourceUrl(): string | undefined {
  if (process.env.DATABASE_URL) return undefined;
  // รูปแบบที่ Prisma/SQLite ยอมรับตอนรันไทม์: file:<absolute-path>
  const dbPath = path.join(process.cwd(), "prisma", "dev.db").replace(/\\/g, "/");
  const fallback = `file:${dbPath}`;
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(
      `[prisma] ไม่พบ DATABASE_URL ใช้ fallback: ${fallback} — ดู README วิธีตั้งค่า .env`
    );
  }
  return fallback;
}

const datasourceUrl = resolveDatasourceUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
