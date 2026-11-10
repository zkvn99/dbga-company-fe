import { api } from '@/shared/http/client'
import type { AccountPortal } from './account'

/** 코드 관리(OIT-08) · 선택지 — code CodeManageController · CodeOptionsController. */

export type CodeGroupScope = 'SYSTEM_LOCKED' | 'EXTENSIBLE' | 'ORG' | 'COMPANY' | 'CENTER'

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
  ownerOrgId: string | null
  ownerOrgName: string | null
  active: boolean
  locked: boolean
}

export interface CodeGroupDetail {
  group: CodeGroup
  /** [조직 코드 추가]를 보일 그룹. */
  editable: boolean
  codes: CodeItem[]
}

export interface AddOrgCodeRequest {
  code: string
  name: string
  orgId: string
  sortOrder: number
}

export interface EditOrgCodeRequest {
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
  addCode: (groupCode: string, body: AddOrgCodeRequest) => api.post<CodeChanged>(`${group(groupCode)}/codes`, body),
  editCode: (groupCode: string, codeId: string, body: EditOrgCodeRequest) => api.put<CodeChanged>(code(groupCode, codeId), body),
  activate: (groupCode: string, codeId: string) => api.post<CodeChanged>(`${code(groupCode, codeId)}/activate`),
  deactivate: (groupCode: string, codeId: string) => api.post<CodeChanged>(`${code(groupCode, codeId)}/deactivate`),
  regions: () => api.get<Regions>('/api/oit/regions'),
  /** 선택지(code:option:read) — orgId 없으면 본인 조직. ?group=RANK&group=POSITION */
  options: (portal: AccountPortal, groups: string[], orgId?: string | null) =>
    api.get<Record<string, CodeOption[]>>(`/api/${portal}/codes/options`, { group: groups, orgId }),
}
