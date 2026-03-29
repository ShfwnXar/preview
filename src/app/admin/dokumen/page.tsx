"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  DOCUMENT_STATUS_OPTIONS,
  DOCUMENT_FIELD_KEYS,
  getDocumentCatalogForParticipant,
  getParticipantDocumentCategory,
  type DocumentKey,
  type DocumentStatus,
  type ParticipantDocumentCategory,
} from "@/data/documentCatalog"
import { downloadFileBlob, getFileBlob } from "@/lib/fileStore"
import { Repos } from "@/repositories"
import type { Athlete, AthleteDocuments, Registration } from "@/types/registration"

type StoredUserLite = {
  id: string
  institutionName: string
  email: string
  institutionType?: string
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("id-ID")
  } catch {
    return value
  }
}

function statusBadge(status?: string) {
  if (status === "Disetujui") return "border-green-200 bg-green-50 text-green-800"
  if (status === "Sudah upload") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  if (status === "Perlu revisi") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "Ditolak") return "border-red-200 bg-red-50 text-red-800"
  return "border-gray-200 bg-gray-100 text-gray-700"
}

function isImageMime(mime?: string) {
  return !!mime && mime.startsWith("image/")
}

function isPdfMime(mime?: string) {
  return !!mime && (mime === "application/pdf" || mime.includes("pdf"))
}

