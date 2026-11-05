import { describe, expect, it } from 'vitest'
import { type FieldDef, initialValues, toPayload } from './fields'

const fields: FieldDef[] = [
  { key: 'name', label: '이름' },
  { key: 'sortOrder', label: '순서', type: 'number' },
  { key: 'regionCodes', label: '지역', type: 'csv' },
  { key: 'loginId', label: '아이디', type: 'readonly' },
  {
    key: 'phones',
    label: '연락처',
    type: 'list',
    itemFields: [
      { key: 'number', label: '번호' },
      { key: 'primary', label: '대표', type: 'checkbox' },
    ],
  },
]

describe('initialValues', () => {
  it('서버 값을 폼 값으로 바꾼다(배열 → 쉼표, 없으면 빈 값)', () => {
    const v = initialValues(fields, { name: 'A', regionCodes: ['11', '26'], phones: [{ number: '010' }] })
    expect(v).toEqual({
      name: 'A',
      sortOrder: null,
      regionCodes: '11, 26',
      loginId: '',
      phones: [{ number: '010', primary: false }],
    })
  })
})

describe('toPayload', () => {
  it('빈 문자열은 null, 숫자 · 쉼표 목록 · 행 목록을 변환하고 readonly 는 뺀다', () => {
    const payload = toPayload(fields, {
      name: '',
      sortOrder: '3',
      regionCodes: '11, ,26',
      loginId: 'x',
      phones: [{ number: '', primary: true }],
    })
    expect(payload).toEqual({
      name: null,
      sortOrder: 3,
      regionCodes: ['11', '26'],
      phones: [{ number: null, primary: true }],
    })
  })
})
