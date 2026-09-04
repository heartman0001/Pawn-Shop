import "server-only";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "pawn_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 วัน

export interface SessionPayload {
  /** ผู้ใช้ระบบ (single user: admin) */
  role: "admin";
}

const FALLBACK_DEV_SECRET =
  "pawn-shop-dev-secret-please-set-AUTH_SECRET-in-.env";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Missing AUTH_SECRET in environment. Generate one with: openssl rand -base64 32"
      );
    }
    console.warn(
      "[auth] AUTH_SECRET ไม่ได้ตั้งค่า ใช้ค่า fallback สำหรับ development เท่านั้น — กรุณาตั้ง AUTH_SECRET ในไฟล์ .env"
    );
    return new TextEncoder().encode(FALLBACK_DEV_SECRET);
  }
  return new TextEncoder().encode(secret);
}

/** เซ็น session token */
export async function signSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/** ตรวจสอบ session token — คืน payload ถ้าถูกต้อง, null ถ้าไม่ */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin") return null;
    return { role: "admin" };
  } catch {
    return null;
  }
}
