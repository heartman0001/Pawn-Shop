import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma ships its own query engine binary that must not be bundled.
  serverExternalPackages: ["@prisma/client"],
  // อนุญาตให้เปิดจากมือถือ/เครื่องอื่นผ่าน IP ในวง LAN (เช่น http://192.168.1.114:3000)
  // ถ้าไม่มีตัวนี้ Next.js 16.2+ จะ block JS bundle → ทุกปุ่มกดไม่ได้บนเบราว์เซอร์อื่น
  allowedDevOrigins: ["192.168.1.114"],
  // รองรับแนบรูป (Server Action จำกัด body ไว้ 1MB) — เผื่อเผื่อ multipart overhead
  // จาก MAX_IMAGE_SIZE 5MB ใน src/lib/upload-image.ts
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
