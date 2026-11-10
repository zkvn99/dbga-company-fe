import { api } from '@/shared/http/client'

/** 조직 목록(트리 순서 — 상위 먼저 · sort_order) — org OrgTreeController. 소속 · 관리 범위 · 코드 적용 조직 선택용. */

export interface OrgUnit {
  orgId: string
  parentOrgId: string | null
  name: string
  orgType: string | null
  /** 0 = 최상위(회사 조직). */
  depth: number
  active: boolean
  /** 처리자 관리 범위 안(선택 가능 여부 표시용). */
  inScope: boolean
}

export const orgApi = {
  /** ORG_SYSTEM_ADMIN (org:org:read). */
  oitOrgs: () => api.get<OrgUnit[]>('/api/oit/orgs'),
  /** ORG_MANAGER (org:org:read). */
  orgOrgs: () => api.get<OrgUnit[]>('/api/org/orgs'),
}
