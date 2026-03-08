"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { eventConfig } from "@/lib/eventConfig"

type User = { id: string; role: string }
type Registration = { athletes: { sportId: string }[]; payment?: { status?: string } }

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export default function StatistikPage() {
  const [summary, setSummary] = useState({
    totalKontingen: 0,
    kontingenMulaiDaftar: 0,
    kontingenPaymentApproved: 0,
    totalAtlet: 0,
  })

  useEffect(() => {
    const users = safeParse<User[]>(localStorage.getItem("mg26_users"), []).filter((u) => u.role === "PESERTA")

    const regs: Registration[] = []
    for (const u of users) {
      const reg = safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${u.id}`), null)
      if (reg) regs.push(reg)
    }

    setSummary({
      totalKontingen: users.length,
      kontingenMulaiDaftar: regs.length,
      kontingenPaymentApproved: regs.filter((r) => r.payment?.status === "APPROVED").length,
      totalAtlet: regs.reduce((acc, r) => acc + r.athletes.length, 0),
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/40 to-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-[0_20px_40px_rgba(15,139,76,0.12)] md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">Insight Board</div>
              <h1 className="mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">Statistik Pendaftar</h1>
              <p className="mt-2 text-sm text-gray-600 md:text-base">Data statistik sudah ditampilkan kembali dengan tampilan baru yang lebih rapi.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/" className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-emerald-50">Kembali ke Landing</Link>
                <Link href="/peringkat" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Lihat Peringkat</Link>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Official Mascot</div>
              <div className="relative mt-2 h-36 w-full md:h-44">
                <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm"><div className="text-xs text-gray-500">Total Kontingen</div><div className="mt-2 text-3xl font-extrabold">{summary.totalKontingen}</div></div>
          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm"><div className="text-xs text-gray-500">Mulai Pendaftaran</div><div className="mt-2 text-3xl font-extrabold">{summary.kontingenMulaiDaftar}</div></div>
          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm"><div className="text-xs text-gray-500">Payment Approved</div><div className="mt-2 text-3xl font-extrabold">{summary.kontingenPaymentApproved}</div></div>
          <div className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm"><div className="text-xs text-gray-500">Total Atlet</div><div className="mt-2 text-3xl font-extrabold">{summary.totalAtlet}</div></div>
        </section>
      </div>
    </div>
  )
}
