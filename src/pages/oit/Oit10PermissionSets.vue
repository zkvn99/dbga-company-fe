<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AccountRole } from '@/api/account'
import { type CatalogRole, accountManageApi } from '@/api/accountManage'
import { type PermissionSet, type PermissionSetHistoryItem, permissionSetApi } from '@/api/permissionSet'
import { useFeatureGate } from '@/forms/accountFields'
import { oit } from '@/portals/oit'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import type { FieldDef, Option } from '@/shared/ui/fields'
import { type Column, cols } from '@/shared/ui/table'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 권한 세트 · 역할 이름 (화면설계서 OIT-10 · OIT-12(1차)의 최소운영 판 — ADR-0031).
 * 역할마다: 표시 이름 변경(PUT /api/oit/roles/{role}) · 세트 목록(기본 · 계정 수) · [세트 추가] · [수정] · [기본으로 지정] · [삭제] · [이력].
 * 기능 체크 = 그 역할의 assignable. 잠금 기능은 처음부터 체크 · "잠금" 표시 — 체크를 풀어도 막지 않고 그대로 보낸다(서버가 잠금은 유지).
 * 버튼은 숨기지 않는 게 기본(403 확인) — "권한 없는 버튼 숨기기"로 /me features 미리보기.
 */
const { showAll, can } = useFeatureGate()

const catalog = useAsync(accountManageApi.permissions)
const sets = useAsync(permissionSetApi.list)
const roles = computed<CatalogRole[]>(() => catalog.data.value?.roles ?? [])
const setsOf = (role: AccountRole) => (sets.data.value ?? []).filter((s) => s.role === role)

function reloadAll(): void {
  void catalog.run()
  void sets.run(null)
}

// ── 역할 이름 ──────────────────────────────────────
const roleNameFields: FieldDef[] = [{ key: 'name', label: '역할 표시 이름', required: true, help: '1–20자 · 다른 역할과 같은 이름 불가 · 역할 코드는 바뀌지 않음' }]
const renameRole = (role: AccountRole) => (body: { name: string }) => permissionSetApi.renameRole(role, body)

// ── 세트 목록 ──────────────────────────────────────
const setColumns: Column<PermissionSet>[] = [
  { key: 'name', label: '세트 이름' },
  { key: 'isDefault', label: '기본', value: (s) => (s.isDefault ? '[기본]' : '') },
  { key: 'description', label: '설명' },
  { key: 'features', label: '기능 수', value: (s) => s.features.length },
  { key: 'accountCount', label: '지정 계정 수' },
  { key: 'updatedAt', label: '수정일시' },
  { key: 'setId', label: '세트 ID' },
]

// ── 세트 추가 · 수정 (화이트박스라 모달 대신 아래 패널) ──
type Editor = { mode: 'create'; role: AccountRole } | { mode: 'edit'; role: AccountRole; setId: string }
const editor = ref<Editor | null>(null)
const setDetail = useAsync(permissionSetApi.get)

const editorRole = computed(() => roles.value.find((r) => r.role === editor.value?.role) ?? null)
const featureOptions = computed<Option[]>(() => {
  const r = editorRole.value
  const options: Option[] = (r?.assignable ?? []).map((a) => ({ value: a.code, label: `${a.label} (${a.code})${a.locked ? ' — 잠금' : ''}` }))
  // 세트에 assignable 밖 기능이 남아 있으면(경로가 바뀐 경우 등) 그것도 보여 준다.
  if (editor.value?.mode === 'edit') {
    for (const code of setDetail.data.value?.features ?? []) if (!options.some((o) => o.value === code)) options.push({ value: code, label: `${code} (assignable 밖)` })
  }
  return options
})
const editorFields = computed<FieldDef[]>(() => [
  { key: 'name', label: '세트 이름', required: true, help: '1–50자 · 같은 역할 안에서 중복 불가' },
  { key: 'description', label: '설명', type: 'textarea', help: '300자 이하' },
  { key: 'features', label: '기능 (전체 교체)', type: 'multicheck', options: featureOptions.value, help: '잠금 기능은 빼도 서버가 유지' },
])
const editorInitial = computed(() => {
  const e = editor.value
  if (!e) return null
  if (e.mode === 'create') return { name: '', description: '', features: (editorRole.value?.assignable ?? []).filter((a) => a.locked).map((a) => a.code) }
  const s = setDetail.data.value
  return s && s.setId === e.setId ? { name: s.name, description: s.description, features: [...s.features] } : null
})
function editorSubmit(body: { name: string; description: string | null; features: string[] }) {
  const e = editor.value!
  return e.mode === 'create' ? permissionSetApi.create({ role: e.role, ...body }) : permissionSetApi.edit(e.setId, body)
}
function openCreate(role: AccountRole): void {
  editor.value = { mode: 'create', role }
}
function openEdit(s: PermissionSet): void {
  editor.value = { mode: 'edit', role: s.role, setId: s.setId }
  void setDetail.run(s.setId)
}

