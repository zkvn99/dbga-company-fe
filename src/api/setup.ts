import { api } from '@/shared/http/client'

/** 설치 셋업 (로그인 전, 회사가 없을 때만 — ADR-0028). 백엔드: hub InstallSetupController. */

export type CenterRegistrationStatus = 'UNREGISTERED' | 'PENDING' | 'REGISTERED'

export interface InstallSetupStatus {
  /** true = 회사 없음 → 이 화면에서 셋업. */
  setupNeeded: boolean
  registration: CenterRegistrationStatus
  installId: string | null
  /** 마지막 요청 실패 오류 코드(등록 대기일 때). */
  lastError: string | null
  lastRequestedAt: string | null
  registeredAt: string | null
}

export interface InstallSetupRequest {
  /** 센터 담당자에게 받은 1회용 설치 코드(저장하지 않음). */
  code: string
  companyName: string
  bizRegNo: string
  /** 대리점 등록번호 — GA마다 유일(센터가 확인), 저장은 대문자. */
  agencyRegNo: string
  adminLoginId: string
  adminName: string
  /** 임시 비밀번호 = 숫자, 로그인 인증번호도 이 번호. */
  adminPhone: string
}

export interface InstallSetupDone {
  companyId: string
  installId: string
  adminLoginId: string
}

const PATH = '/api/setup/install'

export const setupApi = {
  status: () => api.get<InstallSetupStatus>(PATH),
  /** 센터 등록 → 성공하면 회사 · 최상위 조직 · 첫 회사 전산관리자. 실패하면 등록 대기, 같은 버튼으로 다시. */
  setup: (body: InstallSetupRequest) => api.post<InstallSetupDone>(PATH, body),
}
