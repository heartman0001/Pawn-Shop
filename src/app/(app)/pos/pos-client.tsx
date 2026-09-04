"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Lock,
  Minus,
  Package,
  PackageX,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  Wallet,
} from "lucide-react";
import { checkout } from "@/app/actions/pos";
import type { ForfeitPawnDto, ProductDto } from "@/lib/dto";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { formatBaht } from "@/lib/format";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { cn } from "@/components/ui";
import { usePosCart } from "@/lib/pos-store";

type Payment = "CASH" | "QR" | "CARD" | "TRANSFER";

interface PosClientProps {
  products: ProductDto[];
  forfeitedPawns: ForfeitPawnDto[];
}


export function PosClient({ products, forfeitedPawns }: PosClientProps) {
  const router = useRouter();
  const { items, add, remove, increment, decrement, clear } = usePosCart();
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState("all"); // "all" | "pawn" | "products" | ชื่อหมวด
  const [payment, setPayment] = useState<Payment>("CASH");
  const [received, setReceived] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    receiptNumber: string;
    totalAmount: number;
    changeAmount: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const cartRef = useRef<HTMLElement>(null);
  const [mobileView, setMobileView] = useState<"shelf" | "cart">("shelf");
  const isShelf = mobileView === "shelf";

  // ชิปหมวด: เรียงตามรายการหมวดคงที่ แล้วตามด้วยหมวดที่ไม่ได้อยู่ในรายการ (ถ้ามีตกค้าง)
  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    const fixed = PRODUCT_CATEGORIES.filter((c) => present.has(c));
    const leftovers = products
      .map((p) => p.category)
      .filter(
        (c) => !(PRODUCT_CATEGORIES as readonly string[]).includes(c)
      );
    return [...fixed, ...leftovers];
  }, [products]);

  const q = search.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);

  const visibleProducts = products.filter((p) => {
    if (chip !== "all" && chip !== "products" && chip !== p.category) return false;
    if (!q) return true;
    return matches(p.name) || matches(p.category);
  });
  const visiblePawns = forfeitedPawns.filter((p) => {
    if (chip !== "all" && chip !== "pawn") return false;
    if (!q) return true;
    return (
      matches(p.itemName) ||
      matches(p.customerName) ||
      matches(p.contractNumber)
    );
  });

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const receivedAmount = received === "" ? total : Number(received);
  const change = payment === "CASH" ? Math.max(receivedAmount - total, 0) : 0;
  const enoughCash = payment !== "CASH" || receivedAmount >= total;

  function addProduct(p: ProductDto) {
    const inCart = items.find((i) => i.kind === "product" && i.id === p.id);
    const remaining = p.quantity - (inCart?.qty ?? 0);
    if (remaining <= 0) return;
    add({
      key: `product-${p.id}`,
      kind: "product",
      id: p.id,
      name: p.name,
      meta: p.category,
      unitPrice: p.sellPrice,
      image: p.image,
      maxQty: p.quantity,
    });
  }

  function addPawn(p: ForfeitPawnDto) {
    if (items.some((i) => i.kind === "pawn" && i.id === p.id)) return;
    add({
      key: `pawn-${p.id}`,
      kind: "pawn",
      id: p.id,
      name: p.itemName,
      meta: `เลขสัญญา ${p.contractNumber}`,
      unitPrice: p.sellPrice,
      image: null,
      maxQty: 1,
    });
  }

  function runCheckout() {
    if (items.length === 0 || !enoughCash) return;
    setError(null);
    startTransition(async () => {
      const result = await checkout({
        lines: items.map((i) =>
          i.kind === "product"
            ? { kind: "product" as const, productId: i.id, quantity: i.qty }
            : { kind: "pawn" as const, pawnContractId: i.id }
        ),
        paymentMethod: payment,
        receivedAmount: payment === "CASH" ? receivedAmount : null,
      });
      if (result.ok) {
        setReceipt({
          receiptNumber: result.receiptNumber,
          totalAmount: result.totalAmount,
          changeAmount: result.changeAmount,
        });
        clear();
        setReceived("");
        setMobileView("shelf"); // มือถือ: กลับไปหน้ารายการสินค้าหลังขายเสร็จ
        router.refresh(); // โหลดสต็อก + สถานะของหลุดจำนำใหม่
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col lg:flex-row lg:gap-4 max-lg:h-[calc(100dvh-8.5rem)]">
      {/* ------- ฝั่งซ้าย: ค้นหา + ชิปหมวด + กริดสินค้า ------- */}
      <div
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 flex-col",
          !isShelf && "max-lg:hidden"
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า / หมวดหมู่ / ชื่อลูกค้า / เลขสัญญา…"
              className="h-11 w-full rounded-full border-2 border-primary/20 bg-cream pl-9 pr-4 text-sm text-zinc-800 shadow-card placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            />
          </div>
        </div>

        {/* หมวดหมู่ */}
        <div className="no-scrollbar -mx-1 mb-3 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap">
          <Chip active={chip === "all"} onClick={() => setChip("all")}>
            ทั้งหมด ({products.length + forfeitedPawns.length})
          </Chip>
          <Chip active={chip === "pawn"} onClick={() => setChip("pawn")}>
            🔒 ของหลุดจำนำ ({forfeitedPawns.length})
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={chip === c} onClick={() => setChip(c)}>
              {c}
            </Chip>
          ))}
        </div>

        {/* กริดสินค้า */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-24 pr-1 lg:pb-2">
          {(chip === "all" || chip === "pawn") && (
            <ProductSection
              title={`ของหลุดจำนำ (${visiblePawns.length})`}
              empty="ยังไม่มีของหลุดจำนำ"
            >
              {visiblePawns.map((p) => (
                <PawnCard key={p.id} pawn={p} onAdd={() => addPawn(p)} />
              ))}
            </ProductSection>
          )}
          {(chip === "all" || chip === "products" || categories.includes(chip)) &&
            categories
              .filter((c) => chip === "all" || chip === "products" || chip === c)
              .map((category) => {
                const list = visibleProducts.filter(
                  (p) => p.category === category
                );
                if (list.length === 0) return null;
                return (
                  <ProductSection
                    key={category}
                    title={`${category} (${list.length})`}
                    empty="ไม่มีสินค้าในหมวดนี้"
                  >
                    {list.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        inCartQty={
                          items.find(
                            (i) => i.kind === "product" && i.id === p.id
                          )?.qty ?? 0
                        }
                        onAdd={() => addProduct(p)}
                      />
                    ))}
                  </ProductSection>
                );
              })}
          {visiblePawns.length === 0 &&
            products.filter(
              (p) =>
                (chip === "all" ||
                  chip === "products" ||
                  chip === p.category) &&
                (!q || matches(p.name) || matches(p.category))
            ).length === 0 && (
              <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center text-sm text-zinc-400">
                ไม่พบสินค้าที่ค้นหา “{search}”
              </div>
            )}
        </div>

        {/* ปุ่มลอยเปิดตะกร้า (เฉพาะจอมือถือ) */}
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setMobileView("cart")}
            className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 border-t-2 border-primary/15 bg-white/95 px-4 py-3 shadow-[0_-8px_20px_rgba(0,0,0,0.10)] backdrop-blur lg:hidden"
          >
            <ShoppingCart className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-sm font-bold text-primary-dark">ดูตะกร้า</span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
              {items.reduce((s, i) => s + i.qty, 0)} ชิ้น
            </span>
            <span className="ml-auto truncate text-base font-extrabold text-primary-dark">
              {formatBaht(total)}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
          </button>
        )}
      </div>

      {/* ------- ตะกร้าฝั่งขวา ------- */}
      <aside
        ref={cartRef}
        className={cn(
          "mt-4 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border-2 border-primary/15 bg-white shadow-card lg:mt-0 lg:w-[340px] lg:shrink-0",
          isShelf && "max-lg:hidden"
        )}
      >
        <div className="flex items-center gap-1.5 border-b-2 border-dashed border-primary/15 bg-cream px-3 py-2.5 sm:px-4 sm:py-3">
          <button
            type="button"
            onClick={() => setMobileView("shelf")}
            aria-label="กลับไปเลือกสินค้า"
            className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary/20 text-primary-dark hover:bg-primary/10 lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <ShoppingCart className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="text-sm font-extrabold text-primary-dark">ตะกร้า</h2>
          <span className="text-xs text-zinc-400">
            {items.reduce((s, i) => s + i.qty, 0)} ชิ้น
          </span>
          {items.length > 0 && (
            <button
              onClick={clear}
              className="ml-auto text-xs text-zinc-400 hover:text-red-600"
            >
              ล้างตะกร้า
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
          {items.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              ยังไม่มีสินค้าในตะกร้า
              <br />
              <span className="text-xs">
                คลิกสินค้าหรือของหลุดจำนำเพื่อเพิ่ม
              </span>
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((item) => (
                <li key={item.key} className="flex items-center gap-2 py-2.5">
                  <Thumb image={item.image} name={item.name} small />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {item.meta} · {formatBaht(item.unitPrice)}
                    </p>
                  </div>
                  {item.kind === "pawn" ? (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary-dark">
                      <Lock className="h-3 w-3" /> 1
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => decrement(item.key)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 font-black text-primary-dark transition-colors hover:bg-primary hover:text-white"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-extrabold text-zinc-800">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => increment(item.key)}
                        disabled={item.qty >= item.maxQty}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary/20 font-black text-primary-dark transition-colors hover:bg-primary hover:text-white disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <span className="w-16 text-right text-sm font-bold text-primary-dark">
                    {formatBaht(item.unitPrice * item.qty)}
                  </span>
                  <button
                    onClick={() => remove(item.key)}
                    className="text-zinc-300 transition-colors hover:text-coral-dark"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ชำระเงิน */}
        <div className="border-t-2 border-dashed border-primary/15 bg-cream px-4 py-3">
          <div className="mb-2 grid grid-cols-4 gap-1">
            {PAYMENT_METHODS.map((m) => {
              const Icon = paymentIcons[m];
              return (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-medium transition-colors",
                    payment === m
                      ? "border-primary bg-primary text-white shadow-glow-teal"
                      : "border-primary/15 bg-white text-zinc-500 hover:bg-primary/10 hover:text-primary-dark"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {PAYMENT_METHOD_LABEL[m]}
                </button>
              );
            })}
          </div>

          {payment === "CASH" && (
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-500">รับเงิน:</span>
                {[total, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setReceived(String(amt))}
                    className="rounded-full border border-primary/20 bg-white px-2.5 py-1 text-xs font-bold text-primary-dark hover:bg-primary/10"
                  >
                    {amt >= 1000 && amt % 1000 === 0
                      ? `${amt / 1000}k`
                      : formatBaht(amt)}
                  </button>
                ))}
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={received}
                  onChange={(e) => setReceived(e.target.value)}
                  placeholder="กรอกจำนวน"
                  className="h-8 w-28 rounded-full border-2 border-primary/20 bg-white px-3 text-right text-sm text-zinc-800 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-zinc-500">เงินทอน</span>
                <span
                  className={cn(
                    "text-lg font-extrabold",
                    change >= 0 ? "text-success" : "text-error"
                  )}
                >
                  {formatBaht(Math.max(change, 0))}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-500">รวมทั้งสิ้น</span>
            <span className="text-2xl font-extrabold text-primary-dark">
              {formatBaht(total)}
            </span>
          </div>

          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            onClick={runCheckout}
            disabled={items.length === 0 || pending || !enoughCash}
            className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-success text-base font-extrabold text-white shadow-card transition-all hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            {pending ? (
              "กำลังชำระเงิน…"
            ) : (
              <>
                <Banknote className="h-5 w-5" />
                ชำระเงิน {formatBaht(total)}
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ------- ใบเสร็จสำเร็จ ------- */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-primary/15 bg-cream p-6 text-center shadow-glow-teal">
            <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
            <h3 className="mt-3 text-lg font-bold">ชำระเงินสำเร็จ</h3>
            <p className="mt-1 text-sm text-zinc-500">ใบเสร็จ</p>
            <p className="text-xl font-bold tracking-wide">
              {receipt.receiptNumber}
            </p>
            <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-left text-sm">
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">ยอดรวม</span>
                <span className="font-semibold">
                  {formatBaht(receipt.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">เงินทอน</span>
                <span className="font-bold text-success">
                  {formatBaht(receipt.changeAmount)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setReceipt(null)}
              className="mt-5 h-12 w-full rounded-full bg-gradient-to-b from-accent-light to-accent text-sm font-extrabold text-zinc-900 shadow-glow-gold transition-all hover:from-accent hover:to-accent-dark active:scale-[0.98]"
            >
              ขายรายการถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const paymentIcons: Record<Payment, typeof Banknote> = {
  CASH: Banknote,
  QR: QrCode,
  CARD: CreditCard,
  TRANSFER: Wallet,
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-gradient-to-b from-primary-light to-primary text-white shadow-glow-teal"
          : "border-2 border-primary/20 bg-white text-zinc-600 hover:bg-primary/10 hover:text-primary-dark"
      )}
    >
      {children}
    </button>
  );
}

function ProductSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>              <h3 className="mb-2 flex items-center gap-2 border-b-2 border-dashed border-primary/20 pb-1.5 text-sm font-extrabold uppercase tracking-wide text-primary-dark">
        {title}
      </h3>
      {Array.isArray(children) && children.length === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-400">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3 xl:grid-cols-6">
          {children}
        </div>
      )}
    </section>
  );
}

function Thumb({
  image,
  name,
  small,
}: {
  image: string | null;
  name: string;
  small?: boolean;
}) {
  if (!image) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary/40",
          small ? "h-9 w-9" : "h-30 w-full"
        )}
      >
        <Package className={small ? "h-4 w-4" : "h-6 w-6"} />
      </span>
    );
  }
  // ใช้ <img> ธรรมดา รองรับ path ไฟล์ในเครื่อง (/products/*.jpg) และ URL ภายนอก
  return (
    // eslint-disable-next-line @next/next/no-img-element -- รองรับ path รูปในเครื่อง (public/products/*)
    <img
      src={image}
      alt={name}
      className={cn(
        "shrink-0 rounded-lg object-cover",
        small ? "h-9 w-9" : "h-30 w-full"
      )}
    />
  );
}

