import type { AuthRepository } from "@/repositories/authRepo"
import type { RegistrationRepository } from "@/repositories/registrationRepo"
import type { RegistrationSettingsRepository } from "@/repositories/registrationSettingsRepo"
import { ENV } from "@/config/env"
import { MockAuthRepo } from "@/repositories/mock/authRepo.mock"
import { MockRegistrationRepo } from "@/repositories/mock/registrationRepo.mock"
import { MockRegistrationSettingsRepo } from "@/repositories/mock/registrationSettingsRepo.mock"
import { HttpAuthRepo } from "@/repositories/http/authRepo.http"
import { HttpRegistrationRepo } from "@/repositories/http/registrationRepo.http"
import { HttpRegistrationSettingsRepo } from "@/repositories/http/registrationSettingsRepo.http"

const mockAuthRepo = new MockAuthRepo()
const mockRegistrationRepo = new MockRegistrationRepo()

export const Repos: {
  auth: AuthRepository
  registration: RegistrationRepository
  registrationSettings: RegistrationSettingsRepository
} = {
  auth: ENV.USE_MOCK ? mockAuthRepo : new HttpAuthRepo(mockAuthRepo),
  registration: ENV.USE_MOCK ? mockRegistrationRepo : new HttpRegistrationRepo(),
  registrationSettings: ENV.USE_MOCK ? new MockRegistrationSettingsRepo() : new HttpRegistrationSettingsRepo(),
}

