export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export class HttpError extends Error {
  status: number
  data: any
  constructor(status: number, message: string, data?: any) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function http<T>(
  url: string,
  opts?: {
    method?: HttpMethod
    body?: any
    token?: string
    headers?: Record<string, string>
  }
): Promise<T> {
  const method = opts?.method ?? "GET"
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers || {}),
  }
  if (opts?.token) headers["Authorization"] = `Bearer ${opts.token}`

  const res = await fetch(url, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })

  const ct = res.headers.get("content-type") || ""
  const data = ct.includes("application/json") ? await res.json() : await res.text()

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`
    throw new HttpError(res.status, msg, data)
  }

  return data as T
}