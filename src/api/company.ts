import { api } from '@/shared/http/client'

/** 회사 정보 — org CompanyController(OIT-13). 회사명 · 사업자등록번호 · 대리점 등록번호는 조회만, 주소 · 대표 연락처만 수정. */

export interface CompanyInfo {
  companyId: string
  name: string
  bizRegNo: string
  agencyRegNo: string | null
  address: string | null
  phone: string | null
  statSendEnabled: boolean
  allowOrgPurchase: boolean
  allowPersonalPurchase: boolean
  setupStatus: string
}

/** 주소 · 대표 연락처를 이 값으로(빈 값 = 없음). */
export interface EditCompanyRequest {
  address: string | null
  phone: string | null
}

export interface CompanyChanged {
  companyId: string
  changed: boolean
}

const PATH = '/api/oit/company'

export const companyApi = {
  /** org:company:read — 회사 전체 관리 범위만(아니면 403). */
  get: () => api.get<CompanyInfo>(PATH),
  /** org:company:manage — 같은 값이면 changed=false. */
  edit: (body: EditCompanyRequest) => api.put<CompanyChanged>(PATH, body),
}
