import type { RegistrationRepository } from "@/repositories/registrationRepo"
import type { RegistrationState, AthleteDocuments, PaymentStatus, DocumentStatus } from "@/context/RegistrationContext"
import type { AdminUpdateDocRequest, AdminUpdatePaymentRequest } from "@/types/api"

type DocKey = keyof Omit<AthleteDocuments, "athleteId">

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toRegistrationKey(userId: string) {
  return `mg26_registration_${userId}`
}

function toRegistrationStepByPayment(status: PaymentStatus): string {
  if (status === "APPROVED") return "PAYMENT_APPROVED"
  if (status === "REJECTED") return "WAITING_PAYMENT_UPLOAD"
  if (status === "PENDING") return "WAITING_PAYMENT_VERIFICATION"
  return "DRAFT_QUOTA"
}

export class MockRegistrationRepo implements RegistrationRepository {
  async getRegistrationByUserId(userId: string): Promise<RegistrationState | null> {
    return safeParse<RegistrationState | null>(localStorage.getItem(toRegistrationKey(userId)), null)
  }

  async saveRegistrationByUserId(userId: string, state: RegistrationState): Promise<void> {
    localStorage.setItem(toRegistrationKey(userId), JSON.stringify(state))
  }

  async adminUpdatePayment(input: AdminUpdatePaymentRequest): Promise<void> {
    const key = toRegistrationKey(input.userId)
    const reg = safeParse<(RegistrationState & { status?: string }) | null>(localStorage.getItem(key), null)
    if (!reg) return

    const updated = {
      ...reg,
      payment: {
        ...reg.payment,
        status: input.status,
        note: input.note,
      },
      status: toRegistrationStepByPayment(input.status),
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(key, JSON.stringify(updated))
  }

  async adminUpdateDoc(input: AdminUpdateDocRequest): Promise<void> {
    const key = toRegistrationKey(input.userId)
    const reg = safeParse<RegistrationState | null>(localStorage.getItem(key), null)
    if (!reg) return

    const docKey = input.docKey as DocKey
    const nextStatus = input.status as Exclude<DocumentStatus, "EMPTY">

    const updatedDocs = reg.documents.map((doc) => {
      if (doc.athleteId !== input.athleteId) return doc
      return {
        ...doc,
        [docKey]: {
          ...doc[docKey],
          status: nextStatus,
          note: input.note,
        },
      }
    })

    const updated: RegistrationState = {
      ...reg,
      documents: updatedDocs,
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(key, JSON.stringify(updated))
  }
}
