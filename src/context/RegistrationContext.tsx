"use client"

import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react"
import { useAuth } from "@/context/AuthContext"

export type PaymentStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED"
export type DocumentStatus = "EMPTY" | "UPLOADED" | "APPROVED" | "REJECTED"

export type DocFile = {
  status: DocumentStatus
  fileId?: string
  fileName?: string
  mimeType?: string
  uploadedAt?: string
}

export type AthleteDocuments = {
  athleteId: string
  dapodik: DocFile
  ktp: DocFile
  kartu: DocFile
  raport: DocFile
  foto: DocFile
}

export type SportCategory = {
  id: string
  name: string
  quota: number
}

export type SportEntry = {
  id: string
  name: string
  plannedAthletes: number
  officialCount: number
  voliMenTeams?: number
  voliWomenTeams?: number
  categories: SportCategory[]
}

export type Athlete = {
  id: string
  sportId: string
  categoryId: string
  name: string
  gender: "PUTRA" | "PUTRI"
  birthDate: string
  institution: string
}

export type Official = {
  id: string
  sportId: string
  name: string
  phone?: string
}

export type PaymentInfo = {
  status: PaymentStatus
  proofFileId?: string
  proofFileName?: string
  proofMimeType?: string
  uploadedAt?: string
  totalFee: number
  approvedTotalFee?: number
  note?: string
}

export type RegistrationState = {
  sports: SportEntry[]
  athletes: Athlete[]
  officials: Official[]
  documents: AthleteDocuments[]
  payment: PaymentInfo
  updatedAt?: string
}

const LS_KEY_PREFIX = "mg26_registration_"

const FEE_ATHLETE = 100_000
const FEE_OFFICIAL = 0
const FEE_VOLI_TEAM = 1_200_000
const SPORT_VOLI_ID = "voli_indoor"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function emptyDoc(): DocFile {
  return { status: "EMPTY" }
}

function ensureAthleteDocs(athleteId: string): AthleteDocuments {
  return {
    athleteId,
    dapodik: emptyDoc(),
    ktp: emptyDoc(),
    kartu: emptyDoc(),
    raport: emptyDoc(),
    foto: emptyDoc(),
  }
}

function computeTotalFee(sports: SportEntry[]) {
  let total = 0
  for (const s of sports) {
    total += Math.max(0, Number(s.officialCount || 0)) * FEE_OFFICIAL

    if (s.id === SPORT_VOLI_ID) {
      const men = Math.max(0, Number(s.voliMenTeams || 0))
      const women = Math.max(0, Number(s.voliWomenTeams || 0))
      total += (men + women) * FEE_VOLI_TEAM
      continue
    }

    total += Math.max(0, Number(s.plannedAthletes || 0)) * FEE_ATHLETE
  }
  return total
}

function getSportAthleteQuota(sport: SportEntry) {
  if (sport.id === SPORT_VOLI_ID) {
    const men = Math.max(0, Number(sport.voliMenTeams || 0))
    const women = Math.max(0, Number(sport.voliWomenTeams || 0))
    return (men + women) * 12
  }

  return Math.max(0, Number(sport.plannedAthletes || 0))
}

function sanitizeSportEntries(sports: SportEntry[]) {
  const seen = new Set<string>()
  const result: SportEntry[] = []

  for (const raw of sports || []) {
    if (!raw?.id || seen.has(raw.id)) continue
    seen.add(raw.id)

    const categories = Array.isArray(raw.categories)
      ? raw.categories.map((c) => ({
          id: c?.id ?? "",
          name: c?.name ?? c?.id ?? "",
          quota: Math.max(0, Number(c?.quota ?? 0)),
        }))
      : []

    result.push({
      ...raw,
      name: raw.name ?? raw.id,
      plannedAthletes: Math.max(0, Number(raw.plannedAthletes || 0)),
      officialCount: Math.max(0, Number(raw.officialCount || 0)),
      voliMenTeams: raw.id === SPORT_VOLI_ID ? Math.max(0, Number(raw.voliMenTeams || 0)) : undefined,
      voliWomenTeams: raw.id === SPORT_VOLI_ID ? Math.max(0, Number(raw.voliWomenTeams || 0)) : undefined,
      categories,
    })
  }

  return result
}

