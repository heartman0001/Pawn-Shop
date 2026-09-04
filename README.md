# ระบบจัดการร้านจำนำและขายสินค้าหน้าร้าน (Single-User Pawnshop & POS)

ระบบใช้งานภายในร้านคนเดียว รันแบบ Local Server — รับจำนำ คิดดอกเบี้ย ตัดหลุดจำนำ
และขายสินค้าหน้าร้าน (POS) โดยไม่ใช้ Barcode เน้น **ค้นหา + คลิกรูปภาพ** แทน

- **Stack:** Next.js 16 (App Router) · TypeScript · Prisma ORM + SQLite · Tailwind CSS v4
- **Auth:** ล็อกอินด้วย Password/PIN จาก `.env` (ไม่ต้องสมัครสมาชิก) — เซสชันแบบ signed cookie (JWT ผ่าน `jose`)
- **State & Form:** Zustand (ตะกร้า POS) · React Hook Form + Zod

> ⚠️ **หมายเหตุ:** โปรเจกต์รันบน **Next.js 16** ซึ่งเปลี่ยนชื่อ `middleware.ts` → **`proxy.ts`**
> (เดิมจะถูก deprecate) ดังนั้นไฟล์กันเส้นทางคือ `src/proxy.ts` ไม่ใช่ `src/middleware.ts`

---

## เริ่มต้นใช้งาน (Quick Start)

```bash
# 1) ติดตั้ง dependencies (ถ้ายัง)
npm install

# 2) สร้าง .env (แก้รหัสผ่าน + AUTH_SECRET ด้วย!)
cp .env.example .env

# 3) สร้างฐานข้อมูล SQLite + seed สินค้าตัวอย่าง
npm run db:push     # prisma db push (สร้างตาราง)
npm run db:seed     # ใส่สินค้าตัวอย่าง (รันครั้งเดียว)

# 4) รัน
npm run dev
# เปิด http://localhost:3000 → เข้าสู่ระบบด้วย ADMIN_PASSWORD
```

> ถ้ายังไม่สร้าง `.env` ระบบจะใช้ค่า default สำหรับ dev (รหัสผ่าน `pawn1234`,
> ฐานข้อมูล `prisma/dev.db`) และแสดง warning — **เปลี่ยนก่อนใช้งานจริง**

---

## โครงสร้างโฟลเดอร์

```
├── prisma/
│   ├── schema.prisma        # ตารางทั้งหมด (Customer, PawnContract, RetailProduct,
│   │                        #  SaleOrder, SaleItem + enum สถานะ/การชำระเงิน)
│   ├── seed.ts              # ข้อมูลสินค้าตัวอย่าง
│   └── dev.db               # ฐานข้อมูล SQLite (สร้างอัตโนมัติ, อย่า commit)
├── public/products/         # รูปสินค้าตัวอย่าง + รูปสินค้าที่อัปโหลดจากหน้าเว็บ (เก็บอัตโนมัติ)
├── public/pawn-items/        # รูปสิ่งของที่จำนำ (แนบตอนรับจำนำ)
└── src/
    ├── proxy.ts             # (เดิมคือ middleware) กันทุก route ยกเว้น /login + static
    ├── lib/
    │   ├── auth.ts          # getSession / requireAuth / createSession / destroySession
    │   ├── session.ts       # sign/verify JWT session (jose) — ใช้ใน proxy ด้วย
    │   ├── prisma.ts        # PrismaClient singleton
    │   ├── definitions.ts   # Zod schemas (ตรวจข้อมูลฝั่ง Server Action)
    │   ├── pos-store.ts     # Zustand store สำหรับตะกร้า POS
    │   ├── dto.ts / format.ts / env.ts / refnumbers.ts
    ├── components/ui.tsx    # UI primitives แบบ Shadcn pattern (Button/Input/Card/...)
    └── app/
        ├── layout.tsx / globals.css
        ├── login/                       # หน้าเข้าสู่ระบบ (สาธารณะ)
        ├── (app)/                       # กลุ่มที่ต้องล็อกอิน (มี header นำทาง)
        │   ├── page.tsx                 # แดชบอร์ด
        │   ├── pos/                     # หน้าขายหน้าร้าน (POS)
        │   ├── pawns/                   # รายการสัญญาจำนำ + ต่อดอก/ตัดหลุด/ไถ่ถอน
        │   ├── pawn/new/                # ฟอร์มสัญญาใหม่ (ค้นหา/สร้างลูกค้าในหน้าเดียว)
        │   ├── products/                # สต็อกสินค้า (เพิ่ม/ปรับจำนวน/ราคา)
        │   └── customers/               # รายชื่อลูกค้า
        └── actions/                     # Server Actions
            ├── auth.ts                  # login / logout (ตรวจ ADMIN_PASSWORD)
            ├── pawn.ts                  # createPawnContract / renewInterest / forfeitContract / redeemContract
            ├── pos.ts                   # checkout (หักสต็อก + สร้างใบเสร็จ แบบ Transaction)
            └── products.ts              # addProduct / setQuantity / updatePrices
```

