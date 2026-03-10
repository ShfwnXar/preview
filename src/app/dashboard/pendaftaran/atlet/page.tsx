// src/app/dashboard/pendaftaran/atlet/page.tsx
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRegistration } from "@/context/RegistrationContext"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import type { AthleteDocuments } from "@/types/registration"
import { useAuth } from "@/context/AuthContext"
import { readRevisionMode } from "@/lib/registrationFlow"
import {
  getActiveAthleteCount,
  getApprovedAthleteQuota,
  getApprovedExtraSlotsForSport,
  getExtraAccess,
  getPendingTopUpCount,
  getUsedExtraSlotsForSport,
  getTopUp,
} from "@/lib/extraAthleteFlow"

type Gender = "PUTRA" | "PUTRI"

type CatalogCategory = {
  id: string
  name: string
  // opsional (kalau sudah kamu tambahkan di catalog)
  rosterSize?: number // 1 individu, 2 ganda, 12 voli, dst
  slot?: number
}

type CatalogSport = {
  id: string
  name: string
  categories: CatalogCategory[]
}

const SPORT_VOLI_ID = "voli_indoor"
const VOLI_ROSTER_PER_TEAM = 12

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}


// Infer roster size kalau catalog belum punya rosterSize
function inferRosterSize(sportId: string, category?: CatalogCategory | null) {
  if (!category) return 1
  if (typeof category.rosterSize === "number" && category.rosterSize > 0) return category.rosterSize

  const n = (category.name || "").toLowerCase()

  // ganda
  if (n.includes("ganda") || n.includes("double")) return 2

  // beregu/tim (default 5 kalau tidak jelas)
  if (n.includes("beregu") || n.includes("team") || n.includes("tim")) {
    if (sportId === "voli_indoor") return 12
    return 5
  }

  // voli khusus
  if (sportId === "voli_indoor") return 12

  return 1
}

function categoryLabel(sportId: string, categoryId: string) {
  const s = (SPORTS_CATALOG as CatalogSport[]).find((x) => x.id === sportId)
  const c = s?.categories?.find((k) => k.id === categoryId)
  return c?.name ?? categoryId
}
function getSportAthleteQuota(s: any) {
  if (!s) return 0
  if (s.id === SPORT_VOLI_ID) {
    const men = Math.max(0, Number(s.voliMenTeams ?? 0))
    const women = Math.max(0, Number(s.voliWomenTeams ?? 0))
    const fromTeams = (men + women) * VOLI_ROSTER_PER_TEAM
    const planned = Math.max(0, Number(s.athleteQuota ?? s.plannedAthletes ?? 0))
    return Math.max(fromTeams, planned)
  }
  return Math.max(0, Number(s.athleteQuota ?? s.plannedAthletes ?? 0))
}

/** =========================
 *  Helper: "Atlet Lengkap"
 *  ========================= */
type DocKey = keyof Omit<AthleteDocuments, "athleteId">

const REQUIRED_DOCS: DocKey[] = ["dapodik", "ktp", "kartu", "raport", "foto"]

function isAthleteProfileComplete(a: any) {
  return !!a?.name?.trim() && !!a?.birthDate
}

function isAthleteDocsComplete(doc: AthleteDocuments | undefined | null) {
  if (!doc) return false
  return REQUIRED_DOCS.every((k) => {
    const d = doc[k]
    return d?.status === "UPLOADED" || d?.status === "APPROVED"
  })
}

function isAthleteComplete(a: any, doc: AthleteDocuments | undefined | null) {
  return isAthleteProfileComplete(a) && isAthleteDocsComplete(doc)
}

