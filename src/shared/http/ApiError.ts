import type { FieldError } from './types'

/** 실패한 API 호출. 화면은 code 로 분기하고 message · requestId 를 그대로 보여 준다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: FieldError[] = [],
    readonly requestId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static from(e: unknown): ApiError {
    if (e instanceof ApiError) return e
    const message = e instanceof Error ? e.message : String(e)
    return new ApiError(0, 'CLIENT_ERROR', message)
  }
}
