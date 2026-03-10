"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { readRegistrationSettings, writeRegistrationSettings } from "@/lib/registrationSettings"
export default function PengaturanPendaftaranPage() {
  const { user } = useAuth()
  const [open, setOpen] = useState(() => readRegistrationSettings().registrationOpen)
  if (!user || user.role !== "SUPER_ADMIN") return null
  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Buka / Tutup Pendaftaran</h1>
        <p className="mt-2 text-gray-600">Kontrol global untuk membuka atau menutup pendaftaran kontingen.</p>
      </div>
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="text-sm text-gray-600">Status saat ini</div>
        <div className={`inline-flex rounded-full px-4 py-2 text-sm font-extrabold ${open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {open ? "Pendaftaran Dibuka" : "Pendaftaran Ditutup"}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              writeRegistrationSettings({ registrationOpen: true, updatedAt: new Date().toISOString(), updatedBy: user.email })
              setOpen(true)
            }}
            className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700"
          >
            Buka Pendaftaran
          </button>
          <button
            onClick={() => {
              writeRegistrationSettings({ registrationOpen: false, updatedAt: new Date().toISOString(), updatedBy: user.email })
              setOpen(false)
            }}
            className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
          >
            Tutup Pendaftaran
          </button>
        </div>
      </div>
    </div>
  )
}
