import type { AccountMe } from '@/api/account'
import type { AccountHistoryItem } from '@/api/accountManage'
import type { CodeOption } from '@/api/code'
import type { OrgUnit } from '@/api/org'
import { type FieldDef, type Option, opts } from '@/shared/ui/fields'
import { type Column, cols } from '@/shared/ui/table'

/** 계정 화면(ORG-25 · OIT-02 · OIT-03)이 같이 쓰는 필드 · 열 · 선택지. */
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

export const SCOPE_TYPE: FieldDef = { key: 'scopeType', label: '관리 범위', type: 'select', options: opts(['COMPANY', 'ORG']), help: 'COMPANY 회사 전체 · ORG 조직 선택' }

/** 조직 목록 → 선택지(깊이만큼 들여쓰기, 범위 밖 · 사용 안 함 표시). 선택은 막지 않는다 — 서버 검증 확인용. */
export function orgOptions(orgs: readonly OrgUnit[] | null | undefined): Option[] {
  return (orgs ?? []).map((o) => ({
    value: o.orgId,
    label: `${'　'.repeat(o.depth)}${o.name}${o.inScope ? '' : ' (범위 밖)'}${o.active ? '' : ' (사용 안 함)'}`,
  }))
}

/** 코드 선택지 → 옵션('이름 (코드)'). */
export function codeOptions(options: readonly CodeOption[] | null | undefined): Option[] {
  return (options ?? []).map((o) => ({ value: o.code, label: `${o.name} (${o.code})` }))
}

/** 로그인한 계정이 그 기능을 가졌나(/me features). 표시용 — 최종 판정은 서버. */
export function hasFeature(me: AccountMe | null | undefined, feature: string): boolean {
  return !!me?.features?.includes(feature)
}

/** 공통 이력 모달(ORG-34) 열 — 일시 · 구분 · 내용(이전 → 이후) · 사유 · 처리자. */
export const HISTORY_COLUMNS: Column<AccountHistoryItem>[] = [
  ...cols<AccountHistoryItem>(['at:일시', 'source:출처', 'kind:구분', 'field:항목']),
  { key: 'change', label: '내용 (이전 → 이후)', value: (r) => `${r.before ?? '-'} → ${r.after ?? '-'}` },
  ...cols<AccountHistoryItem>(['reason:사유', 'actorType:처리자 유형', 'actorName:처리자']),
]

/** 기본값: 내 조직 · 대표 휴대폰 한 행 · 알림톡 전부 켬. */
export function accountInitial(me: AccountMe | null) {
  return {
    orgId: me?.orgId ?? '',
    phones: [{ kind: 'MOBILE', number: '', memo: '', primary: true }],
    alimtalk: { DB_ASSIGN: true, SCHEDULE: true, AS_RESULT: true, PURCHASE: true },
  }
}
