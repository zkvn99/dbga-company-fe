import axios, { type AxiosResponse } from 'axios'
import { ApiError } from './ApiError'
import { recordRequest } from './requestLog'
import type { ApiResponse, Query } from './types'

/**
 * 유일한 HTTP 클라이언트. API 함수(src/api)만 이 파일의 api.* 를 부른다 — 페이지 · 컴포넌트에서 직접 부르지 않는다.
 *
 * - 인증: HttpOnly 쿠키 자동 전송. 토큰을 읽거나 헤더에 넣지 않는다(ADR-0016).
 * - CSRF: 상태를 바꾸는 요청 전에 XSRF-TOKEN 쿠키가 없으면 GET /api/auth/csrf. 403 AUTH_CSRF_INVALID 면 한 번 다시 받고 재시도.
 * - 401: /api/auth/** 밖이면 현재 Portal 의 갱신을 한 번 시도하고 재시도. 실패하면 onUnauthenticated.
 * - 성공(success=true)이면 data 만 돌려주고, 아니면 ApiError 를 던진다.
 * - 파일: upload = multipart(FormData) 한 개, download = 원본 바이트(ApiResponse 아님)를 받아 브라우저 저장(메모리 URL만, 저장소에 남기지 않음).
 */
export interface AuthHooks {
  refresh?: () => Promise<unknown>
  onUnauthenticated?: () => void
  onForbidden?: () => void
}

export interface RawResult {
  status: number
  requestId: string | null
  body: unknown
  ms: number
  contentDisposition?: string | null
}

/** 내려받은 파일(브라우저가 저장함). */
export interface DownloadedFile {
  fileName: string
  size: number
}

interface SendOptions {
  responseType?: 'json' | 'blob'
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

const CSRF_URL = '/api/auth/csrf'
const AUTH_PREFIX = '/api/auth/'
const MUTATING: ReadonlySet<Method> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

let hooks: AuthHooks = {}

/** 현재 Portal 의 갱신 · 로그인 이동 처리를 등록한다(라우터 가드가 Portal 진입 때 부름). */
export function setAuthHooks(next: AuthHooks): void {
  hooks = next
}

const http = axios.create({
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  validateStatus: () => true,
  // Spring 은 배열을 group=a&group=b 로 받는다(axios 기본값 group[]=a 아님).
  paramsSerializer: { indexes: null },
})

function hasCsrfCookie(): boolean {
  return document.cookie.split('; ').some((c) => c.startsWith('XSRF-TOKEN='))
}

async function ensureCsrf(force: boolean): Promise<void> {
  if (force || !hasCsrfCookie()) await send('GET', CSRF_URL)
}

export function cleanQuery(query?: Query): Query | undefined {
  if (!query) return undefined
  const out: Query = {}
  for (const [k, v] of Object.entries(query)) {
    if (v === '' || v === null || v === undefined) continue
    if (Array.isArray(v) && v.length === 0) continue
    out[k] = v
  }
  return out
}

function codeOf(body: unknown): string | null {
  const error = (body as Partial<ApiResponse<unknown>> | null)?.error
  return error?.code ?? null
}

async function send(method: Method, url: string, params?: Query, data?: unknown, options?: SendOptions): Promise<RawResult> {
  const started = performance.now()
  let res: AxiosResponse
  try {
    res = await http.request({ method, url, params: cleanQuery(params), data, responseType: options?.responseType ?? 'json' })
  } catch {
    recordRequest({ method, path: url, status: 0, code: 'NETWORK_ERROR', requestId: null, ms: 0 })
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 백엔드가 떠 있는지 확인하세요.')
  }
  const ms = Math.round(performance.now() - started)
  const requestId = (res.headers['x-request-id'] as string | undefined) ?? null
  recordRequest({ method, path: url, status: res.status, code: codeOf(res.data), requestId, ms })
  const contentDisposition = (res.headers['content-disposition'] as string | undefined) ?? null
  return { status: res.status, requestId, body: res.data, ms, contentDisposition }
}

/** CSRF 준비 · 재시도 · 갱신 재시도까지 마친 원시 결과. API 콘솔만 직접 쓴다. */
export async function rawRequest(method: Method, url: string, params?: Query, data?: unknown, options?: SendOptions): Promise<RawResult> {
  if (MUTATING.has(method)) await ensureCsrf(false)
  let res = await send(method, url, params, data, options)
  if (res.status === 403 && codeOf(res.body) === 'AUTH_CSRF_INVALID') {
    await ensureCsrf(true)
    res = await send(method, url, params, data, options)
  }
  if (res.status === 401 && !url.startsWith(AUTH_PREFIX) && hooks.refresh) {
    const refreshed = await hooks.refresh().then(
      () => true,
      () => false,
    )
    if (refreshed) res = await send(method, url, params, data, options)
  }
  return res
}

function toError(res: RawResult): ApiError {
  const body = res.body as Partial<ApiResponse<unknown>> | null
  const error = body?.error
  return new ApiError(
    res.status,
    error?.code ?? `HTTP_${res.status}`,
    error?.message ?? '응답 형식이 ApiResponse 가 아닙니다.',
    error?.fieldErrors ?? [],
    body?.meta?.requestId ?? res.requestId,
  )
}

function fail(url: string, res: RawResult): never {
  const error = toError(res)
  if (!url.startsWith(AUTH_PREFIX)) {
    if (error.status === 401) hooks.onUnauthenticated?.()
    if (error.status === 403 && error.code !== 'AUTH_CSRF_INVALID') hooks.onForbidden?.()
  }
  throw error
}

async function call<T>(method: Method, url: string, params?: Query, data?: unknown): Promise<T> {
  const res = await rawRequest(method, url, params, data)
  const body = res.body as Partial<ApiResponse<T>> | null
  if (res.status < 400 && body?.success) return body.data as T
  return fail(url, res)
}

/** Content-Disposition 의 파일명(RFC 5987 filename* 우선). */
export function fileNameOf(disposition: string | null | undefined): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) return decodeURIComponent(encoded)
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1] ?? 'download'
}

async function download(url: string, query?: Query): Promise<DownloadedFile> {
  const res = await rawRequest('GET', url, query, undefined, { responseType: 'blob' })
  const blob = res.body as Blob
  if (res.status >= 400) {
    let body: unknown = null
    try {
      body = JSON.parse(await blob.text())
    } catch {
      body = null
    }
    return fail(url, { ...res, body })
  }
  const fileName = fileNameOf(res.contentDisposition)
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.click()
  URL.revokeObjectURL(href)
  return { fileName, size: blob.size }
}

function upload<T>(url: string, file: File, field = 'file'): Promise<T> {
  const form = new FormData()
  form.append(field, file)
  return call<T>('POST', url, undefined, form)
}

export const api = {
  get: <T>(url: string, query?: Query) => call<T>('GET', url, query),
  post: <T>(url: string, body?: unknown) => call<T>('POST', url, undefined, body),
  put: <T>(url: string, body?: unknown) => call<T>('PUT', url, undefined, body),
  patch: <T>(url: string, body?: unknown) => call<T>('PATCH', url, undefined, body),
  delete: <T>(url: string, body?: unknown) => call<T>('DELETE', url, undefined, body),
  /** multipart 파일 1개(기본 필드명 file). */
  upload,
  /** 원본 바이트를 받아 브라우저에 저장. 실패하면 ApiError(본문 JSON). */
  download,
}