---

## การทำงานหลัก

### 1) ล็อกอิน (Password จาก .env)
- กรอกรหัสเดียวกับ `ADMIN_PASSWORD` (หรือ `pawn1234` ถ้ายังไม่ได้ตั้ง .env)
- สำเร็จ → ตั้ง cookie `pawn_session` (JWT HS256, อายุ 30 วัน, httpOnly)
- `src/proxy.ts` ตรวจ cookie ทุก request → ยังไม่ล็อกอิน redirect ไป `/login`
- Server Actions ทุกตัวเรียก `requireAuth()` ซ้ำอีกชั้น (proxy ≠ ระบบรักษาความปลอดภัยหลัก)

### 2) รับจำนำ (`/pawn/new`)
- โหมด “ลูกค้าเดิม”: เลือกลูกค้าจาก dropdown (ค้นหาได้)
- โหมด “สร้างลูกค้าใหม่”: กรอกเลขบัตร 13 หลัก + ชื่อ (ถ้าเลขซ้ำจะใช้ลูกค้าเดิมอัตโนมัติ)
- **อายุสัญญาแบบ fix = ทุกๆ 10 วัน** (Due Date = วันเริ่ม + 10 วัน ไม่สามารถแก้ไขได้)
- **แนบรูปสิ่งของจากเครื่อง** ได้ (JPG/PNG/WEBP/GIF ไม่เกิน 5MB) — รูปจะโชว์ในรายการสัญญา
  และการ์ดของหลุดจำนำในหน้าร้าน
- โชว์ดอกเบี้ยงวดแรกให้เห็นก่อนบันทึก
- บันทึกเสร็จได้เลขสัญญา เช่น `PC-20260904-001`
- **เงินต้นที่จ่ายออกจะถูกบันทึกเป็นรายจ่ายอัตโนมัติ** (ตาราง `Expense`)
  → ไปหักออกใน “รายงานรายรับ” เป็นรายจ่ายเงินต้นรับจำนำ

### 3) ต่อดอกเบี้ย / ไถ่ถอน / ตัดหลุด (`/pawns`)
- **ต่อดอกเบี้ย:** ทุกๆ **1 รอบ = 10 วัน (fix)** — ขยาย Due Date ไปอีก 10 วัน คิดดอกเบี้ยต่องวด
  = `เงินต้น × (อัตรา% ต่อ 10 วัน) ÷ 100` และ**บันทึกเงินที่รับชำระลงตาราง `PawnRenewal`**
  (พร้อมวิธีชำระ: เงินสด/QR/บัตร/โอน) ทุกครั้งที่กดต่อ
- **ไถ่ถอน (Redeem):** กดปุ่ม “ไถ่ถอน” บนสัญญา → ระบบคำนวณยอดให้อัตโนมัติ
  (เงินต้น + ดอกเบี้ยค้างตามรอบที่เกิน 10 วัน ถ้าเกินกำหนด) → รับชำระพร้อมวิธี/เงินสด-เงินทอน
  และบันทึกหลักฐานลงตาราง `PawnRedemption` แล้วเปลี่ยนสถานะเป็น `REDEEMED`
- **ตัดหลุด (Forfeit):** เปลี่ยนสถานะเป็น `FORFEITED` + ตั้งราคาขาย (default = เงินต้น)
  → ของไปขึ้นในหน้าขาย (POS) ทันที

