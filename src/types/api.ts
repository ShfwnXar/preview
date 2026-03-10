import type { Role, InstitutionType, User } from "@/context/AuthContext"
import type { RegistrationState, PaymentStatus, DocumentStatus } from "@/context/RegistrationContext"

/** ===== Auth DTO ===== */
export type LoginRequest = { email: string; password: string }
export type LoginResponse = { accessToken: string; user: User }

export type RegisterRequest = {
  institutionName: string
  institutionType: InstitutionType
  address: string
  picName: string
  email: string
  phone: string
  password: string
}

export type ForgotPasswordRequest = { email: string }
export type ResetPasswordRequest = { email: string; token: string; newPassword: string }

export type CreateAdminRequest = {
  role: Exclude<Role, "PESERTA">
  email: string
  password: string
  picName: string
  phone: string
  institutionName?: string
}

/** ===== Registration DTO ===== */
export type GetRegistrationResponse = RegistrationState
export type SaveRegistrationRequest = RegistrationState

export type AdminUpdatePaymentRequest = {
  userId: string
  status: PaymentStatus
  note?: string
}

export type AdminUpdateDocRequest = {
  userId: string
  athleteId: string
  docKey: string
  status: Exclude<DocumentStatus, "EMPTY">
  note?: string
}
