<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AccountMe } from '@/api/account'
import { type AddOrgCodeRequest, type CodeGroup, type CodeItem, type EditOrgCodeRequest, type Regions, codeApi } from '@/api/code'
import { orgApi } from '@/api/org'
import { hasFeature, orgOptions } from '@/forms/accountFields'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import type { FieldDef } from '@/shared/ui/fields'
import { type Column, cols } from '@/shared/ui/table'
import { session } from '@/shared/portal/session'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * OIT-08 코드 관리 — 왼쪽 그룹 트리(parentGroupCode 로 조립, 적용 범위 칩으로 거르기, 센터 사본 = 조회만) · 오른쪽 선택 그룹의 코드.
 * [조직 코드 추가] · [수정](이름 · 순서) · [사용]/[사용 안 함]은 editable 그룹 · 잠기지 않은 회사 코드 · code:code:manage 일 때만 보인다.
 * 지역 표준 탭: 시 · 도 + 권역(센터 사본, 조회만).
 */
const me = computed(() => session.me as AccountMe | null)
const showAll = ref(true) // frontend.md 5장: features로 숨기지 않는 게 기본(403 확인). 끄면 /me features대로 미리보기
const canManage = computed(() => showAll.value || hasFeature(me.value, 'code:code:manage'))

const tab = ref<'codes' | 'regions'>('codes')
const groups = useAsync(codeApi.groups)
const group = useAsync(codeApi.group)
const regions = useAsync(codeApi.regions)
const orgs = useAsync(orgApi.oitOrgs)
const selected = ref<string | null>(null)
const editing = ref<CodeItem | null>(null)
const scopeFilter = ref<string>('')

const SCOPES = ['SYSTEM_LOCKED', 'EXTENSIBLE', 'ORG', 'COMPANY', 'CENTER'] as const
const scopeCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const g of groups.data.value ?? []) counts[g.scope] = (counts[g.scope] ?? 0) + 1
  return counts
})

/** 평면 목록 → 트리 순서(상위 → 하위) + 깊이. 부모가 목록에 없으면 최상위로. */
const tree = computed(() => {
  const all = groups.data.value ?? []
  const codes = new Set(all.map((g) => g.groupCode))
  const children = new Map<string | null, CodeGroup[]>()
  for (const g of all) {
    const parent = g.parentGroupCode && codes.has(g.parentGroupCode) ? g.parentGroupCode : null
    children.set(parent, [...(children.get(parent) ?? []), g])
  }
  const out: { group: CodeGroup; depth: number; hasChildren: boolean }[] = []
  const walk = (parent: string | null, depth: number, seen: Set<string>) => {
    for (const g of children.get(parent) ?? []) {
      if (seen.has(g.groupCode)) continue
      seen.add(g.groupCode)
      out.push({ group: g, depth, hasChildren: (children.get(g.groupCode) ?? []).length > 0 })
      walk(g.groupCode, depth + 1, seen)
    }
  }
  walk(null, 0, new Set())
  return scopeFilter.value ? out.filter((n) => n.group.scope === scopeFilter.value) : out
})

const detail = computed(() => group.data.value ?? null)
const editable = computed(() => !!detail.value?.editable && canManage.value)
const groupFields = cols<Record<string, unknown>>(['groupCode:그룹 코드', 'parentGroupCode:상위 그룹', 'name:이름', 'scope:적용 범위', 'source:원본', 'usedIn:사용 화면', 'active:사용', 'codeCount:코드 수'])
const codeColumns: Column<CodeItem>[] = [
  ...cols<CodeItem>(['sortOrder:순서', 'code:코드', 'name:코드명']),
  { key: 'ownerOrgName', label: '적용 범위', value: (r) => r.ownerOrgName ?? '시스템 기본' },
  ...cols<CodeItem>(['active:사용', 'locked:잠금', 'codeId:codeId']),
]
const rowEditable = (row: CodeItem) => (editable.value || showAll.value) && !!row.codeId && (!row.locked || showAll.value)

const addFields = computed<FieldDef[]>(() => [
  { key: 'code', label: '코드', required: true, help: '영문 대문자 · 숫자 · _ 1~40자, 등록 후 불변. 다른 조직과 겹쳐도 됨' },
  { key: 'name', label: '코드명', required: true },
  { key: 'orgId', label: '적용 조직', type: 'select', options: orgOptions(orgs.data.value), required: true, help: '아래 조직 포함 · 관리 범위 안' },
  { key: 'sortOrder', label: '순서', type: 'number', required: true, help: '0~9999' },
])
const editFields: FieldDef[] = [
  { key: 'name', label: '코드명', required: true },
  { key: 'sortOrder', label: '순서', type: 'number', required: true },
]

function open(groupCode: string): void {
  selected.value = groupCode
  editing.value = null
  void group.run(groupCode)
}
function reload(): void {
  void groups.run()
  if (selected.value) void group.run(selected.value)
}
const addCode = (body: AddOrgCodeRequest) => codeApi.addCode(selected.value!, body)
const editCode = (body: EditOrgCodeRequest) => codeApi.editCode(selected.value!, editing.value!.codeId!, body)

