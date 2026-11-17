import { api } from '@/shared/http/client'
import type { PageQuery, PageResponse } from '@/shared/http/types'

/**
 * 공급업체 계약(GA 쪽) — hub ContractController (ADR-0043). 조회는 이 설치본 사본, 처리는 센터로 보내고 응답으로 사본을 바로 맞춘다(센터 거절은
 * 그 오류 코드 그대로). 같은 API가 Portal마다 경로만 다르다: 조직 전산관리자 /api/oit/contracts(OIT-16 · 17), 위임받은 조직 관리자
 * /api/org/contracts(설계서 밖 화면).
 */

export type ContractPortal = 'oit' | 'org'

/** 잠금 코드 CONTRACT_STATUS. */
export type ContractStatus = 'REQUESTED' | 'ACTIVE' | 'TERMINATE_REQUESTED' | 'TERMINATED' | 'REJECTED' | 'CANCELED' | 'EXPIRED'

/** 보기(카드) — AWAITING 받은 신청 · SENT 보낸 신청 · CLOSED 해지 · 거절 · 신청 취소 · 만료. */
export const CONTRACT_VIEWS = ['ALL', 'ACTIVE', 'AWAITING', 'SENT', 'TERMINATE_REQUESTED', 'CLOSED'] as const
export type ContractView = (typeof CONTRACT_VIEWS)[number]

export const CONTRACT_DIRECTIONS = ['ALL', 'RECEIVED', 'SENT'] as const
export type ContractDirection = (typeof CONTRACT_DIRECTIONS)[number]

/** 잠금 코드 CONTRACT_TERMINATE_REASON. */
export const TERMINATE_REASONS = ['END_OF_DEAL', 'PRICE', 'TERMS_MISMATCH', 'SUPPLY_STOP', 'ETC'] as const

export type ContractAction = 'REQUEST' | 'CANCEL' | 'ACCEPT' | 'REJECT' | 'TERMINATE' | 'TERMINATE_CANCEL' | 'TERMINATE_ACCEPT' | 'TERMINATE_REJECT'

export interface ContractSearchQuery extends PageQuery {
  view?: ContractView | null
  direction?: ContractDirection | null
  /** 업체명 · 사업자등록번호 */
  keyword?: string | null
}

export interface ContractResponse {
  contractId: string
  contractNo: string
  partnerId: string
  partnerName: string
  partnerBizRegNo: string | null
  /** 같은 업체와의 차수 */
  seq: number
  status: ContractStatus
  requestedSide: 'PARTNER' | 'COMPANY'
  /** 지금 신청(해지 신청 중이면 해지 신청)을 받았나 · 보냈나 */
  direction: 'RECEIVED' | 'SENT'
  awaitingMe: boolean
  /** 지금 누를 수 있는 버튼(처리 때 센터가 다시 판정) */
  actions: ContractAction[]
  /** GA 쪽 처리면 이 설치본 계정 이름, 공급업체 쪽이면 담당자 이름 */
  requestedByName: string | null
  requestedAt: string
  startDate: string
  endDate: string | null
  memo: string | null
  decidedByName: string | null
  decidedAt: string | null
  rejectReason: string | null
  terminateSide: 'PARTNER' | 'COMPANY' | null
  terminateRequestedByName: string | null
  terminateRequestedAt: string | null
  terminateReasonCode: string | null
  terminateReason: string | null
  terminateWishDate: string | null
  terminatedAt: string | null
  terminatedByName: string | null
  /** 해지 동의가 끝나 희망일(= 종료일)을 기다리는 계약 중 */
  terminationScheduled: boolean
  terminateRejectedByName: string | null
  terminateRejectedAt: string | null
  terminateRejectReason: string | null
}

export interface ContractHistoryResponse {
  kind: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  actorType: string
  actorName: string | null
  at: string
}

export interface ContractPartnerResponse {
  partnerId: string
  name: string
  bizRegNo: string | null
  latestStatus: ContractStatus | null
  /** 진행 중 계약이 있으면 false */
  selectable: boolean
}

export interface ContractRequestRequest {
  partnerId: string
  startDate: string
  /** 비우면 해지할 때까지 */
  endDate: string | null
  memo: string | null
}

export interface ContractTerminateRequest {
  reasonCode: string
  /** 비우면 동의 즉시 해지 */
  wishDate: string | null
  detail: string | null
}

export interface ContractReasonRequest {
  reason: string
}

const base = (portal: ContractPortal) => `/api/${portal}/contracts`

export const contractApi = {
  /** 업체마다 최근 차수 계약. summary = 보기별 건수(보기 조건 제외). */
  contracts: (portal: ContractPortal, query: ContractSearchQuery) =>
    api.get<PageResponse<ContractResponse>>(base(portal), { ...query }),
  /** 받은 신청 + 받은 해지 신청. */
  awaitingCount: (portal: ContractPortal) => api.get<{ count: number }>(`${base(portal)}/awaiting-count`),
  /** 신청할 공급업체(이용 중 업체 사본). */
  partners: (portal: ContractPortal, keyword?: string | null) =>
    api.get<ContractPartnerResponse[]>(`${base(portal)}/partners`, { keyword }),
  contract: (portal: ContractPortal, contractId: string) => api.get<ContractResponse>(`${base(portal)}/${contractId}`),
  history: (portal: ContractPortal, contractId: string) =>
    api.get<ContractHistoryResponse[]>(`${base(portal)}/${contractId}/history`),
  /** 동의 대기로. 같은 업체와 진행 중 계약이 있으면 409 CONTRACT_OPEN_EXISTS(센터). */
  request: (portal: ContractPortal, body: ContractRequestRequest) => api.post<ContractResponse>(base(portal), body),
  cancel: (portal: ContractPortal, contractId: string) => api.post<ContractResponse>(`${base(portal)}/${contractId}/cancel`),
  accept: (portal: ContractPortal, contractId: string) => api.post<ContractResponse>(`${base(portal)}/${contractId}/accept`),
  reject: (portal: ContractPortal, contractId: string, body: ContractReasonRequest) =>
    api.post<ContractResponse>(`${base(portal)}/${contractId}/reject`, body),
  /** 계약 중만. 해지 확정(희망일 대기) 계약은 409 CONTRACT_TERMINATION_SCHEDULED. */
  terminate: (portal: ContractPortal, contractId: string, body: ContractTerminateRequest) =>
    api.post<ContractResponse>(`${base(portal)}/${contractId}/terminate`, body),
  cancelTermination: (portal: ContractPortal, contractId: string) =>
    api.post<ContractResponse>(`${base(portal)}/${contractId}/terminate/cancel`),
  /** 희망일이 없거나 지났으면 즉시 해지, 미래면 그날 해지. */
  acceptTermination: (portal: ContractPortal, contractId: string) =>
    api.post<ContractResponse>(`${base(portal)}/${contractId}/terminate/accept`),
  rejectTermination: (portal: ContractPortal, contractId: string, body: ContractReasonRequest) =>
    api.post<ContractResponse>(`${base(portal)}/${contractId}/terminate/reject`, body),
}
