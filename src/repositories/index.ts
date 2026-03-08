import type { AuthRepository } from "@/repositories/authRepo"
import type { RegistrationRepository } from "@/repositories/registrationRepo"
import { MockAuthRepo } from "@/repositories/mock/authRepo.mock"
import { MockRegistrationRepo } from "@/repositories/mock/registrationRepo.mock"

export const Repos: {
  auth: AuthRepository
  registration: RegistrationRepository
} = {
  auth: new MockAuthRepo(),
  registration: new MockRegistrationRepo(),
}

