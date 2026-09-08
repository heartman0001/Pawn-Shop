"use client";

/* eslint-disable @next/next/no-img-element -- รูปสินค้าอัปโหลดจากเครื่อง (path ในเครื่อง ใช้ <img> ธรรมดา) */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Package,
  PackagePlus,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { addProduct, deleteProduct, setQuantity, updatePrices } from "@/app/actions/products";
import { PRODUCT_CATEGORIES, categoryRank } from "@/lib/categories";
import { formatBaht, PRODUCT_IMAGE_UPLOAD_HINT } from "@/lib/format";
import { Badge, Button, Field, Input, Select } from "@/components/ui";
import { cn } from "@/components/ui";

interface ProductRow {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number;
  image: string | null;
}

const emptyForm = {
  name: "",
  category: "",
  costPrice: "",
  sellPrice: "",
  quantity: "0",
  minQuantity: "0",
};

export function ProductsManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // เรียงตารางตามลำดับหมวดหมู่คงที่ แล้วตามชื่อ
  const sortedProducts = [...products].sort(
    (a, b) =>
      categoryRank(a.category) - categoryRank(b.category) ||
      a.name.localeCompare(b.name, "th")
  );

  // ล้าง object URL ตอนเปลี่ยน/เลิกใช้รูป
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function notify(msg: string) {
    setMessage(msg);
    setError(null);
    window.setTimeout(() => setMessage(null), 4000);
  }

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  }

  function submitAdd() {
    if (!form.name.trim() || !form.category.trim()) {
      setError("กรอกชื่อสินค้าและหมวดหมู่ก่อน");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("category", form.category);
    fd.append("costPrice", form.costPrice);
    fd.append("sellPrice", form.sellPrice);
    fd.append("quantity", form.quantity);
    fd.append("minQuantity", form.minQuantity);
    if (imageFile) fd.append("image", imageFile);

    startTransition(async () => {
      const result = await addProduct(fd);
      if (result.ok) {
        notify("เพิ่มสินค้าเรียบร้อย");
        setForm(emptyForm);
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function removeProduct(product: ProductRow) {
    setConfirmDeleteId(null);
    startTransition(async () => {
      const result = await deleteProduct({ id: product.id });
      if (result.ok) {
        notify(
          result.mode === "deleted"
            ? `ลบสินค้า "${product.name}" แล้ว`
            : `"${product.name}" เคยมีประวัติการขาย → ซ่อนออกจากสต็อกแล้ว (เก็บประวัติใบเสร็จ)`
        );
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function changeQty(id: string, quantity: number) {
    startTransition(async () => {
      const result = await setQuantity({ id, quantity });
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-primary-dark">
          สต็อกสินค้า
        </h1>
        <p className="text-sm font-medium text-zinc-500">
          เพิ่มสินค้า / แนบรูปจากเครื่อง / ปรับจำนวน-ราคา / ลบสินค้า
        </p>
      </div>

      {message && (
        <p className="rounded-full bg-primary-dark px-5 py-2.5 text-sm font-bold text-white shadow-glow-teal">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-2xl bg-coral/10 px-5 py-2.5 text-sm font-bold text-coral-dark">
          {error}
        </p>
      )}

      {/* ฟอร์มเพิ่มสินค้า */}
      <div className="rounded-3xl border-2 border-primary/15 bg-white p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-2 border-b-2 border-dashed border-primary/25 pb-2 text-sm font-extrabold uppercase tracking-wide text-primary-dark">
          <PackagePlus className="h-4 w-4 text-primary" /> เพิ่มสินค้าใหม่
        </h2>
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          {/* แนบรูปจากเครื่อง */}
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-primary-dark">
              รูปสินค้า
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-40 w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
                imagePreview
                  ? "border-primary/40 bg-primary/5"
                  : "border-primary/30 bg-cream hover:border-primary"
              )}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="ตัวอย่างสินค้า"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <UploadCloud className="h-9 w-9 text-primary/60" />
                  <span className="text-xs font-bold text-primary-dark">
                    คลิกเพื่อแนบรูปจากเครื่อง
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

          <div className="grid content-start gap-3 sm:grid-cols-2">
            <Field label="ชื่อสินค้า" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น แบตเตอรี่สำรอง 10000mAh"
              />
            </Field>
            <Field label="หมวดหมู่" required>
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">— เลือกหมวดหมู่ —</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ต้นทุน (บาท)">
              <Input
                type="number"
                min={0}
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </Field>
            <Field label="ราคาขาย (บาท)" required>
              <Input
                type="number"
                min={1}
                value={form.sellPrice}
                onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
              />
            </Field>
            <Field label="จำนวนเริ่มต้น">
              <Input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </Field>
            <Field label="สต็อกขั้นต่ำ (เตือน)">
              <Input
                type="number"
                min={0}
                value={form.minQuantity}
                onChange={(e) =>
                  setForm({ ...form, minQuantity: e.target.value })
                }
              />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setForm(emptyForm)}>
            ล้างฟอร์ม
          </Button>
          <Button onClick={submitAdd} disabled={pending}>
            <ImagePlus className="h-4 w-4" /> {pending ? "กำลังบันทึก…" : "เพิ่มสินค้า"}
          </Button>
        </div>
      </div>

      {/* ตารางสินค้า — mobile: card / desktop: table */}
      <div className="overflow-x-auto rounded-2xl border-2 border-primary/10 bg-surface-card shadow-card">
        {/* Desktop: table */}
        <div className="hidden divide-y divide-zinc-100 sm:block">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-bold">สินค้า</th>
                <th className="px-4 py-3 font-bold">ราคา</th>
                <th className="px-4 py-3 font-bold">สต็อก</th>
                <th className="px-4 py-3 font-bold">สถานะ</th>
                <th className="px-4 py-3 text-right font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-400">
                    ยังไม่มีสินค้า — เพิ่มสินค้าแรกด้านบน หรือรัน{" "}
                    <code>npm run db:seed</code>
                  </td>
                </tr>
              )}
              {sortedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-primary/5">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary/50">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-9 w-9 rounded-lg object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{p.name}</p>
                        <p className="text-xs text-zinc-400">{p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {editing === p.id ? (
                      <PriceEditor
                        product={p}
                        onDone={() => {
                          setEditing(null);
                          router.refresh();
                        }}
                      />
                    ) : (
                      <div>
                        <p className="font-extrabold text-zinc-800">
                          {formatBaht(p.sellPrice)}
                        </p>
                        <p className="text-xs text-zinc-400">
                          ทุน {formatBaht(p.costPrice)}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <QtyBtn
                        label="-"
                        disabled={p.quantity <= 0}
                        onClick={() => changeQty(p.id, p.quantity - 1)}
                      />
                      <span className="w-10 text-center font-extrabold">
                        {p.quantity}
                      </span>
                      <QtyBtn
                        label="+"
                        onClick={() => changeQty(p.id, p.quantity + 1)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    {p.quantity <= 0 ? (
                      <Badge tone="coral">หมด</Badge>
                    ) : p.quantity <= p.minQuantity ? (
                      <Badge tone="gold">สต็อกต่ำ</Badge>
                    ) : (
                      <Badge tone="green">ปกติ</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {confirmDeleteId === p.id ? (
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-coral-dark">
                            ยืนยันลบ?
                          </span>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => removeProduct(p)}
                            disabled={pending}
                          >
                            ใช่, ลบเลย
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            ยกเลิก
                          </Button>
                        </span>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setEditing(editing === p.id ? null : p.id)
                            }
                          >
                            แก้ไขราคา
                          </Button>
                          <button
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-coral/10 hover:text-coral-dark"
                            title="ลบสินค้า"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: card stack */}
        <div className="space-y-3 p-3 sm:hidden">
          {products.length === 0 && (
            <div className="rounded-2xl border-2 border-primary/10 bg-surface-card px-4 py-10 text-center text-sm text-zinc-400 shadow-card">
              ยังไม่มีสินค้า — เพิ่มสินค้าแรกด้านบน
            </div>
          )}
          {sortedProducts.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border-2 border-primary/10 bg-surface-card p-4 shadow-card"
            >
              {/* header: รูป + ชื่อ + สถานะ */}
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary/50">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <Package className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="text-xs text-zinc-400">{p.category}</p>
                </div>
                {p.quantity <= 0 ? (
                  <Badge tone="coral">หมด</Badge>
                ) : p.quantity <= p.minQuantity ? (
                  <Badge tone="gold">สต็อกต่ำ</Badge>
                ) : (
                  <Badge tone="green">ปกติ</Badge>
                )}
              </div>

              {/* รายละเอียด */}
              <dl className="mt-3 space-y-1.5 text-sm">
                {editing === p.id ? (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-zinc-400">แก้ไขราคา</dt>
                    <dd>
                      <PriceEditor
                        product={p}
                        onDone={() => {
                          setEditing(null);
                          router.refresh();
                        }}
                      />
                    </dd>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-zinc-400">ราคาขาย</dt>
                      <dd className="font-extrabold text-zinc-800">
                        {formatBaht(p.sellPrice)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-zinc-400">ต้นทุน</dt>
                      <dd className="text-zinc-700">{formatBaht(p.costPrice)}</dd>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-zinc-400">สต็อก</dt>
                  <dd>
                    <div className="flex items-center gap-1.5">
                      <QtyBtn
                        label="-"
                        disabled={p.quantity <= 0}
                        onClick={() => changeQty(p.id, p.quantity - 1)}
                      />
                      <span className="w-8 text-center font-extrabold">
                        {p.quantity}
                      </span>
                      <QtyBtn
                        label="+"
                        onClick={() => changeQty(p.id, p.quantity + 1)}
                      />
                    </div>
                  </dd>
                </div>
              </dl>

              {/* จัดการ */}
              <div className="mt-3 flex items-center justify-end gap-1.5 border-t-2 border-dashed border-primary/20 pt-3">
                {confirmDeleteId === p.id ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-coral-dark">
                      ยืนยันลบ?
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => removeProduct(p)}
                      disabled={pending}
                    >
                      ใช่, ลบเลย
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      ยกเลิก
                    </Button>
                  </span>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEditing(editing === p.id ? null : p.id)
                      }
                    >
                      แก้ไขราคา
                    </Button>
                    <button
                      onClick={() => setConfirmDeleteId(p.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-coral/10 hover:text-coral-dark"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QtyBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 text-base font-black text-primary-dark transition-colors",
        "hover:bg-primary hover:text-white disabled:opacity-40"
      )}
    >
      {label}
    </button>
  );
}

function PriceEditor({
  product,
  onDone,
}: {
  product: ProductRow;
  onDone: () => void;
}) {
  const [cost, setCost] = useState(String(product.costPrice));
  const [price, setPrice] = useState(String(product.sellPrice));
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updatePrices({
        id: product.id,
        sellPrice: Number(price),
        costPrice: Number(cost),
      });
      if (result.ok) onDone();
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        value={cost}
        onChange={(e) => setCost(e.target.value)}
        className="h-8 w-20"
        aria-label="ต้นทุน"
      />
      <Input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="h-8 w-20"
        aria-label="ราคาขาย"
      />
      <Button
        size="sm"
        variant="success"
        onClick={save}
        disabled={pending}
        aria-label="บันทึกราคา"
      >
        <Save className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
