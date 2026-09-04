"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );

  return (
    <form
      action={action}
      className="rounded-3xl border-2 border-primary/20 bg-cream p-6 shadow-card"
    >
      <Field label="รหัสผ่าน / PIN" required>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            type="password"
            name="password"
            autoFocus
            autoComplete="current-password"
            placeholder="กรอกรหัสผ่าน"
            className="pl-9"
          />
        </div>
      </Field>
      {state?.error && (
        <p className="mt-3 rounded-xl bg-coral/10 px-3 py-2 text-sm font-medium text-coral-dark">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending}>
        {pending ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
