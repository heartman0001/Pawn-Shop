"use client";

// ปุ่มดำเนินการกับสัญญา (ต่อดอกเบี้ย / ไถ่ถอน / ตัดหลุด) — ใช้ในหน้ารายละเอียดสัญญา
// ใช้ฟอร์มชุดเดียวกับหน้ารายการสัญญา แล้ว refresh ข้อมูลหน้า detail หลังสำเร็จ

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PawnContractDto } from "@/lib/dto";
import {
  ActionButton,
  ForfeitForm,
  RedeemForm,
  RenewForm,
} from "../contract-action-forms";

type OpenForm = "renew" | "redeem" | "forfeit" | null;

export function ContractActions({ contract }: { contract: PawnContractDto }) {
  const router = useRouter();
  const [open, setOpen] = useState<OpenForm>(null);
  const [toast, setToast] = useState<string | null>(null);

  function done(msg: string) {
    setOpen(null);
    setToast(msg);
    window.setTimeout(() => setToast(null), 5000);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 p-5 pb-0">
        <ActionButton
          label="ต่อดอกเบี้ย"
          tone="primary"
          onClick={() => setOpen(open === "renew" ? null : "renew")}
        />
        <ActionButton
          label="ไถ่ถอน"
          tone="success"
          onClick={() => setOpen(open === "redeem" ? null : "redeem")}
        />
        <ActionButton
          label="ตัดหลุด"
          tone="danger"
          onClick={() => setOpen(open === "forfeit" ? null : "forfeit")}
        />
      </div>

      {open && (
        <div className="px-4 pb-4 pt-3 sm:px-0 sm:pb-0">
          {open === "renew" && <RenewForm contract={contract} onDone={done} />}
          {open === "redeem" && (
            <RedeemForm contract={contract} onDone={done} requireConfirm />
          )}
          {open === "forfeit" && (
            <ForfeitForm contract={contract} onDone={done} requireConfirm />
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