export default function AdminDokumenPage() {
  const { getAllUsers, user: adminUser, canAccessSport } = useAuth()

  const [targetUserId, setTargetUserId] = useState("")
  const [selectedAthleteId, setSelectedAthleteId] = useState("")
  const [, setRevision] = useState(0)
  const [participantFilter, setParticipantFilter] = useState<"ALL" | ParticipantDocumentCategory>("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | DocumentStatus>("ALL")
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState<{ open: boolean; title: string; url: string; mime?: string; error?: string }>({
    open: false,
    title: "",
    url: "",
  })

  const participantUsers = useMemo(() => {
    return (getAllUsers() as StoredUserLite[]).filter((user) => {
      if ((user as { role?: string }).role !== "PESERTA") return false
      const registration = safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${user.id}`), null)
      if (!registration) return false
      if (!adminUser) return false
      if (adminUser.role === "ADMIN" || adminUser.role === "SUPER_ADMIN") return true
      if (adminUser.role === "ADMIN_CABOR") return registration.athletes.some((athlete) => canAccessSport(athlete.sportId))
      return false
    })
  }, [adminUser, canAccessSport, getAllUsers])

  const filteredUsers = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase()
    return participantUsers.filter((user) => {
      const participantCategory = getParticipantDocumentCategory(user.institutionType)
      if (participantFilter !== "ALL" && participantCategory !== participantFilter) return false
      if (!loweredQuery) return true
      return [user.institutionName, user.email, participantCategory].join(" ").toLowerCase().includes(loweredQuery)
    })
  }, [participantFilter, participantUsers, query])

  const activeUser = filteredUsers.find((user) => user.id === targetUserId) ?? filteredUsers[0] ?? null
  const registration = activeUser
    ? safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${activeUser.id}`), null)
    : null
  const participantCategory = getParticipantDocumentCategory(activeUser?.institutionType)
  const documentCatalog = getDocumentCatalogForParticipant(activeUser?.institutionType)

  const visibleAthletes = useMemo(() => {
    if (!registration) return []
    const base = adminUser?.role === "ADMIN_CABOR" ? registration.athletes.filter((athlete) => canAccessSport(athlete.sportId)) : registration.athletes
    if (statusFilter === "ALL") return base
    return base.filter((athlete) => {
      const docs = registration.documents.find((item) => item.athleteId === athlete.id)
      return documentCatalog.some((item) => (docs?.[item.key]?.status ?? "Belum upload") === statusFilter)
    })
  }, [adminUser?.role, canAccessSport, documentCatalog, registration, statusFilter])

  const selectedAthlete = visibleAthletes.find((athlete) => athlete.id === selectedAthleteId) ?? visibleAthletes[0] ?? null
  const selectedDocs = registration?.documents.find((item) => item.athleteId === selectedAthlete?.id) ?? null

  const updateDoc = async (docKey: DocumentKey, status: Exclude<DocumentStatus, "Belum upload" | "Sudah upload">) => {
    if (!registration || !activeUser || !selectedAthlete || !selectedDocs) return
    const current = selectedDocs[docKey]
    if (!current?.fileId) {
      alert("Dokumen belum diunggah.")
      return
    }

    let note = current.note
    if (status === "Perlu revisi" || status === "Ditolak") {
      const input = window.prompt("Catatan validator wajib diisi:", current.note ?? "")
      if (!input || !input.trim()) return
      note = input.trim()
    }

    const validatedAt = new Date().toISOString()
    const validatedBy = adminUser?.picName ?? adminUser?.email ?? "Validator"

    const nextDocs = registration.documents.map((doc) => {
      if (doc.athleteId !== selectedAthlete.id) return doc
      return {
        ...doc,
        [docKey]: {
          ...doc[docKey],
          status,
          note,
          validatedAt,
          validatedBy,
        },
      }
    })

    const nextRegistration: Registration = { ...registration, documents: nextDocs, updatedAt: validatedAt }
    localStorage.setItem(`mg26_registration_${activeUser.id}`, JSON.stringify(nextRegistration))

    await Repos.registration.adminUpdateDoc({
      userId: activeUser.id,
      athleteId: selectedAthlete.id,
      docKey,
      status,
      note,
      validatedBy,
    }).catch(() => {})

    setRevision((value) => value + 1)
  }

  const openPreview = async (docKey: DocumentKey) => {
    const fileId = selectedDocs?.[docKey]?.fileId
    if (!fileId) {
      alert("Dokumen belum diunggah.")
      return
    }
    const blob = await getFileBlob(fileId)
    if (!blob) {
      setPreview({ open: true, title: selectedDocs?.[docKey]?.fileName ?? "Dokumen", url: "", error: "File tidak tersedia di browser ini." })
      return
    }
    const url = URL.createObjectURL(blob)
    setPreview({ open: true, title: selectedDocs?.[docKey]?.fileName ?? "Dokumen", url, mime: selectedDocs?.[docKey]?.mimeType || blob.type })
  }

  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: false, title: "", url: "" })
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Validasi Dokumen Peserta</h1>
        <p className="mt-2 text-gray-600">
          Menu validasi menampilkan dokumen berdasarkan kategori <b>Pelajar</b> dan <b>Mahasiswa</b> dengan daftar yang identik dengan form upload.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-xl border px-3 py-2" placeholder="Cari kontingen / email" />
          <select value={participantFilter} onChange={(e) => setParticipantFilter(e.target.value as "ALL" | ParticipantDocumentCategory)} className="rounded-xl border px-3 py-2">
            <option value="ALL">Semua kategori peserta</option>
            <option value="Pelajar">Pelajar</option>
            <option value="Mahasiswa">Mahasiswa</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | DocumentStatus)} className="rounded-xl border px-3 py-2">
            <option value="ALL">Semua status validasi</option>
            {DOCUMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <select value={activeUser?.id ?? ""} onChange={(e) => { setTargetUserId(e.target.value); setSelectedAthleteId("") }} className="w-full rounded-xl border px-3 py-2">
          {filteredUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.institutionName} | {getParticipantDocumentCategory(user.institutionType)} | {user.email}
            </option>
          ))}
        </select>
      </div>

      {!registration || !activeUser ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500 shadow-sm">Belum ada kontingen yang cocok dengan filter.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <div className="text-lg font-extrabold text-gray-900">Daftar Atlet</div>
            <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
              <div><b>Kontingen:</b> {activeUser.institutionName}</div>
              <div className="mt-1"><b>Kategori peserta:</b> {participantCategory}</div>
            </div>
            <select value={selectedAthlete?.id ?? ""} onChange={(e) => setSelectedAthleteId(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              {visibleAthletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-1">
              <div className="text-lg font-extrabold text-gray-900">Menu Validasi Dokumen</div>
              <div className="text-sm text-gray-600">Kategori {participantCategory}. Daftar dokumen berikut identik dengan form upload.</div>
            </div>

            {!selectedAthlete || !selectedDocs ? (
              <div className="text-sm text-gray-500">Atlet atau dokumen belum tersedia.</div>
            ) : (
              <div className="space-y-4">
                {documentCatalog.map((item) => {
                  const doc = selectedDocs[item.key]
                  const hasFile = !!doc?.fileId
                  const currentStatus = doc?.status ?? "Belum upload"

                  return (
                    <div key={item.key} className="rounded-2xl border border-gray-200 p-4">
                      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                        <div className="space-y-2 text-sm text-gray-700">
                          <div className="font-extrabold text-gray-900">{item.label}</div>
                          <div><b>Kategori peserta:</b> {participantCategory}</div>
                          <div>
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(currentStatus)}`}>{currentStatus}</span>
                          </div>
                          <div><b>Catatan validator:</b> {doc?.note ?? "-"}</div>
                          <div><b>Tanggal upload:</b> {formatDateTime(doc?.uploadedAt)}</div>
                          <div><b>Tanggal validasi:</b> {formatDateTime(doc?.validatedAt)}</div>
                          <div><b>Validator:</b> {doc?.validatedBy ?? "-"}</div>
                          <div><b>Nama file:</b> {doc?.fileName ?? "-"}</div>
                        </div>

                        <div className="space-y-2">
                          <button type="button" onClick={() => openPreview(item.key)} disabled={!hasFile} className={`w-full rounded-xl border px-3 py-2 text-sm font-extrabold ${hasFile ? "bg-white hover:bg-gray-50" : "cursor-not-allowed bg-gray-100 text-gray-400"}`}>Lihat dokumen</button>
                          <button type="button" onClick={() => hasFile && void downloadFileBlob(doc.fileId!, doc.fileName ?? item.label)} disabled={!hasFile} className={`w-full rounded-xl border px-3 py-2 text-sm font-extrabold ${hasFile ? "bg-white hover:bg-gray-50" : "cursor-not-allowed bg-gray-100 text-gray-400"}`}>Unduh dokumen</button>
                          <button type="button" onClick={() => void updateDoc(item.key, "Disetujui")} disabled={!hasFile} className="w-full rounded-xl bg-green-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500">Disetujui</button>
                          <button type="button" onClick={() => void updateDoc(item.key, "Perlu revisi")} disabled={!hasFile} className="w-full rounded-xl bg-amber-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-500">Perlu revisi</button>
                          <button type="button" onClick={() => void updateDoc(item.key, "Ditolak")} disabled={!hasFile} className="w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500">Ditolak</button>
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

      {preview.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <div className="font-extrabold text-gray-900">{preview.title}</div>
              <button onClick={closePreview} className="rounded-xl bg-gray-900 px-3 py-2 font-extrabold text-white hover:bg-black">Tutup</button>
            </div>
            <div className="p-4">
              {preview.error ? <div className="text-sm text-red-700">{preview.error}</div> : null}
              {!preview.error && preview.url && isImageMime(preview.mime) ? <img src={preview.url} alt={preview.title} className="max-h-[70vh] w-full rounded-xl border object-contain" /> : null}
              {!preview.error && preview.url && isPdfMime(preview.mime) ? <iframe title="pdf-preview" src={preview.url} className="h-[70vh] w-full rounded-xl border" /> : null}
              {!preview.error && preview.url && !isImageMime(preview.mime) && !isPdfMime(preview.mime) ? (
                <div className="text-sm text-gray-600">Pratinjau tidak tersedia untuk tipe file ini. Silakan gunakan tombol unduh dokumen.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
