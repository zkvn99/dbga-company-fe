<script setup lang="ts" generic="P, R">
import { reactive, watch } from 'vue'
import FormFields from './FormFields.vue'
import ResultBox from './ResultBox.vue'
import { type FieldDef, initialValues, toPayload } from './fields'
import { useAsync } from './useAsync'

/**
 * 필드 정의 + 제출 함수 하나로 만드는 폼. :submit 에는 src/api 의 함수를 그대로 넘긴다(명시적 호출).
 * initial 이 바뀌면(상세 다시 읽기) 값을 다시 채운다. 성공하면 success 이벤트.
 */
const props = withDefaults(
  defineProps<{
    fields: readonly FieldDef[]
    submit: (payload: P) => Promise<R>
    initial?: object | null
    submitLabel?: string
    title?: string
  }>(),
  { initial: null, submitLabel: '저장', title: '' },
)
const emit = defineEmits<{ success: [result: R] }>()

const values = reactive(initialValues(props.fields, props.initial))
watch(
  () => props.initial,
  (next) => Object.assign(values, initialValues(props.fields, next)),
)

const { loading, data, error, done, run } = useAsync(props.submit)

async function onSubmit(): Promise<void> {
  const result = await run(toPayload(props.fields, values) as P)
  if (!error.value) emit('success', result as R)
}

defineExpose({ values })
</script>

<template>
  <form class="api-form" @submit.prevent="onSubmit">
    <h3 v-if="title">{{ title }}</h3>
    <FormFields :fields="fields" :values="values" :errors="error?.fieldErrors" />
    <div class="buttons">
      <button type="submit" :disabled="loading">{{ loading ? '처리 중…' : submitLabel }}</button>
      <slot name="buttons" :values="values" />
    </div>
    <ResultBox :error="error" :data="data" :done="done" />
  </form>
</template>
