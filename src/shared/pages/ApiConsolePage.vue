<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { type RawResult, rawRequest } from '../http/client'
import type { PortalDef } from '../portal/types'
import JsonView from '../ui/JsonView.vue'
import RequestLogPanel from '../ui/RequestLogPanel.vue'

/** 등록되지 않은 API · 비정상 입력을 직접 보내는 콘솔. CSRF · 쿠키는 앱과 같은 방식으로 붙는다. */
const props = defineProps<{ portals: readonly PortalDef[] }>()

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
const method = ref<Method>('GET')
const path = ref('/api/')
const query = ref('')
const body = ref('')
const result = shallowRef<RawResult | null>(null)
const parseError = ref('')

const knownApis = computed(() => [...new Set(props.portals.flatMap((p) => p.screens.flatMap((s) => s.apis ?? [])))].sort())

function pick(api: string): void {
  const [m, p] = api.split(' ')
  method.value = m as Method
  path.value = p
}

async function send(): Promise<void> {
  parseError.value = ''
  let data: unknown
  let params: Record<string, string> | undefined
  try {
    data = body.value.trim() ? JSON.parse(body.value) : undefined
  } catch (e) {
    parseError.value = `본문 JSON 오류: ${(e as Error).message}`
    return
  }
  if (query.value.trim()) params = Object.fromEntries(new URLSearchParams(query.value))
  result.value = await rawRequest(method.value, path.value, params, data).catch((e: Error) => ({ status: 0, requestId: null, body: e.message, ms: 0 }))
}
</script>

<template>
  <main style="padding: 8px 16px 240px">
    <RouterLink to="/">← 처음</RouterLink>
    <h1>API 콘솔</h1>
    <div class="box">
      <select v-model="method" style="min-width: 90px">
        <option v-for="m in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']" :key="m">{{ m }}</option>
      </select>
      <input v-model="path" style="width: 480px" placeholder="/api/adm/partners" />
      <button type="button" @click="send">보내기</button>
      <div><input v-model="query" style="width: 600px" placeholder="쿼리: page=1&size=15&keyword=..." /></div>
      <textarea v-model="body" rows="8" style="width: 600px" placeholder='본문 JSON: {"loginId": "..."}' />
      <div v-if="parseError" class="err">{{ parseError }}</div>
    </div>
    <div v-if="result" class="box">
      <b>HTTP {{ result.status }}</b> · {{ result.ms }}ms · requestId {{ result.requestId ?? '-' }}
      <JsonView :value="result.body" />
    </div>
    <details>
      <summary>화면에 등록된 API ({{ knownApis.length }}) — 누르면 채움. 경로 변수 {…} 는 직접 바꾼다.</summary>
      <div v-for="a in knownApis" :key="a"><a href="#" @click.prevent="pick(a)">{{ a }}</a></div>
    </details>
    <RequestLogPanel />
  </main>
</template>
