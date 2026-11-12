<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { type AccountStatus } from '@/api/account'
import { type MemberProcessRequest, accountManageApi } from '@/api/accountManage'
import { codeApi } from '@/api/code'
import { orgApi } from '@/api/org'
import { type MemberListItem, type MemberSearchQuery, orgMemberApi } from '@/api/orgMember'
import { HISTORY_COLUMNS, orgOptions, useFeatureGate } from '@/forms/accountFields'
import { org } from '@/portals/org'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import FormFields from '@/shared/ui/FormFields.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { type FieldDef, type Option, initialValues, toPayload } from '@/shared/ui/fields'
import type { Column } from '@/shared/ui/table'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * ORG-24 조직원 관리 — 상태 카드(summary, 상태 조건 무시한 수 · 탈퇴 제외) · 조직(아래 포함) · 직급 · 검색 · 연락처(정확히 일치) · 표 · 페이지.
 * 행: [상세](ORG-32, 행 클릭도) · [회원 처리](ORG-26 B안 = 정지) · [정지 해제] · [이력](ORG-34). 조직원 정보는 조회만(수정은 FP-21 · OIT-03).
 * 보유 DB 열은 DB 배정(alloc) 작업 때. PagedList 대신 직접 그리는 이유: summary 의 ALL 키(OIT-02와 같음).
 */
const STATUSES: readonly AccountStatus[] = ['ACTIVE', 'LEAVE', 'SUSPENDED']
const router = useRouter()
const { showAll, can } = useFeatureGate()

const orgs = useAsync(orgApi.orgOrgs)
const ranks = useAsync(() => codeApi.options('org', ['RANK', 'POSITION']))
const rankOptions = computed<Option[]>(() => (ranks.data.value?.RANK ?? []).map((c) => ({ value: c.code, label: c.name })))
const codeName = (group: 'RANK' | 'POSITION', code: string | null) =>
  code ? (ranks.data.value?.[group]?.find((c) => c.code === code)?.name ?? code) : null

const ROLE_OPTIONS: Option[] = [
  { value: 'AGENT', label: '설계사' },
  { value: 'ORG_MANAGER', label: '조직 관리자' },
  { value: 'ORG_SYSTEM_ADMIN', label: '전산관리자' },
]
const filters = computed<FieldDef[]>(() => [
  { key: 'role', label: '역할', type: 'select', options: ROLE_OPTIONS },
  { key: 'orgId', label: '소속 조직', type: 'select', options: orgOptions(orgs.data.value) },
  { key: 'rankCode', label: '직급', type: 'select', options: rankOptions.value },
  { key: 'q', label: '검색', placeholder: '이름 · 아이디 · 사번' },
  { key: 'phone', label: '연락처', placeholder: '번호 전체(숫자만 비교)' },
])
const filterValues = reactive(initialValues(filters.value))
const statusFilter = ref<AccountStatus | ''>('')
const paging = reactive({ page: 1, size: 15 })
const list = useAsync(orgMemberApi.members)
const result = computed(() => list.data.value)
const summary = computed(() => (result.value?.summary ?? {}) as Record<string, number>)

function reload(): void {
  void list.run({ ...toPayload(filters.value, filterValues), status: statusFilter.value || null, page: paging.page, size: paging.size } as MemberSearchQuery)
}
function search(): void {
  paging.page = 1
  reload()
}
function pickStatus(next: AccountStatus | ''): void {
  statusFilter.value = next
  search()
}
function go(page: number): void {
  paging.page = page
  reload()
}

const columns: Column<MemberListItem>[] = [
  { key: 'name', label: '이름' },
  { key: 'loginId', label: '아이디', value: (r) => (r.employeeNo ? `${r.loginId} (${r.employeeNo})` : r.loginId) },
  { key: 'org', label: '소속', value: (r) => r.org?.orgName },
  { key: 'role', label: '역할', value: (r) => r.roleName ?? r.role },
  { key: 'rankCode', label: '직급', value: (r) => codeName('RANK', r.rankCode) },
  { key: 'positionCode', label: '직책', value: (r) => codeName('POSITION', r.positionCode) },
  { key: 'primaryPhone', label: '연락처' },
  { key: 'hireDate', label: '입사일' },
  { key: 'status', label: '상태' },
]

