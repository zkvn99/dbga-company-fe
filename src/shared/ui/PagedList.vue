<script setup lang="ts" generic="T extends object, Q">
import { computed, onMounted, reactive } from 'vue'
import type { PageResponse } from '../http/types'
import DataTable from './DataTable.vue'
import FormFields from './FormFields.vue'
import ResultBox from './ResultBox.vue'
import { type FieldDef, initialValues, toPayload } from './fields'
import type { Column } from './table'
import { useAsync } from './useAsync'

/**
 * 목록 화면 공통(화면설계서 목록 형식): 상태 카드(summary) · 조회 조건 · 표 · 페이지(15/30/50).
 * :load 에는 src/api 의 목록 함수를 그대로 넘긴다. summaryKey = 상태 카드를 눌렀을 때 바꿀 조건 이름.
 */
const props = withDefaults(
  defineProps<{
    load: (query: Q) => Promise<PageResponse<T>>
    columns: readonly Column<T>[]
    filters?: readonly FieldDef[]
    summaryKey?: string
  }>(),
  { filters: () => [], summaryKey: '' },
)
const emit = defineEmits<{ rowClick: [row: T] }>()

const filterValues = reactive(initialValues(props.filters))
const paging = reactive({ page: 1, size: 15 })
const list = useAsync(props.load)

const result = computed(() => list.data.value)
const totalPages = computed(() => Math.max(1, Math.ceil((result.value?.totalCount ?? 0) / paging.size)))

function query(): Q {
  return { ...toPayload(props.filters, filterValues), page: paging.page, size: paging.size } as unknown as Q
}

async function reload(): Promise<void> {
  await list.run(query())
}

function search(): void {
  paging.page = 1
  void reload()
}

function pickSummary(key: string): void {
  filterValues[props.summaryKey] = key
  search()
}

function go(page: number): void {
  paging.page = page
  void reload()
}

onMounted(reload)
defineExpose({ reload })
</script>

<template>
  <div class="paged-list">
    <div v-if="summaryKey && result?.summary" class="cards">
      <button type="button" :class="{ on: !filterValues[summaryKey] }" @click="pickSummary('')">전체</button>
      <button
        v-for="(count, key) in result.summary"
        :key="key"
        type="button"
        :class="{ on: filterValues[summaryKey] === key }"
        @click="pickSummary(String(key))"
      >
        {{ key }} <b>{{ count }}</b>
      </button>
    </div>

    <form v-if="filters.length" class="filters" @submit.prevent="search">
      <FormFields :fields="filters" :values="filterValues" :errors="list.error.value?.fieldErrors" />
      <button type="submit">조회</button>
    </form>

    <ResultBox :error="list.error.value" />

    <p class="muted">총 {{ result?.totalCount ?? 0 }}건 · {{ paging.page }} / {{ totalPages }} 페이지</p>
    <DataTable :rows="result?.items ?? []" :columns="columns" @row-click="(row) => emit('rowClick', row)">
      <template v-if="$slots.actions" #actions="{ row }"><slot name="actions" :row="row" /></template>
    </DataTable>

    <div class="pager">
      <button type="button" :disabled="paging.page <= 1" @click="go(paging.page - 1)">이전</button>
      <button type="button" :disabled="!result?.hasNext" @click="go(paging.page + 1)">다음</button>
      <select v-model.number="paging.size" @change="search">
        <option v-for="n in [15, 30, 50, 100]" :key="n" :value="n">{{ n }}개씩</option>
      </select>
    </div>
  </div>
</template>
