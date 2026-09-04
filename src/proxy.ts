import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// ⚠️ ใน Next.js 16 ไฟล์นี้คือ "proxy.ts" (เดิมคือ middleware.ts)
// ใช้สำหรับ optimistic check เท่านั้น — ทุก Server Action ตรวจ requireAuth() ซ้ำอีกชั้น

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  // ยังไม่ล็อกอิน → ไปหน้า login (ยกเว้นหน้า login เอง)
  if (!session && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ล็อกอินแล้วแต่พยายามเข้า /login → กลับหน้าแรก
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // วิ่งทุก route ยกเว้น static files / api / รูปภาพ
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
