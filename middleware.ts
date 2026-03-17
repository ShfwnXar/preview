import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const AUTH_COOKIE_KEY = "mg26_auth"
const AUTH_ROLE_COOKIE_KEY = "mg26_role"

function isPublicAuthRoute(pathname: string) {
  return pathname === "/login" || pathname === "/daftar" || pathname === "/verifikasi-email"
}

function isDashboardRoute(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
}

function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/")
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.get(AUTH_COOKIE_KEY)?.value === "1"
  const role = request.cookies.get(AUTH_ROLE_COOKIE_KEY)?.value ?? ""

  if (isPublicAuthRoute(pathname) && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = role === "PESERTA" ? "/dashboard" : "/admin"
    return NextResponse.redirect(url)
  }

  if (isDashboardRoute(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isAdminRoute(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isDashboardRoute(pathname) && isAuthenticated && role && role !== "PESERTA") {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    return NextResponse.redirect(url)
  }

  if (isAdminRoute(pathname) && isAuthenticated && role === "PESERTA") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/daftar", "/verifikasi-email"],
}
