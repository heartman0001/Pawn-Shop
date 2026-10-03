"use client";

// ฟอร์มดำเนินการกับสัญญาจำนำ (ต่อดอกเบี้ย / ไถ่ถอน / ตัดหลุด)
// แชร์ใช้ทั้งหน้ารายการสัญญา และหน้ารายละเอียดสัญญา

import { useState, useTransition } from "react";
import { Gavel, HandCoins } from "lucide-react";
import {
  forfeitContract,
  redeemContract,
  renewInterest,
} from "@/app/actions/pawn";
import type { PawnContractDto } from "@/lib/dto";
import {
  formatBaht,
  formatDate,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/format";
import {
  calcRedemption,
  calcPeriodInterest,
  PAWN_TERM_DAYS,
} from "@/lib/pawn-math";
import { Button, Field, Input } from "@/components/ui";
import { cn } from "@/components/ui";

export function ActionButton({
  label,
  onClick,
  tone = "primary",
}: {
  label: string;
  onClick: () => void;
  tone?: "primary" | "success" | "danger";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary-dark hover:bg-primary/20",
    success: "bg-success/10 text-success hover:bg-success/20",
    danger: "bg-coral/10 text-coral-dark hover:bg-coral/20",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors",
        tones[tone]
      )}
    >
      {label}
    </button>
  );
}

