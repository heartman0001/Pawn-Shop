import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SessionPayload,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session";

/** อ่าน session จาก cookie (สำหรับ Server Components / Server Actions) */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/** ป้องกันหน้าเว็บ: ถ้ายังไม่ล็อกอิน → redirect ไป /login */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** ตั้ง cookie session หลังล็อกอินสำเร็จ */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

/** ลบ cookie session (logout) */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