const processing = ref<{ row: MemberListItem; mode: 'suspend' | 'unsuspend' } | null>(null)
const historyOf = ref<MemberListItem | null>(null)
const reasonFields: FieldDef[] = [{ key: 'reason', label: '처리 사유', type: 'textarea', required: true, help: '필수 · 500자 이하 — 이력에 남음' }]
function processRun(body: MemberProcessRequest) {
  const p = processing.value!
  return p.mode === 'suspend' ? accountManageApi.orgSuspend(p.row.accountId, body) : accountManageApi.orgUnsuspend(p.row.accountId, body)
}
function openProcess(row: MemberListItem, mode: 'suspend' | 'unsuspend'): void {
  historyOf.value = null
  processing.value = { row, mode }
}
function openHistory(row: MemberListItem): void {
  processing.value = null
  historyOf.value = row
}
const historyLoad = (q: { page?: number; size?: number }) => orgMemberApi.history(historyOf.value!.accountId, q)
const detailPath = (row: MemberListItem) => screenPath(org, 'ORG-32', row.accountId)

onMounted(() => {
  void orgs.run()
  void ranks.run()
  reload()
})
</script>

<template>
  <div>
    <p>
      <RouterLink v-if="can('iam:account:create-agent')" :to="screenPath(org, 'ORG-25')">설계사 등록 (ORG-25)</RouterLink>
      <label class="inline"><input v-model="showAll" type="checkbox" /> 권한 없는 버튼도 보기 (403 확인용)</label>
    </p>
    <p class="muted">조직원 정보는 조회만 — 수정은 설계사 본인(FP-21) · 조직 전산관리자(OIT-03). 회원 처리 B안 = 정지(보유 DB 유지). 보유 DB 열은 DB 배정 작업 때.</p>
    <ResultBox :error="orgs.error.value" />
    <ResultBox :error="ranks.error.value" />

    <div class="cards">
      <button type="button" :class="{ on: !statusFilter }" @click="pickStatus('')">전체 <b>{{ summary.ALL ?? '-' }}</b></button>
      <button v-for="s in STATUSES" :key="s" type="button" :class="{ on: statusFilter === s }" @click="pickStatus(s)">
        {{ s }} <b>{{ summary[s] ?? '-' }}</b>
      </button>
    </div>
    <form class="filters" @submit.prevent="search">
      <FormFields :fields="filters" :values="filterValues" :errors="list.error.value?.fieldErrors" />
      <button type="submit">조회</button>
    </form>
    <ResultBox :error="list.error.value" />

    <p class="muted">총 {{ result?.totalCount ?? 0 }}건 · {{ paging.page }} 페이지</p>
    <DataTable :rows="result?.items ?? []" :columns="columns" @row-click="(row) => router.push(detailPath(row))">
      <template #actions="{ row }">
        <RouterLink :to="detailPath(row)">상세</RouterLink>
        <template v-if="can('iam:account:suspend') && row.role === 'AGENT'">
          <button v-if="row.status === 'SUSPENDED'" type="button" @click.stop="openProcess(row, 'unsuspend')">정지 해제</button>
          <button v-else type="button" @click.stop="openProcess(row, 'suspend')">회원 처리</button>
        </template>
        <button type="button" @click.stop="openHistory(row)">이력</button>
      </template>
    </DataTable>
    <div class="pager">
      <button type="button" :disabled="paging.page <= 1" @click="go(paging.page - 1)">이전</button>
      <button type="button" :disabled="!result?.hasNext" @click="go(paging.page + 1)">다음</button>
      <select v-model.number="paging.size" @change="search">
        <option v-for="n in [15, 30, 50, 100]" :key="n" :value="n">{{ n }}개씩</option>
      </select>
    </div>

    <!-- ORG-26 회원 처리 (B안) · 정지 해제 -->
    <section v-if="processing" class="box">
      <h3>{{ processing.mode === 'suspend' ? '회원 처리 (ORG-26, B안 = 정지)' : '정지 해제' }} — {{ processing.row.name }} ({{ processing.row.loginId }})</h3>
      <p class="muted">{{ processing.mode === 'suspend' ? '상태 → SUSPENDED · 로그인 즉시 차단 · 보유 DB 유지. A안(탈퇴 + DB 귀속)은 1차.' : '상태 SUSPENDED → ACTIVE.' }}</p>
      <ApiForm :key="`${processing.row.accountId}-${processing.mode}`" :fields="reasonFields" :submit="processRun" submit-label="처리" @success="reload">
        <template #buttons><button type="button" @click="processing = null">취소</button></template>
      </ApiForm>
    </section>

    <!-- ORG-34 이력 보기 (공통 모달) -->
    <section v-if="historyOf" class="box">
      <h3>이력 — {{ historyOf.name }} ({{ historyOf.loginId }})</h3>
      <PagedList :key="historyOf.accountId" :load="historyLoad" :columns="HISTORY_COLUMNS" />
      <button type="button" @click="historyOf = null">닫기</button>
    </section>
  </div>
</template>
