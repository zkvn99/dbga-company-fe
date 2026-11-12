<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { orgManageApi } from '@/api/org'
import { createFields } from '@/forms/orgFields'
import { org } from '@/portals/org'
import ApiForm from '@/shared/ui/ApiForm.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/** ORG-28 조직 추가 — 상위 조직(관리 범위 안) · 조직명(같은 상위 안 중복 불가) · 유형 · 연락처 · 순서. 조직장은 만든 뒤 ORG-27에서. */
const api = orgManageApi('org')
const tree = useAsync(api.list)
const fields = computed(() => createFields(tree.data.value))

onMounted(() => void tree.run())
</script>

<template>
  <div>
    <p><RouterLink :to="screenPath(org, 'ORG-27')">← 조직도 (ORG-27)</RouterLink></p>
    <ResultBox :error="tree.error.value" />
    <ApiForm :key="fields.length + (tree.data.value?.length ?? 0)" :fields="fields" :submit="api.create" submit-label="추가" @success="() => tree.run()" />
  </div>
</template>