function reconcileBySports(
  sports: SportEntry[],
  athletes: Athlete[],
  officials: Official[],
  documents: AthleteDocuments[]
) {
  const sportIds = new Set(sports.map((s) => s.id))

  const cleanAthletes = (athletes || []).filter(
    (a) => !!a?.id && !!a?.sportId && !!a?.categoryId && !!a?.name?.trim() && !!a?.birthDate && sportIds.has(a.sportId)
  )

  const cleanOfficials = (officials || []).filter((o) => !!o?.id && !!o?.name?.trim() && sportIds.has(o.sportId))

  const athleteIds = new Set(cleanAthletes.map((a) => a.id))
  const docsMap = new Map<string, AthleteDocuments>()
  for (const d of documents || []) {
    if (!d?.athleteId || !athleteIds.has(d.athleteId)) continue
    docsMap.set(d.athleteId, d)
  }
  for (const a of cleanAthletes) {
    if (!docsMap.has(a.id)) docsMap.set(a.id, ensureAthleteDocs(a.id))
  }

  const athleteCountBySport = new Map<string, number>()
  for (const a of cleanAthletes) athleteCountBySport.set(a.sportId, (athleteCountBySport.get(a.sportId) ?? 0) + 1)

  const officialCountBySport = new Map<string, number>()
  for (const o of cleanOfficials) officialCountBySport.set(o.sportId, (officialCountBySport.get(o.sportId) ?? 0) + 1)

  const adjustedSports = sports.map((s) => ({
    ...s,
    plannedAthletes: Math.max(s.plannedAthletes, athleteCountBySport.get(s.id) ?? 0),
    officialCount: Math.max(s.officialCount, officialCountBySport.get(s.id) ?? 0),
  }))

  return {
    sports: adjustedSports,
    athletes: cleanAthletes,
    officials: cleanOfficials,
    documents: Array.from(docsMap.values()),
  }
}

const initialState: RegistrationState = {
  sports: [],
  athletes: [],
  officials: [],
  documents: [],
  payment: { status: "NONE", totalFee: 0 },
}

type Action =
  | { type: "LOAD"; payload: RegistrationState }
  | { type: "RESET" }
  | { type: "SET_SPORTS"; sports: SportEntry[] }
  | {
      type: "UPDATE_SPORT_PLANNING"
      sportId: string
      patch: Partial<Pick<SportEntry, "plannedAthletes" | "officialCount" | "voliMenTeams" | "voliWomenTeams">>
    }
  | { type: "SET_PAYMENT_PROOF"; fileId: string; fileName: string; mimeType: string }
  | { type: "SET_PAYMENT_STATUS"; status: PaymentStatus; note?: string }
  | { type: "ADD_ATHLETE"; athlete: Athlete }
  | { type: "UPDATE_ATHLETE"; athlete: Athlete }
  | { type: "REMOVE_ATHLETE"; athleteId: string }
  | { type: "ADD_OFFICIAL"; official: Official }
  | { type: "REMOVE_OFFICIAL"; officialId: string }
  | {
      type: "UPSERT_DOC_FILE"
      athleteId: string
      docKey: keyof Omit<AthleteDocuments, "athleteId">
      fileId: string
      fileName: string
      mimeType: string
    }
  | {
      type: "SET_DOC_STATUS"
      athleteId: string
      docKey: keyof Omit<AthleteDocuments, "athleteId">
      status: Exclude<DocumentStatus, "EMPTY">
    }

