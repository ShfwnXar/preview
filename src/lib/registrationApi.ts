import type {
  Athlete,
  AthleteDocuments,
  DocumentStatus,
  PaymentStatus,
  RegistrationState,
  SportEntry,
} from "@/context/RegistrationContext"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import type {
  ApiEnvelope,
  BackendAthlete,
  BackendDocument,
  BackendRegistrationDetail,
  BackendRegistrationSummary,
  BackendSport,
} from "@/types/api"

type MaybeEnvelope<T> = T | ApiEnvelope<T>

function isEnvelope<T>(value: MaybeEnvelope<T>): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "data" in value
}

export function unwrapApiData<T>(value: MaybeEnvelope<T>): T {
  return isEnvelope(value) ? value.data : value
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return ""
}

function normalizeStatus(status?: string): DocumentStatus {
  const value = pickString(status)
  return value || "EMPTY"
}

export function mapBackendSportsToEntries(sports: BackendSport[]): SportEntry[] {
  return sports.map((sport) => {
    const sportId = pickString(sport.id)
    const catalogSport = SPORTS_CATALOG.find((item) => item.id === sportId)
    const categories =
      sport.categories?.map((category) => ({
        id: pickString(category.id),
        name: pickString(category.name, category.title) || pickString(category.id),
        quota: Math.max(0, Number(category.quota ?? 0)),
      })) ??
      catalogSport?.categories.map((category) => ({
        id: category.id,
        name: category.name,
        quota: 0,
      })) ??
      []

    return {
      id: sportId,
      name: pickString(sport.name, sport.title) || catalogSport?.name || sportId,
      plannedAthletes: 0,
      officialCount: 0,
      categories,
    }
  })
}

export function mapSportIdsToEntries(sportIds: Array<string | number>): SportEntry[] {
  return sportIds.map((sportIdRaw) => {
    const sportId = pickString(sportIdRaw)
    const catalogSport = SPORTS_CATALOG.find((item) => item.id === sportId)
    return {
      id: sportId,
      name: catalogSport?.name ?? sportId,
      plannedAthletes: 0,
      officialCount: 0,
      categories:
        catalogSport?.categories.map((category) => ({
          id: category.id,
          name: category.name,
          quota: 0,
        })) ?? [],
    }
  })
}

export function mapBackendAthlete(athlete: BackendAthlete): Athlete {
  return {
    id: pickString(athlete.id),
    teamId: pickString(athlete.team_id) || null,
    sportId: pickString(athlete.sport_id),
    categoryId: pickString(athlete.category_id),
    name: pickString(athlete.name, athlete.full_name),
    gender: pickString(athlete.gender).toUpperCase() === "PUTRI" ? "PUTRI" : "PUTRA",
    birthDate: pickString(athlete.birth_date),
    institution: pickString(athlete.institution, athlete.school_name),
  }
}

function emptyDoc() {
  return { status: "EMPTY" as DocumentStatus }
}

export function groupDocumentsByAthlete(documents: BackendDocument[], athleteIds: string[]): AthleteDocuments[] {
  const map = new Map<string, AthleteDocuments>()

  for (const athleteId of athleteIds) {
    map.set(athleteId, {
      athleteId,
      dapodik: emptyDoc(),
      ktp: emptyDoc(),
      kartu: emptyDoc(),
      raport: emptyDoc(),
      foto: emptyDoc(),
    })
  }

  for (const document of documents) {
    const athleteId = pickString(document.athlete_id)
    if (!athleteId || !map.has(athleteId)) continue

    const docType = mapDocumentTypeToDocKey(pickString(document.type, document.document_type))
    if (!docType) continue

    const current = map.get(athleteId)
    if (!current) continue

    current[docType] = {
      status: normalizeStatus(document.status),
      fileId: pickString(document.id),
      fileName: pickString(document.file_name),
      uploadedAt: pickString(document.uploaded_at, document.created_at),
      note: pickString(document.note),
    }
  }

  return Array.from(map.values())
}

