"use client";

/* eslint-disable @next/next/no-img-element -- ภาพตัวอย่างสินค้าที่แนบจากเครื่อง */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  CheckCircle2,
  PackageSearch,
  UploadCloud,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { createPawnContract } from "@/app/actions/pawn";
import { formatBaht, formatDate, PRODUCT_IMAGE_UPLOAD_HINT } from "@/lib/format";
import { PAWN_TERM_DAYS } from "@/lib/pawn-math";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/components/ui";

interface CustomerOption {
  id: string;
  nationalId: string;
  fullName: string;
  phone: string;
}

// ---------------------------------------------------------------------------
// Form schema — string ตรงกับ input HTML, ตรวจซ้ำอีกชั้นใน Server Action
// ระยะเวลาสัญญา fix = 10 วัน (ไม่ให้แก้ไข) ดูค่าใน @/lib/pawn-math
// ---------------------------------------------------------------------------

const nationalIdPattern = /^\d{13}$/;
const phonePattern = /^[0-9\-\s]{9,10}$/;

const pawnFormSchema = z.object({
  customer: z
    .object({
      mode: z.enum(["existing", "new"]),
      customerId: z.string().optional().default(""),
      nationalId: z.string().optional().default(""),
      fullName: z.string().optional().default(""),
      phone: z.string().optional().default(""),
    })
    .superRefine((v, ctx) => {
      if (v.mode === "existing") {
        if (!v.customerId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["customerId"],
            message: "กรุณาเลือกลูกค้า",
          });
        }
      } else {
        if (!nationalIdPattern.test(v.nationalId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["nationalId"],
            message: "เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก",
          });
        }
        if ((v.fullName ?? "").trim().length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["fullName"],
            message: "กรอกชื่อ-นามสกุล",
          });
        }
        if (v.phone && !phonePattern.test(v.phone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["phone"],
            message: "เบอร์โทรไม่ถูกต้อง",
          });
        }
      }
    }),
  itemName: z.string().trim().min(2, "กรอกรายละเอียดสิ่งของ"),
  serialNumber: z.string().trim().optional().default(""),
  storageBox: z.string().trim().optional().default(""),
  principalAmount: z
    .string()
    .regex(/^\d+$/, "เงินต้นต้องเป็นตัวเลข")
    .refine((v) => Number(v) >= 1, "เงินต้นต้องมากกว่า 0"),
  interestRatePercent: z
    .string()
    .regex(/^\d+(\.\d+)?$/, "ดอกเบี้ยต้องเป็นตัวเลข")
    .default("2"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
});

type PawnFormValues = z.input<typeof pawnFormSchema>;

function todayStr(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
}

const emptyForm: PawnFormValues = {
  customer: {
    mode: "existing",
    customerId: "",
    nationalId: "",
    fullName: "",
    phone: "",
  },
  itemName: "",
  serialNumber: "",
  storageBox: "",
  principalAmount: "",
  interestRatePercent: "2",
  startDate: todayStr(),
};

