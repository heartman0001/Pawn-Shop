"use client";

/* eslint-disable @next/next/no-img-element -- favicon.ico เป็นไฟล์ .ico ใช้ <img> ธรรมดา */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChartColumn,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings2,
  Store,
  Users,
  X,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/components/ui";

const NAV_LINKS = [
  { href: "/", label: "หน้าแรก", icon: LayoutDashboard },
  { href: "/pos", label: "ขายหน้าร้าน", icon: Store },
  { href: "/pawns", label: "รับจำนำ", icon: HandCoins },
  { href: "/products", label: "สต็อก", icon: Package },
  { href: "/customers", label: "ลูกค้า", icon: Users },
  { href: "/manage", label: "จัดการข้อมูล", icon: Settings2 },
  { href: "/reports", label: "รายงาน", icon: ChartColumn },
];

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-30 border-b-2 border-dashed border-primary/30 bg-surface-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex min-w-0 shrink-0 items-center gap-2 font-extrabold tracking-tight text-primary-dark"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-accent-light to-accent shadow-glow-gold">
            <img
              src="/favicon.ico"
              alt="โลโก้ร้าน"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="hidden truncate text-base sm:inline">
            PomJame Shop
          </span>
        </Link>

        {/* เมนูบนจอใหญ่ */}
        <nav className="ml-2 hidden items-center gap-1.5 lg:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                prefetch={false} // <-- ปิดการโหลดล่วงหน้าเพื่อทดสอบ Loading
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition-all",
                  active
                    ? "bg-primary/10 text-primary-dark"
                    : "text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-primary" : "text-primary/60"
                  )}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form action={logout} className="hidden lg:block">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-coral/10 hover:text-coral-dark"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </form>
          {/* ปุ่มเมนูมือถือ */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/20 text-primary-dark transition-colors hover:bg-primary/10 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* เมนูแบบดึงลง (มือถือ) */}
      {open && (
        <nav className="border-t-2 border-dashed border-primary/20 bg-surface-card px-3 pb-3 pt-2 shadow-card lg:hidden">
          <ul className="space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold",
                      active
                        ? "bg-primary/10 text-primary-dark"
                        : "text-zinc-600 hover:bg-primary/5"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        active ? "text-primary" : "text-zinc-400"
                      )}
                    />
                    {label}
                    {active && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-primary shadow-glow-teal" />
                    )}
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-dashed border-primary/15 pt-1">
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-coral-dark hover:bg-coral/10"
                >
                  <LogOut className="h-5 w-5 text-coral" />
                  ออกจากระบบ
                </button>
              </form>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