function inferPaymentStatus(rawStatus?: string, fallback?: PaymentStatus): PaymentStatus {
  const value = (rawStatus || "").toUpperCase()
  if (value.includes("APPROVED")) return "APPROVED"
  if (value.includes("PENDING")) return "PENDING"
  if (value.includes("REJECTED")) return "REJECTED"
  return fallback ?? "NONE"
}

export function isTerminalRegistrationStatus(status?: string) {
  const value = (status || "").toLowerCase()
  return ["submitted", "final", "closed", "approved", "completed"].some((item) => value.includes(item))
}

export function mapRegistrationDetailToState(
  detail: BackendRegistrationDetail,
  fallbackState?: RegistrationState | null
): RegistrationState {
  const normalizedDetail = normalizeRegistrationDetail(detail)
  const sports =
    normalizedDetail.sports && normalizedDetail.sports.length > 0
      ? mapBackendSportsToEntries(normalizedDetail.sports)
      : normalizedDetail.sport_ids && normalizedDetail.sport_ids.length > 0
      ? mapSportIdsToEntries(normalizedDetail.sport_ids)
      : fallbackState?.sports ?? []
  const athletes = (normalizedDetail.athletes ?? []).map(mapBackendAthlete)
  const athleteIds = athletes.map((athlete) => athlete.id)
  const documents = groupDocumentsByAthlete(normalizedDetail.documents ?? [], athleteIds)

  for (const sport of sports) {
    const athletesInSport = athletes.filter((athlete) => athlete.sportId === sport.id).length
    sport.plannedAthletes = Math.max(sport.plannedAthletes, athletesInSport)
  }

  return {
    sports,
    athletes,
    officials: [],
    documents,
    payment: {
      status: inferPaymentStatus(detail.status ?? detail.submission_status, fallbackState?.payment.status),
      totalFee: fallbackState?.payment.totalFee ?? 0,
      proofFileId: fallbackState?.payment.proofFileId,
      proofFileName: fallbackState?.payment.proofFileName,
      proofMimeType: fallbackState?.payment.proofMimeType,
      uploadedAt: fallbackState?.payment.uploadedAt,
      note: fallbackState?.payment.note,
      approvedTotalFee: fallbackState?.payment.approvedTotalFee,
    },
    updatedAt: pickString(normalizedDetail.updated_at, normalizedDetail.created_at) || new Date().toISOString(),
  }
}

export function normalizeRegistrationDetail(detail: BackendRegistrationDetail): BackendRegistrationDetail & {
  sport_ids: Array<string | number>
  documents: BackendDocument[]
} {
  const derivedSportIds =
    detail.sport_ids && detail.sport_ids.length > 0
      ? detail.sport_ids
      : (detail.sports ?? []).map((sport) => sport.id)

  return {
    ...detail,
    sport_ids: derivedSportIds,
    documents: Array.isArray(detail.documents) ? detail.documents : [],
  }
}

export function summarizeRegistrationList(items: BackendRegistrationSummary[]) {
  return items.map((item) => ({
    id: pickString(item.id),
    status: pickString(item.status, item.submission_status) || "draft",
    title: pickString(item.title, item.name) || `Registrasi #${pickString(item.id)}`,
    updatedAt: pickString(item.updated_at, item.created_at),
  }))
}

export function mapDocumentTypeToDocKey(type: string): keyof Omit<AthleteDocuments, "athleteId"> | null {
  const value = type.trim().toLowerCase()
  if (!value) return null

  if (["dapodik", "student_registry", "education_registry"].includes(value)) return "dapodik"
  if (["ktp", "kia", "identity_card"].includes(value)) return "ktp"
  if (["kartu", "student_card", "membership_card"].includes(value)) return "kartu"
  if (["raport", "report_card", "study_result_card"].includes(value)) return "raport"
  if (["foto", "photo", "pas_foto", "passport_photo"].includes(value)) return "foto"
  return null
}

export function mapDocKeyToDocumentType(docKey: keyof Omit<AthleteDocuments, "athleteId">) {
  const map: Record<keyof Omit<AthleteDocuments, "athleteId">, string> = {
    dapodik: "student_registry",
    ktp: "identity_card",
    kartu: "membership_card",
    raport: "report_card",
    foto: "passport_photo",
  }

  return map[docKey]
}
