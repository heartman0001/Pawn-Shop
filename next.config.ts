import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma ships its own query engine binary that must not be bundled.
  serverExternalPackages: ["@prisma/client"],
  // รองรับแนบรูป (Server Action จำกัด body ไว้ 1MB) — เผื่อเผื่อ multipart overhead
  // จาก MAX_IMAGE_SIZE 5MB ใน src/lib/upload-image.ts
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