### 4) ขายหน้าร้าน POS (`/pos`)
- ช่องค้นหา + แถบหมวดหมู่: สินค้าทั่วไป vs **“🔒 ของหลุดจำนำ”** (แยกกัน)
- คลิกการ์ดรูปภาพเพิ่มเข้าตะกร้า → สินค้าทั่วไปปรับจำนวนได้ ส่วนของหลุดจำนำ **ล็อก 1 ชิ้น**
- ชำระเงิน: เลือกวิธี (เงินสด/PromptPay/บัตร/โอน) → เงินสดคำนวณเงินทอนอัตโนมัติ
- `checkout` ทำงานใน **Transaction เดียว**: หัก `quantity` ของสินค้า / เปลี่ยนของหลุดจำนำ
  เป็น `SOLD` + สร้าง `SaleOrder` + `SaleItem` + เลขใบเสร็จ `R-YYYYMMDD-xxx`
  (ถ้าสต็อกไม่พอ/ขายซ้ำ ระบบจะไม่สร้างใบเสร็จให้)

### 5) รายงานรายรับ (`/reports`)
- รวมเงินเข้า-ออกทุกช่องทางในหน้าจอเดียว: **รายรับ** (ขายหน้าร้าน POS + ไถ่ถอน + ต่อดอกเบี้ย)
  และ **รายจ่าย** (เงินต้นที่จ่ายออกตอนรับจำนำ) — พร้อมสรุป **เงินคงเหลือสุทธิ**
- ตัวกรองช่วงวันที่ (วันนี้ / 7 วันล่าสุด / เดือนนี้ / ทั้งหมด / กำหนดเอง) — สรุปเป็นจำนวนครั้ง
  และแยกรายละเอียด: POS แยกสินค้าทั่วไป vs ของหลุดจำนำ, ไถ่ถอนแยกเงินต้นคืน vs ดอกเบี้ย
- ข้อมูลมาจากตาราง `SaleOrder` (ยอดขาย), `PawnRedemption` (ไถ่ถอน),
  `PawnRenewal` (ต่อดอกเบี้ย) และ `Expense` (รายจ่ายเงินต้นรับจำนำ)
- หมายเหตุ: เงินต้นที่คืนตอนไถ่ถอนคือ **เงินคืนทุน** และเงินต้นที่จ่ายตอนรับจำนำคือ **รายจ่าย**
  — ตัวเลข “คงเหลือ (สุทธิ)” จึงเป็นเงินจริงที่เหลือในร้าน

### 6) สต็อกสินค้า (`/products`)
- เพิ่มสินค้าใหม่ **แนบรูปจากเครื่อง** (คลิกกล่องรูป → เลือกไฟล์ JPG/PNG/WEBP/GIF ไม่เกิน 5MB) —
  ระบบบันทึกรูปไปที่ `public/products/` ให้อัตโนมัติ
- ปรับ +/- จำนวน แก้ไขราคา กำหนดสต็อกขั้นต่ำ (แจ้งเตือนบนแดชบอร์ดเมื่อเหลือน้อย)
- **ลบสินค้า**: ยังไม่เคยขาย → ลบออกจริงพร้อมไฟล์รูป / เคยมีประวัติขาย → ซ่อนออกจากสต็อก (archived)
  เพื่อเก็บประวัติใบเสร็จไว้ครบถ้วน

---

## ค่าตั้งใน `.env`

| ตัวแปร | ความหมาย |
| --- | --- |
| `DATABASE_URL` | ตำแหน่ง SQLite เช่น `file:./dev.db` (อยู่ในโฟลเดอร์ prisma/) |
| `ADMIN_PASSWORD` | รหัสผ่านเข้าใช้ระบบ (ตรวจตรงๆ ไม่มี user ใน DB) |
| `AUTH_SECRET` | คีย์เซ็น cookie session — สร้างด้วย `openssl rand -base64 32` |

## สคริปต์ที่มีให้

```bash
npm run dev          # dev server
npm run build        # build production
npm run typecheck    # tsc --noEmit
npm run db:push      # สร้าง/อัปเดตตารางจาก schema (ใช้ตอนแก้ schema)
npm run db:seed      # ใส่ข้อมูลตัวอย่าง
npm run db:studio    # เปิด Prisma Studio ดู/แก้ข้อมูลใน DB
```

## เปิดใช้นอกบ้าน (Hybrid Cloud ด้วย Cloudflare Tunnel)

