import { api } from '@/shared/http/client'
import type { TokenExpiry } from '@/shared/auth/otpAuthApi'
import type { AccountPortal } from './account'
import type { AccountChanged, AccountDetail, EditAlimtalkRequest, EditContactsRequest } from './accountManage'

/**
 * 내 정보 화면 · 본인 수정(FP-20 · FP-21 · ORG-29 · ORG-30 · OIT 공통 p.10) — iam MyAccountController. 세 Portal 같은 API.
 * 본인이 바꿀 수 있는 것 = 이름 · 이메일 · 추가 연락처 · 알림톡 · 대표 휴대폰(인증 후). 직급 · 직책 · 소속 · 역할 · 범위 · 권한은 OIT-03.
 * 임시 비밀번호(셋업) 계정은 GET …/me 와 PUT …/me/password 밖이 403(PASSWORD_CHANGE_REQUIRED).
 */

/** 계정 상세(OIT-03과 같은 형식 — 이메일 · 생년월일 · 번호는 가린 값) + 비밀번호 최근 변경일. 최근 로그인 = account.lastLoginAt. */
export interface MyProfileResponse {
  account: AccountDetail
  passwordChangedAt: string | null
}

/** email 비우면 그대로(가린 값이 내려오므로 바꿀 때만 보낸다). */
export interface EditMyInfoRequest {
  name: string
  email: string | null
}

/** 새 대표 휴대폰 인증번호 발송 — 인증번호는 새 번호로 간다. */
export interface SendPhoneOtpRequest {
  phone: string
}

export interface OtpSendResponse {
  maskedPhone: string
  codeExpiresIn: number
  resendAvailableIn: number
}

export interface ChangePhoneRequest {
  phone: string
  code: string
}

export const meApi = {
  profile: (portal: AccountPortal) => api.get<MyProfileResponse>(`/api/${portal}/me/profile`),
  editInfo: (portal: AccountPortal, body: EditMyInfoRequest) => api.put<AccountChanged>(`/api/${portal}/me`, body),
  /** 추가 번호 전체 교체(OIT-03 연락처와 같은 규칙) — 대표 항목은 무시, phoneId + 빈 번호 = 번호 그대로. */
  editContacts: (portal: AccountPortal, body: EditContactsRequest) => api.put<AccountChanged>(`/api/${portal}/me/contacts`, body),
  editAlimtalk: (portal: AccountPortal, body: EditAlimtalkRequest) => api.put<AccountChanged>(`/api/${portal}/me/alimtalk`, body),
  sendPhoneOtp: (portal: AccountPortal, body: SendPhoneOtpRequest) => api.post<OtpSendResponse>(`/api/${portal}/me/phone/otp`, body),
  /** 성공하면 새 인증 쿠키(지금 세션 유지 · 다른 세션 로그아웃) → 내 정보를 다시 읽는다. */
  changePhone: (portal: AccountPortal, body: ChangePhoneRequest) => api.put<TokenExpiry>(`/api/${portal}/me/phone`, body),
}
