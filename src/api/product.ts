import { api } from '@/shared/http/client'
import type { PageQuery, PageResponse } from '@/shared/http/types'

/** DB 구매 — 상품 목록(FP-02 · ORG-02, 같은 상품) — trade ProductBrowseController. 기능 trade:product:read. */

export type ProductPortal = 'fp' | 'org'

/** 계약 상태(공급업체 ↔ 이 회사). ACTIVE · TERMINATE_REQUESTED 일 때만 구매 가능. */
export type ContractStatus = 'NONE' | 'REQUESTED' | 'ACTIVE' | 'TERMINATE_REQUESTED' | 'ENDED'

export interface ProductListItem {
  productId: string
  productNo: string
  name: string
  summary: string | null
  partner: { partnerId: string; name: string }
  dbTypeCode: string
  inflow: 'INBOUND' | 'OUTBOUND'
  ageBand: string | null
  price: number
  /** GROUP 권역 선택 · REGION 개별 지역 선택. */
  buyerRegionMode: 'GROUP' | 'REGION'
  /** 판매 권역 이름(권역 선택 상품). */
  saleGroups: string[]
  /** 포함 시 · 도 이름. */
  regions: string[]
  contractStatus: ContractStatus
  /** false = "계약 전 · 구매 불가". */
  purchasable: boolean
  registeredAt: string | null
}

export interface ProductSearchQuery extends PageQuery {
  partnerId?: string | null
  inflow?: 'INBOUND' | 'OUTBOUND' | null
  /** 이 시 · 도를 판매 지역에 포함하는 상품. */
  regionCode?: string | null
  /** 이 권역의 시 · 도를 모두 포함하는 상품. */
  groupId?: string | null
  /** 상품명 · 공급업체명. */
  keyword?: string | null
  sort?: 'registeredAt' | 'name' | 'partnerName' | 'price' | null
  direction?: 'asc' | 'desc' | null
}

export interface ProductFilterOptions {
  partners: { partnerId: string; name: string }[]
  regions: { regionCode: string; name: string }[]
  groups: { groupId: string; name: string }[]
}

export const productApi = {
  products: (portal: ProductPortal, query: ProductSearchQuery) => api.get<PageResponse<ProductListItem>>(`/api/${portal}/products`, { ...query }),
  filters: (portal: ProductPortal) => api.get<ProductFilterOptions>(`/api/${portal}/products/filters`),
}
