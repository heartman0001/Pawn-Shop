import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

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

const inputBase =
  "w-full rounded-lg border border-accent-dark/30 bg-cream px-3 text-zinc-800 placeholder:text-zinc-400 " +
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:bg-zinc-100";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, "h-10", className)} {...props} />;
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
    <select className={cn(inputBase, "h-10 pr-8", className)} {...props}>
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
        <span className="mt-1 block text-xs text-zinc-400">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs font-medium text-coral-dark">
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
