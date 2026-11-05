<script setup lang="ts">
import type { ApiError } from '../http/ApiError'
import JsonView from './JsonView.vue'

/** API 호출 결과(성공 데이터 또는 오류 code · message · requestId · fieldErrors). */
defineProps<{ error: ApiError | null; data?: unknown; done?: boolean }>()
</script>

<template>
  <div v-if="error" class="result error">
    <b>{{ error.status }} {{ error.code }}</b> — {{ error.message }}
    <span v-if="error.requestId" class="muted"> (requestId {{ error.requestId }})</span>
    <ul v-if="error.fieldErrors.length">
      <li v-for="f in error.fieldErrors" :key="f.field + f.code">
        <code>{{ f.field }}</code> [{{ f.code }}] {{ f.reason }}
      </li>
    </ul>
  </div>
  <div v-else-if="done" class="result ok">
    <b>성공</b>
    <JsonView v-if="data !== undefined && data !== null" :value="data" />
  </div>
</template>
