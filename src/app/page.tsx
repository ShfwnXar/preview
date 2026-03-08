"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { eventConfig } from "@/lib/eventConfig"

function Countdown({ targetISO }: { targetISO: string }) {
  const target = useMemo(() => new Date(targetISO).getTime(), [targetISO])
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = now === null ? 0 : Math.max(0, target - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  const started = now !== null && target - now <= 0

  const cells = [
    { label: 'Hari', value: days },
    { label: 'Jam', value: hours },
    { label: 'Menit', value: minutes },
    { label: 'Detik', value: seconds },
  ]

  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-emerald-100/60 p-6 shadow-[0_22px_44px_rgba(15,139,76,0.18)]">
      <div className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
        Countdown Arena
      </div>

      <div className="mt-3 text-2xl font-extrabold text-gray-900 md:text-3xl">
        {now === null ? 'Menghitung waktu pembukaan...' : started ? 'Pertandingan sudah dimulai' : days + ' hari menuju pembukaan'}
      </div>

      <div className="mt-1 text-xs text-emerald-700/80">Muhammadiyah Games 2026</div>

      {!started && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label} className="rounded-2xl border border-emerald-200 bg-white/90 p-3 text-center shadow-sm">
              <div className="bg-gradient-to-b from-emerald-700 to-emerald-500 bg-clip-text text-2xl font-black text-transparent">
                {String(cell.value).padStart(2, '0')}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                {cell.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 rounded-xl border border-emerald-100 bg-white/70 p-3 text-xs text-gray-600">
        Jadwal mulai:{" "}
        <b>
          {new Intl.DateTimeFormat("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Asia/Jakarta",
          }).format(new Date(eventConfig.tournamentStart))}
        </b>
      </div>
    </div>
  )
}

