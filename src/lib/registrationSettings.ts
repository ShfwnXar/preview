export type RegistrationSettings = {
  registrationOpen: boolean
  updatedAt?: string
  updatedBy?: string
}

export const REGISTRATION_SETTINGS_KEY = "mg26_registration_settings"

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettings = {
  registrationOpen: true,
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function readRegistrationSettings(): RegistrationSettings {
  if (typeof window === "undefined") return DEFAULT_REGISTRATION_SETTINGS
  const saved = safeParse<RegistrationSettings | null>(localStorage.getItem(REGISTRATION_SETTINGS_KEY), null)
  return {
    ...DEFAULT_REGISTRATION_SETTINGS,
    ...(saved ?? {}),
  }
}

export function writeRegistrationSettings(settings: RegistrationSettings) {
  if (typeof window === "undefined") return
  localStorage.setItem(REGISTRATION_SETTINGS_KEY, JSON.stringify(settings))
}