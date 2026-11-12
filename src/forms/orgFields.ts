import { ORG_HISTORY_KINDS, type OrgDetail, type OrgHistoryItem, type OrgUnit } from '@/api/org'
import { orgOptions } from '@/forms/accountFields'
import { type FieldDef, opts } from '@/shared/ui/fields'
import { type Column, cols } from '@/shared/ui/table'

/** 조직 관리 화면(ORG-27 · ORG-28 · ORG-33 · OIT-13)이 같이 쓰는 필드 · 열. 입력 차단 검증은 하지 않는다(서버 검증 확인용). */

export const ORG_MANAGE = 'org:org:manage'

/** 조직도 표 — 이름은 깊이만큼 들여쓴다. */
export const TREE_COLUMNS: Column<OrgUnit>[] = [
  { key: 'name', label: '조직', value: (o) => `${'　'.repeat(o.depth)}${o.name}` },
  ...cols<OrgUnit>(['orgType:유형', 'leaderName:조직장', 'memberCount:인원', 'sortOrder:순서']),
  { key: 'state', label: '상태', value: (o) => `${o.active ? '사용' : '사용 안 함'}${o.inScope ? '' : ' · 범위 밖'}` },
]

/** 선택한 조직 정보(KeyValueTable). */
export function detailRows(d: OrgDetail | null): Record<string, unknown> | null {
  if (!d) return null
  return {
    조직명: d.name,
    상위조직: d.parentName ?? '(회사 — 최상위)',
    유형: d.orgType ?? '-',
    조직장: d.leaderName ?? '-',
    연락처: d.phone ?? '-',
    표시순서: d.sortOrder,
    인원: `${d.memberCount}명 (아래 조직 포함 ${d.memberCountWithChildren}명)`,
    하위조직: `${d.childCount}개`,
    상태: d.active ? '사용' : '사용 안 함',
    수정가능: d.top ? '최상위 — 수정 불가' : d.inScope ? '관리 범위 안' : '관리 범위 밖 (서버 403)',
  }
}

/** 조직 추가(ORG-28) — 상위 조직 기본값은 화면이 넘긴다. 조직장은 만든 뒤 조직장 변경으로. */
export function createFields(orgs: readonly OrgUnit[] | null | undefined): FieldDef[] {
  return [
    { key: 'parentOrgId', label: '상위 조직', type: 'select', options: orgOptions(orgs), required: true },
    { key: 'name', label: '조직명', required: true, help: '같은 상위 조직 안에서 중복 불가 (409)' },
    { key: 'orgType', label: '유형', placeholder: '지점 · 팀 · 파트 (자유 입력)' },
    { key: 'phone', label: '연락처' },
    { key: 'sortOrder', label: '표시 순서', type: 'number' },
  ]
}

export const EDIT_FIELDS: FieldDef[] = [
  { key: 'name', label: '조직명', required: true },
  { key: 'phone', label: '연락처', help: '빈 값 = 없음' },
  { key: 'sortOrder', label: '표시 순서', type: 'number', required: true },
]

export const LEADER_FIELDS: FieldDef[] = [
  { key: 'leaderAccountId', label: '조직장 계정 ID', help: '그 조직(아래 조직 포함) 소속 계정만 — 빈 값 = 조직장 없음' },
]

export function moveFields(orgs: readonly OrgUnit[] | null | undefined): FieldDef[] {
  return [
    { key: 'parentOrgId', label: '새 상위 조직', type: 'select', options: orgOptions(orgs), required: true, help: '자기 자신 · 하위 조직 밑은 400' },
    { key: 'orgType', label: '유형 변경', placeholder: '빈 값 = 그대로 (예: 팀 → 지점 승급)' },
  ]
}

export function historyFilters(orgs: readonly OrgUnit[] | null | undefined): FieldDef[] {
  return [
    { key: 'from', label: '시작일', type: 'date', help: '빈 값 = 최근 1개월' },
    { key: 'to', label: '끝일', type: 'date' },
    { key: 'kind', label: '구분', type: 'select', options: opts(ORG_HISTORY_KINDS) },
    { key: 'orgId', label: '조직 (아래 포함)', type: 'select', options: orgOptions(orgs) },
  ]
}

export const ORG_HISTORY_COLUMNS: Column<OrgHistoryItem>[] = [
  ...cols<OrgHistoryItem>(['at:일시', 'kind:구분', 'orgPath:조직', 'field:항목']),
  { key: 'change', label: '이전 → 이후', value: (r) => `${r.before ?? '-'} → ${r.after ?? '-'}` },
  {
    key: 'type',
    label: '유형',
    value: (r) => (r.orgTypeBefore || r.orgTypeAfter ? `${r.orgTypeBefore ?? '-'} → ${r.orgTypeAfter ?? '-'}` : ''),
  },
  ...cols<OrgHistoryItem>(['reason:사유', 'actorName:처리자', 'ip:접속 IP']),
]
