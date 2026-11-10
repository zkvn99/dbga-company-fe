import { api } from '@/shared/http/client'
import type { TokenExpiry } from '@/shared/auth/otpAuthApi'

/** 회사 계정 공통 — 내 정보 · 비밀번호 변경 · 계정 만들기 (iam AccountMeController · AgentRegistrationController · AccountRegistrationController). */

export type AccountPortal = 'fp' | 'org' | 'oit'
export type AccountRole = 'ORG_SYSTEM_ADMIN' | 'ORG_MANAGER' | 'AGENT'
export type AccountStatus = 'ACTIVE' | 'LEAVE' | 'SUSPENDED' | 'WITHDRAWN'
export type PhoneKind = 'MOBILE' | 'LANDLINE'
export type AlimtalkNoticeType = 'DB_ASSIGN' | 'SCHEDULE' | 'AS_RESULT' | 'PURCHASE'
export type ManageScopeType = 'COMPANY' | 'ORG'

export const ACCOUNT_ROLES: readonly AccountRole[] = ['ORG_SYSTEM_ADMIN', 'ORG_MANAGER', 'AGENT']
export const ACCOUNT_STATUSES: readonly AccountStatus[] = ['ACTIVE', 'LEAVE', 'SUSPENDED', 'WITHDRAWN']

export interface AccountMe {
  accountId: string
  orgId: string
  loginId: string
  name: string
  role: AccountRole
  /** 역할 표시 이름(OIT 에서 바꿀 수 있음 — 코드는 불변). */
  roleName: string | null
  status: string
  setupRequired: boolean
  lastLoginAt: string | null
  /** 가진 기능 코드(잠금 ∪ 권한 세트 ∪ 위임, 요청마다 계산). 메뉴 · 버튼 표시에만 쓴다 — 판정은 서버. */
  features: string[]
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ContactPhone {
  kind: PhoneKind
  number: string
  memo: string | null
  primary: boolean
}

interface AccountBase {
  loginId: string
  name: string
  birthDate: string | null
  hireDate: string | null
  gender: 'M' | 'F' | null
  orgId: string
  positionCode: string | null
  phones: ContactPhone[]
  alimtalk: Partial<Record<AlimtalkNoticeType, boolean>> | null
}

/** ORG-25 설계사 등록 — 이메일 · 입사일 · 직급 필수, 사번 = 아이디. */
export interface RegisterAgentRequest extends AccountBase {
  email: string
  rankCode: string
}

/** OIT-03 계정 만들기 — 역할은 경로가 정한다. 관리 범위는 조직 관리자 · 전산관리자 필수, 위임은 조직 관리자만. */
export interface RegisterAccountRequest extends AccountBase {
  email: string | null
  employeeNo: string | null
  rankCode: string | null
  scopeType?: ManageScopeType | null
  scopeOrgIds?: string[] | null
  delegations?: string[] | null
  /** 권한 세트(그 역할의 세트만 — 아니면 400, 없으면 404). 비우면 역할 기본 세트 따름. */
  permissionSetId?: string | null
}

export interface RegisteredAccount {
  accountId: string
  loginId: string
}

/** 역할 → 만들기 기능 코드(생성 등급). 화면은 이 기능이 없는 역할을 숨긴다. */
export const CREATE_FEATURE: Record<AccountRole, string> = {
  ORG_SYSTEM_ADMIN: 'iam:account:create-system-admin',
  ORG_MANAGER: 'iam:account:create-manager',
  AGENT: 'iam:account:create-agent',
}

export const accountApi = {
  me: (portal: AccountPortal) => api.get<AccountMe>(`/api/${portal}/me`),
  /** 성공하면 token_version +1 · 새 쿠키. */
  changePassword: (portal: AccountPortal, body: ChangePasswordRequest) => api.put<TokenExpiry>(`/api/${portal}/me/password`, body),

  /** ORG-25 (iam:account:create-agent). */
  registerAgent: (body: RegisterAgentRequest) => api.post<RegisteredAccount>('/api/org/agents', body),
  agentLoginIdCheck: (loginId: string) => api.get<{ available: boolean }>('/api/org/agents/login-id-check', { loginId }),

  /** OIT-03 — 생성 등급 = 경로. 옛 POST /api/oit/accounts 는 없다. */
  createSystemAdmin: (body: RegisterAccountRequest) => api.post<RegisteredAccount>('/api/oit/accounts/system-admins', body),
  createManager: (body: RegisterAccountRequest) => api.post<RegisteredAccount>('/api/oit/accounts/managers', body),
  createAgent: (body: RegisterAccountRequest) => api.post<RegisteredAccount>('/api/oit/accounts/agents', body),
  accountLoginIdCheck: (loginId: string) => api.get<{ available: boolean }>('/api/oit/accounts/login-id-check', { loginId }),
}
