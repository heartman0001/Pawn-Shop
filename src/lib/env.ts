// อ่านค่าจาก .env พร้อม default สำหรับ dev (single-user local)
// ⚠️ เปลี่ยน ADMIN_PASSWORD ก่อนนำไปใช้จริง!

const DEV_DEFAULT_PASSWORD = "pawn1234";

export function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing ADMIN_PASSWORD in environment — ตั้งค่าในไฟล์ .env ก่อนใช้งานจริง"
      );
    }
    console.warn(
      `[auth] ADMIN_PASSWORD ไม่ได้ตั้งค่า ใช้ค่า dev default "${DEV_DEFAULT_PASSWORD}" — กรุณาตั้งค่าใน .env`
    );
    return DEV_DEFAULT_PASSWORD;
  }
  return password;
}

/** URL ของ SQLite database */
export function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    "file:./dev.db" // อยู่ในโฟลเดอร์ prisma/ เมื่อรันผ่าน Prisma CLI
  );
}
