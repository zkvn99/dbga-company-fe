import { reactive } from 'vue'

/**
 * 최근 요청 기록 (화면 하단 패널). 화이트박스 테스트에서 상태 · 오류 코드 · requestId 를 바로 본다.
 * 개인정보가 섞일 수 있는 쿼리 · 본문은 남기지 않는다 — 메서드 · 경로 · 결과만 (docs/logging.md).
 */
export interface RequestLogEntry {
  seq: number
  at: string
  method: string
  path: string
  status: number
  code: string | null
  requestId: string | null
  ms: number
}

const MAX = 50
let seq = 0

export const requestLog = reactive<RequestLogEntry[]>([])

export function recordRequest(entry: Omit<RequestLogEntry, 'seq' | 'at'>): void {
  seq += 1
  requestLog.unshift({ ...entry, seq, at: new Date().toLocaleTimeString('ko-KR', { hour12: false }) })
  if (requestLog.length > MAX) requestLog.length = MAX
}

export function clearRequestLog(): void {
  requestLog.length = 0
}
