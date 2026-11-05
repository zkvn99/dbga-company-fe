import type { AccountMe } from '@/api/account'
import { type FieldDef, opts } from '@/shared/ui/fields'

/** 계정 등록 화면(ORG-25 · OIT-03)이 같이 쓰는 필드. */
export const PHONES: FieldDef = {
  key: 'phones',
  label: '연락처',
  type: 'list',
  required: true,
  help: '대표 휴대폰 정확히 1개(휴대폰만) · 같은 번호 한 번만',
  itemFields: [
    { key: 'kind', label: '종류', type: 'select', options: opts(['MOBILE', 'LANDLINE']), required: true },
    { key: 'number', label: '번호', type: 'tel', required: true },
    { key: 'memo', label: '메모' },
    { key: 'primary', label: '대표', type: 'checkbox' },
  ],
}

export const ALIMTALK: FieldDef = {
  key: 'alimtalk',
  label: '알림톡 수신',
  type: 'boolmap',
  options: opts(['DB_ASSIGN', 'SCHEDULE', 'AS_RESULT', 'PURCHASE']),
}

export const GENDER: FieldDef = { key: 'gender', label: '성별', type: 'select', options: opts(['M', 'F']) }

/** 기본값: 내 조직 · 대표 휴대폰 한 행 · 알림톡 전부 켬. */
export function accountInitial(me: AccountMe | null) {
  return {
    orgId: me?.orgId ?? '',
    phones: [{ kind: 'MOBILE', number: '', memo: '', primary: true }],
    alimtalk: { DB_ASSIGN: true, SCHEDULE: true, AS_RESULT: true, PURCHASE: true },
  }
}
