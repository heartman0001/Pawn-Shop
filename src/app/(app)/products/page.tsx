import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { PAGE_SIZE_COOKIE, parsePageSize } from "@/lib/page-size";
import { ProductsManager } from "./products-manager";

export const metadata = { title: "สต็อกสินค้า — ร้านรับจำนำ POS" };


export default async function ProductsPage() {
  await requireAuth();

  const products = await db.retailProduct.findMany({
    where: { archived: false }, // หน้ารายการนี้ไม่โชว์ของที่ลบ/ซ่อนแล้ว
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      category: true,
      costPrice: true,
      sellPrice: true,
      quantity: true,
      minQuantity: true,
      image: true,
    },
  });

  // จำนวนต่อหน้า: อ่านจาก cookie ร่วมกับหน้าอื่น
  const cookieStore = await cookies();
  const initialPageSize = parsePageSize(
    cookieStore.get(PAGE_SIZE_COOKIE)?.value
  );

  return (
    <ProductsManager products={products} initialPageSize={initialPageSize} />
  );
}
