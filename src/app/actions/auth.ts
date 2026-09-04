"use server";

import { createSession, destroySession } from "@/lib/auth";
import { getAdminPassword } from "@/lib/env";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";

export type LoginState = { error?: string } | undefined;

function passwordsMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(expected, "utf8");
  // timing-safe ต่อความยาวเท่ากัน
  const padded = Buffer.alloc(Math.max(a.length, b.length));
  a.copy(padded);
  const bPadded = Buffer.alloc(Math.max(a.length, b.length));
  b.copy(bPadded);
  return timingSafeEqual(padded, bPadded);
}

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!passwordsMatch(password, getAdminPassword())) {
    return { error: "รหัสผ่านไม่ถูกต้อง" };
  }

  await createSession({ role: "admin" });
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
