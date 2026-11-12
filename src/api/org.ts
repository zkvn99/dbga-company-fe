import { api } from '@/shared/http/client'
import type { PageQuery, PageResponse } from '@/shared/http/types'

/**
 * 조직 — org OrgTreeController(목록) · OrgManageController(상세 · 추가 · 수정 · 조직장 · 이동 · 사용 여부 · 삭제 · 이력).
 * 같은 API가 Portal마다 경로만 다르다: 조직 전산관리자 /api/oit/orgs(OIT-13), 조직 관리자 /api/org/orgs(ORG-27 · 28 · 33).
 */

export type OrgPortal = 'oit' | 'org'

/** 조직 목록 한 줄(트리 순서 — 상위 먼저 · sort_order). */
export interface OrgUnit {
  orgId: string
  parentOrgId: string | null
  name: string
  orgType: string | null
  /** 0 = 최상위(회사 조직). */
  depth: number
  active: boolean
  /** 처리자 관리 범위 안(선택 · 수정 가능 여부 표시용). */
  inScope: boolean
  sortOrder: number
  leaderAccountId: string | null
  leaderName: string | null
  /** 바로 소속된 계정 수(탈퇴 제외). */
  memberCount: number
}

export interface OrgDetail {
  orgId: string
  parentOrgId: string | null
  parentName: string | null
  name: string
  orgType: string | null
  leaderAccountId: string | null
  leaderName: string | null
  phone: string | null
  sortOrder: number
  active: boolean
  /** 최상위 회사 조직 — 수정 · 이동 · 삭제 불가. */
  top: boolean
  memberCount: number
  memberCountWithChildren: number
  childCount: number
  depth: number
  inScope: boolean
}

export interface CreateOrgRequest {
  parentOrgId: string
  name: string
  orgType?: string | null
  phone?: string | null
  sortOrder?: number | null
}

export interface EditOrgRequest {
  name: string
  phone?: string | null
  sortOrder: number
}

export interface ChangeOrgLeaderRequest {
  leaderAccountId: string | null
}

export interface MoveOrgRequest {
  parentOrgId: string
  orgType?: string | null
}

export interface OrgChanged {
  orgId: string
  changed: boolean
}

/** CREATE · RENAME · MOVE · LEADER · INFO · DEACTIVATE · ACTIVATE · DELETE */
export const ORG_HISTORY_KINDS = ['CREATE', 'RENAME', 'MOVE', 'LEADER', 'INFO', 'DEACTIVATE', 'ACTIVATE', 'DELETE'] as const

export interface OrgHistoryItem {
  historyId: string
  at: string
  kind: string
  orgId: string
  orgPath: string
  field: string | null
  /** 이동 = 상위 조직 이름, 조직장 = 계정 이름, 연락처 = 가린 값. */
  before: string | null
  after: string | null
  orgTypeBefore: string | null
  orgTypeAfter: string | null
  reason: string | null
  actorType: string
  actorName: string | null
  ip: string | null
}

export interface OrgHistoryQuery extends PageQuery {
  from?: string | null
  to?: string | null
  kind?: string | null
  orgId?: string | null
}

const base = (portal: OrgPortal) => `/api/${portal}/orgs`
const one = (portal: OrgPortal, orgId: string) => `${base(portal)}/${encodeURIComponent(orgId)}`

/** Portal별 조직 API — 목록 · 상세 · 이력 = org:org:read, 나머지 = org:org:manage. */
export function orgManageApi(portal: OrgPortal) {
  return {
    list: () => api.get<OrgUnit[]>(base(portal)),
    detail: (orgId: string) => api.get<OrgDetail>(one(portal, orgId)),
    create: (body: CreateOrgRequest) => api.post<OrgChanged>(base(portal), body),
    edit: (orgId: string, body: EditOrgRequest) => api.put<OrgChanged>(one(portal, orgId), body),
    changeLeader: (orgId: string, body: ChangeOrgLeaderRequest) => api.put<OrgChanged>(`${one(portal, orgId)}/leader`, body),
    move: (orgId: string, body: MoveOrgRequest) => api.post<OrgChanged>(`${one(portal, orgId)}/move`, body),
    deactivate: (orgId: string, reason?: string) => api.post<OrgChanged>(`${one(portal, orgId)}/deactivate`, { reason: reason ?? null }),
    activate: (orgId: string) => api.post<OrgChanged>(`${one(portal, orgId)}/activate`),
    remove: (orgId: string) => api.delete<OrgChanged>(one(portal, orgId)),
    history: (query: OrgHistoryQuery) => api.get<PageResponse<OrgHistoryItem>>(`${base(portal)}/history`, { ...query }),
    orgHistory: (orgId: string, query: PageQuery) => api.get<PageResponse<OrgHistoryItem>>(`${one(portal, orgId)}/history`, { ...query }),
  }
}

export const orgApi = {
  /** ORG_SYSTEM_ADMIN (org:org:read). */
  oitOrgs: () => api.get<OrgUnit[]>('/api/oit/orgs'),
  /** ORG_MANAGER (org:org:read). */
  orgOrgs: () => api.get<OrgUnit[]>('/api/org/orgs'),
}
