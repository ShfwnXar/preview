import type { AuthRepository, ResetTokenResult } from "@/repositories/authRepo"
import type {
  ApiEnvelope,
  CreateAdminRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/api"
import { ENV } from "@/config/env"
import { getAuthToken } from "@/lib/authSession"
import { http } from "@/lib/http"
import type { User } from "@/context/AuthContext"
import type { MockAuthRepo } from "@/repositories/mock/authRepo.mock"

export class HttpAuthRepo implements AuthRepository {
  constructor(private readonly fallback: MockAuthRepo) {}

  private baseUrl() {
    if (!ENV.API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL belum dikonfigurasi.")
    }
    return ENV.API_BASE_URL
  }

  async login(input: LoginRequest): Promise<{ ok: boolean; message: string; data?: LoginResponse }> {
    try {
      const res = await http<ApiEnvelope<LoginResponse> | LoginResponse>(`${this.baseUrl()}/api/auth/login`, {
        method: "POST",
        body: input,
      })
      const payload = typeof res === "object" && res !== null && "data" in res ? res : { data: res, message: "Login berhasil." }
      if (!payload.data?.accessToken || !payload.data?.user) {
        return { ok: false, message: "Response login backend tidak lengkap." }
      }
      return {
        ok: true,
        message: payload.message || "Login berhasil.",
        data: payload.data,
      }
    } catch (error) {
      if (input.email.trim().toLowerCase().endsWith("@mg.local")) {
        return this.fallback.login(input)
      }
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Login gagal.",
      }
    }
  }

  async register(input: RegisterRequest) {
    return this.fallback.register(input)
  }

  async logout() {
    try {
      await http(`${this.baseUrl()}/api/auth/logout`, { method: "POST", token: getAuthToken() ?? undefined })
    } catch {
      // ignore logout API failures to preserve existing UX
    }
    await this.fallback.logout()
  }

  async listUsers(): Promise<User[]> {
    return this.fallback.listUsers()
  }

  async updateUserPassword(userId: string, newPassword: string) {
    return this.fallback.updateUserPassword(userId, newPassword)
  }

  async setUserActive(userId: string, active: boolean) {
    return this.fallback.setUserActive(userId, active)
  }

  async deleteUser(userId: string) {
    return this.fallback.deleteUser(userId)
  }

  async createAdmin(input: CreateAdminRequest) {
    return this.fallback.createAdmin(input)
  }

  async generateResetToken(email: string): Promise<ResetTokenResult> {
    return this.fallback.generateResetToken(email)
  }

  async resetPasswordWithToken(input: ResetPasswordRequest) {
    return this.fallback.resetPasswordWithToken(input)
  }
}
