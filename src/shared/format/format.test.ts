import { describe, expect, it } from 'vitest'
import { formatCell, formatValue } from './format'

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

describe('formatCell', () => {
  it('비어 있는 처리자 · 생성자 칸은 시스템', () => {
    expect(formatCell('createdBy', null)).toBe('시스템')
    expect(formatCell('actorName', null, { actorType: 'SYSTEM' })).toBe('시스템')
    expect(formatCell('updatedByName', '', {})).toBe('시스템')
  })
  it('처리자 유형이 SYSTEM 이 아니면 -, 값이 있으면 그대로, 다른 칸은 formatValue', () => {
    expect(formatCell('actorName', null, { actorType: 'ADMIN' })).toBe('-')
    expect(formatCell('actorName', '홍관리', { actorType: 'ADMIN' })).toBe('홍관리')
    expect(formatCell('actorType', null)).toBe('-')
    expect(formatCell('name', null)).toBe('-')
  })
})
