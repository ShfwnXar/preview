"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ENV } from "@/config/env"
import { Modal } from "@/components/ui/Modal"
import { useAuth } from "@/context/AuthContext"
import { useRegistration } from "@/context/RegistrationContext"
import {
  getDocumentCatalogForParticipant,
  getParticipantDocumentCategory,
  isUploadedDocumentStatus,
  type DocumentKey,
} from "@/data/documentCatalog"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { putFileBlob } from "@/lib/fileStore"

function formatISO(iso?: string) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

function getCategoryMeta(sportId?: string, categoryId?: string) {
  const sport = SPORTS_CATALOG.find((item) => item.id === sportId)
  const category = sport?.categories.find((item) => item.id === categoryId)

  return {
    sportName: sport?.name ?? sportId ?? "-",
    categoryName: category?.name ?? categoryId ?? "-",
    rosterSize: Math.max(1, category?.rosterSize ?? 1),
  }
}

function getDocStatusMeta(status?: string) {
  if (status === "Disetujui") return { label: status, badgeClass: "bg-green-50 border-green-200 text-green-800" }
  if (status === "Sudah upload") return { label: status, badgeClass: "bg-yellow-50 border-yellow-200 text-yellow-800" }
  if (status === "Perlu revisi") return { label: status, badgeClass: "bg-amber-50 border-amber-200 text-amber-800" }
  if (status === "Ditolak") return { label: status, badgeClass: "bg-red-50 border-red-200 text-red-800" }
  return { label: "Belum upload", badgeClass: "bg-gray-100 border-gray-200 text-gray-700" }
}

