import { api } from '@/shared/http/client'
import type { PageQuery, PageResponse } from '@/shared/http/types'
import type { AccountRole, AccountStatus, AlimtalkNoticeType, PhoneKind } from './account'
import type { AccountHistoryItem, OrgRef } from './accountManage'

/**
 * 조직원 조회(ORG-24 · ORG-32, 조직 관리자 — iam:member:read) — iam MemberQueryController. 처리자 관리 범위 안의 모든 역할(설계사 · 조직 관리자 · 전산관리자), 조회만. 회원 처리는 설계사만.
 * 회원 처리(정지 · 해제)는 accountManageApi.orgSuspend · orgUnsuspend.
 */

export interface MemberSearchQuery extends PageQuery {
  status?: AccountStatus | null
  role?: AccountRole | null
  orgId?: string | null
  rankCode?: string | null
  q?: string | null
  phone?: string | null
}

/** 직급 · 직책은 코드(이름은 코드 선택지로 붙인다). primaryPhone = 가린 대표 휴대폰. 보유 DB는 DB 배정 작업 때. */
export interface MemberListItem {
  accountId: string
  loginId: string
  name: string
  employeeNo: string | null
  org: OrgRef
  role: AccountRole
  roleName: string | null
  rankCode: string | null
  positionCode: string | null
  primaryPhone: string | null
  hireDate: string | null
  status: AccountStatus
}

export interface MemberPhone {
  kind: PhoneKind
  number: string
  memo: string | null
  primary: boolean
}

/** 이메일 · 생년월일 · 번호는 가린 값. */
export interface MemberDetail {
  accountId: string
  loginId: string
  name: string
  status: AccountStatus
  role: AccountRole
  roleName: string | null
  org: OrgRef
  email: string | null
  employeeNo: string | null
  birthDate: string | null
  gender: string | null
  hireDate: string | null
  rankCode: string | null
  positionCode: string | null
  phones: MemberPhone[]
  alimtalk: Record<AlimtalkNoticeType, boolean>
  locked: boolean
  lastLoginAt: string | null
  passwordChangedAt: string | null
}

const BASE = '/api/org/members'
const one = (accountId: string) => `${BASE}/${encodeURIComponent(accountId)}`

export const orgMemberApi = {
  members: (query: MemberSearchQuery) => api.get<PageResponse<MemberListItem>>(BASE, { ...query }),
  member: (accountId: string) => api.get<MemberDetail>(one(accountId)),
  history: (accountId: string, query: PageQuery) => api.get<PageResponse<AccountHistoryItem>>(`${one(accountId)}/history`, { ...query }),
}
