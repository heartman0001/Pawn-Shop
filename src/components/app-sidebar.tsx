"use client";

/* eslint-disable @next/next/no-img-element -- favicon.ico เป็นไฟล์ .ico ใช้ <img> ธรรมดา */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  Wallet,
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
  { href: "/incomes", label: "รายรับ", icon: Wallet },
  { href: "/expenses", label: "รายจ่าย", icon: Wallet },
  { href: "/reports", label: "รายงาน", icon: ChartColumn },
];

const DESKTOP_QUERY = "(min-width: 1024px)"; // ตรงกับ breakpoint lg ของ Tailwind

// 4 เมนูที่ใช้บ่อยสุดบนมือถือ — ที่เหลืออยู่ในปุ่ม "เพิ่มเติม"
const BOTTOM_LINKS = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/pos", label: "ขายหน้าร้าน", icon: Store },
  { href: "/pawns", label: "สัญญา", icon: HandCoins },
  { href: "/customers", label: "ลูกค้า", icon: Users },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const close = () => setOpen(false);

  // ตัดสินการเรนเดอร์ด้วย matchMedia — ไม่พึ่ง CSS class (hidden/lg:*) ในการซ่อน
  // เพราะ CSS bundle ที่ browser แคชไว้อาจ stale ทำให้ responsive class ไม่ทำงาน
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => {
      setIsDesktop(mq.matches);
      // ขยายเป็น desktop = ปิด drawer ทิ้งในจังหวะเดียวกัน (ไม่ต้องใช้ effect ที่สอง)
      if (mq.matches) setOpen(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ปิด drawer ด้วยปุ่ม Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ล็อก scroll ของ body ตอน drawer เปิด
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* ===== Sidebar ถาวร (จอใหญ่ ≥1024px) — เรนเดอร์เฉพาะ desktop ===== */}
      {isDesktop && (
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-primary/15 bg-surface-card">
          <SidebarContent />
        </aside>
      )}

      {/* ===== Drawer (มือถือ) — เลื่อนทับเนื้อหา ไม่มีฉากมืดบังจอหลัก ===== */}
      {open && !isDesktop && (
        <div className="fixed inset-0 z-50">
          {/* ชั้นโปร่งใส — กดนอกเมนูเพื่อปิด (ไม่ทึบ ไม่บังเนื้อหาหลังเมนู) */}
          <div onClick={close} aria-hidden="true" className="absolute inset-0" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เมนูนำทาง"
            className="absolute inset-y-0 left-0 flex h-full w-72 max-w-[85vw] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] animate-slide-in-left flex-col border-r border-primary/15 bg-surface-card shadow-card"
          >
            <button
              type="button"
              onClick={close}
              aria-label="ปิดเมนู"
              className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-primary/10 hover:text-primary-dark"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={close} />
          </div>
        </div>
      )}

      {/* ===== แถบนำทางล่าง (มือถือ/แท็บเล็ต < lg) ===== */}
      {!isDesktop && (
        <nav
          aria-label="เมนูหลัก (มือถือ)"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/15 bg-surface-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <ul className="mx-auto flex max-w-lg items-stretch">
            {BOTTOM_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <li key={href} className="min-w-0 flex-1">
                  <Link
                    href={href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className="flex h-16 flex-col items-center justify-center gap-1 px-0.5"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                        active ? "bg-primary/15 text-primary-dark" : "text-zinc-500"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span
                      className={cn(
                        "max-w-full truncate text-xs leading-none",
                        active
                          ? "font-bold text-primary-dark"
                          : "font-semibold text-zinc-600"
                      )}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="เปิดเมนูทั้งหมด"
                aria-expanded={open}
                className="flex h-16 w-full flex-col items-center justify-center gap-1 px-0.5"
              >
                <span className="flex h-7 w-12 items-center justify-center rounded-full text-zinc-500">
                  <Menu className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate text-xs font-semibold leading-none text-zinc-600">
                  เพิ่มเติม
                </span>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// เนื้อหา sidebar (โลโก้ + เมนู + ออกจากระบบ) — ใช้ร่วมกันทั้ง desktop และ drawer
// ---------------------------------------------------------------------------
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* โลโก้ */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-primary/10 px-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 font-extrabold tracking-tight text-primary-dark"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-accent-light to-accent shadow-glow-gold">
            <img
              src="/favicon.ico"
              alt="โลโก้ร้าน"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] leading-tight">
              PomJame Shop
            </span>
            <span className="block truncate text-xs font-semibold uppercase tracking-wider text-zinc-500">
              ร้านรับจำนำ
            </span>
          </span>
        </Link>
      </div>

      {/* เมนู */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="เมนูหลัก">
        <ul className="space-y-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  prefetch={false} // <-- ปิดการโหลดล่วงหน้าเพื่อทดสอบ Loading
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9375rem] font-semibold transition-colors",
                    active
                      ? "bg-primary/10 font-bold text-primary-dark"
                      : "text-zinc-700 hover:bg-primary/5 hover:text-primary-dark"
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-primary" : "text-zinc-500"
                    )}
                  />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ออกจากระบบ */}
      <div className="shrink-0 border-t border-primary/10 p-3">
        <form action={logout}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9375rem] font-semibold text-coral-dark transition-colors hover:bg-coral/10"
          >
            <LogOut className="h-5 w-5 shrink-0 text-coral" />
            ออกจากระบบ
          </button>
        </form>
      </div>
    </>
  );
}
