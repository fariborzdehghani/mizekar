import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth-constants";

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!session) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!signin|_next/static|_next/image|favicon.ico|images|fonts|uploads).*)",
  ],
};
