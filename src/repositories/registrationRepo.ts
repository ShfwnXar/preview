import type { RegistrationState } from "@/context/RegistrationContext"
import type { AdminUpdateDocRequest, AdminUpdatePaymentRequest } from "@/types/api"

export interface RegistrationRepository {
  getRegistrationByUserId(userId: string): Promise<RegistrationState | null>
  saveRegistrationByUserId(userId: string, state: RegistrationState): Promise<void>

  // admin
  adminUpdatePayment(input: AdminUpdatePaymentRequest): Promise<void>
  adminUpdateDoc(input: AdminUpdateDocRequest): Promise<void>
}