export function NewPawnForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PawnFormValues>({
    resolver: zodResolver(pawnFormSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const watchValues = watch();
  const customerMode = watchValues.customer?.mode ?? "existing";
  const startDate = watchValues.startDate ?? todayStr();
  const principal = Number(watchValues.principalAmount) || 0;
  const rate = Number(watchValues.interestRatePercent) || 0;

  // Due date = วันเริ่ม + 10 วัน (fix)
  const [y, m, d] = startDate.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  due.setDate(due.getDate() + PAWN_TERM_DAYS);
  const firstInterest = Math.round((principal * rate) / 100);

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  function onSubmit(values: PawnFormValues) {
    setError(null);
    setCreated(null);

    const fd = new FormData();
    fd.append("customerMode", values.customer.mode);
    if (values.customer.mode === "existing") {
      fd.append("customerId", values.customer.customerId ?? "");
    } else {
      fd.append("nationalId", values.customer.nationalId ?? "");
      fd.append("fullName", values.customer.fullName ?? "");
      fd.append("phone", values.customer.phone ?? "");
    }
    fd.append("itemName", values.itemName);
    fd.append("serialNumber", values.serialNumber ?? "");
    fd.append("storageBox", values.storageBox ?? "");
    fd.append("principalAmount", values.principalAmount);
    fd.append("interestRatePercent", values.interestRatePercent ?? "0");
    fd.append("startDate", values.startDate);
    if (imageFile) fd.append("image", imageFile);

    startTransition(async () => {
      const result = await createPawnContract(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCreated(result.contractNumber);
      router.refresh();
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      reset(emptyForm);
    });
  }

  const customerErrors = (errors.customer ?? {}) as {
    customerId?: { message?: string };
    nationalId?: { message?: string };
    fullName?: { message?: string };
    phone?: { message?: string };
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-3xl border-2 border-primary/15 bg-white p-5 shadow-card sm:p-6"
    >
      {/* ---------- ลูกค้า ---------- */}
      <section>
        <h2 className="mb-3 border-b-2 border-dashed border-primary/25 pb-1.5 text-sm font-extrabold uppercase tracking-wide text-primary-dark">
          1. ลูกค้า
        </h2>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-primary/10 p-1.5">
          <ModeButton
            active={customerMode === "existing"}
            onClick={() => setValue("customer.mode", "existing")}
            icon={<UserRound className="h-4 w-4" />}
            label="ลูกค้าเดิม (ค้นหา)"
          />
          <ModeButton
            active={customerMode === "new"}
            onClick={() => setValue("customer.mode", "new")}
            icon={<UserPlus className="h-4 w-4" />}
            label="สร้างลูกค้าใหม่"
          />
        </div>

        {customerMode === "existing" ? (
          <Field
            label="เลือกลูกค้า (พิมพ์ค้นหา)"
            required
            error={customerErrors.customerId?.message}
          >
            <Select {...register("customer.customerId")} className="h-11">
              <option value="">— เลือกลูกค้า —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} · {c.nationalId}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="เลขบัตรประชาชน (13 หลัก)"
              required
              error={customerErrors.nationalId?.message}
            >
              <Input
                inputMode="numeric"
                maxLength={13}
                placeholder="1XXXXXXXXXX"
                {...register("customer.nationalId")}
              />
            </Field>
            <Field
              label="ชื่อ-นามสกุล"
              required
              error={customerErrors.fullName?.message}
            >
              <Input
                placeholder="นายสมชาย ใจดี"
                {...register("customer.fullName")}
              />
            </Field>
            <Field label="เบอร์โทรศัพท์" error={customerErrors.phone?.message}>
              <Input
                placeholder="08X-XXX-XXXX"
                {...register("customer.phone")}
              />
            </Field>
          </div>
        )}
      </section>

      {/* ---------- สิ่งของ ---------- */}
      <section>
        <h2 className="mb-3 border-b-2 border-dashed border-primary/25 pb-1.5 text-sm font-extrabold uppercase tracking-wide text-primary-dark">
          2. สิ่งของที่จำนำ
        </h2>
        <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
          {/* แนบรูปสิ่งของจากเครื่อง */}
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-primary-dark">
              รูปสิ่งของ
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-36 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
                imagePreview
                  ? "border-primary/40 bg-primary/5"
                  : "border-primary/30 bg-cream hover:border-primary"
              )}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="ตัวอย่างสิ่งของที่จำนำ"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-primary/60" />
                  <span className="px-2 text-center text-xs font-bold text-primary-dark">
                    แนบรูปสิ่งของจากเครื่อง
                  </span>
                  <span className="px-3 text-center text-[11px] text-zinc-400">
                    {PRODUCT_IMAGE_UPLOAD_HINT}
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
            {imagePreview && (
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-coral-dark hover:bg-coral/10"
              >
                <X className="h-3.5 w-3.5" /> เอาออกรูป
              </button>
            )}
          </div>

          <div className="grid content-start gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="รายละเอียดสิ่งของ"
                required
                error={errors.itemName?.message}
              >
                <Textarea
                  rows={2}
                  placeholder="เช่น โทรศัพท์ iPhone 13 สีดำ 128GB สภาพดี / แหวนทอง 1 สลึง"
                  {...register("itemName")}
                />
              </Field>
            </div>
            <Field label="เลขซีเรียล / Serial (ถ้ามี)">
              <Input
                placeholder="เช่น IMEI / Serial"
                {...register("serialNumber")}
              />
            </Field>
            <Field label="กล่อง/ตำแหน่งเก็บ">
              <Input placeholder="เช่น A-12" {...register("storageBox")} />
            </Field>
          </div>
        </div>
      </section>

      {/* ---------- เงิน & เงื่อนไข ---------- */}
      <section>
        <h2 className="mb-3 border-b-2 border-dashed border-primary/25 pb-1.5 text-sm font-extrabold uppercase tracking-wide text-primary-dark">
          3. เงิน & เงื่อนไข
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="เงินต้น (บาท)"
            required
            error={errors.principalAmount?.message}
          >
            <Input
              type="number"
              min={1}
              placeholder="เช่น 10000"
              {...register("principalAmount")}
            />
          </Field>
          <Field
            label="ดอกเบี้ย % ต่อ 10 วัน"
            required
            error={errors.interestRatePercent?.message}
          >
            <Input
              type="number"
              step="0.5"
              min={0}
              max={100}
              {...register("interestRatePercent")}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              label="วันที่เริ่มสัญญา"
              required
              error={errors.startDate?.message}
            >
              <Input type="date" {...register("startDate")} />
            </Field>
          </div>
        </div>

        {/* สรุปเงื่อนไข */}
        <div className="mt-4 grid gap-4 rounded-2xl border-2 border-accent/25 bg-cream p-4 text-sm shadow-card sm:grid-cols-3">
          <SummaryItem label="เงินต้น" value={formatBaht(principal)} />
          <SummaryItem
            label="ดอกเบี้ยงวดแรก (10 วัน)"
            value={firstInterest > 0 ? formatBaht(firstInterest) : "—"}
            hint={`${rate || 0}% ต่อ 10 วัน`}
          />
          <SummaryItem
            label="ครบกำหนดชำระ"
            value={formatDate(due)}
            hint={`ทุกๆ ${PAWN_TERM_DAYS} วัน (fix)`}
          />
        </div>
      </section>

      {error && (
        <p className="rounded-2xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
          {error}
        </p>
      )}
      {created && (
        <div className="flex items-center gap-3 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            บันทึกสัญญา <b>{created}</b> เรียบร้อย —{" "}
            <button
              type="button"
              onClick={() => router.push("/pawns")}
              className="font-bold underline"
            >
              ดูรายการสัญญา
            </button>
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <Button type="button" variant="secondary" onClick={() => reset(emptyForm)}>
          ล้างฟอร์ม
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          <PackageSearch className="h-4 w-4" />
          {pending ? "กำลังบันทึกสัญญา…" : "บันทึกสัญญาจำนำ"}
        </Button>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
        active
          ? "bg-white text-primary-dark shadow-card"
          : "text-zinc-500 hover:bg-white/50 hover:text-primary-dark"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-primary/60">
        {label}
      </p>
      <p className="text-xl font-extrabold text-primary-dark">{value}</p>
      {hint && <p className="text-xs font-medium text-zinc-400">{hint}</p>}
    </div>
  );
}