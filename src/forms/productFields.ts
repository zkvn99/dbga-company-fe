import type { ProductFilterOptions, ProductListItem } from '@/api/product'
import { type FieldDef, opts } from '@/shared/ui/fields'
import type { Column } from '@/shared/ui/table'

/** 상품 목록(FP-02 · ORG-02 — 같은 화면 · 같은 상품)의 조회 조건 · 열. */

const REGION_MODE: Record<ProductListItem['buyerRegionMode'], string> = { GROUP: '권역 선택', REGION: '개별 지역 선택' }

/** 판매 지역: 권역 선택 상품은 권역 이름, 개별 지역 상품은 시 · 도 이름 + 지역 선택 방식. */
export function saleArea(row: ProductListItem): string {
  const area = row.buyerRegionMode === 'GROUP' && row.saleGroups.length ? row.saleGroups : row.regions
  return `${area.join(' · ') || '-'} (${REGION_MODE[row.buyerRegionMode] ?? row.buyerRegionMode})`
}

export function productFilters(options: ProductFilterOptions | null | undefined): FieldDef[] {
  return [
    { key: 'partnerId', label: '공급업체', type: 'select', options: (options?.partners ?? []).map((p) => ({ value: p.partnerId, label: p.name })) },
    { key: 'inflow', label: '유입', type: 'select', options: opts(['INBOUND', 'OUTBOUND']) },
    { key: 'regionCode', label: '판매 지역 (시 · 도)', type: 'select', options: (options?.regions ?? []).map((r) => ({ value: r.regionCode, label: r.name })) },
    { key: 'groupId', label: '판매 지역 (권역)', type: 'select', options: (options?.groups ?? []).map((g) => ({ value: g.groupId, label: g.name })) },
    { key: 'keyword', label: '검색', placeholder: '상품명 · 공급업체' },
    { key: 'sort', label: '정렬', type: 'select', options: opts(['registeredAt', 'name', 'partnerName', 'price']) },
    { key: 'direction', label: '방향', type: 'select', options: opts(['asc', 'desc']) },
  ]
}

export const PRODUCT_COLUMNS: Column<ProductListItem>[] = [
  { key: 'name', label: '상품' },
  { key: 'summary', label: '간단 설명' },
  { key: 'partner', label: '공급업체', value: (r) => r.partner.name },
  { key: 'inflow', label: '유입' },
  { key: 'ageBand', label: '주요 연령대' },
  { key: 'saleArea', label: '판매 지역', value: saleArea },
  { key: 'price', label: '가격' },
  { key: 'contract', label: '계약', value: (r) => (r.purchasable ? r.contractStatus : `${r.contractStatus} — 계약 전 · 구매 불가`) },
  { key: 'productNo', label: '상품코드' },
]
