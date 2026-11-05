import { api } from '../http/client'

/** 모든 Portal 공통 로그인 API(security.md 1.2 ~ 1.4): 비밀번호 → 인증번호 발송 → 확인 → 쿠키 발급. */
export interface LoginChallenge {
  status: 'OTP_REQUIRED'
  challengeToken: string
  maskedPhone: string
  expiresIn: number
}

export interface OtpSent {
  maskedPhone: string
  codeExpiresIn: number
  resendAvailableIn: number
}

export interface TokenExpiry {
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
  /** 공급업체 · 회사 계정만. true 면 셋업(비밀번호 변경 · 업체 정보) 화면으로. */
  setupRequired?: boolean
}

export interface LoginRequest {
  loginId: string
  password: string
}

export interface OtpVerifyRequest {
  challengeToken: string
  code: string
}

export interface OtpAuthApi {
  login(body: LoginRequest): Promise<LoginChallenge>
  sendOtp(challengeToken: string): Promise<OtpSent>
  verifyOtp(body: OtpVerifyRequest): Promise<TokenExpiry>
  refresh(): Promise<TokenExpiry>
  logout(): Promise<void>
}

/** base = '/api/auth/admin' 처럼 Portal 로그인 경로. 앱의 src/api/auth.ts 에서 Portal 마다 한 번 만든다. */
export function createOtpAuthApi(base: string): OtpAuthApi {
  return {
    login: (body) => api.post(`${base}/login`, body),
    sendOtp: (challengeToken) => api.post(`${base}/otp/send`, { challengeToken }),
    verifyOtp: (body) => api.post(`${base}/otp/verify`, body),
    refresh: () => api.post(`${base}/token/refresh`),
    logout: () => api.post(`${base}/logout`),
  }
}
