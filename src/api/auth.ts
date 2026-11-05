import { createOtpAuthApi } from '@/shared/auth/otpAuthApi'

/** 회사 계정 로그인 (security.md 1.4). Portal 마다 그 역할만 로그인한다. 세 Portal 은 같은 쿠키 이름. */
export const fpAuthApi = createOtpAuthApi('/api/auth/fp')
export const orgAuthApi = createOtpAuthApi('/api/auth/org')
export const oitAuthApi = createOtpAuthApi('/api/auth/oit')
