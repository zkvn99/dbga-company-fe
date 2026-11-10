<script setup lang="ts">
import { computed } from 'vue'
import { formatCell } from '../format/format'
import type { Column } from './table'

/** 상세 값 표. fields 를 주지 않으면 모든 필드를 응답 이름 그대로 보여 준다. */
const props = defineProps<{ data: object | null | undefined; fields?: readonly Column<Record<string, unknown>>[] }>()

const rows = computed(() => {
  const d = (props.data ?? {}) as Record<string, unknown>
  const fields: readonly Column<Record<string, unknown>>[] = props.fields ?? Object.keys(d).map((key) => ({ key, label: key }))
  return fields.map((f) => ({ label: f.label, key: f.key, value: formatCell(f.key, f.value ? f.value(d) : d[f.key], d) }))
})
</script>

<template>
  <table v-if="data" class="kv">
    <tr v-for="r in rows" :key="r.key">
      <th>{{ r.label }}</th>
      <td>{{ r.value }}</td>
    </tr>
  </table>
</template>
