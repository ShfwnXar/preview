"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRegistration } from "@/context/RegistrationContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"

function isActive(pathname: string, href: string) {
  if (pathname === href) return true
  return pathname.startsWith(href + "/")
}

function paymentTone(status: string) {
  if (status === "APPROVED") return "success"
  if (status === "PENDING") return "warning"
  if (status === "REJECTED") return "danger"
  return "neutral"
}

function Stepper() {
  const pathname = usePathname()
  const { state, hydrateReady } = useRegistration()

  if (!hydrateReady) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Pendaftaran</CardTitle>
          <CardDescription>Memuat data pendaftaran...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const isLocked =
    state.payment.status === "PENDING" ||
    state.payment.status === "APPROVED"

  const steps = [
    {
      label: "Step 1 • Pilih Cabor",
      href: "/dashboard/pendaftaran",
      note: isLocked ? "Terkunci (pembayaran PENDING/APPROVED)" : "Buka",
      disabled: false,
    },
    {
      label: "Step 2 • Pembayaran",
      href: "/dashboard/pembayaran",
      note: "Upload bukti pembayaran",
      disabled: false,
    },
    {
      label: "Step 3 • Input Atlet + Kategori",
      href: "/dashboard/pendaftaran/atlet",
      note: "Pilih kategori per atlet sesuai kuota",
      disabled: state.payment.status !== "APPROVED",
    },
    {
      label: "Step 4 • Upload Dokumen Atlet",
      href: "/dashboard/pendaftaran/dokumen",
      note: "Upload 5 dokumen per atlet",
      disabled: state.payment.status !== "APPROVED",
    },
  ] as const

  return (
    <Card variant="soft">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-gray-500 tracking-wider">
              PENDAFTARAN
            </div>
            <CardTitle className="mt-1">Alur Pendaftaran (Step 1–4)</CardTitle>
            <CardDescription className="mt-2">
              Step 3 & 4 terbuka setelah pembayaran <b>APPROVED</b>.
            </CardDescription>

            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <Badge tone={paymentTone(state.payment.status) as any}>
                Payment: {state.payment.status}
              </Badge>
              {isLocked && <Badge tone="warning">Step 1 terkunci (edit disabled)</Badge>}
              <Badge tone="info">
                Total: Rp {state.payment.totalFee.toLocaleString("id-ID")}
              </Badge>
            </div>
          </div>

          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Kembali
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((s) => {
            const active = isActive(pathname, s.href)

            return (
              <Link
                key={s.href}
                href={s.disabled ? "#" : s.href}
                onClick={(e) => {
                  if (s.disabled) {
                    e.preventDefault()
                    alert("Step ini hanya bisa dibuka setelah pembayaran APPROVED.")
                  }
                }}
                className={[
                  "rounded-2xl border p-4 transition-all",
                  "bg-white/70 backdrop-blur",
                  active
                    ? "border-emerald-200 shadow-[0_12px_40px_rgba(16,185,129,0.12)]"
                    : "border-gray-200 hover:border-emerald-150 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]",
                  s.disabled ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-extrabold text-gray-900">
                    {s.label}
                  </div>
                  {active ? <Badge tone="brand">Aktif</Badge> : null}
                </div>

                <div className="mt-2 text-xs text-gray-600">{s.note}</div>

                {s.disabled && (
                  <div className="mt-2 text-xs text-amber-700 font-semibold">
                    Terkunci sampai pembayaran APPROVED
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Catatan: Setelah upload bukti bayar, status akan <b>PENDING</b> sampai admin memverifikasi.
        </div>
      </CardContent>
    </Card>
  )
}

export default function PendaftaranLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <Stepper />
      {children}
    </div>
  )
}