function reducer(state: RegistrationState, action: Action): RegistrationState {
  switch (action.type) {
    case "LOAD": {
      const p = action.payload || ({} as RegistrationState)
      const reconciled = reconcileBySports(sanitizeSportEntries(p.sports || []), p.athletes || [], p.officials || [], p.documents || [])
      return {
        ...initialState,
        ...p,
        sports: reconciled.sports,
        athletes: reconciled.athletes,
        officials: reconciled.officials,
        documents: reconciled.documents,
        payment: { ...initialState.payment, ...(p.payment || {}), totalFee: computeTotalFee(reconciled.sports) },
      }
    }

    case "RESET":
      return { ...initialState }

    case "SET_SPORTS": {
      const reconciled = reconcileBySports(sanitizeSportEntries(action.sports), state.athletes, state.officials, state.documents)
      return {
        ...state,
        sports: reconciled.sports,
        athletes: reconciled.athletes,
        officials: reconciled.officials,
        documents: reconciled.documents,
        payment: { ...state.payment, totalFee: computeTotalFee(reconciled.sports) },
        updatedAt: new Date().toISOString(),
      }
    }

    case "UPDATE_SPORT_PLANNING": {
      const athleteCount = state.athletes.filter((a) => a.sportId === action.sportId).length
      const officialCountInState = state.officials.filter((o) => o.sportId === action.sportId).length

      const sports = state.sports.map((s) => {
        if (s.id !== action.sportId) return s
        const next = { ...s, ...action.patch }
        next.plannedAthletes = Math.max(athleteCount, Number(next.plannedAthletes || 0))
        next.officialCount = Math.max(officialCountInState, Number(next.officialCount || 0))
        if (next.id === SPORT_VOLI_ID) {
          next.voliMenTeams = Math.max(0, Number(next.voliMenTeams || 0))
          next.voliWomenTeams = Math.max(0, Number(next.voliWomenTeams || 0))
        }
        return next
      })

      return {
        ...state,
        sports,
        payment: { ...state.payment, totalFee: computeTotalFee(sports) },
        updatedAt: new Date().toISOString(),
      }
    }

    case "SET_PAYMENT_PROOF":
      return {
        ...state,
        payment: {
          ...state.payment,
          proofFileId: action.fileId,
          proofFileName: action.fileName,
          proofMimeType: action.mimeType,
          uploadedAt: new Date().toISOString(),
          status: "PENDING",
        },
        updatedAt: new Date().toISOString(),
      }

    case "SET_PAYMENT_STATUS":
      return {
        ...state,
        payment: { ...state.payment, status: action.status, note: action.note },
        updatedAt: new Date().toISOString(),
      }

    case "ADD_ATHLETE": {
      const sport = state.sports.find((s) => s.id === action.athlete.sportId)
      if (!sport || !action.athlete.name?.trim() || !action.athlete.birthDate || !action.athlete.categoryId) return state

      const currentSportAthletes = state.athletes.filter((a) => a.sportId === action.athlete.sportId).length
      const sportAthleteQuota = getSportAthleteQuota(sport)
      if (currentSportAthletes >= sportAthleteQuota) return state

      const categoryQuota = sport.categories.find((c) => c.id === action.athlete.categoryId)?.quota
      if (typeof categoryQuota === "number" && categoryQuota > 0) {
        const currentCategoryAthletes = state.athletes.filter(
          (a) => a.sportId === action.athlete.sportId && a.categoryId === action.athlete.categoryId
        ).length
        if (currentCategoryAthletes >= categoryQuota) return state
      }

      const athletes = [action.athlete, ...state.athletes]
      const hasDocs = state.documents.some((d) => d.athleteId === action.athlete.id)
      const documents = hasDocs ? state.documents : [ensureAthleteDocs(action.athlete.id), ...state.documents]
      return { ...state, athletes, documents, updatedAt: new Date().toISOString() }
    }

    case "UPDATE_ATHLETE": {
      const sport = state.sports.find((s) => s.id === action.athlete.sportId)
      if (!sport || !action.athlete.name?.trim() || !action.athlete.birthDate || !action.athlete.categoryId) return state
      const athletes = state.athletes.map((a) => (a.id === action.athlete.id ? action.athlete : a))
      return { ...state, athletes, updatedAt: new Date().toISOString() }
    }

    case "REMOVE_ATHLETE":
      return {
        ...state,
        athletes: state.athletes.filter((a) => a.id !== action.athleteId),
        documents: state.documents.filter((d) => d.athleteId !== action.athleteId),
        updatedAt: new Date().toISOString(),
      }

    case "ADD_OFFICIAL": {
      const sport = state.sports.find((s) => s.id === action.official.sportId)
      if (!sport || !action.official.name?.trim()) return state

      const currentOfficials = state.officials.filter((o) => o.sportId === action.official.sportId).length
      if (currentOfficials >= sport.officialCount) return state

      const officials = [action.official, ...state.officials]
      return { ...state, officials, updatedAt: new Date().toISOString() }
    }

    case "REMOVE_OFFICIAL":
      return {
        ...state,
        officials: state.officials.filter((o) => o.id !== action.officialId),
        updatedAt: new Date().toISOString(),
      }

    case "UPSERT_DOC_FILE": {
      const athleteExists = state.athletes.some((a) => a.id === action.athleteId)
      if (!athleteExists) return state

      const uploadedDoc = {
        status: "UPLOADED" as DocumentStatus,
        fileId: action.fileId,
        fileName: action.fileName,
        mimeType: action.mimeType,
        uploadedAt: new Date().toISOString(),
      }

      const exists = state.documents.some((d) => d.athleteId === action.athleteId)
      const finalDocs = exists
        ? state.documents.map((d) => {
            if (d.athleteId !== action.athleteId) return d
            return {
              ...d,
              [action.docKey]: uploadedDoc,
            }
          })
        : [
            {
              ...ensureAthleteDocs(action.athleteId),
              [action.docKey]: uploadedDoc,
            },
            ...state.documents,
          ]

      return { ...state, documents: finalDocs, updatedAt: new Date().toISOString() }
    }

    case "SET_DOC_STATUS": {
      const athleteExists = state.athletes.some((a) => a.id === action.athleteId)
      if (!athleteExists) return state

      const documents = state.documents.map((d) => {
        if (d.athleteId !== action.athleteId) return d
        const prev = d[action.docKey]
        return { ...d, [action.docKey]: { ...prev, status: action.status } }
      })
      return { ...state, documents, updatedAt: new Date().toISOString() }
    }

    default:
      return state
  }
}

