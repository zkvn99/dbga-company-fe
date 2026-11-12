import { api } from '@/shared/http/client'
import type { AccountPortal } from './account'

/** 코드 관리(OIT-08) · 선택지 — code CodeManageController · CodeOptionsController. */

/** SYSTEM_LOCKED 조회만 · EXTENSIBLE 시스템 기본 + 회사 추가 · COMPANY 회사가 전부 관리 · CENTER 센터 사본(조회만). 코드는 회사 단위 하나(ADR-0038). */
export type CodeGroupScope = 'SYSTEM_LOCKED' | 'EXTENSIBLE' | 'COMPANY' | 'CENTER'
export const CODE_GROUP_SCOPES: readonly CodeGroupScope[] = ['SYSTEM_LOCKED', 'EXTENSIBLE', 'COMPANY', 'CENTER']

export interface CodeGroup {
  groupCode: string
  parentGroupCode: string | null
  name: string
  scope: CodeGroupScope
  /** COMPANY 회사 코드 · CENTER 센터 사본(조회만). */
  source: 'COMPANY' | 'CENTER'
  usedIn: string | null
  active: boolean
  codeCount: number
}

export interface CodeItem {
  /** 회사 코드 ID — 센터 사본이면 null. */
  codeId: string | null
  code: string
  name: string
  sortOrder: number
  /** 시스템 기본 값(시드). 센터 사본이면 true. */
  systemDefault: boolean
  active: boolean
  locked: boolean
}

export interface CodeGroupDetail {
  group: CodeGroup
  /** [코드 추가]를 보일 그룹. */
  editable: boolean
  codes: CodeItem[]
}

export interface AddCompanyCodeRequest {
  code: string
  name: string
  sortOrder: number
}

export interface EditCompanyCodeRequest {
  name: string
  sortOrder: number
}

export interface CodeChanged {
  codeId: string
  changed: boolean
}

export interface Regions {
  regions: { regionCode: string; name: string; sortOrder: number; active: boolean }[]
  groups: { groupId: string; name: string; regionCodes: string[]; active: boolean }[]
}

export interface CodeOption {
  code: string
  name: string
}

const GROUPS = '/api/oit/codes/groups'
const group = (groupCode: string) => `${GROUPS}/${encodeURIComponent(groupCode)}`
const code = (groupCode: string, codeId: string) => `${group(groupCode)}/codes/${encodeURIComponent(codeId)}`

export const codeApi = {
  groups: () => api.get<CodeGroup[]>(GROUPS),
  group: (groupCode: string) => api.get<CodeGroupDetail>(group(groupCode)),
  addCode: (groupCode: string, body: AddCompanyCodeRequest) => api.post<CodeChanged>(`${group(groupCode)}/codes`, body),
  editCode: (groupCode: string, codeId: string, body: EditCompanyCodeRequest) => api.put<CodeChanged>(code(groupCode, codeId), body),
  activate: (groupCode: string, codeId: string) => api.post<CodeChanged>(`${code(groupCode, codeId)}/activate`),
  deactivate: (groupCode: string, codeId: string) => api.post<CodeChanged>(`${code(groupCode, codeId)}/deactivate`),
  regions: () => api.get<Regions>('/api/oit/regions'),
  /** 선택지(code:option:read) — 사용 중인 회사 코드(소속 조직과 무관). ?group=RANK&group=POSITION */
  options: (portal: AccountPortal, groups: string[]) => api.get<Record<string, CodeOption[]>>(`/api/${portal}/codes/options`, { group: groups }),
}
