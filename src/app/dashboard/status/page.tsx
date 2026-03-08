"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRegistration } from "@/context/RegistrationContext"

type DocKey = "dapodik" | "ktp" | "kartu" | "raport" | "foto"

const DOC_KEYS: DocKey[] = ["dapodik", "ktp", "kartu", "raport", "foto"]

function Badge({
  text,
  variant,
}: {
  text: string
  variant: "gray" | "yellow" | "green" | "red"
}) {
  const cls =
    variant === "gray"
      ? "bg-gray-100 border-gray-200 text-gray-700"
      : variant === "yellow"
      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : variant === "green"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-800"

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border ${cls}`}
    >
      {text}
    </span>
  )
}

function formatISO(iso?: string) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

export default function StatusPage() {
  const { user } = useAuth()
  const { state, hydrateReady, dispatch } = useRegistration()
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const paymentStatus = state.payment.status
  const paymentApproved = paymentStatus === "APPROVED"

  const handleReopenRegistration = () => {
    const ok = window.confirm("Buka revisi pendaftaran? Step 1 akan terbuka lagi dan Anda perlu melakukan pembayaran ulang setelah revisi kuota.")
    if (!ok) return

    dispatch({ type: "SET_PAYMENT_STATUS", status: "NONE" })
    setActionMsg({ type: "success", text: "Mode revisi dibuka. Silakan ubah kuota di Step 1, lalu lanjutkan pembayaran ulang di Step 2." })
  }
  const paymentBadge = useMemo(() => {
    if (paymentStatus === "NONE") return <Badge text="Belum Upload" variant="gray" />
    if (paymentStatus === "PENDING") return <Badge text="Menunggu Verifikasi" variant="yellow" />
    if (paymentStatus === "APPROVED") return <Badge text="Approved" variant="green" />
    return <Badge text="Rejected" variant="red" />
  }, [paymentStatus])

  // Step 1: total kuota atlet & total official
  const step1 = useMemo(() => {
    let totalAthleteQuota = 0
    let totalOfficialQuota = 0

    const rows: Array<{
      sportId: string
      sportName: string
      categoryName: string
      quota: number
    }> = []

    for (const s of state.sports) {
      totalOfficialQuota += Number(s.officialCount || 0)
      for (const c of s.categories) {
        const q = Number(c.quota || 0)
        if (q <= 0) continue
        totalAthleteQuota += q
        rows.push({
          sportId: s.id,
          sportName: s.name,
          categoryName: c.name,
          quota: q,
        })
      }
    }

    const filledSports = rows.length
    const done = totalAthleteQuota > 0 || totalOfficialQuota > 0

    return {
      totalAthleteQuota,
      totalOfficialQuota,
      rows,
      filledSports,
      done,
    }
  }, [state.sports])

  // Step 3: total atlet terisi & ringkasan terisi per kategori
  const step3 = useMemo(() => {
    const totalAthletes = state.athletes.length

    const map = new Map<string, number>() // key: sportId|categoryId
    for (const a of state.athletes) {
      const k = `${a.sportId}__${a.categoryId}`
      map.set(k, (map.get(k) ?? 0) + 1)
    }

    // buat summary berdasarkan kuota step1 agar "terisi/kuota"
    const rows: Array<{
      sportName: string
      categoryName: string
      filled: number
      quota: number
    }> = []

    for (const s of state.sports) {
      for (const c of s.categories) {
        const q = Number(c.quota || 0)
        if (q <= 0) continue
        const filled = map.get(`${s.id}__${c.id}`) ?? 0
        rows.push({ sportName: s.name, categoryName: c.name, filled, quota: q })
      }
    }

    const done = step1.totalAthleteQuota > 0 && totalAthletes > 0
    const complete = step1.totalAthleteQuota > 0 && totalAthletes >= step1.totalAthleteQuota

    return {
      totalAthletes,
      rows,
      done,
      complete,
    }
  }, [state.athletes, state.sports, step1.totalAthleteQuota])

  // Step 4: dokumen per atlet
  const step4 = useMemo(() => {
    const rows = state.athletes.map((a) => {
      const d = state.documents.find((x) => x.athleteId === a.id)
      let uploaded = 0
      for (const k of DOC_KEYS) {
        const file = (d as any)?.[k]
        if (file?.status && file.status !== "EMPTY") uploaded += 1
      }
      return {
        athleteId: a.id,
        name: a.name,
        sportId: a.sportId,
        categoryId: a.categoryId,
        uploaded,
        total: DOC_KEYS.length,
      }
    })

    const totalAthletes = state.athletes.length
    const totalDocsNeeded = totalAthletes * DOC_KEYS.length
    const totalUploaded = rows.reduce((acc, r) => acc + r.uploaded, 0)

    const done = totalAthletes > 0 && totalUploaded > 0
    const complete = totalAthletes > 0 && totalUploaded >= totalDocsNeeded

    return {
      totalAthletes,
      totalDocsNeeded,
      totalUploaded,
      rows,
      done,
      complete,
    }
  }, [state.athletes, state.documents])

  // Checklist step completion
  const checklist = useMemo(() => {
    const step1Ready = step1.done
    const step2Ready = paymentStatus === "PENDING" || paymentStatus === "APPROVED"
    const step2Approved = paymentStatus === "APPROVED"
    const step3Ready = step2Approved && step3.done
    const step4Ready = step2Approved && step4.done
    const allStepsComplete = step1Ready && step2Approved && step3.complete && step4.complete

    return {
      step1Ready,
      step2Ready,
      step2Approved,
      step3Ready,
      step4Ready,
      allStepsComplete,
    }
  }, [step1.done, step3.complete, step3.done, step4.complete, step4.done, paymentStatus])

  if (!hydrateReady) {
    return (
      <div className="max-w-6xl">
        <div className="bg-white border rounded-xl p-6 shadow-sm text-sm text-gray-600">
          Memuat status...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Status Pendaftaran</h1>
            <p className="text-gray-600 mt-2">
              Ringkasan progres Step 1-4 + status verifikasi admin (mock).
            </p>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {paymentBadge}
              <Badge
                text={`Total Biaya: Rp ${state.payment.totalFee.toLocaleString()}`}
                variant="gray"
              />
              {user?.institutionName ? (
                <Badge text={user.institutionName} variant="gray" />
              ) : null}
            </div>
          </div>

          {actionMsg && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {actionMsg.text}
            </div>
          )}
          <div className="rounded-xl border bg-gray-50 p-4 min-w-[320px]">
            <div className="text-xs text-gray-500">Aksi Cepat</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/pendaftaran"
                className="px-3 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50 text-sm text-center"
              >
                Step 1
              </Link>
              <Link
                href="/dashboard/pembayaran"
                className="px-3 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50 text-sm text-center"
              >
                Step 2
              </Link>
              <Link
                href="/dashboard/pendaftaran/atlet"
                className={`px-3 py-2 rounded-xl font-extrabold text-sm text-center ${
                  paymentApproved
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-600 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!paymentApproved) {
                    e.preventDefault()
                    alert("Step 3 hanya bisa dibuka setelah pembayaran APPROVED.")
                  }
                }}
                >
                  Step 3
                </Link>
                <Link
                  href="/dashboard/pendaftaran/dokumen"
                  className={`px-3 py-2 rounded-xl font-extrabold text-sm text-center ${
                    paymentApproved
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 text-gray-600 cursor-not-allowed"
                }`}
              >
                Step 4
              </Link>
            </div>
          </div>
        </div>
      </div>
          {checklist.allStepsComplete && (
            <button
              onClick={handleReopenRegistration}
              className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-amber-600"
            >
              Revisi / Tambah Atlet Lagi
            </button>
          )}
          {paymentApproved && !checklist.allStepsComplete && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tombol tambah atlet lagi akan aktif setelah Step 1 sampai Step 4 selesai lengkap.
            </div>
          )}










      {/* Checklist Steps */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="text-lg font-extrabold text-gray-900">Checklist Step</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Step 1</div>
              <div className="text-xs text-gray-600 mt-1">Pilih cabor & kuota</div>
            </div>
            {checklist.step1Ready ? <Badge text="OK" variant="green" /> : <Badge text="Belum" variant="gray" />}
          </div>

          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Step 2</div>
              <div className="text-xs text-gray-600 mt-1">Upload bukti pembayaran</div>
            </div>
            {checklist.step2Ready ? <Badge text="Sudah Upload" variant="yellow" /> : <Badge text="Belum" variant="gray" />}
          </div>

          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Verifikasi Admin</div>
              <div className="text-xs text-gray-600 mt-1">Pembayaran harus APPROVED</div>
            </div>
            {checklist.step2Approved ? <Badge text="APPROVED" variant="green" /> : <Badge text="Belum" variant="yellow" />}
          </div>

          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Step 3 & 4</div>
              <div className="text-xs text-gray-600 mt-1">Input atlet + upload dokumen</div>
            </div>
            {checklist.step3Ready || checklist.step4Ready ? <Badge text="Progress" variant="yellow" /> : <Badge text="Terkunci" variant="gray" />}
          </div>
        </div>
      </div>

      {/* Pembayaran Detail */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="text-lg font-extrabold text-gray-900">Detail Pembayaran</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Status</div>
            <div className="mt-2">{paymentBadge}</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Bukti</div>
            <div className="mt-2 text-sm text-gray-900 font-bold">
              {state.payment.proofFileName ?? "-"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Upload: {formatISO(state.payment.uploadedAt)}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Total</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900">
              Rp {state.payment.totalFee.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Step 1 Summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Step 1 - Kuota Dipilih</div>
            <div className="text-sm text-gray-600 mt-1">
              Total kuota atlet: <b>{step1.totalAthleteQuota}</b> | Official: <b>{step1.totalOfficialQuota}</b>
            </div>
          </div>
          <Link
            href="/dashboard/pendaftaran"
            className="px-4 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50 text-sm"
          >
            Edit Step 1
          </Link>
        </div>

        {step1.rows.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">Belum ada kuota yang diisi.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {step1.rows.map((r, idx) => (
              <div key={idx} className="rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-gray-900">{r.sportName}</div>
                  <div className="text-xs text-gray-600 mt-1">{r.categoryName}</div>
                </div>
                <Badge text={`Kuota: ${r.quota}`} variant="gray" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3 Summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Step 3 - Atlet</div>
            <div className="text-sm text-gray-600 mt-1">
              Total atlet terisi: <b>{step3.totalAthletes}</b> / <b>{step1.totalAthleteQuota}</b>
            </div>
          </div>

          <Link
            href="/dashboard/pendaftaran/atlet"
            className={`px-4 py-2 rounded-xl font-extrabold text-sm ${
              paymentApproved
                ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105"
                : "bg-gray-200 text-gray-600 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!paymentApproved) {
                e.preventDefault()
                alert("Step 3 hanya bisa dibuka setelah pembayaran APPROVED.")
              }
            }}
          >
            Buka Step 3
          </Link>
        </div>

        {!paymentApproved && (
          <div className="mt-4 text-sm text-gray-600">
            Step 3 masih terkunci sampai pembayaran <b>APPROVED</b>.
          </div>
        )}

        {paymentApproved && step3.rows.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">Belum ada atlet diinput.</div>
        ) : paymentApproved ? (
          <div className="mt-4 space-y-2">
            {step3.rows.map((r, idx) => {
              const ok = r.filled >= r.quota
              return (
                <div key={idx} className="rounded-xl border p-4 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-gray-900">{r.sportName}</div>
                    <div className="text-xs text-gray-600 mt-1">{r.categoryName}</div>
                  </div>
                  <Badge text={`${r.filled} / ${r.quota}`} variant={ok ? "green" : "yellow"} />
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Step 4 Summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Step 4 - Dokumen</div>
            <div className="text-sm text-gray-600 mt-1">
              Total dokumen terupload: <b>{step4.totalUploaded}</b> / <b>{step4.totalDocsNeeded}</b>
            </div>
          </div>

          <Link
            href="/dashboard/pendaftaran/dokumen"
            className={`px-4 py-2 rounded-xl font-extrabold text-sm ${
              paymentApproved
                ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105"
                : "bg-gray-200 text-gray-600 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!paymentApproved) {
                e.preventDefault()
                alert("Step 4 hanya bisa dibuka setelah pembayaran APPROVED.")
              }
            }}
          >
            Buka Step 4
          </Link>
        </div>

        {!paymentApproved && (
          <div className="mt-4 text-sm text-gray-600">
            Step 4 masih terkunci sampai pembayaran <b>APPROVED</b>.
          </div>
        )}

        {paymentApproved && step4.rows.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">Belum ada atlet, jadi belum ada dokumen.</div>
        ) : paymentApproved ? (
          <div className="mt-4 space-y-2">
            {step4.rows.map((r) => {
              const ok = r.uploaded >= r.total
              return (
                <div key={r.athleteId} className="rounded-xl border p-4 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {r.sportId} | {r.categoryId}
                    </div>
                  </div>
                  <Badge text={`${r.uploaded}/${r.total}`} variant={ok ? "green" : "yellow"} />
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
