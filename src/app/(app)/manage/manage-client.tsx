"use client";

/* eslint-disable @next/next/no-img-element -- รูปอัปโหลดจากเครื่อง/Supabase public URL ใช้ <img> ธรรมดา */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel,
  HandCoins,
  Package,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  deleteCustomer,
  deletePawnItem,
  upsertCustomer,
  upsertPawnItem,
} from "@/app/actions/manage";
import { formatDateTime, PAWN_STATUS_LABEL, PAWN_STATUS_TONE } from "@/lib/format";
import { Badge, Button, Field, Input } from "@/components/ui";
import { cn } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomerRow {
  id: string;
  nationalId: string;
  fullName: string;
  phone: string;
  contractCount: number;
  createdAt: string;
}

interface ContractRow {
  id: string;
  contractNumber: string;
  itemName: string;
  serialNumber: string | null;
  storageBox: string | null;
  principalAmount: number;
  interestRatePercent: number;
  status: "ACTIVE" | "REDEEMED" | "FORFEITED" | "SOLD";
  image: string | null;
  customerId: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function ManageClient({
  customers,
  contracts,
}: {
  customers: CustomerRow[];
  contracts: ContractRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"customers" | "items">("customers");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  // error banner — ไม่หายเอง ต้องกดปิด (กัน error หลุดตา)
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // สำเนาข้อมูลใน state — ลบ/แก้ไขแล้วอัปเดตทันที ไม่ต้องรอ router.refresh
  const [customerRows, setCustomerRows] = useState<CustomerRow[]>(customers);
  const [itemRows, setItemRows] = useState<ContractRow[]>(contracts);

  // props ใหม่จาก router.refresh() → sync กลับเข้า state
  useEffect(() => setCustomerRows(customers), [customers]);
  useEffect(() => setItemRows(contracts), [contracts]);

  function showToast(msg: string, ok = true) {
    if (!ok) {
      // error → แสดงเป็น banner ค้างไว้ อ่านชัด
      setErrorBanner(msg);
      return;
    }
    setToast({ msg, ok });
    window.setTimeout(() => setToast(null), 4000);
  }

  /** เรียก server action แบบกัน throw (network/500) → คืน ok:false เสมอ */
  async function safeAction<T extends { ok: boolean; error?: string }>(
    fn: () => Promise<T>
  ): Promise<T | { ok: false; error: string }> {
    try {
      return await fn();
    } catch (e) {
      console.error("[manage] action failed:", e);
      return {
        ok: false,
        error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง",
      };
    }
  }

  // ลูกค้า
  const [customerModal, setCustomerModal] = useState<
    { mode: "add" } | { mode: "edit"; row: CustomerRow } | null
  >(null);
  const [confirmCustomerDelete, setConfirmCustomerDelete] =
    useState<CustomerRow | null>(null);

  // สินค้ารับจำนำ
  const [itemModal, setItemModal] = useState<
    { mode: "add" } | { mode: "edit"; row: ContractRow } | null
  >(null);
  const [confirmItemDelete, setConfirmItemDelete] = useState<ContractRow | null>(
    null
  );

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customerRows;
    return customerRows.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.nationalId.includes(q) ||
        c.phone.includes(q)
    );
  }, [customerRows, search]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return itemRows;
    return itemRows.filter(
      (c) =>
        c.itemName.toLowerCase().includes(q) ||
        c.contractNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.serialNumber?.toLowerCase().includes(q) ?? false)
    );
  }, [itemRows, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
            จัดการข้อมูล
          </h1>
          <p className="text-sm text-zinc-500">
            เพิ่ม / แก้ไข / ลบ — ข้อมูลลูกค้า และ สินค้ารับจำนำ
          </p>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border-2 border-primary/15 bg-white p-1">
          <TabBtn
            active={tab === "customers"}
            icon={<Users className="h-4 w-4" />}
            label={`ลูกค้า (${customerRows.length})`}
            onClick={() => setTab("customers")}
          />
          <TabBtn
            active={tab === "items"}
            icon={<Package className="h-4 w-4" />}
            label={`สินค้ารับจำนำ (${itemRows.length})`}
            onClick={() => setTab("items")}
          />
        </div>
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "customers"
                ? "ค้นหาชื่อ / เลขบัตร / เบอร์โทร…"
                : "ค้นหาสัญญา / สิ่งของ / ลูกค้า…"
            }
            className="pl-9"
          />
        </div>
        <div className="ml-auto">
          {tab === "customers" ? (
            <Button onClick={() => setCustomerModal({ mode: "add" })}>
              <UserPlus className="h-4 w-4" /> เพิ่มลูกค้า
            </Button>
          ) : (
            <Button onClick={() => setItemModal({ mode: "add" })}>
              <Package className="h-4 w-4" /> เพิ่มสินค้ารับจำนำ
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {errorBanner && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-coral/10 px-4 py-3">
          <p className="text-sm font-bold text-coral-dark">⚠️ {errorBanner}</p>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="shrink-0 rounded-full p-1 text-coral-dark/60 hover:bg-coral/10 hover:text-coral-dark"
            aria-label="ปิดข้อผิดพลาด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===== Tab: ลูกค้า ===== */}
      {tab === "customers" && (
        <CustomerTable
          rows={filteredCustomers}
          search={search}
          onEdit={(row) => setCustomerModal({ mode: "edit", row })}
          onDeleteAsk={(row) => setConfirmCustomerDelete(row)}
        />
      )}

      {/* ===== Tab: สินค้ารับจำนำ ===== */}
      {tab === "items" && (
        <ItemTable
          rows={filteredItems}
          search={search}
          onEdit={(row) => setItemModal({ mode: "edit", row })}
          onDeleteAsk={(row) => setConfirmItemDelete(row)}
        />
      )}

      {/* Modals */}
      {customerModal && (
        <CustomerModal
          mode={customerModal.mode}
          row={customerModal.mode === "edit" ? customerModal.row : null}
          onClose={() => setCustomerModal(null)}
          onDone={(msg) => {
            setCustomerModal(null);
            showToast(msg);
            router.refresh();
          }}
        />
      )}
      {itemModal && (
        <ItemModal
          mode={itemModal.mode}
          row={itemModal.mode === "edit" ? itemModal.row : null}
          customers={customerRows}
          onClose={() => setItemModal(null)}
          onDone={(msg) => {
            setItemModal(null);
            showToast(msg);
            router.refresh();
          }}
        />
      )}
      {confirmCustomerDelete && (
        <ConfirmModal
          title="ลบลูกค้า?"
          message={`ต้องการลบ "${confirmCustomerDelete.fullName}" ใช่หรือไม่? (ลบได้เฉพาะลูกค้าที่ไม่มีสัญญาจำนำ)`}
          confirmLabel="ลบ"
          onClose={() => setConfirmCustomerDelete(null)}
          onConfirm={async () => {
            const row = confirmCustomerDelete;
            setConfirmCustomerDelete(null);
            const result = await safeAction(() => deleteCustomer({ id: row.id }));
            if (result.ok) {
              // ลบออกจาก state ทันที — UI อัปเดตเสมอ ไม่ต้องรอ refresh
              setCustomerRows((rows) => rows.filter((r) => r.id !== row.id));
              showToast(`ลบลูกค้า "${row.fullName}" แล้ว`);
              router.refresh();
            } else {
              showToast(result.error ?? "ลบลูกค้าไม่สำเร็จ", false);
            }
          }}
        />
      )}
      {confirmItemDelete && (
        <ConfirmModal
          title="ลบสินค้ารับจำนำ?"
          message={`ต้องการลบ "${confirmItemDelete.itemName}" (${confirmItemDelete.contractNumber}) ใช่หรือไม่? (ลบได้เฉพาะสัญญาที่ยังไม่มีธุรกรรม)`}
          confirmLabel="ลบ"
          onClose={() => setConfirmItemDelete(null)}
          onConfirm={async () => {
            const row = confirmItemDelete;
            setConfirmItemDelete(null);
            const result = await safeAction(() => deletePawnItem({ id: row.id }));
            if (result.ok) {
              setItemRows((rows) => rows.filter((r) => r.id !== row.id));
              showToast(`ลบ "${row.itemName}" แล้ว`);
              router.refresh();
            } else {
              showToast(result.error ?? "ลบสินค้ารับจำนำไม่สำเร็จ", false);
            }
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-lg",
            toast.ok ? "bg-zinc-900" : "bg-coral-dark"
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab button
// ---------------------------------------------------------------------------

function TabBtn({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all",
        active
          ? "bg-gradient-to-b from-primary-light to-primary text-white shadow-glow-teal"
          : "text-zinc-500 hover:text-primary-dark"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ตารางลูกค้า — desktop table / mobile cards
// ---------------------------------------------------------------------------

function CustomerTable({
  rows,
  search,
  onEdit,
  onDeleteAsk,
}: {
  rows: CustomerRow[];
  search: string;
  onEdit: (row: CustomerRow) => void;
  onDeleteAsk: (row: CustomerRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-surface-card shadow-card">
      {/* Desktop */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 font-medium">เลขบัตรประชาชน</th>
              <th className="px-4 py-3 font-medium">โทรศัพท์</th>
              <th className="px-4 py-3 font-medium">สัญญา</th>
              <th className="px-4 py-3 font-medium">สมัครเมื่อ</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                  {search ? `ไม่พบลูกค้า “${search}”` : "ยังไม่มีลูกค้า"}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-primary/5">
                <td className="px-4 py-2.5 font-bold text-zinc-800">
                  {c.fullName}
                </td>
                <td className="px-4 py-2.5 text-zinc-600">{c.nationalId}</td>
                <td className="px-4 py-2.5 text-zinc-600">{c.phone || "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={c.contractCount > 0 ? "teal" : "gray"}>
                    {c.contractCount} สัญญา
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-zinc-400">
                  {formatDateTime(c.createdAt)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" /> แก้ไข
                    </Button>
                    <IconBtn
                      title="ลบลูกค้า"
                      disabled={c.contractCount > 0}
                      hint={
                        c.contractCount > 0 ? "มีสัญญาอยู่ — ลบไม่ได้" : undefined
                      }
                      onClick={() => onDeleteAsk(c)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 p-3 sm:hidden">
        {rows.length === 0 && (
          <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
            {search ? `ไม่พบลูกค้า “${search}”` : "ยังไม่มีลูกค้า"}
          </div>
        )}
        {rows.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-primary-dark">{c.fullName}</span>
              <Badge tone={c.contractCount > 0 ? "teal" : "gray"}>
                {c.contractCount} สัญญา
              </Badge>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Line label="เลขบัตร">{c.nationalId}</Line>
              <Line label="โทรศัพท์">{c.phone || "—"}</Line>
              <Line label="สมัครเมื่อ">{formatDateTime(c.createdAt)}</Line>
            </dl>
            <div className="mt-3 flex items-center justify-end gap-1.5 border-t-2 border-dashed border-primary/20 pt-3">
              <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                <Pencil className="h-3.5 w-3.5" /> แก้ไข
              </Button>
              <IconBtn
                title="ลบลูกค้า"
                disabled={c.contractCount > 0}
                hint={c.contractCount > 0 ? "มีสัญญาอยู่ — ลบไม่ได้" : undefined}
                onClick={() => onDeleteAsk(c)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ตารางสินค้ารับจำนำ — desktop table / mobile cards
// ---------------------------------------------------------------------------

function ItemTable({
  rows,
  search,
  onEdit,
  onDeleteAsk,
}: {
  rows: ContractRow[];
  search: string;
  onEdit: (row: ContractRow) => void;
  onDeleteAsk: (row: ContractRow) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary/10 bg-surface-card shadow-card">
      {/* Desktop */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">สัญญา</th>
              <th className="px-4 py-3 font-medium">สิ่งที่จำนำ</th>
              <th className="px-4 py-3 font-medium">ลูกค้า</th>
              <th className="px-4 py-3 text-right font-medium">เงินต้น</th>
              <th className="px-4 py-3 text-center font-medium">ดอกเบี้ย</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                  {search ? `ไม่พบ “${search}”` : "ยังไม่มีสินค้ารับจำนำ"}
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-primary/5">
                <td className="whitespace-nowrap px-4 py-2.5 font-bold text-zinc-800">
                  {c.contractNumber}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary/50">
                      {c.image ? (
                        <img
                          src={c.image}
                          alt={c.itemName}
                          className="h-9 w-9 rounded-lg object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="max-w-[200px] truncate text-zinc-700">
                        {c.itemName}
                      </p>
                      {c.serialNumber && (
                        <p className="text-xs text-zinc-400">
                          S/N {c.serialNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-zinc-600">
                  {c.customerName}
                  <span className="block text-xs text-zinc-400">
                    {c.customerPhone || "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-extrabold text-zinc-800">
                  ฿{c.principalAmount.toLocaleString("th-TH")}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-center text-zinc-600">
                  {c.interestRatePercent}% / 10 วัน
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={PAWN_STATUS_TONE[c.status]}>
                    {PAWN_STATUS_LABEL[c.status]}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" /> แก้ไข
                    </Button>
                    <IconBtn title="ลบสัญญา" onClick={() => onDeleteAsk(c)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 p-3 sm:hidden">
        {rows.length === 0 && (
          <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
            {search ? `ไม่พบ “${search}”` : "ยังไม่มีสินค้ารับจำนำ"}
          </div>
        )}
        {rows.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-primary-dark">
                {c.contractNumber}
              </span>
              <Badge tone={PAWN_STATUS_TONE[c.status]}>
                {PAWN_STATUS_LABEL[c.status]}
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-primary/50">
                {c.image ? (
                  <img
                    src={c.image}
                    alt={c.itemName}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </span>
              <p className="min-w-0 truncate text-sm font-semibold">
                {c.itemName}
              </p>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <Line label="ลูกค้า">{c.customerName}</Line>
              <Line label="เงินต้น">
                ฿{c.principalAmount.toLocaleString("th-TH")}
              </Line>
              <Line label="ดอกเบี้ย">{c.interestRatePercent}% / 10 วัน</Line>
              {c.serialNumber && <Line label="S/N">{c.serialNumber}</Line>}
              {c.storageBox && <Line label="จุดเก็บ">{c.storageBox}</Line>}
            </dl>
            <div className="mt-3 flex items-center justify-end gap-1.5 border-t-2 border-dashed border-primary/20 pt-3">
              <Button variant="ghost" size="sm" onClick={() => onEdit(c)}>
                <Pencil className="h-3.5 w-3.5" /> แก้ไข
              </Button>
              <IconBtn title="ลบสัญญา" onClick={() => onDeleteAsk(c)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal: ลูกค้า (เพิ่ม/แก้ไข)
// ---------------------------------------------------------------------------

function CustomerModal({
  mode,
  row,
  onClose,
  onDone,
}: {
  mode: "add" | "edit";
  row: CustomerRow | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [nationalId, setNationalId] = useState(row?.nationalId ?? "");
  const [fullName, setFullName] = useState(row?.fullName ?? "");
  const [phone, setPhone] = useState(row?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await upsertCustomer({
        ...(mode === "edit" && row ? { id: row.id } : {}),
        nationalId,
        fullName,
        phone,
      });
      if (result.ok) {
        onDone(
          mode === "edit"
            ? `บันทึกข้อมูลลูกค้า "${fullName}" แล้ว`
            : `เพิ่มลูกค้า "${fullName}" แล้ว`
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      title={mode === "edit" ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}
      onClose={onClose}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === "edit" ? "บันทึก" : "เพิ่มลูกค้า"}
    >
      <Field label="เลขบัตรประชาชน (13 หลัก)" required>
        <Input
          value={nationalId}
          onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={13}
          placeholder="เช่น 1100200012345"
        />
      </Field>
      <Field label="ชื่อ-นามสกุล" required>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="เช่น สมชาย ใจดี"
        />
      </Field>
      <Field label="โทรศัพท์">
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="เช่น 0812345678"
        />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal: สินค้ารับจำนำ (เพิ่ม/แก้ไข)
// ---------------------------------------------------------------------------

function ItemModal({
  mode,
  row,
  customers,
  onClose,
  onDone,
}: {
  mode: "add" | "edit";
  row: ContractRow | null;
  customers: CustomerRow[];
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [customerId, setCustomerId] = useState(row?.customerId ?? "");
  const [itemName, setItemName] = useState(row?.itemName ?? "");
  const [serialNumber, setSerialNumber] = useState(row?.serialNumber ?? "");
  const [storageBox, setStorageBox] = useState(row?.storageBox ?? "");
  const [principalAmount, setPrincipalAmount] = useState(
    row ? String(row.principalAmount) : ""
  );
  const [interestRatePercent, setInterestRatePercent] = useState(
    row ? String(row.interestRatePercent) : "2"
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    row?.image ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  function submit() {
    setError(null);
    if (mode === "add" && !customerId) {
      setError("กรุณาเลือกลูกค้า");
      return;
    }
    const fd = new FormData();
    if (mode === "edit" && row) fd.append("id", row.id);
    fd.append("customerId", customerId);
    fd.append("itemName", itemName);
    fd.append("serialNumber", serialNumber);
    fd.append("storageBox", storageBox);
    fd.append("principalAmount", principalAmount);
    fd.append("interestRatePercent", interestRatePercent);
    if (imageFile) fd.append("image", imageFile);

    startTransition(async () => {
      const result = await upsertPawnItem(fd);
      if (result.ok) {
        onDone(
          mode === "edit"
            ? `บันทึกการแก้ไข "${itemName}" แล้ว`
            : `เพิ่มข้อมูล "${itemName}" แล้ว`
        );
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      title={
        mode === "edit"
          ? `แก้ไขสินค้ารับจำนำ — ${row?.contractNumber ?? ""}`
          : "เพิ่มข้อมูลสินค้ารับจำนำ"
      }
      onClose={onClose}
      onSubmit={submit}
      pending={pending}
      submitLabel={mode === "edit" ? "บันทึก" : "เพิ่มข้อมูล"}
    >
      <Field label="ลูกค้าเจ้าของ" required hint={mode === "add" ? "ยังไม่มีลูกค้า? เพิ่มในแท็บลูกค้าก่อน" : mode === "edit" ? "เปลี่ยนเจ้าของได้เฉพาะสัญญาที่ยังไม่มีธุรกรรม" : undefined}>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          disabled={mode === "edit"}
          className="h-10 w-full rounded-lg border border-accent-dark/30 bg-cream px-3 text-zinc-800 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:bg-zinc-100"
        >
          <option value="">— เลือกลูกค้า —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName} ({c.nationalId})
            </option>
          ))}
        </select>
      </Field>
      <Field label="รายละเอียดสิ่งของ" required>
        <Input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="เช่น ทองคำแท่ง 10 บาท / iPhone 15 Pro 256GB"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="หมายเลขซีเรียล">
          <Input
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </Field>
        <Field label="จุดเก็บ (กล่อง/ชั้น)">
          <Input
            value={storageBox}
            onChange={(e) => setStorageBox(e.target.value)}
          />
        </Field>
        <Field
          label="เงินต้น (บาท)"
          required
          hint={mode === "edit" ? "แก้ได้เฉพาะสัญญาที่ยังไม่มีธุรกรรม" : undefined}
        >
          <Input
            type="number"
            min={1}
            value={principalAmount}
            onChange={(e) => setPrincipalAmount(e.target.value)}
          />
        </Field>
        <Field
          label="ดอกเบี้ย (% ต่อ 10 วัน)"
          required
          hint={mode === "edit" ? "แก้ได้เฉพาะสัญญาสถานะ ACTIVE" : undefined}
        >
          <Input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={interestRatePercent}
            onChange={(e) => setInterestRatePercent(e.target.value)}
          />
        </Field>
      </div>

      {/* รูปสิ่งของ */}
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-primary-dark">
          รูปสิ่งของ
        </span>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex h-32 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
            imagePreview
              ? "border-primary/40 bg-primary/5"
              : "border-primary/30 bg-cream hover:border-primary"
          )}
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="ตัวอย่างรูปสิ่งของ"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <UploadCloud className="h-7 w-7 text-primary/60" />
              <span className="text-xs font-bold text-primary-dark">
                คลิกเพื่อแนบรูปจากเครื่อง
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
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared modal shell + small pieces
// ---------------------------------------------------------------------------

function Modal({
  title,
  children,
  onClose,
  onSubmit,
  pending,
  submitLabel,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-2 border-primary/15 bg-surface-card p-5 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b-2 border-dashed border-primary/25 pb-3">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-primary-dark">
            <HandCoins className="h-5 w-5 text-primary" />
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-primary/10 hover:text-primary-dark"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="space-y-3"
        >
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              <Gavel className="h-4 w-4" />
              {pending ? "กำลังบันทึก…" : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await onConfirm();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border-2 border-coral/30 bg-surface-card p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-extrabold text-coral-dark">{title}</h3>
        <p className="mt-2 text-sm text-zinc-600">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            <Trash2 className="h-4 w-4" />
            {pending ? "กำลังลบ…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  disabled,
  hint,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <span title={hint ?? title}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={title}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors",
          disabled
            ? "cursor-not-allowed opacity-40"
            : "hover:bg-coral/10 hover:text-coral-dark"
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </span>
  );
}

function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="shrink-0 text-zinc-400">{label}</dt>
      <dd className="min-w-0 text-right text-zinc-700">{children}</dd>
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm font-bold text-coral-dark">
      {children}
    </p>
  );
}
