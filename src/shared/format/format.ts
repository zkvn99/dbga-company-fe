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

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? 'undefined'
}
