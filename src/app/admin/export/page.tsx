// src/app/admin/download/page.tsx
"use client"

import { useAuth } from "@/context/AuthContext"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type PaymentStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED"
type DocumentStatus = "EMPTY" | "UPLOADED" | "APPROVED" | "REJECTED"

type DocFile = {
  status: DocumentStatus
  fileName?: string
  mimeType?: string
  uploadedAt?: string
}

type AthleteDocuments = {
  athleteId: string
  dapodik: DocFile
  ktp: DocFile
  kartu: DocFile
  raport: DocFile
  foto: DocFile
}

type Athlete = {
  id: string
  sportId: string
  categoryId: string
  name: string
  gender?: "PUTRA" | "PUTRI"
  birthDate?: string
  institution?: string
}

type Official = {
  id: string
  sportId: string
  name: string
  phone?: string
}

type SportEntry = {
  id: string
  name: string
  // beberapa versi state lama pakai athleteQuota; versi baru pakai categories[].quota
  athleteQuota?: number
  officialCount?: number
  categories?: Array<{ id: string; name: string; quota: number }>
}

type Registration = {
  sports: SportEntry[]
  athletes: Athlete[]
  officials: Official[]
  documents: AthleteDocuments[]
  payment: {
    status: PaymentStatus
    proofFileName?: string
    proofMimeType?: string
    uploadedAt?: string
    totalFee?: number
    note?: string
  }
  updatedAt?: string
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function fmtDate(iso?: string) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

function sportNameById(sportId: string) {
  return SPORTS_CATALOG.find((s) => s.id === sportId)?.name ?? sportId
}

function categoryNameById(sportId: string, categoryId: string) {
  const s = SPORTS_CATALOG.find((x) => x.id === sportId)
  const c = s?.categories?.find((k) => k.id === categoryId)
  return c?.name ?? categoryId
}

function getDocStatusForAthlete(reg: Registration, athleteId: string) {
  const d = reg.documents?.find((x) => x.athleteId === athleteId)
  if (!d) {
    return {
      dapodik: "EMPTY" as DocumentStatus,
      ktp: "EMPTY" as DocumentStatus,
      kartu: "EMPTY" as DocumentStatus,
      raport: "EMPTY" as DocumentStatus,
      foto: "EMPTY" as DocumentStatus,
      allStatus: "EMPTY" as DocumentStatus,
      completeUploaded: false,
      completeApproved: false,
    }
  }

  const keys: Array<keyof Omit<AthleteDocuments, "athleteId">> = [
    "dapodik",
    "ktp",
    "kartu",
    "raport",
    "foto",
  ]
  const statuses = keys.map((k) => d[k]?.status ?? ("EMPTY" as DocumentStatus))

  const completeUploaded = statuses.every((st) => st !== "EMPTY")
  const completeApproved = statuses.every((st) => st === "APPROVED")


  let allStatus: DocumentStatus = "EMPTY"
  if (statuses.some((st) => st === "REJECTED")) allStatus = "REJECTED"
  else if (statuses.some((st) => st === "UPLOADED")) allStatus = "UPLOADED"
  else if (statuses.every((st) => st === "APPROVED")) allStatus = "APPROVED"
  else allStatus = "EMPTY"

  return {
    dapodik: d.dapodik?.status ?? "EMPTY",
    ktp: d.ktp?.status ?? "EMPTY",
    kartu: d.kartu?.status ?? "EMPTY",
    raport: d.raport?.status ?? "EMPTY",
    foto: d.foto?.status ?? "EMPTY",
    allStatus,
    completeUploaded,
    completeApproved,
  }
}

type Row = {
  kontingen: string
  email: string
  phone: string
  paymentStatus: PaymentStatus
  paymentProof: string
  paymentUploadedAt: string
  athleteName: string
  athleteInstitution: string
  athletePhone: string // ambil dari akun (PIC) kalau atlet tidak punya
  sportId: string
  sportName: string
  categoryId: string
  categoryName: string
  docAllStatus: DocumentStatus
  officialNames: string
}

export default function AdminDownloadPage() {
  const { user: adminUser, getAllUsers, canAccessSport } = useAuth()

  const [sportFilter, setSportFilter] = useState<string>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "ALL">("ALL")
  const [docFilter, setDocFilter] = useState<DocumentStatus | "ALL">("ALL")

  const [groupSheetsPerSport, setGroupSheetsPerSport] = useState<boolean>(true)

  // Ambil semua peserta + reg
  const pesertaWithReg = useMemo(() => {
    const all = getAllUsers().filter((u) => u.role === "PESERTA")

    const mapped = all
      .map((u) => {
        const key = `mg26_registration_${u.id}`
        const reg = safeParse<Registration | null>(localStorage.getItem(key), null)
        return { u, reg }
      })
      .filter((x) => !!x.reg) as Array<{ u: any; reg: Registration }>

    // scope ADMIN_CABOR
    if (adminUser?.role === "ADMIN_CABOR") {
      return mapped.filter(({ reg }) => {
        const sportIds = (reg.sports ?? []).map((s) => s.id)
        return sportIds.some((sid) => canAccessSport(sid))
      })
    }

    // ADMIN / SUPER_ADMIN
    if (adminUser?.role === "ADMIN" || adminUser?.role === "SUPER_ADMIN") return mapped

    return []
  }, [getAllUsers, adminUser, canAccessSport])

  // Build opsi cabor yang muncul dari data (lebih akurat)
  const availableSports = useMemo(() => {
    if (adminUser?.role === "ADMIN_CABOR") {
      return SPORTS_CATALOG
        .filter((sport) => canAccessSport(sport.id))
        .map((sport) => ({ id: sport.id, name: sport.name }))
    }

    return SPORTS_CATALOG.map((sport) => ({ id: sport.id, name: sport.name }))
  }, [adminUser, canAccessSport])

  // Build opsi kategori berdasar sportFilter
  const availableCategories = useMemo(() => {
    if (sportFilter === "ALL") return []
    const s = SPORTS_CATALOG.find((x) => x.id === sportFilter)
    return (s?.categories ?? []).map((c) => ({ id: c.id, name: c.name }))
  }, [sportFilter])

  // Auto reset category jika sport ganti
  useEffect(() => {
    setCategoryFilter("ALL")
  }, [sportFilter])

  // Flatten rows (atlet rows)
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []

    for (const { u, reg } of pesertaWithReg) {
      const paymentStatus = reg.payment?.status ?? "NONE"
      const paymentProof = reg.payment?.proofFileName ?? "-"
      const paymentUploadedAt = fmtDate(reg.payment?.uploadedAt)

      const officialsSafe: Official[] = Array.isArray(reg.officials) ? reg.officials : []

      // group official names by sportId (biar rapi)
      const officialNamesBySport = new Map<string, string>()
      for (const s of reg.sports ?? []) {
        const list = officialsSafe
          .filter((o: Official) => o.sportId === s.id)
          .map((o: Official) => (o.phone ? `${o.name} (${o.phone})` : o.name))
        officialNamesBySport.set(s.id, list.join("; "))
      }

      // kalau belum ada atlet, tetap bisa diexport 1 row kosong? (opsional)
      const athletes = Array.isArray(reg.athletes) ? reg.athletes : []
      for (const a of athletes) {
        const docInfo = getDocStatusForAthlete(reg, a.id)

        out.push({
          kontingen: u.institutionName ?? "-",
          email: u.email ?? "-",
          phone: u.phone ?? "-",
          paymentStatus,
          paymentProof,
          paymentUploadedAt,
          athleteName: a.name ?? "-",
          athleteInstitution: a.institution ?? (u.institutionName ?? "-"),
          athletePhone: u.phone ?? "-",
          sportId: a.sportId,
          sportName: sportNameById(a.sportId),
          categoryId: a.categoryId,
          categoryName: categoryNameById(a.sportId, a.categoryId),
          docAllStatus: docInfo.allStatus,
          officialNames: officialNamesBySport.get(a.sportId) ?? "-",
        })
      }
    }

    return out
  }, [pesertaWithReg])

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => (sportFilter === "ALL" ? true : r.sportId === sportFilter))
      .filter((r) => (categoryFilter === "ALL" ? true : r.categoryId === categoryFilter))
      .filter((r) => (paymentFilter === "ALL" ? true : r.paymentStatus === paymentFilter))
      .filter((r) => (docFilter === "ALL" ? true : r.docAllStatus === docFilter))
  }, [rows, sportFilter, categoryFilter, paymentFilter, docFilter])

  // Ringkasan header
  const summary = useMemo(() => {
    const totalAthletes = filteredRows.length
    const byPayment = new Map<PaymentStatus, number>([
      ["NONE", 0],
      ["PENDING", 0],
      ["APPROVED", 0],
      ["REJECTED", 0],
    ])
    const byDocs = new Map<DocumentStatus, number>([
      ["EMPTY", 0],
      ["UPLOADED", 0],
      ["APPROVED", 0],
      ["REJECTED", 0],
    ])

    for (const r of filteredRows) {
      byPayment.set(r.paymentStatus, (byPayment.get(r.paymentStatus) ?? 0) + 1)
      byDocs.set(r.docAllStatus, (byDocs.get(r.docAllStatus) ?? 0) + 1)
    }

    return { totalAthletes, byPayment, byDocs }
  }, [filteredRows])

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    const baseColumns = [
      "No",
      "Nama",
      "Cabor",
      "Kategori",
      "Asal Sekolah/Instansi",
      "No HP (PIC)",
      "Official",
      "Kontingen",
      "Email",
      "Status Pembayaran",
      "Bukti Pembayaran",
      "Waktu Upload Bukti",
      "Status Dokumen (Ringkas)",
    ]

    const toSheetData = (data: Row[]) => {
      return data.map((r, idx) => [
        idx + 1,
        r.athleteName,
        r.sportName,
        r.categoryName,
        r.athleteInstitution,
        r.athletePhone,
        r.officialNames,
        r.kontingen,
        r.email,
        r.paymentStatus,
        r.paymentProof,
        r.paymentUploadedAt,
        r.docAllStatus,
      ])
    }

    // Sheet ALL
    const wsAll = XLSX.utils.aoa_to_sheet([baseColumns, ...toSheetData(filteredRows)])
    wsAll["!cols"] = [
      { wch: 5 },
      { wch: 26 },
      { wch: 20 },
      { wch: 38 },
      { wch: 26 },
      { wch: 16 },
      { wch: 34 },
      { wch: 26 },
      { wch: 24 },
      { wch: 16 },
      { wch: 26 },
      { wch: 22 },
      { wch: 20 },
    ]
    XLSX.utils.book_append_sheet(wb, wsAll, "ALL")

    // Sheet per sport (opsional)
    if (groupSheetsPerSport) {
      const group = new Map<string, Row[]>()
      for (const r of filteredRows) {
        group.set(r.sportId, [...(group.get(r.sportId) ?? []), r])
      }
      for (const [sportId, list] of group.entries()) {
        const name = sportNameById(sportId)
        const safeName = name.slice(0, 31) // Excel sheet name max 31
        const ws = XLSX.utils.aoa_to_sheet([baseColumns, ...toSheetData(list)])
        ws["!cols"] = wsAll["!cols"]
        XLSX.utils.book_append_sheet(wb, ws, safeName)
      }
    }

    const fileName = `MG26_Data_Peserta_${new Date().toISOString().slice(0, 10)}.xlsx`
    const out = XLSX.write(wb, { type: "array", bookType: "xlsx" })
    downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName)
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })

    const title = "Muhammadiyah Games 2026 — Download Data Peserta"
    const filters = [
      `Cabor: ${sportFilter === "ALL" ? "Semua" : sportNameById(sportFilter)}`,
      `Kategori: ${
        categoryFilter === "ALL" ? "Semua" : categoryNameById(sportFilter === "ALL" ? "" : sportFilter, categoryFilter)
      }`,
      `Pembayaran: ${paymentFilter === "ALL" ? "Semua" : paymentFilter}`,
      `Dokumen: ${docFilter === "ALL" ? "Semua" : docFilter}`,
      `Waktu: ${new Date().toLocaleString("id-ID")}`,
    ].join(" | ")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text(title, 40, 40)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(filters, 40, 60)

    const head = [[
      "No",
      "Nama",
      "Cabor",
      "Kategori",
      "Asal Instansi",
      "No HP (PIC)",
      "Official",
      "Kontingen",
      "Email",
      "Pay",
      "Dok",
    ]]

    const body = filteredRows.map((r, idx) => ([
      String(idx + 1),
      r.athleteName,
      r.sportName,
      r.categoryName,
      r.athleteInstitution,
      r.athletePhone,
      r.officialNames,
      r.kontingen,
      r.email,
      r.paymentStatus,
      r.docAllStatus,
    ]))

    autoTable(doc, {
      startY: 80,
      head,
      body,
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [22, 163, 74] }, // hijau (tailwind green-600-ish)
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 110 },
        2: { cellWidth: 80 },
        3: { cellWidth: 160 },
        4: { cellWidth: 110 },
        5: { cellWidth: 72 },
        6: { cellWidth: 140 },
        7: { cellWidth: 110 },
        8: { cellWidth: 120 },
        9: { cellWidth: 50 },
        10: { cellWidth: 50 },
      },
      margin: { left: 40, right: 40 },
    })

    const fileName = `MG26_Data_Peserta_${new Date().toISOString().slice(0, 10)}.pdf`
    const blob = doc.output("blob")
    downloadBlob(blob, fileName)
  }

  const badge = (text: string, variant: "gray" | "green" | "yellow" | "red") => {
    const cls =
      variant === "green"
        ? "bg-green-50 border-green-200 text-green-800"
        : variant === "yellow"
        ? "bg-yellow-50 border-yellow-200 text-yellow-800"
        : variant === "red"
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-gray-50 border-gray-200 text-gray-700"
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>
        {text}
      </span>
    )
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-gray-500">ADMIN</div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Download Data Peserta
            </h1>
            {adminUser?.role === "ADMIN_CABOR" && (
              <div className="mt-3 text-xs text-gray-500">
                Mode Admin Cabor: data yang tampil hanya kontingen/atlet dari cabor yang kamu pegang.
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 min-w-[320px]">
            <div className="text-xs text-gray-500">Ringkasan Filter</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {badge(`Total Atlet: ${summary.totalAthletes}`, "gray")}
              {badge(`Pay APPROVED: ${summary.byPayment.get("APPROVED") ?? 0}`, "green")}
              {badge(`Pay PENDING: ${summary.byPayment.get("PENDING") ?? 0}`, "yellow")}
              {badge(`Dok APPROVED: ${summary.byDocs.get("APPROVED") ?? 0}`, "green")}
              {badge(`Dok REJECTED: ${summary.byDocs.get("REJECTED") ?? 0}`, "red")}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="text-lg font-extrabold text-gray-900">Filter</div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Cabor</label>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 bg-white"
            >
              <option value="ALL">Semua Cabor</option>
              {availableSports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-2">Sumber: cabor yang benar-benar dipilih peserta.</div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Kategori</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 bg-white"
              disabled={sportFilter === "ALL"}
            >
              <option value="ALL">{sportFilter === "ALL" ? "Pilih cabor dulu" : "Semua Kategori"}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-2">Kategori aktif setelah pilih cabor.</div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Status Pembayaran</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full border rounded-xl px-3 py-2 bg-white"
            >
              <option value="ALL">Semua</option>
              <option value="NONE">NONE</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <div className="text-xs text-gray-500 mt-2">Untuk rekap admin (bisa download yang sudah valid).</div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Status Dokumen (Ringkas)</label>
            <select
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value as any)}
              className="w-full border rounded-xl px-3 py-2 bg-white"
            >
              <option value="ALL">Semua</option>
              <option value="EMPTY">EMPTY</option>
              <option value="UPLOADED">UPLOADED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <div className="text-xs text-gray-500 mt-2">
              Ringkas: jika ada 1 rejected → REJECTED; ada uploaded → UPLOADED; semua approved → APPROVED.
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={groupSheetsPerSport}
              onChange={(e) => setGroupSheetsPerSport(e.target.checked)}
            />
            Excel buat sheet per cabor
          </label>

          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              className="px-5 py-2 rounded-xl bg-green-600 text-white font-extrabold hover:bg-green-700"
              disabled={filteredRows.length === 0}
            >
              Download Excel
            </button>
            <button
              onClick={exportPDF}
              className="px-5 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50"
              disabled={filteredRows.length === 0}
            >
              Download PDF
            </button>
          </div>
        </div>

        {filteredRows.length === 0 && (
          <div className="rounded-xl border bg-yellow-50 border-yellow-200 text-yellow-800 p-4 text-sm">
            Tidak ada data sesuai filter saat ini.
          </div>
        )}
      </div>

      {/* Preview Table */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Preview Data</div>
            <div className="text-xs text-gray-500">
              Preview hanya menampilkan sebagian kolom. File export berisi kolom admin lebih lengkap.
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Menampilkan: <b>{Math.min(filteredRows.length, 50)}</b> dari <b>{filteredRows.length}</b> baris
          </div>
        </div>

        <div className="overflow-auto border rounded-xl">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Nama</th>
                <th className="text-left p-3">Cabor</th>
                <th className="text-left p-3">Kategori</th>
                <th className="text-left p-3">Asal Instansi</th>
                <th className="text-left p-3">No HP (PIC)</th>
                <th className="text-left p-3">Official</th>
                <th className="text-left p-3">Pay</th>
                <th className="text-left p-3">Dok</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.slice(0, 50).map((r, idx) => (
                <tr key={`${r.athleteName}_${idx}`} className="border-b">
                  <td className="p-3 font-semibold text-gray-900">{r.athleteName}</td>
                  <td className="p-3">{r.sportName}</td>
                  <td className="p-3">{r.categoryName}</td>
                  <td className="p-3">{r.athleteInstitution}</td>
                  <td className="p-3">{r.athletePhone}</td>
                  <td className="p-3">{r.officialNames || "-"}</td>
                  <td className="p-3">{r.paymentStatus}</td>
                  <td className="p-3">{r.docAllStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
