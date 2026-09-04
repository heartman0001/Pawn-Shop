import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

/* eslint-disable @next/next/no-img-element -- favicon.ico เป็นไฟล์ .ico ใช้ <img> ธรรมดา */

export const metadata = { title: "เข้าสู่ระบบ — ร้านรับจำนำ POS" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/"); // ล็อกอินแล้ว (proxy ก็กันไว้แล้ว แต่กันซ้ำเพื่อความชัวร์)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary-bg via-surface-base to-cream px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-accent-light to-accent shadow-glow-gold">
            <img
              src="/favicon.ico"
              alt="โลโก้ร้าน"
              className="h-full w-full object-cover"
            />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
            ระบบจัดการร้านรับจำนำ
          </h1>
          <p className="mt-1.5 text-sm font-medium text-zinc-500">
            เข้าสู่ระบบเพื่อใช้งาน (Password / PIN จากไฟล์ .env)
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
