/** 백엔드 공통 응답 (docs/api-conventions.md 2 · 3장). 백엔드 global.web.response 와 같은 모양. */
export interface ApiMeta {
  requestId: string
  timestamp: string
}

export interface FieldError {
  field: string
  code: string
  reason: string
}

export interface ErrorBody {
  code: string
  message: string
  fieldErrors: FieldError[]
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error: ErrorBody | null
  meta: ApiMeta
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalCount: number
  hasNext: boolean
  summary?: Record<string, number> | null
}

/** 목록 요청 공통 파라미터. page 는 1부터, size 기본 15 · 최대 100. */
export interface PageQuery {
  page?: number
  size?: number
}

/** 쿼리 파라미터 값. 빈 문자열 · null · undefined 는 보내지 않는다. */
export type QueryValue = string | number | boolean | null | undefined | string[]
export type Query = Record<string, QueryValue>
