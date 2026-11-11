<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { type FeatureSummary, accountManageApi } from '@/api/accountManage'
import { useFeatureGate } from '@/forms/accountFields'
import { oit } from '@/portals/oit'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import type { FieldDef } from '@/shared/ui/fields'
import { screenPath } from '@/shared/portal/types'
import { cols } from '@/shared/ui/table'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 권한 관리 — 기능 탭 (OIT-21, ADR-0035): 기능 목록(이름 · 코드 · Portal · 잠금 · API 수) + 기능 표시 이름 수정.
 * 기능 추가 · 삭제 · API 연결은 배포 시드라 화면에 없다. 잠금 기능은 이름도 바꿀 수 없다(서버 409).
 */
const { can } = useFeatureGate()
const catalog = useAsync(accountManageApi.permissions)
const features = computed(() => catalog.data.value?.features ?? [])
const selected = ref<FeatureSummary | null>(null)

const columns = cols<FeatureSummary>(['label:기능 이름', 'code:기능 코드', 'portals:Portal', 'locked:잠금', 'apiCount:API 수'])
const fields: FieldDef[] = [{ key: 'label', label: '기능 이름', required: true, help: '1–50자 · 화면 표시용(권한 판정과 무관)' }]
const rename = (code: string) => (body: { label: string }) => accountManageApi.renameFeature(code, body)

async function reload() {
  await catalog.run()
  selected.value = features.value.find((f) => f.code === selected.value?.code) ?? null
}

onMounted(() => void catalog.run())
</script>

<template>
  <div>
    <p>
      <RouterLink :to="screenPath(oit, 'OIT-19')">권한 조회 (OIT-19)</RouterLink> ·
      <RouterLink :to="screenPath(oit, 'OIT-10')">역할 상세 · 권한 세트 (OIT-10)</RouterLink>
    </p>
    <p class="muted">기능 추가 · 삭제 · API 연결은 배포 시드로만 바뀝니다(ADR-0035). 새 기능은 그 역할 기본 세트에 넣어 배포되고, 다른 세트에는 OIT-10에서 넣습니다.</p>
    <ResultBox :error="catalog.error.value" />
    <DataTable :rows="features" :columns="columns">
      <template #actions="{ row }">
        <button v-if="can('iam:permission:manage')" type="button" @click="selected = row">이름 수정</button>
      </template>
    </DataTable>
    <section v-if="selected" class="box">
      <h3>{{ selected.label }} <code class="muted">{{ selected.code }}</code></h3>
      <ApiForm
        :key="`${selected.code}-${selected.label}`"
        :title="`기능 이름 — PUT /api/oit/permissions/features/${selected.code}`"
        :fields="fields"
        :initial="{ label: selected.label }"
        :submit="rename(selected.code)"
        @success="reload"
      />
    </section>
  </div>
</template>
