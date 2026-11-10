import { api } from '@/shared/http/client'
import type { PageQuery, PageResponse } from '@/shared/http/types'
import type { AccountRole, AccountStatus, AlimtalkNoticeType, ManageScopeType, PhoneKind } from './account'

/**
 * 계정 관리(OIT-02 · OIT-03 수정 · ORG-26 B안 · ORG-34 이력) — iam AccountQueryController · AccountManageController ·
 * MemberProcessController · PermissionController. 권한 세트 · 역할 이름은 ./permissionSet.
 */

export interface OrgRef {
  orgId: string
  orgName: string
}

export interface ManageScope {
  scopeType: ManageScopeType | null
  orgs: OrgRef[]
}

/** 계정의 권한 세트 — assigned=false 면 지정 없이 역할 기본 세트를 따르는 중(ADR-0031). */
export interface AccountPermissionSet {
  setId: string
  name: string
  isDefault: boolean
  assigned: boolean
}

export interface AccountSearchQuery extends PageQuery {
  role?: AccountRole | null
  status?: AccountStatus | null
  orgId?: string | null
  /** 기본 세트를 고르면 미지정(기본 따름) 계정도 포함 — summary 도 이 조건 반영. */
  permissionSetId?: string | null
  q?: string | null
}

export interface AccountListItem {
  accountId: string
  loginId: string
  name: string
  employeeNo: string | null
  role: AccountRole
  roleName: string | null
  permissionSet: AccountPermissionSet | null
  status: AccountStatus
  org: OrgRef
  scope: ManageScope
  delegations: string[]
  locked: boolean
  lastLoginAt: string | null
  /** 마지막 활동 조직 전산관리자 — 정지 · 역할 변경 · 휴직 버튼 비활성. */
  lastActiveSystemAdmin: boolean
}

export interface AccountDetailPhone {
  phoneId: string
  kind: PhoneKind
  /** 가린 번호(010-****-1234). */
  number: string
  memo: string | null
  primary: boolean
}

export interface AccountDetail {
  accountId: string
  loginId: string
  name: string
  role: AccountRole
  roleName: string | null
  permissionSet: AccountPermissionSet | null
  status: AccountStatus
  org: OrgRef
  /** 가린 이메일. */
  email: string | null
  employeeNo: string | null
  /** 가린 생년월일(1991-**-**). */
  birthDate: string | null
  gender: 'M' | 'F' | null
  hireDate: string | null
  rankCode: string | null
  positionCode: string | null
  phones: AccountDetailPhone[]
  alimtalk: Record<AlimtalkNoticeType, boolean>
  scope: ManageScope
  delegations: string[]
  locked: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  lastActiveSystemAdmin: boolean
}

export interface AccountHistoryItem {
  source: 'ACCOUNT' | 'DELEGATION'
  at: string
  kind: string
  field: string | null
  before: string | null
  after: string | null
  reason: string | null
  actorType: string | null
  actorName: string | null
}

/** 기본 정보 — email · birthDate 는 null 이면 그대로(새 값 입력 시 변경), status 는 ACTIVE · LEAVE 만(null = 그대로). */
export interface EditAccountRequest {
  name: string
  email: string | null
  employeeNo: string | null
  birthDate: string | null
  hireDate: string | null
  gender: 'M' | 'F' | null
  orgId: string
  rankCode: string | null
  positionCode: string | null
  status: 'ACTIVE' | 'LEAVE' | null
}

/** 추가 번호 전체 교체 — phoneId 있으면 수정, 없으면 추가, 빠지면 삭제. 대표 항목은 무시. 번호는 원문 필수(가린 값은 400). */
export interface EditContactsRequest {
  phones: { phoneId: string | null; kind: PhoneKind; number: string; memo: string | null; primary?: boolean }[]
}

export interface EditAlimtalkRequest {
  alimtalk: Partial<Record<AlimtalkNoticeType, boolean>>
}

/** 지정 세트가 있었으면 역할 변경 시 서버가 NULL(새 역할 기본 세트)로 되돌린다. */
export interface ChangeRoleRequest {
  role: AccountRole
  scopeType: ManageScopeType | null
  scopeOrgIds: string[] | null
}

export interface ChangeScopeRequest {
  scopeType: ManageScopeType
  scopeOrgIds: string[] | null
}