function openRegions(): void {
  tab.value = 'regions'
  if (!regions.data.value) void regions.run()
}
const regionNames = computed(() => new Map((regions.data.value?.regions ?? []).map((r) => [r.regionCode, r.name])))
const regionColumns = cols<Regions['regions'][number]>(['sortOrder:순서', 'regionCode:코드', 'name:이름', 'active:사용'])
const regionGroupColumns: Column<Regions['groups'][number]>[] = [
  ...cols<Regions['groups'][number]>(['name:권역', 'active:사용']),
  { key: 'regionCodes', label: '포함 지역', value: (g) => g.regionCodes.map((c) => `${regionNames.value.get(c) ?? '?'}(${c})`) },
  { key: 'groupId', label: 'groupId' },
]

onMounted(() => {
  void groups.run()
  void orgs.run()
})
</script>

<template>
  <div>
    <p>
      <button type="button" :class="{ on: tab === 'codes' }" @click="tab = 'codes'">공통 코드</button>
      <button type="button" :class="{ on: tab === 'regions' }" @click="openRegions">지역 표준 (시 · 도 · 권역)</button>
      <label class="inline"><input v-model="showAll" type="checkbox" /> 권한 · 잠금과 무관하게 버튼 보기 (403 · 409 확인용)</label>
    </p>

    <template v-if="tab === 'codes'">
      <ResultBox :error="groups.error.value" />
      <div class="cards">
        <button type="button" :class="{ on: !scopeFilter }" @click="scopeFilter = ''">전체 <b>{{ groups.data.value?.length ?? 0 }}</b></button>
        <button v-for="s in SCOPES" :key="s" type="button" :class="{ on: scopeFilter === s }" @click="scopeFilter = s">
          {{ s }} <b>{{ scopeCounts[s] ?? 0 }}</b>
        </button>
      </div>
      <table class="table compact">
        <tr v-for="n in tree" :key="n.group.groupCode" class="row" :class="{ on: n.group.groupCode === selected }" @click="open(n.group.groupCode)">
          <td :style="{ paddingLeft: `${8 + n.depth * 20}px` }">
            {{ n.hasChildren ? '▾' : '·' }} <b v-if="n.group.groupCode === selected">{{ n.group.name }}</b><span v-else>{{ n.group.name }}</span>
            <code class="muted">{{ n.group.groupCode }}</code>
          </td>
          <td>{{ n.group.scope }}</td>
          <td>{{ n.group.source === 'CENTER' ? '센터 사본 · 조회만' : 'COMPANY' }}</td>
          <td>{{ n.group.codeCount }}</td>
          <td>{{ n.group.active ? '' : '사용 안 함' }}</td>
        </tr>
      </table>

      <ResultBox :error="group.error.value" />
      <template v-if="selected && detail">
        <h2>{{ detail.group.name }} ({{ detail.group.groupCode }})</h2>
        <KeyValueTable :data="detail.group" :fields="groupFields" />
        <p class="muted">editable = {{ detail.editable }} — {{ detail.editable ? '조직 코드 추가 · 수정 가능 그룹' : '조회만 (시스템 · 잠금 / 센터 사본)' }}</p>
        <DataTable :rows="detail.codes" :columns="codeColumns">
          <template #actions="{ row }">
            <template v-if="rowEditable(row)">
              <button type="button" @click="editing = row">수정</button>
              <ActionButton v-if="row.active" label="사용 안 함" :run="() => codeApi.deactivate(selected!, row.codeId!)" @done="reload" />
              <ActionButton v-else label="사용" :run="() => codeApi.activate(selected!, row.codeId!)" @done="reload" />
            </template>
            <span v-else class="muted">잠금</span>
          </template>
        </DataTable>
        <ApiForm v-if="editing" :key="editing.codeId ?? editing.code" :title="`코드 수정: ${editing.code}`" :fields="editFields" :initial="editing" :submit="editCode" @success="reload">
          <template #buttons><button type="button" @click="editing = null">닫기</button></template>
        </ApiForm>
        <ApiForm v-if="editable || showAll" :key="`${selected}-add`" title="조직 코드 추가" :fields="addFields" :submit="addCode" submit-label="추가" @success="reload" />
      </template>
    </template>

    <template v-else>
      <p class="muted">센터 원본의 사본 — 조회만(변경은 통합 관리자 센터 API).</p>
      <ResultBox :error="regions.error.value" />
      <template v-if="regions.data.value">
        <h3>시 · 도 (표준 코드)</h3>
        <DataTable :rows="regions.data.value.regions" :columns="regionColumns" />
        <h3>기본 그룹 (권역)</h3>
        <DataTable :rows="regions.data.value.groups" :columns="regionGroupColumns" />
      </template>
    </template>
  </div>
</template>