export function RenewForm({
  contract,
  onDone,
}: {
  contract: PawnContractDto;
  onDone: (msg: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");

  // 1 งวด = 10 วัน (fix) — ดอกเบี้ยต่องวด (ตรงกับที่ Server คำนวณ)
  const interest = calcPeriodInterest(
    contract.principalAmount,
    contract.interestRatePercent
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await renewInterest({
        contractId: contract.id,
        paymentMethod: method,
      });
      if (result.ok) {
        onDone(
          `ต่อดอกเบี้ย 10 วัน สำเร็จ — รับชำระ ${formatBaht(
            result.interestDue
          )} บาท (${PAYMENT_METHOD_LABEL[method]})`
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="-mx-4 -mb-4 mt-2 border-t-2 border-dashed border-primary/20 bg-primary-bg px-4 py-4 sm:mx-0 sm:mb-0 sm:mt-0 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-primary/60">
            ต่อดอกเบี้ย 1 รอบ = 10 วัน
          </p>
          <p className="font-semibold text-zinc-500">ดอกเบี้ยที่ต้องชำระ</p>
          <p className="text-2xl font-extrabold text-accent-dark">
            {formatBaht(interest)}
          </p>
          <p className="text-xs text-zinc-400">
            ({contract.interestRatePercent}% ต่อ 10 วัน) ครบกำหนดใหม่{" "}
            {formatDate(addDays(new Date(contract.dueDate), PAWN_TERM_DAYS))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                method === m
                  ? "bg-primary text-white shadow-glow-teal"
                  : "border-2 border-primary/15 bg-white text-zinc-500 hover:bg-primary/10"
              )}
            >
              {PAYMENT_METHOD_LABEL[m]}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          className="ml-auto"
          disabled={pending}
          onClick={submit}
        >
          {pending ? "กำลังบันทึก…" : "ยืนยันต่อดอกเบี้ย (10 วัน)"}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm font-medium text-coral-dark">{error}</p>}
    </div>
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function ForfeitForm({
  contract,
  onDone,
  requireConfirm = false,
}: {
  contract: PawnContractDto;
  onDone: (msg: string) => void;
  /** true = ต้องกดยืนยันซ้ำก่อนตัดหลุด (ใช้ในหน้ารายละเอียดสัญญา) */
  requireConfirm?: boolean;
}) {
  const [price, setPrice] = useState(String(contract.principalAmount));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await forfeitContract({
        contractId: contract.id,
        forfeitPrice: Number(price) > 0 ? Number(price) : null,
      });
      if (result.ok) {
        onDone("ตัดหลุดจำนำแล้ว — ของจะไปโผล่ในหน้าขาย (POS)");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="-mx-4 -mb-4 mt-2 border-t-2 border-dashed border-coral/30 bg-coral/5 px-4 py-4 sm:mx-0 sm:mb-0 sm:mt-0 sm:px-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="max-w-sm text-sm text-zinc-600">
          <p className="font-extrabold text-coral-dark">ตัดหลุดจำนำ?</p>
          <p className="text-xs font-medium">
            สัญญานี้จะกลายเป็น “ของหลุดจำนำ” และพร้อมขายในหน้าร้านทันที
          </p>
        </div>
        <Field label="ราคาที่ตั้งขาย (บาท)" required>
          <Input
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-36"
          />
        </Field>
        {requireConfirm && confirming ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-coral-dark">
              ยืนยันตัดหลุดจริงหรือไม่?
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={submit}
            >
              <Gavel className="h-4 w-4" />
              {pending ? "กำลังดำเนินการ…" : "ยืนยัน"}
            </Button>
          </div>
        ) : (
          <Button
            variant="danger"
            className="ml-auto"
            disabled={pending}
            onClick={() => (requireConfirm ? setConfirming(true) : submit())}
          >
            <Gavel className="h-4 w-4" />
            {pending ? "กำลังดำเนินการ…" : "ยืนยันตัดหลุด"}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function RedeemForm({
  contract,
  onDone,
  requireConfirm = false,
}: {
  contract: PawnContractDto;
  onDone: (msg: string) => void;
  /** true = ต้องกดยืนยันซ้ำก่อนไถ่ถอน (ใช้ในหน้ารายละเอียดสัญญา) */
  requireConfirm?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number]>("CASH");
  const [confirming, setConfirming] = useState(false);

  // คำนวณเหมือน Server Action (Fixed Cycle): งวดนับจากวันเริ่มสัญญา ขั้นต่ำ 1 งวด
  // หักงวดที่จ่ายไปแล้วตอนต่อดอก (renewalCount) เพื่อไม่เก็บซ้ำ
  const dueDate = new Date(contract.dueDate);
  const calc = calcRedemption({
    principal: contract.principalAmount,
    interestRatePercent: contract.interestRatePercent,
    cycleDays: PAWN_TERM_DAYS,
    startDate: new Date(contract.startDate),
    redemptionDate: new Date(),
    paidCycles: contract.renewalCount,
  });
  const rounds = calc.dueCycles; // งวดที่ต้องชำระ (หลังหักที่ต่อดอกไปแล้ว)
  const interestDue = calc.totalInterest;
  const total = calc.totalAmount;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await redeemContract({
        contractId: contract.id,
        paymentMethod: method,
        receivedAmount: method === "CASH" ? total : null,
      });
      if (result.ok) {
        onDone(
          `ไถ่ถอนสำเร็จ — รับชำระ ${formatBaht(result.totalAmount)} ` +
            `(เงินต้น ${formatBaht(contract.principalAmount)}` +
            (result.interestDue > 0
              ? ` + ดอกเบี้ยค้าง ${formatBaht(result.interestDue)})`
              : `)`) +
            (result.changeAmount > 0
              ? ` เงินทอน ${formatBaht(result.changeAmount)}`
              : "")
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="-mx-4 -mb-4 mt-2 border-t-2 border-dashed border-success/30 bg-success/5 px-4 py-4 sm:mx-0 sm:mb-0 sm:mt-0 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-success" />
          <div>
            <p className="font-extrabold text-success">
              ไถ่ถอน — คืนสิ่งของให้ลูกค้า
            </p>
            <p className="text-xs font-medium text-zinc-500">
              เริ่มสัญญา {formatDate(new Date(contract.startDate))} · ครบกำหนด{" "}
              {formatDate(dueDate)} · ผ่านมาแล้ว {calc.daysElapsed} วัน —
              คิดดอกเบี้ย {calc.totalCycles} งวด (รอบละ {PAWN_TERM_DAYS} วัน)
              {contract.renewalCount > 0 &&
                ` · หักที่ต่อดอกไปแล้ว ${contract.renewalCount} งวด`}
            </p>
          </div>
        </div>
      </div>

      {/* ยอดสรุป */}
      <div className="grid gap-3 sm:grid-cols-3">
        <RedeemSummary
          label="เงินต้น"
          value={formatBaht(contract.principalAmount)}
        />
        <RedeemSummary
          label={`ดอกเบี้ยค้าง (${rounds} รอบ)`}
          value={formatBaht(interestDue)}
          hint={`${contract.interestRatePercent}% ต่อ 10 วัน`}
        />
        <RedeemSummary
          label="ยอดที่ต้องชำระ"
          value={formatBaht(total)}
          accent
        />
      </div>

      {/* วิธีชำระ + เงินสด */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                method === m
                  ? "bg-primary text-white shadow-glow-teal"
                  : "border-2 border-primary/15 bg-white text-zinc-500 hover:bg-primary/10"
              )}
            >
              {PAYMENT_METHOD_LABEL[m]}
            </button>
          ))}
        </div>
        {requireConfirm && confirming ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-success">
              ยืนยันไถ่ถอนจริงหรือไม่?
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="success"
              size="sm"
              disabled={pending}
              onClick={submit}
            >
              {pending ? "กำลังบันทึก…" : `ยืนยัน ${formatBaht(total)}`}
            </Button>
          </div>
        ) : (
          <Button
            variant="success"
            className="ml-auto"
            disabled={pending}
            onClick={() => (requireConfirm ? setConfirming(true) : submit())}
          >
            {pending ? "กำลังบันทึก…" : `ยืนยันไถ่ถอน ${formatBaht(total)}`}
          </Button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm font-medium text-coral-dark">{error}</p>
      )}
    </div>
  );
}

function RedeemSummary({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-2",
        accent ? "border-accent/30 bg-cream" : "border-primary/15 bg-white"
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-extrabold",
          accent ? "text-accent-dark" : "text-zinc-800"
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}
