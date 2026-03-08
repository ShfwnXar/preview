"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

export type Role = "PESERTA" | "ADMIN" | "ADMIN_CABOR" | "SUPER_ADMIN"

export type InstitutionType =
  | "SD"
  | "SMP"
  | "SMA"
  | "KAMPUS_PTM"
  | "PIMPINAN_RANTING"
  | "PIMPINAN_CABANG"

export type User = {
  id: string
  role: Role
  institutionName: string
  institutionType: InstitutionType
  address: string
  picName: string
  email: string
  phone: string
  isActive?: boolean
  assignedSportIds?: string[]
  createdAt: string
}

type StoredUser = User & {
  password: string
}

type RegisterInput = {
  institutionName: string
  institutionType: InstitutionType
  address: string
  picName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

type LoginInput = {
  email: string
  password: string
}

const LS_USERS_KEY = "mg26_users"
const LS_SESSION_KEY = "mg26_session"
const LS_RESET_TOKENS_KEY = "mg26_reset_tokens"

type ResetToken = {
  token: string
  userId: string
  email: string
  expiresAt: string
  used: boolean
  createdAt: string
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  register: (input: RegisterInput) => { ok: boolean; message: string }
  login: (input: LoginInput) => { ok: boolean; message: string }
  logout: () => void
  generateResetToken: (email: string) => { ok: boolean; message: string; token?: string }
  resetPasswordWithToken: (input: {
    email: string
    token: string
    newPassword: string
    confirmPassword: string
  }) => { ok: boolean; message: string }
  getAllUsers: () => StoredUser[]
  seedDefaultAdminsIfEmpty: () => void
  canAccessSport: (sportId: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function uid() {
  return "u_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function randomToken(len = 6) {
  const digits = "0123456789"
  let out = ""
  for (let i = 0; i < len; i++) out += digits[Math.floor(Math.random() * digits.length)]
  return out
}

function getResetTokens(): ResetToken[] {
  return safeParse<ResetToken[]>(localStorage.getItem(LS_RESET_TOKENS_KEY), [])
}

function setResetTokens(tokens: ResetToken[]) {
  localStorage.setItem(LS_RESET_TOKENS_KEY, JSON.stringify(tokens))
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const session = safeParse<{ userId: string } | null>(localStorage.getItem(LS_SESSION_KEY), null)
    if (!session?.userId) return

    const users = safeParse<StoredUser[]>(localStorage.getItem(LS_USERS_KEY), [])
    const found = users.find((u) => u.id === session.userId)
    if (!found) return

    const { password: _pw, ...publicUser } = found
    setUser(publicUser)
  }, [])

  const getAllUsers = () => {
    return safeParse<StoredUser[]>(localStorage.getItem(LS_USERS_KEY), [])
  }

  const setAllUsers = (users: StoredUser[]) => {
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(users))
  }

  const seedDefaultAdminsIfEmpty = () => {
    const users = getAllUsers()
    if (users.length > 0) return

    const now = new Date().toISOString()

    const superAdmin: StoredUser = {
      id: uid(),
      role: "SUPER_ADMIN",
      institutionName: "Panitia Muhammadiyah Games",
      institutionType: "PIMPINAN_CABANG",
      address: "—",
      picName: "Super Admin",
      email: normalizeEmail("superadmin@mg.local"),
      phone: "0000000000",
      password: "superadmin123",
      createdAt: now,
    }

    const adminUmum: StoredUser = {
      id: uid(),
      role: "ADMIN",
      institutionName: "Panitia Muhammadiyah Games",
      institutionType: "PIMPINAN_CABANG",
      address: "—",
      picName: "Admin Umum",
      email: normalizeEmail("admin@mg.local"),
      phone: "0000000000",
      password: "admin12345",
      createdAt: now,
    }

    const adminCaborVoli: StoredUser = {
      id: uid(),
      role: "ADMIN_CABOR",
      institutionName: "Panitia Muhammadiyah Games",
      institutionType: "PIMPINAN_CABANG",
      address: "—",
      picName: "Admin Cabor Voli",
      email: normalizeEmail("adminvoli@mg.local"),
      phone: "0000000000",
      password: "adminvoli123",
      assignedSportIds: ["voli_indoor"],
      createdAt: now,
    }

    setAllUsers([superAdmin, adminUmum, adminCaborVoli])
  }

  const register = (input: RegisterInput) => {
    if (!input.institutionName.trim()) return { ok: false, message: "Nama instansi wajib diisi." }
    if (!input.picName.trim()) return { ok: false, message: "Nama PIC wajib diisi." }
    if (!isValidEmail(input.email)) return { ok: false, message: "Format email tidak valid." }
    if (!input.phone.trim()) return { ok: false, message: "No HP/WA wajib diisi." }
    if (!input.address.trim()) return { ok: false, message: "Alamat wajib diisi." }
    if (input.password.length < 6) return { ok: false, message: "Password minimal 6 karakter." }
    if (input.password !== input.confirmPassword)
      return { ok: false, message: "Konfirmasi password tidak sama." }

    const users = getAllUsers()
    const email = normalizeEmail(input.email)

    if (users.some((u) => normalizeEmail(u.email) === email)) {
      return { ok: false, message: "Email sudah terdaftar. Silakan login." }
    }

    const now = new Date().toISOString()

    const newUser: StoredUser = {
      id: uid(),
      role: "PESERTA",
      institutionName: input.institutionName.trim(),
      institutionType: input.institutionType,
      address: input.address.trim(),
      picName: input.picName.trim(),
      email,
      phone: input.phone.trim(),
      password: input.password,
      createdAt: now,
    }

    setAllUsers([newUser, ...users])

    return { ok: true, message: "Akun berhasil dibuat. Silakan login." }
  }

  const login = (input: LoginInput) => {
    const email = normalizeEmail(input.email)
    const password = input.password

    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if (!password) return { ok: false, message: "Password wajib diisi." }

    const users = getAllUsers()
    const found = users.find((u) => normalizeEmail(u.email) === email)

    if (!found) return { ok: false, message: "Akun tidak ditemukan." }
    if (found.password !== password) return { ok: false, message: "Password salah." }

    localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ userId: found.id }))

    const { password: _pw, ...publicUser } = found
    setUser(publicUser)

    return { ok: true, message: "Login berhasil." }
  }

  const logout = () => {
    localStorage.removeItem(LS_SESSION_KEY)
    setUser(null)
  }

  const generateResetToken = (emailInput: string) => {
    if (!user || (user.role !== "ADMIN" && user.role !== "ADMIN_CABOR" && user.role !== "SUPER_ADMIN")) {
      return { ok: false, message: "Akses ditolak. Token reset hanya dapat dibuat oleh admin." }
    }

    const email = normalizeEmail(emailInput)
    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }

    const users = getAllUsers()
    const target = users.find((u) => normalizeEmail(u.email) === email)
    if (!target) return { ok: false, message: "Akun tidak ditemukan." }

    const now = new Date()
    const expires = new Date(now.getTime() + 30 * 60 * 1000)
    const token = randomToken(6)

    const tokens = getResetTokens()
    const newToken: ResetToken = {
      token,
      userId: target.id,
      email,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      used: false,
    }

    setResetTokens([newToken, ...tokens])

    return { ok: true, message: "Token reset berhasil dibuat.", token }
  }

  const resetPasswordWithToken = (input: {
    email: string
    token: string
    newPassword: string
    confirmPassword: string
  }) => {
    const email = normalizeEmail(input.email)
    const token = input.token.trim()
    const newPassword = input.newPassword
    const confirmPassword = input.confirmPassword

    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if (token.length < 4) return { ok: false, message: "Kode reset tidak valid." }
    if (newPassword.length < 6) return { ok: false, message: "Password minimal 6 karakter." }
    if (newPassword !== confirmPassword) return { ok: false, message: "Konfirmasi password tidak sama." }

    const tokens = getResetTokens()
    const found = tokens.find((t) => t.email === email && t.token === token)

    if (!found) return { ok: false, message: "Kode reset salah." }
    if (found.used) return { ok: false, message: "Kode reset sudah digunakan." }

    const now = new Date()
    if (new Date(found.expiresAt).getTime() < now.getTime()) {
      return { ok: false, message: "Kode reset sudah kedaluwarsa. Minta token baru ke admin." }
    }

    const users = getAllUsers()
    const idx = users.findIndex((u) => u.id === found.userId)
    if (idx === -1) return { ok: false, message: "Akun tidak ditemukan." }

    users[idx] = { ...users[idx], password: newPassword }
    setAllUsers(users)

    const nextTokens = tokens.map((t) => (t === found ? { ...t, used: true } : t))
    setResetTokens(nextTokens)

    return { ok: true, message: "Password berhasil direset. Silakan login." }
  }

  const canAccessSport = (sportId: string) => {
    if (!user) return false
    if (user.role === "SUPER_ADMIN") return true
    if (user.role === "ADMIN") return true
    if (user.role === "ADMIN_CABOR") {
      const legacyCabang = (user as unknown as { cabang?: string }).cabang
      const allowed = user.assignedSportIds ?? (legacyCabang ? [legacyCabang] : [])
      return allowed.includes(sportId)
    }
    return false
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      register,
      login,
      logout,
      generateResetToken,
      resetPasswordWithToken,
      getAllUsers,
      seedDefaultAdminsIfEmpty,
      canAccessSport,
    }),
    [user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

