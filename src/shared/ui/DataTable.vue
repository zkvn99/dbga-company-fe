<script setup lang="ts" generic="T extends object">
import { formatValue } from '../format/format'
import type { Column } from './table'

/** 표. 셀은 column.value(row) → 없으면 row[key] 를 formatValue 로 표시. 셀 바꾸기는 #cell-<key> 슬롯, 행 버튼은 #actions. */
defineProps<{ rows: readonly T[]; columns: readonly Column<T>[] }>()
const emit = defineEmits<{ rowClick: [row: T] }>()

function cell(row: T, column: Column<T>): string {
  const raw = column.value ? column.value(row) : (row as Record<string, unknown>)[column.key]
  return formatValue(raw)
}
</script>

<template>
  <table class="table">
    <thead>
      <tr>
        <th v-for="c in columns" :key="c.key">{{ c.label }}</th>
        <th v-if="$slots.actions">동작</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="rows.length === 0">
        <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="muted">데이터 없음</td>
      </tr>
      <tr v-for="(row, i) in rows" :key="i" class="row" @click="emit('rowClick', row)">
        <td v-for="c in columns" :key="c.key">
          <slot :name="`cell-${c.key}`" :row="row">{{ cell(row, c) }}</slot>
        </td>
        <td v-if="$slots.actions" @click.stop><slot name="actions" :row="row" /></td>
      </tr>
    </tbody>
  </table>
</template>
