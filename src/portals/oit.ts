import { accountApi } from '@/api/account'
import { oitAuthApi } from '@/api/auth'
import { setupApi } from '@/api/setup'
import { type PortalDef, pending } from '@/shared/portal/types'

/** 회사 전산관리자(OIT, 역할 ORG_SYSTEM_ADMIN — 화면설계서의 "조직 전산관리자") — 화면설계서 p.109~117. */
export const oit: PortalDef = {
  key: 'oit',
  name: '회사 전산관리자 (OIT)',
  auth: oitAuthApi,
  me: () => accountApi.me('oit'),
  changePassword: (body) => accountApi.changePassword('oit', body),
  otpRedisKeyPrefix: 'dbga:company:login:oit:otp:',
  home: 'OIT-X-ME',
  login: 'OIT-00',
  setupScreen: 'OIT-15',
  installScreen: 'OIT-X-INSTALL',
  installRequired: () => setupApi.status().then((s) => s.setupNeeded),
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
      id: 'OIT-X-INSTALL',
      title: '설치 셋업 (설치 직후 첫 화면)',
      public: true,
      page: () => import('@/pages/oit/OitXInstallSetup.vue'),
      apis: ['GET /api/setup/install', 'POST /api/setup/install'],
      note: '화면설계서 밖 — ADR-0028. 회사가 없으면 로그인 대신 이 화면으로 자동 이동(installRequired). 센터 설치 코드로 등록 → 회사 · 첫 회사 전산관리자 생성',
    },
    {
      id: 'OIT-15',
      title: '초기 셋업 (최초 로그인)',
      setup: true,
      page: () => import('@/shared/pages/ChangePasswordPage.vue'),
      apis: ['PUT /api/oit/me/password'],
      specPage: 111,
      note: '지금은 비밀번호 변경 단계만 — 센터 등록 · 회사 생성은 로그인 전 설치 셋업(OIT-X-INSTALL), 회사 정보 · 조직 셋업(company.setup_status)은 API 대기',
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
