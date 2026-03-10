"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { eventConfig } from "@/lib/eventConfig"
import { buildMedalTable, getWinnerResults, type WinnerResult } from "@/lib/winnerResults"

export default function PeringkatPage() {
  const [results, setResults] = useState<WinnerResult[]>([])

  useEffect(() => {
    setResults(getWinnerResults())
  }, [])

  const sorted = useMemo(() => {
    return buildMedalTable(results)
      .map((row) => ({ ...row, total: row.gold + row.silver + row.bronze }))
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        if (b.bronze !== a.bronze) return b.bronze - a.bronze
        return b.total - a.total
      })
  }, [results])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/40 to-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-[0_20px_40px_rgba(15,139,76,0.12)] md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                Leaderboard
              </div>
              <h1 className="mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">Peringkat Perolehan Medali</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Peringkat dihitung otomatis dari hasil pemenang yang diinput admin setiap hari lomba.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/" className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-emerald-50">
                  Kembali ke Landing
                </Link>
                <Link href="/statistik" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Lihat Statistik
                </Link>
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

        <section className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
          {sorted.length === 0 ? (
            <div className="text-sm text-gray-600">Belum ada hasil lomba. Admin akan mengunggah pemenang harian.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-emerald-100">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Kontingen</th>
                    <th>Emas</th>
                    <th>Perak</th>
                    <th>Perunggu</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="font-bold">{idx + 1}</td>
                      <td>
                        <div className="font-semibold text-gray-900">{row.name}</div>
                        <div className="text-xs text-gray-500">{row.id}</div>
                      </td>
                      <td className="font-semibold">{row.gold}</td>
                      <td className="font-semibold">{row.silver}</td>
                      <td className="font-semibold">{row.bronze}</td>
                      <td className="font-bold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500">Urutan ranking: Emas - Perak - Perunggu - Total.</div>
        </section>
      </div>
    </div>
  )
}
