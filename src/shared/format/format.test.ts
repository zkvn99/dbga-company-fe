import { describe, expect, it } from 'vitest'
import { formatValue } from './format'

describe('formatValue', () => {
  it('날짜는 YYYY.MM.DD, 시각은 YYYY.MM.DD HH:mm', () => {
    expect(formatValue('2026-11-03')).toBe('2026.11.03')
    expect(formatValue('2026-11-03T09:22:02+09:00')).toBe('2026.11.03 09:22')
  })

  it('빈 값은 -, 불리언은 Y/N, 배열은 쉼표', () => {
    expect(formatValue(null)).toBe('-')
    expect(formatValue('')).toBe('-')
    expect(formatValue(true)).toBe('Y')
    expect(formatValue(['A', 'B'])).toBe('A, B')
  })
})
