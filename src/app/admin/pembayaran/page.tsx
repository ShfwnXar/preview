
"use client"

import { useAuth } from "@/context/AuthContext"
import { getFileBlob } from "@/lib/fileStore"
import { Repos } from "@/repositories"
import type { PaymentStatus, Registration } from "@/types/registration"
import { useEffect, useMemo, useState } from "react"

type PaymentFilter = "ALL" | "ACC" | "BELUM_ACC"

type PreviewState = {
  open: boolean
  loading: boolean
  error: string | null
  url: string
  mime: string
  fileName: string
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function paymentBadgeClass(status: string) {
  if (status === "APPROVED") return "border-green-200 bg-green-50 text-green-700"
  if (status === "PENDING") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700"
  return "border-gray-200 bg-gray-50 text-gray-700"
}
function isPdfMime(mime?: string) {
  if (!mime) return false
  return mime === "application/pdf" || mime.includes("pdf")
}

function isImageMime(mime?: string) {
  if (!mime) return false
  return mime.startsWith("image/")
}

function isPaymentApproved(status?: PaymentStatus) {
  return status === "APPROVED"
}

export default function AdminPembayaranPage() {
  const { getAllUsers, user: adminUser, canAccessSport } = useAuth()

  const [targetUserId, setTargetUserId] = useState<string>("")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL")
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [status, setStatus] = useState<PaymentStatus>("NONE")
  const [note, setNote] = useState<string>("")

  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    loading: false,
    error: null,
    url: "",
    mime: "",
    fileName: "",
  })

  const pesertaUsersAll = useMemo(() => getAllUsers().filter((u) => u.role === "PESERTA"), [getAllUsers])

  const pesertaWithReg = useMemo(() => {
    return pesertaUsersAll
      .map((u) => {
        const reg = safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${u.id}`), null)
        return { u, reg }
      })
      .filter((x) => !!x.reg)
  }, [pesertaUsersAll])

  const visibleKontingen = useMemo(() => {
    if (!adminUser) return []
    if (adminUser.role === "ADMIN" || adminUser.role === "SUPER_ADMIN") return pesertaWithReg

    if (adminUser.role === "ADMIN_CABOR") {
      return pesertaWithReg.filter(({ reg }) => {
        const sportIds = reg!.sports.map((s) => s.id)
        return sportIds.some((sid) => canAccessSport(sid))
      })
    }

    return []
  }, [adminUser, pesertaWithReg, canAccessSport])

  const paymentSummary = useMemo(() => {
    return visibleKontingen.reduce(
      (acc, { reg }) => {
        const current = reg?.payment?.status ?? "NONE"
        if (current === "APPROVED") acc.approved += 1
        else if (current === "REJECTED") acc.rejected += 1
        else if (current === "PENDING") acc.pending += 1
        else acc.none += 1
        return acc
      },
      { approved: 0, rejected: 0, pending: 0, none: 0 }
    )
  }, [visibleKontingen])
  const filteredKontingen = useMemo(() => {
    return visibleKontingen.filter(({ reg }) => {
      const currentStatus = reg?.payment?.status ?? "NONE"
      if (paymentFilter === "ACC") return isPaymentApproved(currentStatus)
      if (paymentFilter === "BELUM_ACC") return !isPaymentApproved(currentStatus)
      return true
    })
  }, [visibleKontingen, paymentFilter])
  useEffect(() => {
    if (filteredKontingen.length === 0) {
      setTargetUserId("")
      setRegistration(null)
      setStatus("NONE")
      setNote("")
      return
    }

    const selectedStillVisible = filteredKontingen.some(({ u }) => u.id === targetUserId)
    if (!selectedStillVisible) {
      setTargetUserId(filteredKontingen[0].u.id)
    }
  }, [filteredKontingen, targetUserId])

  useEffect(() => {
    let active = true

    const loadRegistration = async () => {
      if (!targetUserId) return
      const reg = (await Repos.registration.getRegistrationByUserId(targetUserId)) as unknown as Registration | null
      if (!active) return
      setRegistration(reg)

      if (reg?.payment) {
        setStatus(reg.payment.status)
        setNote(reg.payment.note ?? "")
      } else {
        setStatus("NONE")
        setNote("")
      }
    }

    void loadRegistration()
    return () => {
      active = false
    }
  }, [targetUserId])

  const openPreview = async () => {
    if (!registration) return
    const paymentAny = registration.payment as any
    const fileId = paymentAny?.proofFileId as string | undefined
    const mime = (paymentAny?.proofMimeType as string | undefined) ?? ""
    const fileName = registration.payment.proofFileName ?? "bukti-pembayaran"

    if (!fileId) {
      alert("File bukti tidak ditemukan.")
      return
    }

    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: true, loading: true, error: null, url: "", mime, fileName })

    try {
      const blob = await getFileBlob(fileId)
      if (!blob) {
        setPreview((prev) => ({ ...prev, loading: false, error: "File tidak tersedia di penyimpanan browser." }))
        return
      }
      const objectUrl = URL.createObjectURL(blob)
      const finalMime = mime || blob.type || "application/octet-stream"
      setPreview({ open: true, loading: false, error: null, url: objectUrl, mime: finalMime, fileName })
    } catch {
      setPreview((prev) => ({ ...prev, loading: false, error: "Gagal membuka preview file." }))
    }
  }

  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: false, loading: false, error: null, url: "", mime: "", fileName: "" })
  }

  const handleSave = async () => {
    if (!targetUserId) return
    const key = `mg26_registration_${targetUserId}`
    const reg = safeParse<Registration | null>(localStorage.getItem(key), null)
    if (!reg) return

    if (adminUser?.role === "ADMIN_CABOR") {
      const sportIds = reg.sports.map((s) => s.id)
      const allowed = sportIds.some((sid) => canAccessSport(sid))
      if (!allowed) {
        alert("Anda tidak memiliki akses untuk kontingen ini.")
        return
      }
    }

    const updated: Registration = {
      ...reg,
      payment: {
        ...reg.payment,
        status,
        note: note.trim() ? note.trim() : undefined,
      },
      status:
        status === "APPROVED"
          ? "PAYMENT_APPROVED"
          : status === "REJECTED"
          ? "WAITING_PAYMENT_UPLOAD"
          : status === "PENDING"
          ? "WAITING_PAYMENT_VERIFICATION"
          : reg.status,
      updatedAt: new Date().toISOString(),
    }

    try {
      await Repos.registration.adminUpdatePayment({
        userId: targetUserId,
        status,
        note: note.trim() ? note.trim() : undefined,
      })
      localStorage.setItem("mg26_mock_payment_status", status === "NONE" ? "NONE" : status)
      setRegistration(updated)
      alert("Status pembayaran berhasil disimpan.")
    } catch {
      alert("Gagal menyimpan status pembayaran.")
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Validasi Pembayaran</h1>
        <p className="mt-2 text-sm text-gray-600">Validasi bukti transfer peserta dengan preview langsung dan ringkasan status.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Sudah ACC</div><div className="mt-1 text-2xl font-extrabold text-green-700">{paymentSummary.approved}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Pending</div><div className="mt-1 text-2xl font-extrabold text-yellow-700">{paymentSummary.pending}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Rejected</div><div className="mt-1 text-2xl font-extrabold text-red-700">{paymentSummary.rejected}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Belum Upload</div><div className="mt-1 text-2xl font-extrabold text-gray-700">{paymentSummary.none}</div></div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div className="text-lg font-extrabold text-gray-900">Pilih Kontingen</div><select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)} className="w-full rounded-xl border px-3 py-2 text-sm md:w-[260px]"><option value="ALL">Semua Status</option><option value="ACC">Sudah ACC</option><option value="BELUM_ACC">Belum ACC</option></select></div>
        {filteredKontingen.length === 0 ? (
          <div className="text-sm text-gray-500">Tidak ada kontingen yang bisa divalidasi sesuai filter.</div>
        ) : (
          <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full rounded-xl border px-3 py-2">
            {filteredKontingen.map(({ u, reg }) => (
              <option key={u.id} value={u.id}>
                {u.institutionName} - {u.email} {reg ? `(${reg.sports.map((s) => s.name).join(", ")})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="text-lg font-extrabold text-gray-900">Detail Pembayaran</div>
        {!registration ? (
          <div className="text-sm text-gray-500">Kontingen belum memiliki data pendaftaran.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Status Saat Ini</div>
                <span className={`mt-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${paymentBadgeClass(registration.payment.status)}`}>
                  {registration.payment.status}
                </span>
                <div className="mt-2 text-sm text-gray-700">Total: Rp {registration.payment.totalFee.toLocaleString("id-ID")}</div>
              </div>
              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Bukti Pembayaran</div>
                <div className="mt-1 text-sm font-bold text-gray-900">{registration.payment.proofFileName ?? "-"}</div>
                <div className="text-xs text-gray-500">Upload: {registration.payment.uploadedAt ?? "-"}</div>
                <button
                  onClick={openPreview}
                  disabled={!(registration.payment as any)?.proofFileId}
                  className="mt-3 rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Preview Bukti
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">Set Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)} className="w-full rounded-lg border px-3 py-2">
                  <option value="NONE">NONE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">Catatan Admin (opsional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="min-h-[92px] w-full rounded-lg border px-3 py-2"
                  placeholder="Contoh: bukti buram / nominal kurang / rekening tidak sesuai"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSave} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-green-700">
                Simpan Validasi
              </button>
              <div className="text-xs text-gray-500">Jika APPROVED maka Step 3-4 peserta terbuka.</div>
            </div>
          </>
        )}
      </div>
      {preview.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="font-extrabold text-gray-900">Preview Bukti Pembayaran</div>
                <div className="text-xs text-gray-500">{preview.fileName}</div>
              </div>
              <button onClick={closePreview} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white hover:bg-black">Tutup</button>
            </div>
            <div className="p-4">
              {preview.loading && <div className="text-sm text-gray-600">Memuat file...</div>}
              {!preview.loading && preview.error && <div className="text-sm text-red-700">{preview.error}</div>}
              {!preview.loading && !preview.error && preview.url && isImageMime(preview.mime) && (
                <div className="flex justify-center">
                  
                  <img src={preview.url} alt="Bukti pembayaran" className="max-h-[70vh] rounded-xl border object-contain" />
                </div>
              )}
              {!preview.loading && !preview.error && preview.url && isPdfMime(preview.mime) && (
                <div className="h-[70vh] overflow-hidden rounded-xl border">
                  <iframe title="payment-preview" src={preview.url} className="h-full w-full" />
                </div>
              )}
              {!preview.loading && !preview.error && preview.url && !isImageMime(preview.mime) && !isPdfMime(preview.mime) && (
                <a href={preview.url} target="_blank" rel="noreferrer" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50">
                  Buka file di tab baru
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}