type RegistrationContextValue = {
  state: RegistrationState
  dispatch: React.Dispatch<Action>
  storageKey: string | null
  hydrateReady: boolean

  setSports: (sports: SportEntry[]) => void
  updateSportPlanning: (
    sportId: string,
    patch: Partial<Pick<SportEntry, "plannedAthletes" | "officialCount" | "voliMenTeams" | "voliWomenTeams">>
  ) => void

  setPaymentProof: (fileId: string, fileName: string, mimeType: string) => void

  addAthlete: (athlete: Omit<Athlete, "id">) => string
  updateAthlete: (athlete: Athlete) => void
  removeAthlete: (athleteId: string) => void

  addOfficial: (official: Omit<Official, "id">) => string
  removeOfficial: (officialId: string) => void

  upsertDocFile: (
    athleteId: string,
    docKey: keyof Omit<AthleteDocuments, "athleteId">,
    fileId: string,
    fileName: string,
    mimeType: string
  ) => void
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null)

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [hydrateReady, setHydrateReady] = React.useState(false)

  const storageKey = user ? `${LS_KEY_PREFIX}${user.id}` : null

  useEffect(() => {
    if (!storageKey) return

    const saved = safeParse<RegistrationState | null>(localStorage.getItem(storageKey), null)
    if (saved) dispatch({ type: "LOAD", payload: saved })
    else dispatch({ type: "LOAD", payload: initialState })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrateReady(true)
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    if (!hydrateReady) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (e) {
      console.error("Failed to persist registration state:", e)
    }
  }, [state, storageKey, hydrateReady])

  const value = useMemo<RegistrationContextValue>(() => {
    return {
      state,
      dispatch,
      storageKey,
      hydrateReady,

      setSports: (sports) => dispatch({ type: "SET_SPORTS", sports }),
      updateSportPlanning: (sportId, patch) => dispatch({ type: "UPDATE_SPORT_PLANNING", sportId, patch }),

      setPaymentProof: (fileId, fileName, mimeType) =>
        dispatch({ type: "SET_PAYMENT_PROOF", fileId, fileName, mimeType }),

      addAthlete: (athlete) => {
        const id = uid("ath")
        dispatch({ type: "ADD_ATHLETE", athlete: { id, ...athlete } })
        return id
      },
      updateAthlete: (athlete) => dispatch({ type: "UPDATE_ATHLETE", athlete }),
      removeAthlete: (athleteId) => dispatch({ type: "REMOVE_ATHLETE", athleteId }),

      addOfficial: (official) => {
        const id = uid("off")
        dispatch({ type: "ADD_OFFICIAL", official: { id, ...official } })
        return id
      },
      removeOfficial: (officialId) => dispatch({ type: "REMOVE_OFFICIAL", officialId }),

      upsertDocFile: (athleteId, docKey, fileId, fileName, mimeType) =>
        dispatch({ type: "UPSERT_DOC_FILE", athleteId, docKey, fileId, fileName, mimeType }),
    }
  }, [state, storageKey, hydrateReady])

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error("useRegistration must be used within RegistrationProvider")
  return ctx
}

