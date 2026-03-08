"use client"

import { useAuth } from "@/context/AuthContext"
import { useEffect, useMemo, useState } from "react"
import { getFileBlob } from "@/lib/fileStore"
import { Repos } from "@/repositories"
import type { AthleteDocuments, DocumentStatus, Registration, Athlete } from "@/types/registration"

type DocKey = keyof Omit<AthleteDocuments, "athleteId">
type ReviewStatus = Exclude<DocumentStatus, "EMPTY" | "UPLOADED">
type DocFilter = "ALL" | "ACC" | "BELUM_ACC"
type KontingenFilter = "ALL" | "SUDAH_APPROVE" | "BELUM_APPROVE" | "SUDAH_SUBMIT" | "BELUM_SUBMIT"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function docLabel(key: DocKey) {
  switch (key) {
    case "dapodik":
      return "1) Bukti terdaftar di Dapodik / PD-Dikti"
    case "ktp":
      return "2) KTP / KIA"
    case "kartu":
      return "3) Kartu Pelajar / KTM"
    case "raport":
      return "4) Raport / KHS"
    case "foto":
      return "5) Pas foto"
    default:
      return key
  }
}

function badge(status: DocumentStatus) {
  const base = "inline-flex items-center px-2 py-1 rounded-full text-xs font-extrabold border"
  if (status === "EMPTY") return <span className={`${base} bg-gray-50 border-gray-200 text-gray-600`}>EMPTY</span>
  if (status === "UPLOADED") return <span className={`${base} bg-yellow-50 border-yellow-200 text-yellow-800`}>UPLOADED</span>
  if (status === "APPROVED") return <span className={`${base} bg-green-50 border-green-200 text-green-800`}>APPROVED</span>
  return <span className={`${base} bg-red-50 border-red-200 text-red-700`}>REJECTED</span>
}


function isImageMime(mime?: string) {
  if (!mime) return false
  return mime.startsWith("image/")
}

function isPdfMime(mime?: string) {
  if (!mime) return false
  return mime === "application/pdf" || mime.includes("pdf")
}

const DOC_KEYS: DocKey[] = ["dapodik", "ktp", "kartu", "raport", "foto"]

function getAthleteDocStatusSummary(registration: Registration | null, athleteId: string): "ACC" | "BELUM_ACC" {
  if (!registration) return "BELUM_ACC"
  const doc = registration.documents.find((d) => d.athleteId === athleteId)
  if (!doc) return "BELUM_ACC"
  for (const key of DOC_KEYS) {
    const status = doc[key]?.status as DocumentStatus | undefined
    if (status !== "APPROVED") return "BELUM_ACC"
  }
  return "ACC"
}

function summarizeKontingenDocs(reg: Registration, athletes: Athlete[]) {
  let totalDocs = 0
  let approvedDocs = 0
  let submittedDocs = 0

  for (const athlete of athletes) {
    const doc = reg.documents.find((d) => d.athleteId === athlete.id)
    if (!doc) continue

    for (const key of DOC_KEYS) {
      totalDocs += 1
      const status = doc[key]?.status ?? "EMPTY"
      if (status === "APPROVED") approvedDocs += 1
      if (status !== "EMPTY") submittedDocs += 1
    }
  }

  return {
    totalDocs,
    approvedDocs,
    submittedDocs,
    isAllApproved: totalDocs > 0 && approvedDocs === totalDocs,
    isAnySubmitted: submittedDocs > 0,
  }
}