export default function Step3AtletPage() {
  const { user } = useAuth()
  const { state, hydrateReady, addAthlete, removeAthlete, addOfficial, removeOfficial } = useRegistration()
  const revisionOpen = user ? readRevisionMode(user.id) : false

  const paymentApproved = state.payment.status === "APPROVED" || revisionOpen
  const approvedAthleteQuota = getApprovedAthleteQuota(state as any)
  const activeAthleteCount = getActiveAthleteCount(state as any)
  const pendingTopUpCount = getPendingTopUpCount(state as any)
  const extraAccess = getExtraAccess(state as any)
  const topUp = getTopUp(state as any)

  const [selectedSportId, setSelectedSportId] = useState<string>("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  // ==== SPORT OPTIONS (yang dipilih Step 1) ====
  // Support dua versi field:
  // - lama: athleteQuota
  // - baru: plannedAthletes
  const sportOptions = useMemo(() => {
    const baseSports = state.sports || []
    const extraSports = (extraAccess.requestItems || [])
      .filter((item: any) => Math.max(0, Number(item.approvedSlots ?? 0)) > 0)
      .map((item: any) => {
        const catalogSport = (SPORTS_CATALOG as CatalogSport[]).find((sport) => sport.id === item.sportId)
        return {
          id: item.sportId,
          name: item.sportName,
          athleteQuota: Math.max(0, Number(item.approvedSlots ?? 0)),
          categories: catalogSport?.categories ?? [],
          plannedAthletes: Math.max(0, Number(item.approvedSlots ?? 0)),
          officialCount: 0,
        }
      })
    const mergedSports = [...baseSports]
    for (const sport of extraSports) {
      if (!mergedSports.some((existing: any) => existing.id === sport.id)) {
        mergedSports.push(sport as any)
      }
    }

    return mergedSports.filter((s: any) => {
      const q = getSportAthleteQuota(s)
      const extraQuota = getApprovedExtraSlotsForSport(state as any, s.id)
      return q > 0 || extraQuota > 0 || (state.athletes || []).some((a) => a.sportId === s.id)
    })
  }, [state.sports, state.athletes, extraAccess.requestItems, state])

  const selectedSport = useMemo(() => {
    return sportOptions.find((s: any) => s.id === selectedSportId) ?? null
  }, [sportOptions, selectedSportId])

  // ==== categories dari catalog ====
  const categoriesForSport = useMemo(() => {
    const s = (SPORTS_CATALOG as CatalogSport[]).find((x) => x.id === selectedSportId)
    return s?.categories ?? []
  }, [selectedSportId])

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return categoriesForSport.find((c) => c.id === selectedCategoryId) ?? null
  }, [categoriesForSport, selectedCategoryId])

  const rosterSize = useMemo(() => {
    return inferRosterSize(selectedSportId, selectedCategory)
  }, [selectedSportId, selectedCategory])

  // ==== Kuota sport ====
  const sportQuota = useMemo(() => {
    const s: any = selectedSport
    if (!s) return 0
    return getSportAthleteQuota(s)
  }, [selectedSport])
  // terisi dihitung dari jumlah atlet terinput (bukan status dokumen)
  const filledInSport = useMemo(() => {
    if (!selectedSportId) return 0
    return (state.athletes || []).filter((a) => a.sportId === selectedSportId).length
  }, [state.athletes, selectedSportId])

  const remainingInSport = sportQuota - filledInSport

  const categoryQuota = useMemo(() => {
    const s: any = selectedSport
    if (!s || !selectedCategoryId) return null

    const q = (s.categories || []).find((x: any) => x.id === selectedCategoryId)?.quota
    const n = Number(q ?? 0)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [selectedSport, selectedCategoryId])

  const filledInCategory = useMemo(() => {
    if (!selectedSportId || !selectedCategoryId) return 0
    return (state.athletes || []).filter((a) => a.sportId === selectedSportId && a.categoryId === selectedCategoryId).length
  }, [state.athletes, selectedSportId, selectedCategoryId])

  const remainingInCategory = categoryQuota == null ? Number.POSITIVE_INFINITY : categoryQuota - filledInCategory

  const documentsByAthleteId = useMemo(() => {
    const map = new Map<string, AthleteDocuments>()
    for (const d of state.documents || []) {
      if (d?.athleteId) map.set(d.athleteId, d as AthleteDocuments)
    }
    return map
  }, [state.documents])
  // ==== Ringkasan global ====
  const totalPlan = useMemo(() => {
    return (state.sports || []).reduce((acc: number, s: any) => acc + getSportAthleteQuota(s), 0)
  }, [state.sports])

  const totalFilled = useMemo(() => (state.athletes || []).length, [state.athletes])
  const initialAthletesCount = useMemo(() => (state.athletes || []).filter((a: any) => a?.registrationState?.source !== "EXTRA_ACCESS").length, [state.athletes])
  const approvedExtraSlotsForSport = useMemo(() => getApprovedExtraSlotsForSport(state as any, selectedSportId), [state, selectedSportId])
  const usedExtraSlotsForSport = useMemo(() => getUsedExtraSlotsForSport(state as any, selectedSportId), [state, selectedSportId])
  const extraSlotsRemaining = Math.max(0, approvedExtraSlotsForSport - usedExtraSlotsForSport)
  const paidSlotsRemaining = Math.max(0, approvedAthleteQuota - initialAthletesCount)

  // ==== kategori summary card ====
  const categorySummary = useMemo(() => {
    if (!selectedSportId) return []
    const athletes = state.athletes || []
    return categoriesForSport.map((c) => {
      const filled = athletes.filter((a) => a.sportId === selectedSportId && a.categoryId === c.id).length
      const rs = inferRosterSize(selectedSportId, c)
      return {
        id: c.id,
        name: c.name,
        rosterSize: rs,
        filled,
      }
    })
  }, [state.athletes, categoriesForSport, selectedSportId])

  // ==== Auto select sport pertama ====
  useEffect(() => {
    if (!hydrateReady) return
    if (selectedSportId) return
    if (sportOptions.length > 0) setSelectedSportId(sportOptions[0].id)
  }, [hydrateReady, selectedSportId, sportOptions])

  // reset category saat sport berubah
  useEffect(() => {
    setSelectedCategoryId("")
  }, [selectedSportId])

  // auto pick category pertama kalau ada
  useEffect(() => {
    if (!hydrateReady) return
    if (!selectedSportId) return
    if (selectedCategoryId) return
    if (categoriesForSport.length > 0) setSelectedCategoryId(categoriesForSport[0].id)
  }, [hydrateReady, selectedSportId, selectedCategoryId, categoriesForSport])

  // ==== Officials per sport ====
  const officialsForSelectedSport = useMemo(() => {
    if (!selectedSportId) return []
    return (state.officials || []).filter((o) => o.sportId === selectedSportId)
  }, [state.officials, selectedSportId])

  const officialQuota = useMemo(() => {
    const s: any = selectedSport
    return Number(s?.officialCount ?? 0)
  }, [selectedSport])

  const canAddOfficialHere = useMemo(() => {
    if (!selectedSport) return false
    return paymentApproved && officialsForSelectedSport.length < officialQuota
  }, [paymentApproved, officialsForSelectedSport.length, officialQuota, selectedSport])

  const [officialForm, setOfficialForm] = useState<{ name: string; phone: string }>({
    name: "",
    phone: "",
  })

  // ==== Form atlet dynamic sesuai rosterSize ====
  type AthleteFormRow = { name: string; gender: Gender; birthDate: string; institution: string }
  const [athleteForms, setAthleteForms] = useState<AthleteFormRow[]>([
    { name: "", gender: "PUTRA", birthDate: "", institution: "" },
  ])

  // Auto resize roster form saat kategori berubah
  useEffect(() => {
    if (!selectedSportId) return
    const size = Math.max(1, rosterSize || 1)
    setAthleteForms((prev) => {
      const next = [...prev]
      while (next.length < size) {
        next.push({ name: "", gender: "PUTRA", birthDate: "", institution: "" })
      }
      return next.slice(0, size)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, selectedSportId, rosterSize])

  const updateAthleteForm = (idx: number, patch: Partial<AthleteFormRow>) => {
    setAthleteForms((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const resetAthleteForms = () => {
    setAthleteForms((prev) => {
      const size = Math.max(1, rosterSize || 1)
      const next: AthleteFormRow[] = []
      for (let i = 0; i < size; i++) next.push({ name: "", gender: "PUTRA", birthDate: "", institution: "" })
      return next
    })
  }

  // ==== List atlet filter ====
  const athletesFiltered = useMemo(() => {
    if (!selectedSportId) return []
    const list = (state.athletes || []).filter((a) => a.sportId === selectedSportId)
    if (!selectedCategoryId) return list
    return list.filter((a) => a.categoryId === selectedCategoryId)
  }, [state.athletes, selectedSportId, selectedCategoryId])

  // ==== Validasi tombol tambah ====
  const rosterFieldsValid = useMemo(() => {
    // minimal: name + birthDate per atlet
    return athleteForms.every((a) => a.name.trim().length > 0 && String(a.birthDate || "").trim().length > 0)
  }, [athleteForms])

  const needRoster = Math.max(1, rosterSize || 1)
  const canUsePaidSlots =
    paymentApproved &&
    !!selectedSportId &&
    !!selectedCategoryId &&
    rosterFieldsValid &&
    paidSlotsRemaining >= needRoster &&
    remainingInCategory >= needRoster

  const canUseExtraSlots =
    paymentApproved &&
    !!selectedSportId &&
    !!selectedCategoryId &&
    rosterFieldsValid &&
    extraAccess.status === "OPEN" &&
    topUp.status === "APPROVED" &&
    extraSlotsRemaining >= needRoster &&
    remainingInCategory >= needRoster

  const canAddRoster = canUsePaidSlots || canUseExtraSlots

  const handleAddRoster = () => {
    if (!paymentApproved) return alert("Belum bisa input atlet: pembayaran harus APPROVED.")
    if (!selectedSportId) return alert("Pilih cabor terlebih dahulu.")
    if (!selectedCategoryId) return alert("Pilih kategori/kelas/nomor terlebih dahulu.")

    if (remainingInCategory < needRoster) {
      alert(`Kuota kategori tidak cukup. Sisa kuota kategori: ${Math.max(0, Number.isFinite(remainingInCategory) ? remainingInCategory : 0)} (butuh ${needRoster}).`)
      return
    }

    if (!canUsePaidSlots && !canUseExtraSlots) {
      alert("Slot terbayar habis. Ajukan tambah peserta, tunggu persetujuan admin, lalu selesaikan pembayaran tambahan terlebih dahulu.")
      return
    }

    if (canUsePaidSlots) {
      for (let i = 0; i < needRoster; i++) {
        const a = athleteForms[i]
        if (!a?.name?.trim()) return alert("Nama atlet " + (i + 1) + " wajib diisi.")
        if (!a?.birthDate) return alert("Tanggal lahir atlet " + (i + 1) + " wajib diisi.")

        addAthlete({
          sportId: selectedSportId,
          categoryId: selectedCategoryId,
          name: a.name.trim(),
          gender: a.gender,
          birthDate: a.birthDate,
          institution: a.institution.trim(),
          registrationState: {
            pricingStatus: "INITIAL_PAID",
            source: "INITIAL_QUOTA",
            isActive: true,
          },
        } as any)
      }

      resetAthleteForms()
      return
    }

    for (let i = 0; i < needRoster; i++) {
      const a = athleteForms[i]
      if (!a?.name?.trim()) return alert("Nama atlet " + (i + 1) + " wajib diisi.")
      if (!a?.birthDate) return alert("Tanggal lahir atlet " + (i + 1) + " wajib diisi.")

      addAthlete({
        sportId: selectedSportId,
        categoryId: selectedCategoryId,
        name: a.name.trim(),
        gender: a.gender,
        birthDate: a.birthDate,
        institution: a.institution.trim(),
        registrationState: {
          pricingStatus: "TOP_UP_PAID",
          source: "EXTRA_ACCESS",
          isActive: true,
        },
      } as any)
    }

    resetAthleteForms()
    alert("Kuota tambahan berhasil diisi tanpa mengubah kuota lama.")
  }

  const handleAddOfficial = () => {
    if (!paymentApproved) return alert("Belum bisa input official: pembayaran harus APPROVED.")
    if (!selectedSportId) return alert("Pilih cabor dulu.")
    if (officialQuota <= 0) return alert("Kuota official untuk cabor ini 0. Atur di Step 1.")
    if (officialsForSelectedSport.length >= officialQuota) return alert("Kuota official untuk cabor ini sudah penuh.")
    if (!officialForm.name.trim()) return alert("Nama official wajib diisi.")

    addOfficial({
      sportId: selectedSportId,
      name: officialForm.name.trim(),
      phone: officialForm.phone.trim() || undefined,
    } as any)

    setOfficialForm({ name: "", phone: "" })
  }

  if (!hydrateReady) {
    return (
      <div className="max-w-6xl">
        <div className="bg-white border rounded-xl p-6 shadow-sm text-sm text-gray-600">Memuat data atlet...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Step 3 - Input Atlet + Kategori</h1>
            <p className="text-gray-600 mt-2">
              Step 3: pilih <b>kategori/kelas/nomor</b>, lalu input atlet sesuai kuota dari Step 1 (per cabor).<br />
              <span className="text-gray-500">
                Catatan: kategori <b>Ganda</b> otomatis input <b>2 atlet</b>, kategori <b>Tim/Beregu</b> otomatis input sesuai roster.
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-700 border-gray-200">
                Payment: {state.payment.status}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-800 border-blue-200">
                Kuota terbayar: {approvedAthleteQuota}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                Atlet aktif: {activeAthleteCount}
              </span>
              {pendingTopUpCount > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-800 border-amber-200">
                  Pending top-up: {pendingTopUpCount}
                </span>
              )}

              {!paymentApproved && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-yellow-50 text-yellow-800 border-yellow-200">
                  Terkunci sampai pembayaran APPROVED
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 min-w-[300px]">
            <div className="text-xs text-gray-500">Progress Atlet</div>
            <div className="mt-1 text-2xl font-extrabold text-gray-900">
              {totalFilled} / {totalPlan}
            </div>
            <div className="mt-2 flex gap-2">
              <Link href="/dashboard/pembayaran" className="px-3 py-2 rounded-lg border bg-white font-bold hover:bg-gray-50 text-sm">
                Step 2
              </Link>
              <Link
                href="/dashboard/pendaftaran/dokumen"
                className={cx(
                  "px-3 py-2 rounded-lg font-bold text-sm",
                  paymentApproved ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-600 cursor-not-allowed"
                )}
                onClick={(e) => {
                  if (!paymentApproved) {
                    e.preventDefault()
                    alert("Step 4 hanya bisa dibuka setelah pembayaran APPROVED.")
                  }
                }}
              >
                Step 4
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Pilih Cabor */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="text-lg font-extrabold text-gray-900">Pilih Cabor</div>
        <select
          value={selectedSportId}
          onChange={(e) => setSelectedSportId(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        >
          {sportOptions.length === 0 ? (
            <option value="">Belum ada cabor berkuota dari Step 1</option>
          ) : (
            sportOptions.map((s: any) => {
              const q = getSportAthleteQuota(s)
              const oq = Number(s.officialCount ?? 0)
              return (
                <option key={s.id} value={s.id}>
                  {s.name} (Kuota Atlet: {q} | Kuota Official: {oq})
                </option>
              )
            })
          )}
        </select>

        {/* Info kuota sport */}
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="font-extrabold text-gray-900">Info Kuota Cabor</div>
          <div className="text-sm text-gray-700 mt-2">
            <div>
              <b>Kuota dipilih:</b> {sportQuota}
            </div>
            <div className="mt-1">
              <b>Sudah diisi:</b> {filledInSport}
            </div>
            <div className="mt-1">
              <b>Sisa:</b> {Math.max(0, remainingInSport)}
            </div>
          </div>
            <div className="mt-1"><b>Sisa slot terbayar:</b> {paidSlotsRemaining}</div>
            <div className="mt-1"><b>Status akses tambahan:</b> {extraAccess.status}</div>
          {sportQuota <= 0 && (
            <div className="mt-3 text-xs font-bold text-red-700">
              Kuota cabor masih 0. Balik ke Step 1 dan isi jumlah atlet (plannedAthletes/athleteQuota).
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan Kategori + pilih kategori */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-lg font-extrabold text-gray-900">Ringkasan Kategori (Cabor terpilih)</div>
          <div className="text-sm text-gray-600">
            Menampilkan jumlah atlet yang sudah masuk tiap kategori. <b>Roster</b>: 1 (individu) / 2 (ganda) / 12 (voli) / dst.
          </div>

          {categorySummary.length === 0 ? (
            <div className="text-sm text-gray-500">Kategori belum tersedia untuk cabor ini di SPORTS_CATALOG.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categorySummary.map((c) => {
                const picked = c.id === selectedCategoryId
                const canPick = paymentApproved && remainingInSport >= c.rosterSize && sportQuota > 0
                return (
                  <div
                    key={c.id}
                    className={cx(
                      "rounded-xl border p-4 flex items-center justify-between gap-3",
                      picked ? "border-emerald-200 bg-emerald-50/40" : "bg-white"
                    )}
                  >
                    <div>
                      <div className="font-extrabold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Roster: <b>{c.rosterSize}</b> | Terisi: <b>{c.filled}</b>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(c.id)}
                      disabled={!canPick}
                      className={cx(
                        "px-4 py-2 rounded-xl font-extrabold border",
                        canPick ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                      title={
                        !paymentApproved
                          ? "Terkunci sampai pembayaran APPROVED"
                          : sportQuota <= 0
                          ? "Kuota cabor 0"
                          : remainingInSport < c.rosterSize
                          ? "Sisa kuota tidak cukup untuk roster kategori ini"
                          : ""
                      }
                    >
                      {picked ? "Dipilih" : "Pilih"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Official */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-lg font-extrabold text-gray-900">Input Official (per cabor)</div>
          <div className="text-sm text-gray-600">
            Isi nama official sesuai kuota official yang kamu isi di Step 1.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-bold mb-1">Nama Official</div>
              <input
                value={officialForm.name}
                onChange={(e) => setOfficialForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2"
                placeholder="Nama lengkap official"
                disabled={!paymentApproved}
              />
            </div>
            <div>
              <div className="text-sm font-bold mb-1">No HP/WA (opsional)</div>
              <input
                value={officialForm.phone}
                onChange={(e) => setOfficialForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2"
                placeholder="08xxxxxxxxxx"
                disabled={!paymentApproved}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <button
              onClick={handleAddOfficial}
              disabled={!canAddOfficialHere}
              className={cx(
                "px-5 py-2 rounded-xl font-extrabold",
                canAddOfficialHere ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-600 cursor-not-allowed"
              )}
            >
              Tambah Official
            </button>
            <div className="text-xs text-gray-600">
              Kuota official: <b>{officialQuota}</b> | Terisi: <b>{officialsForSelectedSport.length}</b>
            </div>
          </div>

          {/* List official */}
          <div className="pt-2">
            <div className="text-sm font-bold text-gray-900">Daftar Official</div>
            {officialsForSelectedSport.length === 0 ? (
              <div className="mt-2 text-sm text-gray-500">Belum ada official.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {officialsForSelectedSport.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div>
                      <div className="font-extrabold text-gray-900">{o.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{o.phone ? `WA: ${o.phone}` : "WA: -"}</div>
                      <div className="text-[11px] text-gray-400 mt-1">ID: {o.id}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (!confirm("Hapus official ini?")) return
                        removeOfficial(o.id)
                      }}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-extrabold hover:bg-red-100"
                      disabled={!paymentApproved}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tambah Atlet (dynamic roster) */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-lg font-extrabold text-gray-900">Tambah Atlet</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-bold mb-1">Kategori / Kelas / Nomor</div>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 bg-white"
                disabled={!selectedSportId}
              >
                <option value="">-- Pilih kategori --</option>
                {categoriesForSport.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="text-xs text-gray-500 mt-2">
                Roster kategori terpilih: <b>{Math.max(1, rosterSize || 1)}</b> atlet
              </div>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="text-sm font-extrabold text-gray-900">Validasi Kuota</div>
              <div className="text-sm text-gray-700 mt-2">
                <div className="mt-1"><b>Sisa slot terbayar:</b> {paidSlotsRemaining}</div>
                <div className="mt-1"><b>Sisa slot akses tambahan:</b> {extraAccess.status === "OPEN" ? extraSlotsRemaining : 0}</div>
                <div>
                  <b>Sisa kuota cabor:</b> {Math.max(0, remainingInSport)}
                </div>
                <div className="mt-1">
                  <b>Butuh untuk kategori ini:</b> {Math.max(1, rosterSize || 1)}
                </div>
              </div>

              {remainingInSport < (rosterSize || 1) && (
                <div className="mt-3 text-xs font-bold text-red-700">
                  Sisa kuota tidak cukup untuk menambah roster kategori ini.
                </div>
              )}
            </div>
          </div>

          {/* Form Data Diri Peserta */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 md:p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-base font-extrabold text-gray-900">Form Data Diri Peserta</div>
                <div className="mt-1 text-xs text-gray-600">Lengkapi nama dan tanggal lahir untuk setiap atlet pada roster kategori ini.</div>
              </div>
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
                Terisi: {athleteForms.filter((item) => item.name.trim() && item.birthDate).length}/{Math.max(1, rosterSize || 1)} atlet
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {athleteForms.map((a, idx) => (
                <div key={idx} className="rounded-xl border border-emerald-100 bg-white p-4">
                  <div className="font-extrabold text-gray-900">Atlet {idx + 1}</div>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-sm font-bold">Nama Atlet <span className="text-red-600">*</span></div>
                      <input
                        value={a.name}
                        onChange={(e) => updateAthleteForm(idx, { name: e.target.value })}
                        className="w-full border rounded-xl px-3 py-2"
                        placeholder="Nama lengkap"
                        disabled={!paymentApproved}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-bold">Jenis Kelamin</div>
                      <select
                        value={a.gender}
                        onChange={(e) => updateAthleteForm(idx, { gender: e.target.value as Gender })}
                        className="w-full border rounded-xl px-3 py-2"
                        disabled={!paymentApproved}
                      >
                        <option value="PUTRA">Putra</option>
                        <option value="PUTRI">Putri</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-bold">Tanggal Lahir <span className="text-red-600">*</span></div>
                      <input
                        type="date"
                        value={a.birthDate}
                        onChange={(e) => updateAthleteForm(idx, { birthDate: e.target.value })}
                        className="w-full border rounded-xl px-3 py-2"
                        disabled={!paymentApproved}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-bold">Asal Instansi Atlet (opsional)</div>
                      <input
                        value={a.institution}
                        onChange={(e) => updateAthleteForm(idx, { institution: e.target.value })}
                        className="w-full border rounded-xl px-3 py-2"
                        placeholder="Contoh: SMP Muhammadiyah 1"
                        disabled={!paymentApproved}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <button
              disabled={!canAddRoster}
              onClick={handleAddRoster}
              className={cx(
                "px-5 py-2 rounded-xl font-extrabold",
                canAddRoster ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              )}
            >
              Tambah Atlet ({Math.max(1, rosterSize || 1)} orang)
            </button>

            <Link
              href="/dashboard/tambah-peserta"
              className="px-5 py-2 rounded-xl font-extrabold border bg-white hover:bg-gray-50"
            >
              Ajukan Tambah Peserta
            </Link>
            {extraAccess.status === "REQUESTED" && <div className="text-sm text-blue-700">Permintaan tambahan dikirim ke admin dan sedang diverifikasi.</div>}
            {extraAccess.status === "OPEN" && topUp.status !== "APPROVED" && <div className="text-sm text-amber-700">Pengajuan disetujui. Lanjutkan pembayaran tambahan di Step 2.</div>}
            {topUp.additionalAthletes > 0 && <div className="text-sm text-amber-700">Top-up tambahan: Rp {topUp.additionalFee.toLocaleString("id-ID")}</div>}
            {!paymentApproved && <div className="text-sm text-gray-600">Terkunci sampai pembayaran APPROVED.</div>}
          </div>
        </div>
      )}

      {/* List Atlet */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="text-lg font-extrabold text-gray-900">Daftar Atlet (filter sesuai pilihan)</div>
          <div className="text-sm text-gray-600 mt-1">
            Cabor: <b>{selectedSport?.name ?? selectedSportId}</b>
            {selectedCategoryId ? (
              <>
                {" "} | Kategori: <b>{categoryLabel(selectedSportId, selectedCategoryId)}</b>
              </>
            ) : null}
          </div>

          {athletesFiltered.length === 0 ? (
            <div className="mt-4 text-sm text-gray-500">Belum ada atlet untuk filter ini.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {athletesFiltered.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <div className="font-extrabold text-gray-900">{a.name}</div>
                    <div className="mt-1 text-xs font-bold text-gray-600">
                      {(a as any)?.registrationState?.source === "EXTRA_ACCESS" ? "Masuk kuota tambahan" : "Masuk kuota terbayar"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      <b>Kategori:</b> {categoryLabel(a.sportId, a.categoryId)}
                    </div>

                    {/* Progres dokumen per atlet */}
                    {(() => {
                      const doc = documentsByAthleteId.get(a.id)
                      const profileOk = isAthleteProfileComplete(a)
                      const docsOk = isAthleteDocsComplete(doc as any)
                      return (
                        <div className="text-xs text-gray-600 mt-1">
                          <b>Status:</b>{" "}
                          {profileOk && docsOk ? (
                            <span className="text-green-700 font-bold">Lengkap (mengurangi kuota)</span>
                          ) : (
                            <span className="text-yellow-700 font-bold">
                              Belum lengkap {profileOk ? "" : "data diri"} {docsOk ? "" : "dokumen"}
                            </span>
                          )}
                        </div>
                      )
                    })()}

                    <div className="text-xs text-gray-600 mt-1">
                      {a.gender} | Lahir: {a.birthDate || "-"}
                      {a.institution ? ` | ${a.institution}` : ""}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">ID: {a.id}</div>
                  </div>

                  <button
                    onClick={() => {
                      if (!confirm("Hapus atlet ini?")) return
                      removeAthlete(a.id)
                    }}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-extrabold hover:bg-red-100"
                    disabled={!paymentApproved}
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <Link
              href="/dashboard/pendaftaran/dokumen"
              className={cx(
                "px-5 py-2 rounded-xl font-extrabold text-center",
                paymentApproved ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-600 cursor-not-allowed"
              )}
              onClick={(e) => {
                if (!paymentApproved) {
                  e.preventDefault()
                  alert("Step 4 hanya bisa dibuka setelah pembayaran APPROVED.")
                }
              }}
            >
              Lanjut Step 4 (Upload Dokumen)
            </Link>

            <Link
              href="/dashboard/pembayaran"
              className="px-5 py-2 rounded-xl font-extrabold border bg-white hover:bg-gray-50 text-center"
            >
              Kembali Step 2
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
