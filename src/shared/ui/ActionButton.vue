<script setup lang="ts" generic="R">
import ResultBox from './ResultBox.vue'
import { useAsync } from './useAsync'

/**
 * 버튼 하나 = API 호출 하나. confirm 이 있으면 확인창, reason 이 있으면 사유 입력창(빈 값도 그대로 보냄 — 서버 검증 확인용).
 */
const props = defineProps<{
  label: string
  run: (reason: string | undefined) => Promise<R>
  confirm?: string
  reason?: 'required' | 'optional'
}>()
const emit = defineEmits<{ done: [result: R] }>()

const call = useAsync(props.run)

async function onClick(): Promise<void> {
  if (props.confirm && !window.confirm(props.confirm)) return
  let reason: string | undefined
  if (props.reason) {
    const input = window.prompt(`사유 (${props.reason === 'required' ? '필수' : '선택'})`, '')
    if (input === null) return
    reason = input === '' ? undefined : input
  }
  const result = await call.run(reason)
  if (!call.error.value) emit('done', result as R)
}
</script>

<template>
  <span class="action">
    <button type="button" :disabled="call.loading.value" @click="onClick">{{ label }}</button>
    <ResultBox :error="call.error.value" :data="call.data.value" :done="call.done.value" />
  </span>
</template>
