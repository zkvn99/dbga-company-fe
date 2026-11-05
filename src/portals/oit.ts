import { accountApi } from '@/api/account'
import { oitAuthApi } from '@/api/auth'
import { type PortalDef, pending } from '@/shared/portal/types'

/** 조직 전산관리자(OIT) — 화면설계서 p.109~117. */
export const oit: PortalDef = {
  key: 'oit',
  name: '조직 전산관리자 (OIT)',
  auth: oitAuthApi,
  me: () => accountApi.me('oit'),
  changePassword: (body) => accountApi.changePassword('oit', body),
  otpRedisKeyPrefix: 'dbga:company:login:oit:otp:',
  home: 'OIT-X-ME',
  login: 'OIT-00',
  setupScreen: 'OIT-15',
  screens: [
    {
      id: 'OIT-00',
      title: '로그인 · 휴대폰 인증 (OIT-00-1)',
      public: true,
      page: () => import('@/shared/pages/OtpLoginPage.vue'),
      apis: ['POST /api/auth/oit/login', 'POST /api/auth/oit/otp/send', 'POST /api/auth/oit/otp/verify'],
      specPage: 109,
    },
    {
      id: 'OIT-15',
      title: '초기 셋업 (최초 로그인)',
      setup: true,
      page: () => import('@/shared/pages/ChangePasswordPage.vue'),
      apis: ['PUT /api/oit/me/password'],
      specPage: 111,
      note: '지금은 비밀번호 변경 단계만 — 회사 정보 · 조직 셋업(company.setup_status)은 API 대기',
    },
    { id: 'OIT-X-ME', title: '내 정보', setup: true, page: () => import('@/shared/pages/MePage.vue'), apis: ['GET /api/oit/me'] },
    {
      id: 'OIT-03',
      title: '계정 등록 · 수정 (모달)',
      page: () => import('@/pages/oit/Oit03AccountRegister.vue'),
      apis: ['POST /api/oit/accounts', 'GET /api/oit/accounts/login-id-check'],
      specPage: 113,
      note: '등록만 — 수정은 API 대기',
    },
    pending('OIT-02', '계정 관리 — 계정 목록', 112),
    pending('OIT-08', '코드 관리 — 공통 코드', 114),
    pending('OIT-13', '조직 설정 — 회사 정보 · 조직', 115),
    pending('OIT-16', '공급업체 계약', 116),
    pending('OIT-17', '계약 신청 · 동의 (모달)', 117),
  ],
}
