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

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const close = () => setOpen(false);

  // ตัดสินการเรนเดอร์ด้วย matchMedia — ไม่พึ่ง CSS class (hidden/lg:*) ในการซ่อน
  // เพราะ CSS bundle ที่ browser แคชไว้อาจ stale ทำให้ responsive class ไม่ทำงาน
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ปิด drawer อัตโนมัติเมื่อขยายเป็นจอ desktop
  useEffect(() => {
    if (isDesktop) setOpen(false);
  }, [isDesktop]);

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
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r-2 border-dashed border-primary/25 bg-surface-card">
          <SidebarContent />
        </aside>
      )}

      {/* ===== ปุ่ม burger ลอยปุ่มเดียว (มือถือ) — ไม่มีแถบ/พื้นหลังบังเนื้อหา ===== */}
      {!isDesktop && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          aria-expanded={open}
          className="fixed right-4 top-4 z-60 flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/20 bg-surface-card text-primary-dark shadow-card transition-colors hover:bg-primary/10"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
            className="absolute inset-y-0 left-0 flex h-full w-72 max-w-[85vw] animate-slide-in-left flex-col border-r-2 border-dashed border-primary/25 bg-surface-card shadow-card"
          >
            <SidebarContent onNavigate={close} />
          </div>
        </div>
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
      <div className="flex h-16 shrink-0 items-center gap-2 border-b-2 border-dashed border-primary/20 px-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2 font-extrabold tracking-tight text-primary-dark"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-accent-light to-accent shadow-glow-gold">
            <img
              src="/favicon.ico"
              alt="โลโก้ร้าน"
              className="h-full w-full object-cover"
            />
          </span>
          <span className="truncate text-base">PomJame Shop</span>
        </Link>
      </div>

      {/* เมนู */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  prefetch={false} // <-- ปิดการโหลดล่วงหน้าเพื่อทดสอบ Loading
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors",
                    active
                      ? "bg-primary/10 text-primary-dark"
                      : "text-zinc-600 hover:bg-primary/5 hover:text-primary-dark"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-primary" : "text-zinc-400"
                    )}
                  />
                  <span className="truncate">{label}</span>
                  {active && (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary shadow-glow-teal" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ออกจากระบบ */}
      <div className="shrink-0 border-t-2 border-dashed border-primary/15 p-3">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold text-coral-dark transition-colors hover:bg-coral/10"
          >
            <LogOut className="h-5 w-5 shrink-0 text-coral" />
            ออกจากระบบ
          </button>
        </form>
      </div>
    </>
  );
}
