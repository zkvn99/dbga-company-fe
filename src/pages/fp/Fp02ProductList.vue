<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { productApi, type ProductSearchQuery } from '@/api/product'
import { PRODUCT_COLUMNS, productFilters } from '@/forms/productFields'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * FP-02 DB 구매 — 상품 목록. 판매중 상품만(서버). 조회: 공급업체 · 유입 · 판매 지역(시 · 도 또는 권역) · 검색 · 정렬.
 * 계약 전 공급업체 상품도 보이고 "계약 전 · 구매 불가"로 표시. 상세 · 구매 신청 · 내 구매 · 공급 현황(FP-04) 은 API 대기.
 */
const options = useAsync(() => productApi.filters('fp'))
const filters = computed(() => productFilters(options.data.value))
const load = (query: ProductSearchQuery) => productApi.products('fp', query)

onMounted(() => void options.run())
</script>

<template>
  <div>
    <p class="muted">계약하지 않은 공급업체 상품도 보이지만 구매 신청은 막힙니다(계약은 조직 전산관리자 OIT-16).</p>
    <ResultBox :error="options.error.value" />
    <PagedList :load="load" :columns="PRODUCT_COLUMNS" :filters="filters" />
  </div>
</template>
