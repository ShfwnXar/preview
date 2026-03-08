"use client"

import Link from "next/link"
import { useAuth } from "@/context/AuthContext"

export default function DashboardHomePage() {
  const { user } = useAuth()

  if (!user) return null

  const registrationSummary = {
    statusLabel: "Belum Memulai Pendaftaran",
    statusBadge: "bg-gray-200 text-gray-800",
    totalAthletes: 0,
    totalFee: 0,
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-6 shadow-[0_14px_28px_rgba(15,139,76,0.1)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              Dashboard Peserta
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">
              Selamat datang, {user.institutionName}
            </h1>
            <p className="mt-1 text-gray-600">
              Akun kontingen untuk Muhammadiyah Games 2026.
            </p>

            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <div>
                <span className="font-semibold">PIC:</span> {user.picName}
              </div>
              <div>
                <span className="font-semibold">Kontak:</span> {user.email} - {user.phone}
              </div>
              <div>
                <span className="font-semibold">Alamat:</span> {user.address}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/profile"
              className="rounded-lg border border-emerald-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-emerald-50"
            >
              Edit Profile
            </Link>

            <Link
              href="/dashboard/pendaftaran"
              className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            >
              Mulai Pendaftaran
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Status Pendaftaran</div>
          <div className="mt-2">
            <span className={`inline-block rounded px-3 py-1 ${registrationSummary.statusBadge}`}>
              {registrationSummary.statusLabel}
            </span>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Status akan berubah sesuai progres Step 1-4 dan validasi admin.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Total Atlet (rencana)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{registrationSummary.totalAthletes}</div>
          <p className="mt-2 text-xs text-gray-500">
            Diisi pada Step 1 (kuota per kategori).
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Estimasi Total Biaya</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            Rp {registrationSummary.totalFee.toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            100k/atlet, official gratis, voli 1.2jt/tim.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Aksi Cepat</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <Link
            href="/dashboard/pendaftaran"
            className="rounded-lg bg-green-600 px-4 py-2 text-center font-semibold text-white hover:bg-green-700"
          >
            Buka Step Pendaftaran
          </Link>

          <Link
            href="/dashboard/status"
            className="rounded-lg border border-emerald-200 px-4 py-2 text-center font-semibold text-gray-700 hover:bg-emerald-50"
          >
            Lihat Status
          </Link>
        </div>
      </div>
    </div>
  )
}

