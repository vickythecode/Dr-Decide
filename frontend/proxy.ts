import { NextRequest, NextResponse } from "next/server";

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const role = req.cookies.get("role")?.value;

  if (pathname.startsWith("/doctor")) {
    if (!token || role !== "Doctor") return redirectToLogin(req);
  }

  if (pathname.startsWith("/patient")) {
    if (!token || role !== "Patient") return redirectToLogin(req);
  }

  if (pathname.startsWith("/auth") && token && role) {
    const url = req.nextUrl.clone();
    url.pathname = role === "Doctor" ? "/doctor/dashboard" : "/patient/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/doctor/:path*", "/patient/:path*", "/auth/:path*"],
};
