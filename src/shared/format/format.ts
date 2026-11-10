/** 화면 표시 형식 (docs/api-conventions.md 5장): 날짜 YYYY.MM.DD, 시각 YYYY.MM.DD HH:mm, null 은 '-'. */
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

export function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Y' : 'N'
  if (typeof value === 'string') {
    const d = DATE.exec(value)
    if (d) return `${d[1]}.${d[2]}.${d[3]}`
    const t = DATETIME.exec(value)
    if (t) return `${t[1]}.${t[2]}.${t[3]} ${t[4]}:${t[5]}`
    return value
  }
  if (Array.isArray(value)) return value.length === 0 ? '-' : value.map(formatValue).join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * 처리자 · 생성자 · 수정자 칸(키 이름이 actor · createdBy · updatedBy · grantedBy · issuedBy 로 시작)은 비어 있으면 '시스템'.
 * 서버는 시스템이 한 일을 NULL 로 둔다(created_by · updated_by NULL = 시스템 — docs/database.md). 처리자 유형(actorType)이
 * 있고 SYSTEM 이 아니면(지워진 계정 등) 그냥 '-'.
 */
export const SYSTEM_ACTOR_LABEL = '시스템'
const ACTOR_KEY = /^(actor|createdBy|updatedBy|grantedBy|issuedBy)/

export function formatCell(key: string, value: unknown, row?: Record<string, unknown>): string {
  const empty = value === null || value === undefined || value === ''
  if (empty && ACTOR_KEY.test(key) && key !== 'actorType') {
    const type = row?.actorType
    if (type === undefined || type === null || type === 'SYSTEM') return SYSTEM_ACTOR_LABEL
  }
  return formatValue(value)
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'undefined'
}
