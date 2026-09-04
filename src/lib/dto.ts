// DTO (Data Transfer Object) — ส่งข้อมูลข้าม Server → Client Component
// เก็บเฉพาะ field ที่ UI จำเป็นต้องใช้ (กันส่ง Date/ข้อมูลใหญ่เกินจำเป็น)

export interface ProductDto {
  id: string;
  name: string;
  category: string;
  sellPrice: number;
  quantity: number;
  image: string | null;
  /** สต็อกเหลือน้อยหรือหมด */
  outOfStock: boolean;
  lowStock: boolean;
}

export interface ForfeitPawnDto {
  id: string;
  contractNumber: string;
  itemName: string;
  customerName: string;
  principalAmount: number;
  /** ราคาที่ขายหน้าร้าน = forfeitPrice ?? เงินต้น */
  sellPrice: number;
  image: string | null;
  forfeitedAt: string;
}

export interface PawnContractDto {
  id: string;
  contractNumber: string;
  itemName: string;
  serialNumber: string | null;
  storageBox: string | null;
  principalAmount: number;
  interestRatePercent: number;
  customerName: string;
  customerPhone: string;
  image: string | null;
  startDate: string;
  dueDate: string;
  status: "ACTIVE" | "REDEEMED" | "FORFEITED" | "SOLD";
  renewalCount: number;
  lastRenewedAt: string | null;
  forfeitPrice: number | null;
  createdAt: string;
}