function ProductCard({
  product,
  inCartQty,
  onAdd,
}: {
  product: ProductDto;
  inCartQty: number;
  onAdd: () => void;
}) {
  const remaining = product.quantity - inCartQty;
  const soldOut = product.outOfStock || remaining <= 0;

  return (
    <button
      onClick={onAdd}
      disabled={soldOut}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-white text-left shadow-sm transition-all",
        soldOut
          ? "cursor-not-allowed border-zinc-100 opacity-60"
          : "border-primary/15 hover:-translate-y-0.5 hover:border-primary hover:shadow-card"
      )}
    >
      <div className="relative h-full w-full bg-zinc-50">
        <Thumb image={product.image} name={product.name} />
        {soldOut && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-semibold text-white">
            <PackageX className="mr-1 h-4 w-4" /> หมด
          </span>
        )}
        {product.lowStock && !soldOut && (
          <span className="absolute left-1 top-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-zinc-800 shadow-glow-gold">
            เหลือ {product.quantity}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-tight">
          {product.name}
        </p>
        <p className="mt-auto text-sm font-extrabold text-primary-dark">
          {formatBaht(product.sellPrice)}
        </p>
      </div>
    </button>
  );
}

function PawnCard({
  pawn,
  onAdd,
}: {
  pawn: ForfeitPawnDto;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-coral/30 bg-cream text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-coral hover:shadow-glow-coral"
    >
      <div className="flex h-20 w-full items-center justify-center overflow-hidden bg-coral/10">
        {pawn.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- รูปสิ่งของที่แนบตอนรับจำนำ
          <img
            src={pawn.image}
            alt={pawn.itemName}
            className="h-full w-full object-cover"
          />
        ) : (
          <Lock className="h-6 w-6 text-coral/60" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-tight">
          {pawn.itemName}
        </p>
        <p className="truncate text-[10px] text-zinc-400">
          {pawn.customerName} · {pawn.contractNumber}
        </p>
        <p className="mt-auto text-sm font-extrabold text-coral-dark">
          {formatBaht(pawn.sellPrice)}
        </p>
      </div>
    </button>
  );
}
