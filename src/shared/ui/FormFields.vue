<script setup lang="ts">
import { reactive } from 'vue'
import type { FieldError } from '../http/types'
import { type FieldDef, type FormValues, newListItem, treeDepth, treeIncluded, treeTopMost } from './fields'

/** 필드 정의대로 입력을 그린다. 서버 fieldErrors 를 `prefix + key` 경로로 찾아 필드 아래 표시. */
const props = withDefaults(
  defineProps<{ fields: readonly FieldDef[]; values: FormValues; errors?: readonly FieldError[]; prefix?: string }>(),
  { errors: () => [], prefix: '' },
)

function errorsOf(key: string): FieldError[] {
  const path = props.prefix + key
  return props.errors.filter((e) => e.field === path || e.field.startsWith(`${path}[`) || e.field.startsWith(`${path}.`))
}

function listOf(key: string): FormValues[] {
  return props.values[key] as FormValues[]
}

function arrayOf(key: string): string[] {
  return props.values[key] as string[]
}

function mapOf(key: string): Record<string, boolean> {
  return props.values[key] as Record<string, boolean>
}

/** 파일 올리기 상태(필드 경로 → 메시지). 실패 사유는 서버 응답 그대로. */
const uploads = reactive<Record<string, string>>({})

async function pickFile(field: FieldDef, event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !field.upload) return
  const path = props.prefix + field.key
  uploads[path] = '올리는 중…'
  try {
    const result = await field.upload(file)
    props.values[field.key] = result.fileId
    uploads[path] = `올림: ${result.fileName ?? file.name}`
  } catch (e) {
    uploads[path] = `실패: ${e instanceof Error ? e.message : String(e)}`
  }
}

/** 트리 선택: 고르면 그 아래 선택은 지운다(상위에 포함) — 값은 늘 맨 위 선택만. */
function toggleTree(f: FieldDef, value: string, on: boolean): void {
  const arr = arrayOf(f.key)
  const next = treeTopMost(f.options ?? [], on ? [...arr, value] : arr.filter((v) => v !== value))
  arr.splice(0, arr.length, ...next)
}

function toggle(key: string, value: string, on: boolean): void {
  const arr = arrayOf(key)
  const i = arr.indexOf(value)
  if (on && i < 0) arr.push(value)
  if (!on && i >= 0) arr.splice(i, 1)
}
</script>

<template>
  <div class="fields">
    <div v-for="f in fields" :key="f.key" class="field">
      <label>
        {{ f.label }}<span v-if="f.required" class="req">*</span>
        <code class="muted">{{ f.key }}</code>
      </label>

      <span v-if="f.type === 'readonly'">{{ values[f.key] ?? '-' }}</span>
      <textarea v-else-if="f.type === 'textarea'" v-model="values[f.key] as string" :placeholder="f.placeholder" rows="3" />
      <select v-else-if="f.type === 'select'" v-model="values[f.key]">
        <option value="">(선택 안 함)</option>
        <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <input v-else-if="f.type === 'checkbox'" v-model="values[f.key]" type="checkbox" />
      <span v-else-if="f.type === 'multicheck'">
        <label v-for="o in f.options" :key="o.value" class="inline">
          <input
            type="checkbox"
            :checked="arrayOf(f.key).includes(o.value)"
            @change="toggle(f.key, o.value, ($event.target as HTMLInputElement).checked)"
          />{{ o.label }}
        </label>
      </span>
      <span v-else-if="f.type === 'treecheck'" class="tree">
        <label
          v-for="o in f.options"
          :key="o.value"
          class="tree-item"
          :style="{ paddingLeft: `${treeDepth(f.options ?? [], o.value) * 1.25}em` }"
        >
          <input
            type="checkbox"
            :checked="arrayOf(f.key).includes(o.value) || treeIncluded(f.options ?? [], arrayOf(f.key), o.value)"
            :disabled="treeIncluded(f.options ?? [], arrayOf(f.key), o.value)"
            @change="toggleTree(f, o.value, ($event.target as HTMLInputElement).checked)"
          />{{ o.label }}
          <span v-if="treeIncluded(f.options ?? [], arrayOf(f.key), o.value)" class="muted"> (포함됨)</span>
        </label>
      </span>
      <span v-else-if="f.type === 'boolmap'">
        <label v-for="o in f.options" :key="o.value" class="inline">
          <input v-model="mapOf(f.key)[o.value]" type="checkbox" />{{ o.label }}
        </label>
      </span>
      <div v-else-if="f.type === 'list'" class="list">
        <div v-for="(item, i) in listOf(f.key)" :key="i" class="list-item">
          <FormFields :fields="f.itemFields ?? []" :values="item" :errors="errors" :prefix="`${prefix}${f.key}[${i}].`" />
          <button type="button" @click="listOf(f.key).splice(i, 1)">행 삭제</button>
        </div>
        <button type="button" @click="listOf(f.key).push(newListItem(f))">행 추가</button>
      </div>
      <span v-else-if="f.type === 'file'">
        <input type="file" @change="pickFile(f, $event)" />
        <code>{{ values[f.key] || '(없음)' }}</code>
        <small v-if="uploads[prefix + f.key]" class="muted">{{ uploads[prefix + f.key] }}</small>
      </span>
      <input
        v-else
        v-model="values[f.key]"
        :type="f.type === 'csv' ? 'text' : (f.type ?? 'text')"
        :placeholder="f.placeholder ?? (f.type === 'csv' ? '쉼표로 구분' : '')"
        autocomplete="off"
      />

      <small v-if="f.help" class="muted">{{ f.help }}</small>
      <small v-for="e in errorsOf(f.key)" :key="e.field + e.code" class="err">{{ e.field }} [{{ e.code }}] {{ e.reason }}</small>
    </div>
  </div>
</template>
