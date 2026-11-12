<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { orgManageApi } from '@/api/org'
import { ORG_HISTORY_COLUMNS, historyFilters } from '@/forms/orgFields'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { useAsync } from '@/shared/ui/useAsync'

/** ORG-33 조직 관리 — 이력: 기간(기본 최근 1개월) · 구분 · 조직(아래 포함). 관리 범위 안 조직만(서버가 거름). */
const api = orgManageApi('org')
const tree = useAsync(api.list)
const filters = computed(() => historyFilters(tree.data.value))

onMounted(() => void tree.run())
</script>

<template>
  <div>
    <ResultBox :error="tree.error.value" />
    <PagedList :key="filters.length + (tree.data.value?.length ?? 0)" :load="api.history" :columns="ORG_HISTORY_COLUMNS" :filters="filters" />
  </div>
</template>
