import type { AuthRepository } from "@/repositories/authRepo"
import type { RegistrationRepository } from "@/repositories/registrationRepo"
import type { RegistrationSettingsRepository } from "@/repositories/registrationSettingsRepo"
import { ENV } from "@/config/env"
import { MockAuthRepo } from "@/repositories/mock/authRepo.mock"
import { MockRegistrationRepo } from "@/repositories/mock/registrationRepo.mock"
import { MockRegistrationSettingsRepo } from "@/repositories/mock/registrationSettingsRepo.mock"
import { HttpRegistrationSettingsRepo } from "@/repositories/http/registrationSettingsRepo.http"

export const Repos: {
  auth: AuthRepository
  registration: RegistrationRepository
  registrationSettings: RegistrationSettingsRepository
} = {
  auth: new MockAuthRepo(),
  registration: new MockRegistrationRepo(),
  registrationSettings: ENV.USE_MOCK ? new MockRegistrationSettingsRepo() : new HttpRegistrationSettingsRepo(),
}