export interface ChangeDelegationsRequest {
  features: string[]
}

/** null = 역할 기본 세트 따르기. */
export interface ChangePermissionSetRequest {
  setId: string | null
}

export interface AccountActionRequest {
  reason?: string | null
}

/** 회원 처리 B안 — 사유 필수(500자). */
export interface MemberProcessRequest {
  reason: string
}

export interface AccountChanged {
  accountId: string
  changed: boolean
}

export interface MemberProcessResult {
  accountId: string
  processId: string | null
  changed: boolean
}

export interface CatalogRole {
  role: AccountRole
  roleName: string
  /** 기본 세트 기능(잠금 포함). */
  features: { code: string; description: string }[]
  /** 세트에 넣을 수 있는 기능 = 그 역할 Portal 경로 기능 + 잠금(locked = 끌 수 없음). */
  assignable: { code: string; label: string; locked: boolean }[]
  /** 이 역할에 위임할 수 있는 기능 = Portal 경로 기능 − 잠금 − 위임 금지(ADR-0032). */
  delegable: { code: string; label: string }[]
  sets: { setId: string; name: string; isDefault: boolean; accountCount: number }[]
}

export interface PermissionCatalog {
  roles: CatalogRole[]
  apis: { method: string; path: string; feature: string; description: string }[]
}

const ACCOUNTS = '/api/oit/accounts'
const one = (accountId: string) => `${ACCOUNTS}/${encodeURIComponent(accountId)}`

export const accountManageApi = {
  // 조회 (iam:account:read)
  accounts: (query: AccountSearchQuery) => api.get<PageResponse<AccountListItem>>(ACCOUNTS, { ...query }),
  account: (accountId: string) => api.get<AccountDetail>(one(accountId)),
  history: (accountId: string, query: PageQuery) => api.get<PageResponse<AccountHistoryItem>>(`${one(accountId)}/history`, { ...query }),

  // 수정
  edit: (accountId: string, body: EditAccountRequest) => api.put<AccountChanged>(one(accountId), body),
  editContacts: (accountId: string, body: EditContactsRequest) => api.put<AccountChanged>(`${one(accountId)}/contacts`, body),
  editAlimtalk: (accountId: string, body: EditAlimtalkRequest) => api.put<AccountChanged>(`${one(accountId)}/alimtalk`, body),
  resetPassword: (accountId: string, body: AccountActionRequest) => api.post<AccountChanged>(`${one(accountId)}/password-reset`, body),
  changeRole: (accountId: string, body: ChangeRoleRequest) => api.put<AccountChanged>(`${one(accountId)}/role`, body),
  changeScope: (accountId: string, body: ChangeScopeRequest) => api.put<AccountChanged>(`${one(accountId)}/scope`, body),
  changeDelegations: (accountId: string, body: ChangeDelegationsRequest) => api.put<AccountChanged>(`${one(accountId)}/delegations`, body),
  /** iam:account:permission-set — 범위 밖 403 · 탈퇴 409 · 역할 불일치 400. */
  changePermissionSet: (accountId: string, body: ChangePermissionSetRequest) => api.put<AccountChanged>(`${one(accountId)}/permission-set`, body),
  unlock: (accountId: string, body: AccountActionRequest) => api.post<AccountChanged>(`${one(accountId)}/unlock`, body),

  // 회원 처리 B안 (iam:account:suspend)
  suspend: (accountId: string, body: MemberProcessRequest) => api.post<MemberProcessResult>(`${one(accountId)}/suspend`, body),
  unsuspend: (accountId: string, body: MemberProcessRequest) => api.post<MemberProcessResult>(`${one(accountId)}/unsuspend`, body),
  /** ORG 조직 관리자(위임 시) — 화면(ORG-24)은 대기라 함수만. */
  orgSuspend: (accountId: string, body: MemberProcessRequest) => api.post<MemberProcessResult>(`/api/org/members/${encodeURIComponent(accountId)}/suspend`, body),
  orgUnsuspend: (accountId: string, body: MemberProcessRequest) => api.post<MemberProcessResult>(`/api/org/members/${encodeURIComponent(accountId)}/unsuspend`, body),

  // 권한 조회 (iam:permission:read)
  permissions: () => api.get<PermissionCatalog>('/api/oit/permissions'),
}