export default function HomePage() {
  const nav = eventConfig.nav
  const [isScrolled, setIsScrolled] = useState(false)

  const portalMenu = [
    { label: "Download", href: nav.download },
    { label: "Berita", href: nav.berita },
    { label: "Pengumuman", href: nav.pengumuman },
    { label: "Peringkat", href: nav.peringkat },
    { label: "Statistik Pendaftar", href: nav.statistik },
  ]

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 180)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className={
        "min-h-screen transition-colors duration-700 " +
        (isScrolled ? "bg-gradient-to-b from-emerald-50 via-emerald-100/70 to-emerald-200/60" : "bg-gray-50")
      }
    >
      <header className={"sticky top-0 z-40 border-b transition-all duration-500 " + (isScrolled ? "bg-emerald-50/95 backdrop-blur" : "bg-white")}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            {eventConfig.headerLogos.map((l) => (
              <div key={l.id} className="relative h-9 w-9">
                <Image src={l.src} alt={l.label} fill className="object-contain" />
              </div>
            ))}
            <div className="hidden md:block">
              <div className="font-extrabold leading-tight text-green-700">Muhammadiyah Games 2026</div>
              <div className="text-xs text-gray-500">Portal Resmi Pendaftaran</div>
            </div>
          </div>

          <nav className="hidden items-center gap-3 text-sm font-semibold lg:flex">
            <div className="portal-nav-shell">
              {portalMenu.map((item) => (
                <Link key={item.href} href={item.href} className="portal-nav-link">
                  {item.label}
                </Link>
              ))}
            </div>

            <Link className="portal-auth-link" href={nav.login}>Login</Link>
            <Link className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700" href={nav.daftar}>Daftar</Link>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <Link className="text-sm font-semibold text-gray-700" href={nav.login}>Login</Link>
            <Link className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white" href={nav.daftar}>Daftar</Link>
          </div>
        </div>
      </header>

      <div className="border-b border-emerald-100 bg-white/80 px-4 py-2 lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {portalMenu.map((item) => (
            <Link key={item.href} href={item.href} className="portal-nav-link whitespace-nowrap">
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
              Pendaftaran Resmi
              <span className="text-green-700">Muhammadiyah Games 2026</span>
            </div>

            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-gray-900 md:text-5xl">
              Portal Pendaftaran Kontingen
              <span className="text-green-700"> Muhammadiyah Games 2026</span>
            </h1>

            <p className="mt-4 leading-relaxed text-gray-600">
              Buat akun kontingen (sekolah atau kampus), isi kuota cabang olahraga, lakukan pembayaran,
              input data atlet, dan upload dokumen sesuai ketentuan.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={nav.daftar} className="rounded-xl bg-green-600 px-6 py-3 text-center font-semibold text-white hover:bg-green-700">
                Daftar Kontingen
              </Link>
              <Link href={nav.berita} className="rounded-xl border bg-white px-6 py-3 text-center font-semibold hover:bg-gray-50">
                Lihat Berita dan Informasi
              </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/55 to-emerald-100/45 p-4 shadow-[0_16px_30px_rgba(15,139,76,0.12)]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Didukung oleh Sponsor</div>
                <div className="text-[11px] text-gray-500">Partner Resmi 2026</div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
                {eventConfig.sponsors.map((s) => (
                  <div
                    key={s.id}
                    className="group rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-white to-emerald-50/40 px-3 py-3 shadow-[0_10px_20px_rgba(15,139,76,0.12)] transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-[0_15px_26px_rgba(15,139,76,0.2)]"
                  >
                    <div className="relative h-12 w-full sm:h-14">
                      <Image src={s.src} alt={s.label} fill className="object-contain p-1 transition duration-300 group-hover:scale-105" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-gray-600">Maskot Resmi</div>
              <div className="mt-3 flex items-center justify-center">
                <div className="relative h-64 w-full md:h-80">
                  <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" priority />
                </div>
              </div>
              <div className="mt-2 text-center text-xs text-gray-500">{eventConfig.mascot.label}</div>
            </div>

            <Countdown targetISO={eventConfig.tournamentStart} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-white p-8 shadow-[0_20px_40px_rgba(15,139,76,0.12)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Alur Pendaftaran Kontingen</h2>
              <p className="mt-2 text-gray-600">Ringkas alur sesuai sistem pendaftaran yang akan kamu gunakan.</p>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">4 Tahapan Utama</div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { no: "01", t: "Isi Kuota", d: "Pilih cabor dan isi jumlah peserta per kategori serta official." },
              { no: "02", t: "Pembayaran", d: "Transfer sesuai total biaya lalu upload bukti." },
              { no: "03", t: "Input Atlet", d: "Setelah pembayaran disetujui, input data atlet sesuai kuota." },
              { no: "04", t: "Upload Dokumen", d: "Upload dokumen wajib per atlet untuk diverifikasi admin." },
            ].map((x) => (
              <div key={x.no} className="group rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_rgba(15,139,76,0.14)]">
                <div className="inline-flex rounded-lg bg-emerald-100 px-2 py-1 text-xs font-black tracking-[0.12em] text-emerald-700">{x.no}</div>
                <div className="mt-3 font-bold text-gray-900">{x.t}</div>
                <div className="mt-1 text-sm text-gray-600">{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-emerald-200 bg-gradient-to-b from-white to-emerald-50/40">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-2xl border border-emerald-100 bg-white/95 p-6 shadow-sm md:p-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div>
                <div className="text-lg font-extrabold text-green-700">Muhammadiyah Games 2026</div>
                <div className="mt-2 text-sm text-gray-600">
                  {eventConfig.footer.orgLine1}
                  <br />
                  {eventConfig.footer.orgLine2}
                </div>
                <div className="mt-3 text-xs text-gray-500">{eventConfig.footer.contactNote}</div>
              </div>

              <div>
                <div className="font-bold text-gray-900">Menu Portal</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm font-semibold">
                  {portalMenu.map((item) => (
                    <Link key={item.href} className="footer-link-pill" href={item.href}>
                      {item.label}
                    </Link>
                  ))}
                  <Link className="footer-link-pill" href={nav.login}>Login Peserta</Link>
                </div>
              </div>

              <div>
                <div className="font-bold text-gray-900">Sponsor</div>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {eventConfig.sponsors.map((s) => (
                    <div key={s.id} className="group flex items-center justify-center rounded-xl border border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/35 p-2.5 shadow-[0_8px_16px_rgba(15,139,76,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_20px_rgba(15,139,76,0.12)]">
                      <div className="relative h-11 w-full">
                        <Image src={s.src} alt={s.label} fill className="object-contain p-1 transition duration-300 group-hover:scale-105" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2 border-t border-emerald-100 pt-6 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
              <div>(c) {new Date().getFullYear()} Muhammadiyah Games 2026. All rights reserved.</div>
              <div className="text-gray-400">Dibuat untuk portal pendaftaran kontingen.</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}






