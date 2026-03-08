"use client"

import { useAuth } from "@/context/AuthContext"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type MedalRow = {
  id: string // userId kontingen
  name: string // institutionName
  gold: number
  silver: number
  bronze: number
}

const LS_MEDAL_TABLE = "mg26_medal_table"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export default function AdminPemenangPage() {
  const { getAllUsers } = useAuth()

  const pesertaUsers = useMemo(() => {
    return getAllUsers().filter((u) => u.role === "PESERTA")
  }, [getAllUsers])

  const [table, setTable] = useState<MedalRow[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [gold, setGold] = useState<number>(0)
  const [silver, setSilver] = useState<number>(0)
  const [bronze, setBronze] = useState<number>(0)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const data = safeParse<MedalRow[]>(localStorage.getItem(LS_MEDAL_TABLE), [])
    setTable(data)
  }, [])

  useEffect(() => {
    if (pesertaUsers.length > 0 && !selectedUserId) {
      setSelectedUserId(pesertaUsers[0].id)
    }
  }, [pesertaUsers, selectedUserId])

  useEffect(() => {
    if (!selectedUserId) return
    const existing = table.find((r) => r.id === selectedUserId)
    if (existing) {
      setGold(existing.gold)
      setSilver(existing.silver)
      setBronze(existing.bronze)
    } else {
      setGold(0)
      setSilver(0)
      setBronze(0)
    }
  }, [selectedUserId, table])

  const selectedUser = useMemo(() => {
    return pesertaUsers.find((u) => u.id === selectedUserId) ?? null
  }, [pesertaUsers, selectedUserId])

  const saveTable = (next: MedalRow[]) => {
    setTable(next)
    localStorage.setItem(LS_MEDAL_TABLE, JSON.stringify(next))
  }

  const handleSave = () => {
    if (!selectedUser) return

    const nextRow: MedalRow = {
      id: selectedUser.id,
      name: selectedUser.institutionName,
      gold: Math.max(0, Number(gold) || 0),
      silver: Math.max(0, Number(silver) || 0),
      bronze: Math.max(0, Number(bronze) || 0),
    }

    const exists = table.some((r) => r.id === selectedUser.id)
    const next = exists
      ? table.map((r) => (r.id === selectedUser.id ? nextRow : r))
      : [nextRow, ...table]

    saveTable(next)
    setMessage("Data medali berhasil disimpan.")
    setTimeout(() => setMessage(null), 1200)
  }

  const handleReset = () => {
    if (!confirm("Reset semua data medali?")) return
    saveTable([])
    setMessage("Tabel medali direset.")
    setTimeout(() => setMessage(null), 1200)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Pemenang & Peringkat Medali</h1>
        <p className="text-gray-600 mt-2">
          Upload pemenang lomba
        </p>

        <div className="mt-4 flex gap-3 flex-wrap">
          <Link
            href="/peringkat"
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
          >
            Buka Halaman Peringkat
          </Link>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100"
          >
            Reset Tabel Medali
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">
            {message}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold">Update Medali Kontingen</h2>

        {pesertaUsers.length === 0 ? (
          <div className="text-sm text-gray-500">Belum ada akun PESERTA.</div>
        ) : (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            {pesertaUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.institutionName} — {u.email}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">🥇 Emas</label>
            <input
              type="number"
              min={0}
              value={gold}
              onChange={(e) => setGold(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">🥈 Perak</label>
            <input
              type="number"
              min={0}
              value={silver}
              onChange={(e) => setSilver(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">🥉 Perunggu</label>
            <input
              type="number"
              min={0}
              value={bronze}
              onChange={(e) => setBronze(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
          disabled={!selectedUser}
        >
          Simpan Medali
        </button>

        <div className="text-xs text-gray-500">
          Kontingen: <b>{selectedUser?.institutionName ?? "-"}</b>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-3">Preview Tabel Medali (tersimpan)</h2>

        {table.length === 0 ? (
          <div className="text-sm text-gray-500">Belum ada data medali.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-3 pr-3">Kontingen</th>
                  <th className="py-3 pr-3">🥇</th>
                  <th className="py-3 pr-3">🥈</th>
                  <th className="py-3 pr-3">🥉</th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-3">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.id}</div>
                    </td>
                    <td className="py-3 pr-3 font-semibold">{r.gold}</td>
                    <td className="py-3 pr-3 font-semibold">{r.silver}</td>
                    <td className="py-3 pr-3 font-semibold">{r.bronze}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