เหมาะกับรันในเครื่อง/เซิร์ฟเวอร์ที่ร้าน แล้วเข้าถึงจากที่อื่นผ่าน URL สาธารณะ —
ข้อมูลยังอยู่ที่เครื่อง (SQLite ไม่ได้ขึ้น Cloud) Cloudflare แค่ส่ง traffic เข้ามา

**ทดสอบเร็ว (ไม่ต้องมีโดเมน/bัญชี):**
```bash
# เปิดแอปก่อน (production หรือ dev ก็ได้)
npm run dev
# เปิดอีก terminal แล้วรัน:
cloudflared tunnel --url http://localhost:3000
# ได้ URL ลักษณะ https://xxx-xxx.trycloudflare.com (ใช้ทดสอบได้ เปลี่ยนทุกครั้งที่เปิด)
```

**แบบถาวร (ต้องมีโดเมนบน Cloudflare แล้ว — ฟรี tier ได้):**
1. ติดตั้ง `cloudflared` (Windows: `winget install cloudflare.cloudflared`)
2. build + รันแอปแบบ production: `npm run build && npm run start`
3. เข้า Cloudflare Dashboard → **Networking > Tunnels** → **Create a tunnel**
   → ตั้งชื่อ (เช่น `pawn-shop`) → เลือก **Windows** → คัดลอกคำสั่ง Install & Run
   → เปิด **Command Prompt (Administrator)** รันคำสั่งที่ได้ (มี token พร้อม)
4. เพิ่ม **Public hostname**: เช่น `pos` + โดเมนของคุณ, Service = `http://localhost:3000`
   (ระบบสร้าง DNS ให้อัตโนมัติ) แล้วเปิด URL นั้นทดสอบ
5. ให้ลิงก์เปิดอัตโนมัติตอนเปิดเครื่อง: `cloudflared service install <TOKEN>` (ในหน้า Dashboard มีคำสั่งให้)

**สิ่งที่ต้องทำบนเครื่องแอป:**
- ตั้งค่าใน `.env` ก่อนรัน production: `AUTH_SECRET` (`openssl rand -base64 32`),
  `ADMIN_PASSWORD` รหัสจริง และ `DATABASE_URL` เป็น absolute path เช่น
  `file:D:/shop/pawnshop/prisma/dev.db` (production จะ error ถ้าไม่ตั้ง)
- ต้องรันแอปให้อยู่ตลอดด้วย เช่น `pm2 start npm --name pawn-shop -- run start`
  (หรือ Windows Task Scheduler / สคริปต์ตอน boot) — tunnel อย่างเดียวไม่พอ เพราะมันส่งไป localhost:3000
- ระบบมีหน้า Login + proxy กันทุก route อยู่แล้ว แต่ถ้าต้องการชั้นป้องกันเพิ่ม
  เปิด Cloudflare **Access** (Zero Trust) บังหน้าไว้ได้
- เครื่องต้องส่งออกอินเทอร์เน็ตถึง Cloudflare ได้ (port **7844**)
- Backup `prisma/dev.db` เป็นประจำ (SQLite ไฟล์เดียวคัดลอกไปเก็บได้เลย)

---

## หมายเหตุ / การตัดสินใจ

- ใช้ **SQLite + Prisma 6** รองรับไฟล์เดียว backup ง่าย — พร้อมอัปเกรดเป็น PostgreSQL/Cockroach ได้โดยแก้ `datasource`
- ตัวเลขเงินทั้งหมดเก็บเป็น **จำนวนเต็มบาท (Int)** หลีกเลี่ยงปัญหา float
- สถานะของของหลุดจำนำเมื่อขายไปแล้วจะเปลี่ยนเป็น `SOLD` (ประวัติอ้างอิงได้จาก `SaleItem.pawnContractId`)
- ออกแบบมาให้ใช้คนเดียวในร้าน — ถ้าจะเปิดหลายเครื่อง/หลายสาขา ควรเพิ่มระบบ user, ปรับ Proxy matcher
  และเปลี่ยนฐานข้อมูลเป็น PostgreSQL ก่อน
- การแนบรูปเขียนไฟล์ลง `public/products/` และ `public/pawn-items/` โดยตรง จึงเหมาะกับรันในเครื่อง/server
  ที่เขียนไฟล์ได้ (ถ้า deploy แบบ serverless ควรเปลี่ยนไปเก็บรูปที่ object storage แทน)
