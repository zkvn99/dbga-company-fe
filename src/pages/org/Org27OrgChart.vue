<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { type OrgUnit, orgManageApi } from '@/api/org'
import { useFeatureGate } from '@/forms/accountFields'
import { EDIT_FIELDS, LEADER_FIELDS, ORG_HISTORY_COLUMNS, ORG_MANAGE, TREE_COLUMNS, detailRows, moveFields } from '@/forms/orgFields'
import { org } from '@/portals/org'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * ORG-27 조직 관리 — 조직도: 트리(유형 · 조직장 · 인원 · 상태) · 선택한 조직 정보 · [수정](이름 · 연락처 · 순서) · [조직장] · [이동](승급) ·
 * [사용 안 함]/[다시 사용] · [삭제](최하위 빈 조직만) · [이력](ORG-34). 관리 범위 밖 조직은 서버가 403. 조직 추가는 ORG-28, 전체 이력은 ORG-33.
 */
const api = orgManageApi('org')
const { can } = useFeatureGate()
const tree = useAsync(api.list)
const detail = useAsync(api.detail)
const history = useAsync(api.orgHistory)
const selectedId = ref<string | null>(null)
const selected = computed(() => detail.data.value ?? null)
const editable = computed(() => !!selected.value && !selected.value.top && can(ORG_MANAGE))

async function select(row: OrgUnit): Promise<void> {
  selectedId.value = row.orgId
  await Promise.all([detail.run(row.orgId), history.run(row.orgId, { page: 1, size: 15 })])
}
async function reload(): Promise<void> {
  await tree.run()
  if (selectedId.value) {
    const still = tree.data.value?.find((o) => o.orgId === selectedId.value)
    if (still) await select(still)
    else selectedId.value = null
  }
}
const id = () => selectedId.value as string

onMounted(() => void tree.run())
</script>

<template>
  <div>
    <p>
      <RouterLink :to="screenPath(org, 'ORG-28')">+ 조직 추가 (ORG-28)</RouterLink> ·
      <RouterLink :to="screenPath(org, 'ORG-33')">조직 이력 (ORG-33)</RouterLink>
    </p>
    <ResultBox :error="tree.error.value" />
    <DataTable :rows="tree.data.value ?? []" :columns="TREE_COLUMNS" @row-click="select">
      <template #actions="{ row }">
        <button type="button" @click="select(row)">선택</button>
      </template>
    </DataTable>

    <section v-if="selected" class="box">
      <h3>{{ selected.name }} <code class="muted">{{ selected.orgId }}</code></h3>
      <ResultBox :error="detail.error.value" />
      <KeyValueTable :data="detailRows(selected)" />
      <template v-if="editable">
        <ApiForm
          :key="`edit-${selected.orgId}-${selected.name}-${selected.sortOrder}`"
          title="수정 — PUT /api/org/orgs/{orgId}"
          :fields="EDIT_FIELDS"
          :initial="{ name: selected.name, phone: selected.phone, sortOrder: selected.sortOrder }"
          :submit="(body) => api.edit(id(), body as never)"
          @success="reload"
        />
        <ApiForm
          :key="`leader-${selected.orgId}-${selected.leaderAccountId}`"
          title="조직장 — PUT /api/org/orgs/{orgId}/leader"
          :fields="LEADER_FIELDS"
          :initial="{ leaderAccountId: selected.leaderAccountId }"
          :submit="(body) => api.changeLeader(id(), body as never)"
          @success="reload"
        />
        <ApiForm
          :key="`move-${selected.orgId}-${selected.parentOrgId}`"
          title="이동 — POST /api/org/orgs/{orgId}/move"
          :fields="moveFields(tree.data.value)"
          :initial="{ parentOrgId: selected.parentOrgId }"
          :submit="(body) => api.move(id(), body as never)"
          @success="reload"
        />
        <p>
          <ActionButton v-if="selected.active" label="사용 안 함" reason="optional" :run="(reason) => api.deactivate(id(), reason)" @done="reload" />
          <ActionButton v-else label="다시 사용" :run="() => api.activate(id())" @done="reload" />
          <ActionButton
            label="삭제"
            :confirm="`'${selected.name}' 조직을 삭제합니다. 하위 조직 · 조직원이 있으면 서버가 거부(409).`"
            :run="() => api.remove(id())"
            @done="reload"
          />
        </p>
      </template>
      <h4>이력 (ORG-34)</h4>
      <ResultBox :error="history.error.value" />
      <DataTable :rows="history.data.value?.items ?? []" :columns="ORG_HISTORY_COLUMNS" />
    </section>
  </div>
</template>
