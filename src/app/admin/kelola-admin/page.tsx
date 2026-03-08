"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { useRouter } from "next/navigation"

type AdminFormRole = "ADMIN" | "ADMIN_CABOR"

type NewAdminForm = {
  institutionName: string
  picName: string
  email: string
  phone: string
  password: string
  role: AdminFormRole
  assignedSportId: string
}

type ManagedAdmin = {
  id: string
  role: string
  picName: string
  email: string
  assignedSportIds?: string[]
  cabang?: string
}

const ADMIN_ROLES: { value: AdminFormRole; label: string }[] = [
  { value: "ADMIN", label: "Admin Umum" },
  { value: "ADMIN_CABOR", label: "Admin Cabor" },
]

export default function KelolaAdminPage() {
  const { user, getAllUsers, seedDefaultAdminsIfEmpty } = useAuth()
  const router = useRouter()

  const [admins, setAdmins] = useState<ManagedAdmin[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [msgType, setMsgType] = useState<"success" | "error">("success")

  const [form, setForm] = useState<NewAdminForm>({
    institutionName: "Panitia Muhammadiyah Games",
    picName: "",
    email: "",
    phone: "",
    password: "",
    role: "ADMIN",
    assignedSportId: "",
  })

  const sportNameById = useMemo(() => {
    return SPORTS_CATALOG.reduce<Record<string, string>>((acc, sport) => {
      acc[sport.id] = sport.name
      return acc
    }, {})
  }, [])

  useEffect(() => {
    if (!user) return
    if (user.role !== "SUPER_ADMIN") {
      router.replace("/admin")
    }
  }, [user, router])

  useEffect(() => {
    seedDefaultAdminsIfEmpty()
    const users = getAllUsers()
    const onlyAdmins = users.filter((u) => ["ADMIN", "ADMIN_CABOR", "SUPER_ADMIN"].includes(u.role))
    setAdmins(onlyAdmins as ManagedAdmin[])
  }, [getAllUsers, seedDefaultAdminsIfEmpty])

  const getAdminSports = (admin: ManagedAdmin) => {
    if (Array.isArray(admin.assignedSportIds) && admin.assignedSportIds.length > 0) {
      return admin.assignedSportIds
    }
    if (admin.cabang) return [admin.cabang]
    return []
  }

  const handleCreate = () => {
    setMsg(null)

    if (user?.role !== "SUPER_ADMIN") {
      setMsgType("error")
      setMsg("Akses ditolak. Hanya super admin yang dapat membuat admin.")
      return
    }

    if (!form.picName || !form.email || !form.phone || !form.password) {
      setMsgType("error")
      setMsg("Semua field wajib diisi.")
      return
    }

    if (form.role === "ADMIN_CABOR" && !form.assignedSportId) {
      setMsgType("error")
      setMsg("Pilih cabor untuk admin cabor.")
      return
    }

    const users = getAllUsers()

    if (users.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
      setMsgType("error")
      setMsg("Email sudah digunakan.")
      return
    }

    const newAdmin = {
      id: "u_" + Date.now(),
      role: form.role,
      institutionName: form.institutionName,
      institutionType: "PIMPINAN_CABANG",
      address: "-",
      picName: form.picName,
      email: form.email.toLowerCase(),
      phone: form.phone,
      password: form.password,
      createdAt: new Date().toISOString(),
      assignedSportIds: form.role === "ADMIN_CABOR" ? [form.assignedSportId] : undefined,
    }

    const updated = [newAdmin, ...users]
    localStorage.setItem("mg26_users", JSON.stringify(updated))

    setAdmins(updated.filter((u) => ["ADMIN", "ADMIN_CABOR", "SUPER_ADMIN"].includes(u.role)) as ManagedAdmin[])

    setMsgType("success")
    setMsg("Admin berhasil dibuat.")
    setForm({
      institutionName: "Panitia Muhammadiyah Games",
      picName: "",
      email: "",
      phone: "",
      password: "",
      role: "ADMIN",
      assignedSportId: "",
    })
  }

  const handleDelete = (id: string) => {
    const users = getAllUsers()
    const filtered = users.filter((u) => u.id !== id)
    localStorage.setItem("mg26_users", JSON.stringify(filtered))

    setAdmins(filtered.filter((u) => ["ADMIN", "ADMIN_CABOR", "SUPER_ADMIN"].includes(u.role)) as ManagedAdmin[])
  }

  if (!user || user.role !== "SUPER_ADMIN") {
    return null
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Kelola Admin</h1>
        <p className="text-gray-600 mt-2">Hanya SUPER_ADMIN yang dapat membuat dan menghapus admin.</p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-extrabold text-gray-900">Buat Admin Baru</h2>

        {msg && (
          <div
            className={`text-sm border p-3 rounded ${
              msgType === "success" ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <input
            placeholder="Nama PIC"
            className="border rounded px-3 py-2"
            value={form.picName}
            onChange={(e) => setForm({ ...form, picName: e.target.value })}
          />
          <input
            placeholder="Email"
            className="border rounded px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="No HP"
            className="border rounded px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="border rounded px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <select
            className="border rounded px-3 py-2"
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value as AdminFormRole,
                assignedSportId: e.target.value === "ADMIN_CABOR" ? form.assignedSportId : "",
              })
            }
          >
            {ADMIN_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {form.role === "ADMIN_CABOR" && (
            <select
              className="border rounded px-3 py-2"
              value={form.assignedSportId}
              onChange={(e) => setForm({ ...form, assignedSportId: e.target.value })}
            >
              <option value="">Pilih cabor</option>
              {SPORTS_CATALOG.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <button onClick={handleCreate} className="bg-green-600 text-white px-5 py-2 rounded font-bold hover:bg-green-700">
          Buat Admin
        </button>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-gray-900 mb-4">Daftar Admin</h2>

        <div className="space-y-3">
          {admins.map((a) => {
            const sportIds = getAdminSports(a)
            return (
              <div key={a.id} className="flex items-center justify-between border rounded-lg p-4">
                <div>
                  <div className="font-bold">{a.picName}</div>
                  <div className="text-xs text-gray-600">
                    {a.email} • {a.role}
                  </div>
                  {a.role === "ADMIN_CABOR" && sportIds.length > 0 && (
                    <div className="text-xs text-gray-500">Cabor: {sportIds.map((id) => sportNameById[id] ?? id).join(", ")}</div>
                  )}
                </div>

                {a.role !== "SUPER_ADMIN" && (
                  <button onClick={() => handleDelete(a.id)} className="text-red-600 font-bold hover:underline">
                    Hapus
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