// ── 세트 이력 ──────────────────────────────────────
const historyOf = ref<{ setId: string; name: string } | null>(null)
const historySetId = ref('')
const historyLoad = (q: { page?: number; size?: number }) => permissionSetApi.history(historyOf.value!.setId, q)
const historyColumns: Column<PermissionSetHistoryItem>[] = [
  ...cols<PermissionSetHistoryItem>(['at:일시', 'kind:구분', 'featureCode:기능 코드']),
  { key: 'change', label: '내용 (이전 → 이후)', value: (r) => `${r.before ?? '-'} → ${r.after ?? '-'}` },
  ...cols<PermissionSetHistoryItem>(['actorType:처리자 유형', 'actorName:처리자']),
]
function openHistory(setId: string, name: string): void {
  historyOf.value = { setId, name }
}

onMounted(reloadAll)
</script>

<template>
  <div>
    <p>
      <RouterLink :to="screenPath(oit, 'OIT-19')">권한 조회 (역할 × 기본 세트 기능 · API 표)</RouterLink>
      <label class="inline"><input v-model="showAll" type="checkbox" /> 권한 없는 버튼도 보기 (403 확인용)</label>
      <button type="button" @click="reloadAll">다시 읽기</button>
    </p>
    <p class="muted">
      계정 실효 기능 = 잠금 ∪ 세트(지정 세트, 없으면 역할 기본 세트) ∪ 위임 — 요청마다 계산이라 세트를 바꾸면 바로 반영(/me 다시 읽기).
      계정에 세트 지정은 계정 등록 · 수정(OIT-03).
    </p>
    <ResultBox :error="catalog.error.value" />
    <ResultBox :error="sets.error.value" />

    <section v-for="r in roles" :key="r.role" class="box">
      <h3>{{ r.roleName }} <code class="muted">{{ r.role }}</code></h3>
      <ApiForm
        v-if="can('iam:permission:manage')"
        :key="`${r.role}-${r.roleName}`"
        :title="`역할 이름 — PUT /api/oit/roles/${r.role}`"
        :fields="roleNameFields"
        :initial="{ name: r.roleName }"
        :submit="renameRole(r.role)"
        @success="reloadAll"
      />
      <p class="muted">세트에 넣을 수 있는 기능 {{ r.assignable.length }}개 (잠금 {{ r.assignable.filter((a) => a.locked).length }}개)</p>
      <DataTable :rows="setsOf(r.role)" :columns="setColumns">
        <template #actions="{ row }">
          <button v-if="can('iam:permission:manage')" type="button" @click="openEdit(row)">수정</button>
          <ActionButton
            v-if="can('iam:permission:manage') && (!row.isDefault || showAll)"
            label="기본으로 지정"
            :confirm="`'${row.name}'을(를) ${r.roleName} 기본 세트로 지정합니다. 세트를 지정하지 않은 계정의 기능이 바로 바뀝니다.`"
            :run="() => permissionSetApi.makeDefault(row.setId)"
            @done="reloadAll"
          />
          <ActionButton
            v-if="can('iam:permission:manage')"
            label="삭제"
            :confirm="`'${row.name}' 세트를 삭제합니다. 기본 세트 · 사용 중 세트는 서버가 거부(409).`"
            :run="() => permissionSetApi.remove(row.setId)"
            @done="reloadAll"
          />
          <button type="button" @click="openHistory(row.setId, row.name)">이력</button>
        </template>
      </DataTable>
      <button v-if="can('iam:permission:manage')" type="button" @click="openCreate(r.role)">세트 추가 ({{ r.roleName }})</button>
    </section>

    <!-- 세트 추가 · 수정 -->
    <section v-if="editor" class="box">
      <h3>
        {{ editor.mode === 'create' ? `세트 추가 — POST /api/oit/permission-sets` : `세트 수정 — PUT /api/oit/permission-sets/${editor.setId}` }}
        · {{ editorRole?.roleName ?? editor.role }} <code class="muted">{{ editor.role }}</code>
      </h3>
      <ResultBox v-if="editor.mode === 'edit'" :error="setDetail.error.value" />
      <ApiForm
        v-if="editor.mode === 'create' || editorInitial"
        :key="editor.mode === 'create' ? `create-${editor.role}` : `edit-${editor.setId}`"
        :fields="editorFields"
        :initial="editorInitial"
        :submit="editorSubmit"
        :submit-label="editor.mode === 'create' ? '추가' : '저장'"
        @success="reloadAll"
      >
        <template #buttons><button type="button" @click="editor = null">닫기</button></template>
      </ApiForm>
    </section>

    <!-- 세트 이력 (삭제된 세트도 조회됨) -->
    <section class="box">
      <h3>세트 이력 — GET /api/oit/permission-sets/{setId}/history</h3>
      <form class="filters" @submit.prevent="historySetId && openHistory(historySetId.trim(), historySetId.trim())">
        <label>세트 ID (삭제된 세트도) <input v-model="historySetId" autocomplete="off" /></label>
        <button type="submit">이력 보기</button>
      </form>
      <template v-if="historyOf">
        <p>{{ historyOf.name }} <code class="muted">{{ historyOf.setId }}</code></p>
        <PagedList :key="historyOf.setId" :load="historyLoad" :columns="historyColumns" />
        <button type="button" @click="historyOf = null">닫기</button>
      </template>
    </section>
  </div>
</template>