export default function AdminDokumenPage() {
  const { getAllUsers, user: adminUser, canAccessSport } = useAuth()

  const [targetUserId, setTargetUserId] = useState<string>("")
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("")
  const [docFilter, setDocFilter] = useState<DocFilter>("ALL")
  const [kontingenFilter, setKontingenFilter] = useState<KontingenFilter>("ALL")
  const [kontingenQuery, setKontingenQuery] = useState("")
  const [preview, setPreview] = useState<{
    open: boolean
    loading: boolean
    error: string | null
    title: string
    fileName: string
    url: string
    mime?: string
  }>({ open: false, loading: false, error: null, title: "", fileName: "", url: "", mime: "" })
  const pesertaUsersAll = useMemo(() => {
    return getAllUsers().filter((u) => u.role === "PESERTA")
  }, [getAllUsers])

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

  const filteredKontingen = useMemo(() => {
    const q = kontingenQuery.trim().toLowerCase()

    return visibleKontingen.filter(({ u, reg }) => {
      const scopedAthletes =
        adminUser?.role === "ADMIN_CABOR" ? reg!.athletes.filter((a) => canAccessSport(a.sportId)) : reg!.athletes
      const summary = summarizeKontingenDocs(reg!, scopedAthletes)

      const matchFilter =
        kontingenFilter === "ALL"
          ? true
          : kontingenFilter === "SUDAH_APPROVE"
          ? summary.isAllApproved
          : kontingenFilter === "BELUM_APPROVE"
          ? !summary.isAllApproved
          : kontingenFilter === "SUDAH_SUBMIT"
          ? summary.isAnySubmitted
          : !summary.isAnySubmitted

      if (!matchFilter) return false
      if (!q) return true

      const haystack = [u.institutionName, u.email, reg!.sports.map((s) => s.name).join(" ")].join(" ").toLowerCase()
      return haystack.includes(q)
    })
  }, [visibleKontingen, adminUser, canAccessSport, kontingenFilter, kontingenQuery])

  useEffect(() => {
    if (filteredKontingen.length > 0 && !targetUserId) {
      setTargetUserId(filteredKontingen[0].u.id)
    }
    if (filteredKontingen.length === 0) {
      setTargetUserId("")
      setRegistration(null)
      setSelectedAthleteId("")
    }
  }, [filteredKontingen, targetUserId])

  useEffect(() => {
    let active = true

    const loadRegistration = async () => {
      if (!targetUserId) return
      const reg = (await Repos.registration.getRegistrationByUserId(targetUserId)) as unknown as Registration | null
      if (!active) return
      setRegistration(reg)

      if (reg?.athletes?.length) setSelectedAthleteId(reg.athletes[0].id)
      else setSelectedAthleteId("")
    }

    void loadRegistration()
    return () => {
      active = false
    }
  }, [targetUserId])
  const visibleAthletes = useMemo(() => {
    if (!registration || !adminUser) return []
    if (adminUser.role === "ADMIN" || adminUser.role === "SUPER_ADMIN") return registration.athletes

    if (adminUser.role === "ADMIN_CABOR") {
      return registration.athletes.filter((a) => canAccessSport(a.sportId))
    }

    return []
  }, [registration, adminUser, canAccessSport])

  const filteredVisibleAthletes = useMemo(() => {
    if (docFilter === "ALL") return visibleAthletes
    return visibleAthletes.filter((athlete) => getAthleteDocStatusSummary(registration, athlete.id) === docFilter)
  }, [visibleAthletes, registration, docFilter])

  useEffect(() => {
    if (filteredVisibleAthletes.length === 0) {
      setSelectedAthleteId("")
      return
    }

    const selectedStillVisible = filteredVisibleAthletes.some((athlete) => athlete.id === selectedAthleteId)
    if (!selectedStillVisible) {
      setSelectedAthleteId(filteredVisibleAthletes[0].id)
    }
  }, [filteredVisibleAthletes, selectedAthleteId])

  const selectedAthlete: Athlete | null = useMemo(() => {
    if (!selectedAthleteId) return null
    return visibleAthletes.find((a) => a.id === selectedAthleteId) ?? null
  }, [visibleAthletes, selectedAthleteId])

  const selectedDocs = useMemo(() => {
    if (!registration || !selectedAthlete) return null
    return registration.documents.find((d) => d.athleteId === selectedAthlete.id) ?? null
  }, [registration, selectedAthlete])

  const openPreview = async (docKey: DocKey) => {
    if (!selectedDocs) return
    const item = selectedDocs[docKey] as any
    const fileId = item?.fileId as string | undefined
    const fileName = item?.fileName as string | undefined
    const mime = item?.mimeType as string | undefined

    if (!fileId) {
      alert("File belum diupload.")
      return
    }

    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: true, loading: true, error: null, title: docLabel(docKey), fileName: fileName ?? "", url: "", mime: mime ?? "" })

    try {
      const blob = await getFileBlob(fileId)
      if (!blob) {
        setPreview((prev) => ({ ...prev, loading: false, error: "File tidak tersedia di browser ini (kemungkinan upload dilakukan di browser/perangkat lain atau storage sudah dibersihkan)." }))
        return
      }
      const url = URL.createObjectURL(blob)
      const finalMime = mime || blob.type || "application/octet-stream"
      setPreview({ open: true, loading: false, error: null, title: docLabel(docKey), fileName: fileName ?? "", url, mime: finalMime })
    } catch {
      setPreview((prev) => ({ ...prev, loading: false, error: "Gagal membuka dokumen." }))
    }
  }


  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: false, loading: false, error: null, title: "", fileName: "", url: "", mime: "" })
  }

  const updateDoc = async (docKey: DocKey, status: ReviewStatus) => {
    if (!registration || !selectedAthleteId) return

    const reg = registration
    if (!reg) return

    const athlete = reg.athletes.find((a) => a.id === selectedAthleteId)
    if (!athlete) return
    if (adminUser?.role === "ADMIN_CABOR" && !canAccessSport(athlete.sportId)) {
      alert("Anda tidak memiliki akses untuk cabor ini.")
      return
    }

    const updatedDocs = reg.documents.map((d) => {
      if (d.athleteId !== selectedAthleteId) return d
      return {
        ...d,
        [docKey]: {
          ...d[docKey],
          status,
        },
      }
    })

    const updated: Registration = {
      ...reg,
      documents: updatedDocs,
      updatedAt: new Date().toISOString(),
    }

    try {
      await Repos.registration.adminUpdateDoc({
        userId: targetUserId,
        athleteId: selectedAthleteId,
        docKey,
        status,
      })
      setRegistration(updated)
    } catch {
      alert("Gagal menyimpan validasi dokumen.")
    }
  }

  const docsCounters = useMemo(() => {
    const acc = { APPROVED: 0, REJECTED: 0, UPLOADED: 0, EMPTY: 0 }
    for (const a of visibleAthletes) {
      const doc = registration?.documents.find((d) => d.athleteId === a.id)
      if (!doc) continue
      for (const key of DOC_KEYS) {
        const st = (doc as any)[key]?.status ?? "EMPTY"
        acc[st] += 1
      }
    }
    return acc
  }, [visibleAthletes, registration])

  return (
    <div className="max-w-7xl space-y-6">
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>

            <h1 className="text-2xl font-extrabold text-gray-900">Validasi Dokumen Atlet</h1>
            <p className="text-gray-600 mt-2">
              Menu Validasi Dokumen Peserta lomba
            </p>
            {adminUser?.role === "ADMIN_CABOR" && (
              <div className="mt-2 text-xs text-gray-500">Mode Admin Cabor: hanya atlet sesuai cabor yang ditugaskan.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Approved</div><div className="mt-1 text-2xl font-extrabold text-green-700">{docsCounters.APPROVED}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Rejected</div><div className="mt-1 text-2xl font-extrabold text-red-700">{docsCounters.REJECTED}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Uploaded</div><div className="mt-1 text-2xl font-extrabold text-yellow-700">{docsCounters.UPLOADED}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs text-gray-500">Empty</div><div className="mt-1 text-2xl font-extrabold text-gray-700">{docsCounters.EMPTY}</div></div>
      </div>

      
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-3">
        <div className="text-sm font-extrabold text-gray-900">Pilih Kontingen</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={kontingenQuery}
            onChange={(e) => setKontingenQuery(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
            placeholder="Cari nama kontingen / email / cabor"
          />
          <select
            value={kontingenFilter}
            onChange={(e) => setKontingenFilter(e.target.value as KontingenFilter)}
            className="w-full border rounded-xl px-3 py-2"
          >
            <option value="ALL">Semua Kontingen</option>
            <option value="SUDAH_APPROVE">Kontingen Sudah Approve</option>
            <option value="BELUM_APPROVE">Kontingen Belum Approve</option>
            <option value="SUDAH_SUBMIT">Kontingen Sudah Submit Dokumen</option>
            <option value="BELUM_SUBMIT">Kontingen Belum Submit Dokumen</option>
          </select>
        </div>
        {filteredKontingen.length === 0 ? (
          <div className="text-sm text-gray-500">Tidak ada kontingen yang cocok dengan filter.</div>
        ) : (
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
          >
            {filteredKontingen.map(({ u, reg }) => {
              const scopedAthletes = adminUser?.role === "ADMIN_CABOR" ? reg!.athletes.filter((a) => canAccessSport(a.sportId)) : reg!.athletes
              const summary = summarizeKontingenDocs(reg!, scopedAthletes)
              return (
                <option key={u.id} value={u.id}>
                  {u.institutionName} - {u.email} ({summary.approvedDocs}/{summary.totalDocs} approved, {summary.submittedDocs}/{summary.totalDocs} submit)
                </option>
              )
            })}
          </select>
        )}
      </div>

      
      {!registration ? (
        <div className="bg-white border rounded-2xl p-6 shadow-sm text-sm text-gray-500">
          Kontingen ini belum memulai pendaftaran / belum ada data registration.
        </div>
      ) : filteredVisibleAthletes.length === 0 ? (
        <div className="bg-white border rounded-2xl p-6 shadow-sm text-sm text-gray-500">
          Tidak ada atlet yang cocok dengan filter dokumen pada kontingen ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div className="text-lg font-extrabold text-gray-900">Data Atlet</div><select value={docFilter} onChange={(e) => setDocFilter(e.target.value as DocFilter)} className="w-full border rounded-xl px-3 py-2 text-sm md:w-[240px]"><option value="ALL">Semua Dokumen</option><option value="ACC">Sudah ACC</option><option value="BELUM_ACC">Belum ACC</option></select></div>

            <select
              value={selectedAthleteId}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
            >
              {filteredVisibleAthletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {!selectedAthlete ? (
              <div className="text-sm text-gray-500">Atlet tidak ditemukan.</div>
            ) : (
              <div className="rounded-2xl border bg-gray-50 p-4 space-y-2">
                <div className="text-sm">
                  <b>Nama:</b> {selectedAthlete.name}
                </div>
                <div className="text-sm">
                  <b>Gender:</b> {selectedAthlete.gender}
                </div>
                <div className="text-sm">
                  <b>Tgl Lahir:</b> {selectedAthlete.birthDate || "-"}
                </div>
                <div className="text-sm">
                  <b>Asal:</b> {selectedAthlete.institution || "-"}
                </div>
                <div className="text-sm">
                  <b>Cabor:</b>{" "}
                  {registration.sports.find((s) => s.id === selectedAthlete.sportId)?.name ?? selectedAthlete.sportId}
                </div>
                <div className="text-sm">
                  <b>Kategori:</b>{" "}
                  {registration.sports
                    .find((s) => s.id === selectedAthlete.sportId)
                    ?.categories?.find((c) => c.id === selectedAthlete.categoryId)?.name ?? selectedAthlete.categoryId}
                </div>
                <div className="text-xs text-gray-500 pt-2">Athlete ID: {selectedAthlete.id}</div>
              </div>
            )}
          </div>

          
          <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="text-lg font-extrabold text-gray-900">Dokumen</div>

            {!selectedDocs ? (
              <div className="text-sm text-gray-500">Belum ada dokumen untuk atlet ini.</div>
            ) : (
              <div className="space-y-3">
                {DOC_KEYS.map((docKey) => {
                  const d = selectedDocs[docKey]
                  const fileId = (d as any)?.fileId
                  const hasFile = typeof fileId === "string" && fileId.trim().length > 0

                  return (
                    <div key={docKey} className="rounded-2xl border p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="font-extrabold text-gray-900">{docLabel(docKey)}</div>
                          <div className="mt-2 flex items-center gap-2">
                            {badge(d.status)}
                            <span className="text-xs text-gray-500">{d.fileName ?? "-"}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Upload: {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString("id-ID") : "-"}
                          </div>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 md:w-[430px]">
                          <button
                            type="button"
                            onClick={() => openPreview(docKey)}
                            disabled={!hasFile}
                            className={`w-full px-3 py-2 rounded-xl font-extrabold border ${
                              hasFile ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                            title={!hasFile ? "Belum ada file" : "Buka dokumen"}
                          >
                            Buka Dokumen
                          </button>

                          <button
                            type="button"
                            onClick={() => updateDoc(docKey, "APPROVED")}
                            className="w-full px-3 py-2 rounded-xl font-extrabold bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled={!hasFile}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDoc(docKey, "REJECTED")}
                            className="w-full px-3 py-2 rounded-xl font-extrabold bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled={!hasFile}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      
      {preview.open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between gap-3">
              <div>
                <div className="font-extrabold text-gray-900">{preview.title}</div>
                <div className="text-xs text-gray-500 break-all">{preview.fileName}</div>
              </div>
              <div className="flex gap-2">
                {preview.url ? (
                  <a href={preview.url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50">Buka Tab Baru</a>
                ) : (
                  <span className="px-3 py-2 rounded-xl border bg-gray-100 text-xs font-bold text-gray-500">File belum siap</span>
                )}
                <button
                  onClick={closePreview}
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white font-extrabold hover:bg-black"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="p-4">
              {selectedAthlete && (
                <div className="mb-4 grid grid-cols-1 gap-2 rounded-xl border bg-gray-50 p-3 text-xs text-gray-700 md:grid-cols-2">
                  <div><b>Nama:</b> {selectedAthlete.name}</div>
                  <div><b>Gender:</b> {selectedAthlete.gender}</div>
                  <div><b>Tgl Lahir:</b> {selectedAthlete.birthDate || "-"}</div>
                  <div><b>Asal:</b> {selectedAthlete.institution || "-"}</div>
                </div>
              )}
              {preview.loading && <div className="text-sm text-gray-600">Memuat file...</div>}
              {!preview.loading && preview.error && <div className="text-sm text-red-700">{preview.error}</div>}
              
              {!preview.loading && !preview.error && preview.url && isImageMime(preview.mime) && (
                <div className="w-full flex justify-center">
                  
                  <img src={preview.url} alt={preview.title} className="max-h-[70vh] object-contain rounded-xl border" />
                </div>
              )}

              
              {!preview.loading && !preview.error && preview.url && isPdfMime(preview.mime) && (
                <div className="w-full h-[70vh] rounded-xl border overflow-hidden">
                  <iframe title="pdf-preview" src={preview.url} className="w-full h-full" />
                </div>
              )}

              
              {!preview.loading && !preview.error && preview.url && !isImageMime(preview.mime) && !isPdfMime(preview.mime) && (
                <div className="text-sm text-gray-600">
                  Tipe file: <b>{preview.mime || "unknown"}</b>. Silakan klik <b>Buka Tab Baru</b> untuk melihat file.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}











































