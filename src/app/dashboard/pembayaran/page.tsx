"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRegistration } from "@/context/RegistrationContext"
import { putFileBlob } from "@/lib/fileStore" // âœ… ADD
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Textarea"

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function paymentTone(status: string) {
  if (status === "APPROVED") return "success"
  if (status === "PENDING") return "warning"
  if (status === "REJECTED") return "danger"
  return "neutral"
}

function formatISO(iso?: string) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

export default function Step2PembayaranPage() {
  const { state, hydrateReady, setPaymentProof } = useRegistration()

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [note, setNote] = useState<string>(state.payment.note ?? "")
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null)
  const [isSubmittingProof, setIsSubmittingProof] = useState(false)

  const selectedSportsCount = state.sports.length

  const canUpload = useMemo(() => {
    // harus pilih minimal 1 cabor dulu
    if (selectedSportsCount === 0) return false
    // jika sudah APPROVED, peserta tidak perlu upload ulang
    if (state.payment.status === "APPROVED") return false
    return true
  }, [selectedSportsCount, state.payment.status])

  const onPickProof = (file: File | null) => {

    if (!file) {
      setSelectedProofFile(null)
      return
    }
    setMsg(null)

    if (selectedSportsCount === 0) {
      setMsg({ type: "error", text: "Pilih minimal 1 cabor di Step 1 sebelum upload bukti pembayaran." })
      setSelectedProofFile(null)
      return
    }

    const maxMB = 5
    if (file.size > maxMB * 1024 * 1024) {
      setMsg({ type: "error", text: `Ukuran file terlalu besar. Maks ${maxMB}MB.` })
      setSelectedProofFile(null)
      return
    }

    setSelectedProofFile(file)
  }

  const onSubmitProof = async () => {
    if (!selectedProofFile || !canUpload) return

    setMsg(null)
    setIsSubmittingProof(true)
    try {
      const fileId = "pay_user_" + Date.now() + "_" + Math.random().toString(16).slice(2)
      await putFileBlob(fileId, selectedProofFile)
      setPaymentProof(fileId, selectedProofFile.name, selectedProofFile.type || "application/octet-stream")
      setSelectedProofFile(null)
      setMsg({
        type: "success",
        text: "Bukti pembayaran tersimpan. Status berubah menjadi PENDING (menunggu verifikasi admin).",
      })
    } catch (e) {
      console.error(e)
      setMsg({ type: "error", text: "Gagal menyimpan bukti pembayaran. Coba ulangi." })
    } finally {
      setIsSubmittingProof(false)
    }
  }

  if (!hydrateReady) {
    return (
      <div className="max-w-5xl">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Step 2 â€¢ Pembayaran</CardTitle>
            <CardDescription>Memuat data pembayaran...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <Card variant="soft">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-gray-500 tracking-wider">STEP 2</div>
              <CardTitle className="mt-1">Pembayaran & Upload Bukti Transfer</CardTitle>
              <CardDescription className="mt-2">
                Transfer dilakukan manual, lalu upload bukti pembayaran. Admin akan memverifikasi.
              </CardDescription>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <Badge tone={paymentTone(state.payment.status) as any}>
                  Payment: {state.payment.status}
                </Badge>
                <Badge tone="info">Total: Rp {state.payment.totalFee.toLocaleString("id-ID")}</Badge>
                <Badge tone="neutral">Cabor dipilih: {selectedSportsCount}</Badge>
              </div>

              {state.payment.status === "REJECTED" && state.payment.note && (
                <div className="mt-3 text-sm text-rose-800">
                  <b>Catatan Admin:</b> {state.payment.note}
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 min-w-[320px]">
              <div className="text-xs text-gray-500">Navigasi</div>
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/dashboard/pendaftaran">
                  <Button variant="secondary" className="w-full">
                    Kembali Step 1
                  </Button>
                </Link>
                <Link href="/dashboard/pendaftaran/atlet">
                  <Button variant="secondary" className="w-full">
                    Ke Step 3 
                  </Button>
                </Link>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Step 3 & 4 akan terbuka setelah status pembayaran <b>APPROVED</b>.
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {msg && (
        <div
          className={cx(
            "rounded-2xl border p-4 text-sm font-semibold",
            msg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {msg.text}
        </div>
      )}

      {/* Rekening + Instruksi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rekening Tujuan</CardTitle>
            <CardDescription>Silakan transfer sesuai total biaya berikut.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-xs text-gray-500">Nomor Rekening</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">4000444338</div>
              <div className="mt-1 text-sm text-gray-700 font-semibold">a.n. LPO PP Muhammadiyah BSI</div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-gradient-to-br from-white to-emerald-50/60 p-4">
                  <div className="text-xs text-gray-500">Total yang harus ditransfer</div>
                  <div className="mt-1 text-xl font-extrabold">Rp {state.payment.totalFee.toLocaleString("id-ID")}</div>
                  <div className="mt-1 text-xs text-gray-500">Atlet 100k/orang, Official gratis, Voli 1.2jt/tim.</div>
                </div>

                <div className="rounded-2xl border bg-gradient-to-br from-white to-sky-50/60 p-4">
                  <div className="text-xs text-gray-500">Status pembayaran</div>
                  <div className="mt-2">
                    <Badge tone={paymentTone(state.payment.status) as any}>{state.payment.status}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Upload bukti â†’ <b>PENDING</b> â†’ Admin verifikasi â†’ <b>APPROVED/REJECTED</b>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <b>Catatan:</b> Gunakan berita transfer yang jelas (misal: nama instansi / kontingen) agar admin mudah memverifikasi.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardHeader>
            <CardTitle>Upload Bukti</CardTitle>
            <CardDescription>Format JPG/PNG/PDF (maks 5MB).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">File terakhir</div>
              <div className="mt-1 text-sm font-extrabold text-gray-900">{state.payment.proofFileName ?? "-"}</div>
              <div className="mt-1 text-xs text-gray-600">
                Upload: <b>{formatISO(state.payment.uploadedAt)}</b>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">Pilih file bukti</div>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!canUpload || isSubmittingProof}
                onChange={(e) => onPickProof(e.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm"
              />
              <div className="mt-2 text-xs text-gray-600">
                File dipilih: <b>{selectedProofFile?.name ?? "-"}</b>
              </div>
              <div className="mt-3">
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={!canUpload || !selectedProofFile || isSubmittingProof}
                  onClick={onSubmitProof}
                >
                  {isSubmittingProof ? "Menyimpan..." : "Submit Bukti Pembayaran"}
                </Button>
              </div>
              {!canUpload && (
                <div className="mt-2 text-xs text-gray-500">
                  {selectedSportsCount === 0
                    ? "Pilih cabor dulu di Step 1."
                    : state.payment.status === "APPROVED"
                    ? "Sudah APPROVED. Tidak perlu upload ulang."
                    : "Upload dinonaktifkan."}
                </div>
              )}
            </div>

            <Textarea
              label="Catatan Peserta (opsional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Transfer dari rekening ... / Nominal ..."
            />

            <div className="text-xs text-gray-500">
              *Catatan peserta saat ini hanya tampilan UI (akan siap dihubungkan ke backend nanti).
            </div>

            <Link href="/dashboard/status">
              <Button variant="secondary" className="w-full">
                Lihat Status
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


