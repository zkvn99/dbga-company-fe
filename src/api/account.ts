import { api } from '@/shared/http/client'
import type { TokenExpiry } from '@/shared/auth/otpAuthApi'

/** 회사 계정 공통 — 내 정보 · 비밀번호 변경 · 계정 등록 (iam AccountMeController · AgentRegistrationController · AccountRegistrationController). */

export type AccountPortal = 'fp' | 'org' | 'oit'
export type AccountRole = 'ORG_SYSTEM_ADMIN' | 'ORG_MANAGER' | 'AGENT'
export type PhoneKind = 'MOBILE' | 'LANDLINE'
export type AlimtalkNoticeType = 'DB_ASSIGN' | 'SCHEDULE' | 'AS_RESULT' | 'PURCHASE'
export type ManageScopeType = 'COMPANY' | 'ORG'

export interface AccountMe {
  accountId: string
  orgId: string
  loginId: string
  name: string
  role: AccountRole
  status: string
  setupRequired: boolean
  lastLoginAt: string | null
  /** 가진 기능 코드(역할 기본 ∪ 위임). 메뉴 · 버튼 표시에만 쓴다 — 판정은 서버. */
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

/** OIT-03 계정 등록 — 역할 선택, 관리 범위는 조직 관리자 · 전산관리자 필수, 위임은 조직 관리자만. */
export interface RegisterAccountRequest extends AccountBase {
  role: AccountRole
  email: string | null
  employeeNo: string | null
  rankCode: string | null
  scopeType: ManageScopeType | null
  scopeOrgIds: string[] | null
  delegations: string[] | null
}

export interface RegisteredAccount {
  accountId: string
  loginId: string
}

export const accountApi = {
  me: (portal: AccountPortal) => api.get<AccountMe>(`/api/${portal}/me`),
  /** 성공하면 token_version +1 · 새 쿠키. */
  changePassword: (portal: AccountPortal, body: ChangePasswordRequest) => api.put<TokenExpiry>(`/api/${portal}/me/password`, body),

  registerAgent: (body: RegisterAgentRequest) => api.post<RegisteredAccount>('/api/org/agents', body),
  agentLoginIdCheck: (loginId: string) => api.get<{ available: boolean }>('/api/org/agents/login-id-check', { loginId }),

  registerAccount: (body: RegisterAccountRequest) => api.post<RegisteredAccount>('/api/oit/accounts', body),
  accountLoginIdCheck: (loginId: string) => api.get<{ available: boolean }>('/api/oit/accounts/login-id-check', { loginId }),
}
