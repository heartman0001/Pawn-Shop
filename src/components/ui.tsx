import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Button — ปุ่มทรงกลม (pill) ตาม DESIGN.md
// primary = Gold CTA, secondary = Teal outline, danger = Coral, success = เขียว
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-accent-light to-accent text-zinc-900 shadow-glow-gold hover:from-accent hover:to-accent-dark hover:text-zinc-950",
  secondary:
    "bg-white text-primary-dark border border-primary/40 hover:bg-primary-bg shadow-card",
  ghost: "bg-transparent text-zinc-600 hover:bg-primary/10 hover:text-primary-dark",
  danger:
    "bg-coral text-white shadow-glow-coral hover:bg-coral-dark",
  success:
    "bg-success text-white shadow-card hover:brightness-110",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2",
  icon: "h-10 w-10",
};

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold transition-all duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Inputs / Field — พื้น Cream ตาม DESIGN.md
// ---------------------------------------------------------------------------

// h-11 = 44px ตามขนาดนิ้วขั้นต่ำที่กดพลาดยาก (ใช้ที่เคาน์เตอร์จริง)
// text-base บนมือถือกัน iOS ซูมเข้าอัตโนมัติเมื่อโฟกัสช่องกรอก
const inputBase =
  "w-full rounded-xl border border-accent-dark/40 bg-cream px-3 text-base text-zinc-800 placeholder:text-zinc-500 sm:text-sm " +
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:bg-zinc-100 disabled:text-zinc-500";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "py-2", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-primary-dark">
        {label}
        {required && <span className="ml-0.5 text-coral">*</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>
      )}
      {error && (
        <span className="mt-1.5 block text-xs font-semibold text-coral-dark">
          {error}
        </span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Card / Badge
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/20 bg-surface-card shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PageHeader — หัวหน้าหน้าแบบเดียวกันทุกหน้า
// (ชื่อหน้า + คำอธิบายสั้น + ปุ่มหลักทางขวา; บนมือถือเรียงลงมา)
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  actions,
  back,
  badge,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  badge?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 rounded-md text-sm font-medium text-zinc-600 transition-colors hover:text-primary-dark"
          >
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-tight text-primary-dark sm:text-[1.75rem]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-[52ch] text-[0.8125rem] font-medium leading-relaxed text-zinc-600 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full items-center gap-2 [&>a]:flex-1 [&>button]:flex-1 [&>a>button]:w-full sm:w-auto sm:justify-end sm:[&>a]:flex-none sm:[&>button]:flex-none sm:[&>a>button]:w-auto">
          {actions}
        </div>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// CardHeader — หัวการ์ด/เซกชันแบบเส้นประ (ใช้ร่วมกันทุกหน้ารายการ)
// ---------------------------------------------------------------------------

export function CardHeader({
  title,
  meta,
  action,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b-2 border-dashed border-primary/25 px-4 py-3 sm:px-5 sm:py-3.5",
        className
      )}
    >
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary-dark">
        {title}
      </h2>
      {meta && (
        <span className="text-xs font-semibold text-zinc-600">{meta}</span>
      )}
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState — สถานะว่างที่บอกทางออก ไม่ใช่แค่ "ไม่มีข้อมูล"
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-surface-card px-5 py-10 text-center",
        className
      )}
    >
      {icon && <div className="mb-2 text-primary/40">{icon}</div>}
      <p className="text-sm font-bold text-zinc-700">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs font-medium text-zinc-500">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

type BadgeTone = "gray" | "teal" | "gold" | "coral" | "green" | "sky" | "red";

const badgeTones: Record<BadgeTone, string> = {
  gray: "bg-zinc-100 text-zinc-600",
  teal: "bg-primary/15 text-primary-dark",
  gold: "bg-accent/35 text-[#6b5200]",
  coral: "bg-coral/15 text-coral-dark",
  green: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
  red: "bg-red-100 text-red-600",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