export default function Step4DokumenPage() {
  const { user } = useAuth()
  const { state, hydrateReady, upsertDocFile, uploadDocument } = useRegistration()
  const paymentApproved = state.payment.status === "APPROVED"

  const participantCategory = getParticipantDocumentCategory(user?.institutionType)
  const documentCatalog = getDocumentCatalogForParticipant(user?.institutionType)

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("")
  const [loadingKey, setLoadingKey] = useState<DocumentKey | null>(null)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionNotified, setCompletionNotified] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<DocumentKey, File>>>({})

  const athletes = state.athletes

  const docsForSelected = useMemo(() => {
    if (!selectedAthleteId) return null
    return state.documents.find((doc) => doc.athleteId === selectedAthleteId) ?? null
  }, [selectedAthleteId, state.documents])

  const selectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return null
    return athletes.find((athlete) => athlete.id === selectedAthleteId) ?? null
  }, [athletes, selectedAthleteId])

  const athleteProgress = useMemo(() => {
    const progressMap = new Map<string, { uploaded: number; total: number }>()
    for (const athlete of athletes) {
      const doc = state.documents.find((item) => item.athleteId === athlete.id)
      const uploaded = documentCatalog.reduce(
        (count, item) => count + (isUploadedDocumentStatus(doc?.[item.key]?.status) ? 1 : 0),
        0
      )
      progressMap.set(athlete.id, { uploaded, total: documentCatalog.length })
    }
    return progressMap
  }, [athletes, documentCatalog, state.documents])

  useEffect(() => {
    if (!hydrateReady || selectedAthleteId || athletes.length === 0) return
    setSelectedAthleteId(athletes[0].id)
  }, [athletes, hydrateReady, selectedAthleteId])

  useEffect(() => {
    if (completionNotified || athletes.length === 0) return
    const allComplete = athletes.every((athlete) => {
      const doc = state.documents.find((item) => item.athleteId === athlete.id)
      return documentCatalog.every((item) => isUploadedDocumentStatus(doc?.[item.key]?.status))
    })
    if (allComplete) {
      setShowCompletionModal(true)
      setCompletionNotified(true)
    }
  }, [athletes, completionNotified, documentCatalog, state.documents])

  const onPickFile = (docKey: DocumentKey, file: File | null) => {
    if (!file) {
      setPendingFiles((prev) => ({ ...prev, [docKey]: undefined }))
      return
    }
    setMsg(null)

    if (!paymentApproved) {
      setMsg({ type: "error", text: "Step 4 terkunci: pembayaran harus APPROVED terlebih dahulu." })
      return
    }
    if (!selectedAthleteId) {
      setMsg({ type: "error", text: "Pilih atlet terlebih dahulu." })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: "error", text: "Ukuran file terlalu besar. Maksimal 10MB." })
      return
    }

    setPendingFiles((prev) => ({ ...prev, [docKey]: file }))
  }

  const onSubmitFile = async (docKey: DocumentKey) => {
    const file = pendingFiles[docKey]
    if (!file || !selectedAthleteId || !paymentApproved) return

    setMsg(null)
    setLoadingKey(docKey)
    try {
      if (ENV.USE_MOCK) {
        const fileId = `doc_${selectedAthleteId}_${docKey}_${Date.now()}_${Math.random().toString(16).slice(2)}`
        await putFileBlob(fileId, file)
        upsertDocFile(selectedAthleteId, docKey, fileId, file.name, file.type || "application/octet-stream")
      } else {
        await uploadDocument(selectedAthleteId, docKey, file)
      }

      setPendingFiles((prev) => ({ ...prev, [docKey]: undefined }))
      setMsg({ type: "success", text: "Dokumen berhasil diunggah." })
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal upload dokumen." })
    } finally {
      setLoadingKey(null)
    }
  }

  if (!hydrateReady) {
    return <div className="max-w-5xl rounded-xl border bg-white p-6 text-sm text-gray-600">Memuat dokumen...</div>
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Modal open={showCompletionModal} onClose={() => setShowCompletionModal(false)} title="Dokumen Berhasil Dilengkapi" className="max-w-lg">
        <p className="text-sm text-gray-700">Semua dokumen wajib sudah terisi. Silakan menunggu proses validasi admin.</p>
      </Modal>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Step 4 - Upload Dokumen Per Atlet</h1>
            <p className="mt-2 text-gray-600">
              Kategori peserta aktif: <b>{participantCategory}</b>. Daftar dokumen di bawah sudah disamakan dengan acuan resmi dan wajib dilengkapi per atlet.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">Payment: {state.payment.status}</span>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">Dokumen wajib: {documentCatalog.length}</span>
            </div>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Navigasi</div>
            <div className="mt-2 flex gap-2">
              <Link href="/dashboard/pendaftaran/atlet" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50">Kembali Step 3</Link>
              <Link href="/dashboard/status" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50">Status</Link>
            </div>
          </div>
        </div>
      </div>

      {msg ? (
        <div className={`rounded-xl border p-4 text-sm ${msg.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {msg.text}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div className="text-lg font-extrabold text-gray-900">Pilih Atlet</div>
        {athletes.length === 0 ? (
          <div className="text-sm text-gray-600">Belum ada atlet. Lengkapi Step 3 terlebih dahulu.</div>
        ) : (
          <>
            <select value={selectedAthleteId} onChange={(e) => setSelectedAthleteId(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              {athletes.map((athlete) => {
                const progress = athleteProgress.get(athlete.id)
                return (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name} ({getCategoryMeta(athlete.sportId, athlete.categoryId).sportName} / {getCategoryMeta(athlete.sportId, athlete.categoryId).categoryName}) | Dokumen {progress?.uploaded ?? 0}/{progress?.total ?? documentCatalog.length}
                  </option>
                )
              })}
            </select>

            {selectedAthlete ? (
              <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
                <div><b>Nama:</b> {selectedAthlete.name}</div>
                <div className="mt-1"><b>Kategori peserta:</b> {participantCategory}</div>
                <div className="mt-1"><b>Cabor/Kategori lomba:</b> {getCategoryMeta(selectedAthlete.sportId, selectedAthlete.categoryId).sportName} / {getCategoryMeta(selectedAthlete.sportId, selectedAthlete.categoryId).categoryName}</div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {athletes.length > 0 && docsForSelected ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-extrabold text-gray-900">Daftar Dokumen Upload</div>
              <div className="text-sm text-gray-600">Kategori {participantCategory} wajib mengunggah {documentCatalog.length} dokumen berikut.</div>
            </div>
            <div className="text-xs text-gray-500">Format file: PDF/JPG/PNG | Maks 10MB</div>
          </div>

          <div className="space-y-4">
            {documentCatalog.map((item, index) => {
              const savedDoc = docsForSelected[item.key]
              const selectedFile = pendingFiles[item.key]
              const statusMeta = getDocStatusMeta(savedDoc?.status)

              return (
                <div key={item.key} className="rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/60 p-4 md:p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div>
                      <div className="font-extrabold text-gray-900">{index + 1}) {item.label}</div>
                      <div className="mt-1 text-xs text-gray-600">{item.hint}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                        <span className="text-xs text-gray-500">Tanggal upload: <b>{formatISO(savedDoc?.uploadedAt)}</b></span>
                        <span className="text-xs text-gray-500">File: <b>{savedDoc?.fileName ?? "-"}</b></span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={!paymentApproved || loadingKey === item.key}
                        onChange={(e) => onPickFile(item.key, e.target.files?.[0] ?? null)}
                        className="w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:font-semibold file:text-white hover:file:bg-emerald-700"
                      />
                      <div className="mt-2 text-xs text-gray-600">File dipilih: <b>{selectedFile?.name ?? "-"}</b></div>
                      <button
                        type="button"
                        disabled={!paymentApproved || !selectedFile || loadingKey === item.key}
                        onClick={() => onSubmitFile(item.key)}
                        className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-extrabold ${!paymentApproved || !selectedFile || loadingKey === item.key ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105"}`}
                      >
                        {loadingKey === item.key ? "Mengunggah..." : "Upload Dokumen"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
