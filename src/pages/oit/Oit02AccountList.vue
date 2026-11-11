<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ACCOUNT_ROLES, ACCOUNT_STATUSES, type AccountRole, CREATE_FEATURE } from '@/api/account'
import { type AccountListItem, type AccountSearchQuery, type MemberProcessRequest, accountManageApi } from '@/api/accountManage'
import { orgApi } from '@/api/org'
import { HISTORY_COLUMNS, orgOptions, roleNameOf, useFeatureGate } from '@/forms/accountFields'
import { oit } from '@/portals/oit'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import FormFields from '@/shared/ui/FormFields.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { type FieldDef, type Option, initialValues, opts, toPayload } from '@/shared/ui/fields'
import type { Column } from '@/shared/ui/table'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * OIT-02 계정 목록 — 역할 칩(summary, 역할 조건 무시한 수) · 상태 · 조직 · 검색 · 표 · 페이지.
 * 행 동작: [수정](OIT-03) · [정지]/[회원 처리](ORG-26 B안) · [정지 해제] · [잠금 해제] · [비밀번호 초기화] · [이력](ORG-34).
 * 버튼은 /me features 로 숨긴다(표시용 — "권한 없는 버튼도 보기"를 켜면 403 확인 가능). 마지막 활동 전산관리자는 정지 비활성.
 * 권한 세트 열(이름 · "기본 따름") · 필터(GET /api/oit/permissions 의 역할별 세트, 기본 세트를 고르면 미지정 계정 포함). 역할은 roleName(코드 병기).
 * PagedList 를 쓰지 않는 이유: summary 에 ALL 키가 있어 칩으로 그대로 쓰면 role=ALL(400)을 보냄 — 칩만 직접 그린다.
 */
const { showAll, can } = useFeatureGate()

const orgs = useAsync(orgApi.oitOrgs)
/** 역할 이름 · 세트 선택지(iam:permission:read — 없으면 403, 필터는 비고 역할은 코드만). */
const catalog = useAsync(accountManageApi.permissions)
const roleName = (r: AccountRole) => roleNameOf(catalog.data.value, r)
const setOptions = computed<Option[]>(() =>
  (catalog.data.value?.roles ?? []).flatMap((r) =>
    r.sets.map((s) => ({ value: s.setId, label: `[${r.roleName}] ${s.name}${s.isDefault ? ' (기본 — 미지정 계정 포함)' : ''} · ${s.accountCount}명` })),
  ),
)
const filters = computed<FieldDef[]>(() => [
  { key: 'status', label: '상태', type: 'select', options: opts(ACCOUNT_STATUSES) },
  { key: 'orgId', label: '조직', type: 'select', options: orgOptions(orgs.data.value) },
  { key: 'permissionSetId', label: '권한 세트', type: 'select', options: setOptions.value },
  { key: 'q', label: '검색', placeholder: '이름 · 아이디 · 사번' },
])
const filterValues = reactive(initialValues(filters.value))
const role = ref<AccountRole | ''>('')
const paging = reactive({ page: 1, size: 15 })
const list = useAsync(accountManageApi.accounts)
const result = computed(() => list.data.value)
const summary = computed(() => (result.value?.summary ?? {}) as Record<string, number>)

function reload(): void {
  void list.run({ ...toPayload(filters.value, filterValues), role: role.value || null, page: paging.page, size: paging.size } as AccountSearchQuery)
}
function search(): void {
  paging.page = 1
  reload()
}
function pickRole(next: AccountRole | ''): void {
  role.value = next
  search()
}
function go(page: number): void {
  paging.page = page
  reload()
}

const columns: Column<AccountListItem>[] = [
  { key: 'name', label: '이름' },
  { key: 'loginId', label: '아이디' },
  { key: 'employeeNo', label: '사번' },
  { key: 'role', label: '역할', value: (r) => (r.roleName ? `${r.roleName} (${r.role})` : r.role) },
  { key: 'org', label: '소속', value: (r) => r.org?.orgName },
  { key: 'scope', label: '관리 범위', value: (r) => (r.scope?.scopeType ? `${r.scope.scopeType}${r.scope.orgs.length ? ` (${r.scope.orgs.map((o) => o.orgName).join(', ')})` : ''}` : null) },
  { key: 'permissionSet', label: '권한 세트', value: (r) => (r.permissionSet ? `${r.permissionSet.name}${r.permissionSet.assigned ? '' : ' (기본 따름)'}` : null) },
  { key: 'delegations', label: '위임' },
  { key: 'status', label: '상태' },
  { key: 'locked', label: '잠김' },
  { key: 'lastLoginAt', label: '최근 로그인' },
  { key: 'lastActiveSystemAdmin', label: '마지막 전산관리자' },
]

/** 열린 모달(화이트박스라 목록 아래 패널로). */
const processing = ref<{ row: AccountListItem; mode: 'suspend' | 'unsuspend' } | null>(null)
const historyOf = ref<AccountListItem | null>(null)

const reasonFields: FieldDef[] = [{ key: 'reason', label: '처리 사유', type: 'textarea', required: true, help: '필수 · 500자 이하 — 이력에 남음' }]
function processRun(body: MemberProcessRequest) {
  const p = processing.value!
  return p.mode === 'suspend' ? accountManageApi.suspend(p.row.accountId, body) : accountManageApi.unsuspend(p.row.accountId, body)
}
function openProcess(row: AccountListItem, mode: 'suspend' | 'unsuspend'): void {
  historyOf.value = null
  processing.value = { row, mode }
}
function openHistory(row: AccountListItem): void {
  processing.value = null
  historyOf.value = row
}
const historyLoad = (q: { page?: number; size?: number }) => accountManageApi.history(historyOf.value!.accountId, q)

const memberInfo = computed(() => {
  const r = processing.value?.row
  if (!r) return null
  return { name: r.name, loginId: r.loginId, employeeNo: r.employeeNo, org: r.org?.orgName, role: r.role, roleName: r.roleName, status: r.status, lastLoginAt: r.lastLoginAt }
})

onMounted(() => {
  void orgs.run()
  void catalog.run()
  reload()
})
</script>

<template>
  <div>
    <p>
      <RouterLink v-if="ACCOUNT_ROLES.some((r) => can(CREATE_FEATURE[r]))" :to="screenPath(oit, 'OIT-03')">계정 등록 (OIT-03)</RouterLink>
      <label class="inline"><input v-model="showAll" type="checkbox" /> 권한 없는 버튼도 보기 (403 확인용)</label>
    </p>
    <p class="muted">정지 · 탈퇴는 상태를 직접 바꾸지 않고 [회원 처리]로만. 활동 중인 전산관리자가 1명뿐이면 그 계정은 정지 · 역할 변경 불가(버튼 비활성, 서버도 409).</p>
    <ResultBox :error="orgs.error.value" />
    <ResultBox :error="catalog.error.value" />

    <div class="cards">
      <button type="button" :class="{ on: !role }" @click="pickRole('')">전체 <b>{{ summary.ALL ?? '-' }}</b></button>
      <button v-for="r in ACCOUNT_ROLES" :key="r" type="button" :class="{ on: role === r }" @click="pickRole(r)">
        {{ roleName(r) ?? r }} <code v-if="roleName(r)" class="muted">{{ r }}</code> <b>{{ summary[r] ?? '-' }}</b>
      </button>
    </div>
    <form class="filters" @submit.prevent="search">
      <FormFields :fields="filters" :values="filterValues" :errors="list.error.value?.fieldErrors" />
      <button type="submit">조회</button>
    </form>
    <ResultBox :error="list.error.value" />

    <p class="muted">총 {{ result?.totalCount ?? 0 }}건 · {{ paging.page }} 페이지</p>
    <DataTable :rows="result?.items ?? []" :columns="columns">
      <template #actions="{ row }">
        <RouterLink v-if="can('iam:account:read')" :to="{ path: screenPath(oit, 'OIT-03'), query: { accountId: row.accountId } }">수정</RouterLink>
        <template v-if="can('iam:account:suspend') && row.status !== 'WITHDRAWN'">
          <button v-if="row.status === 'SUSPENDED'" type="button" @click="openProcess(row, 'unsuspend')">정지 해제</button>
          <button
            v-else
            type="button"
            :disabled="row.lastActiveSystemAdmin && !showAll"
            :title="row.lastActiveSystemAdmin ? '마지막 활동 전산관리자 — 정지 불가' : ''"
            @click="openProcess(row, 'suspend')"
          >
            {{ row.role === 'AGENT' ? '회원 처리' : '정지' }}
          </button>
        </template>
        <ActionButton v-if="row.locked && can('iam:account:unlock')" label="잠금 해제" reason="optional" :run="(reason) => accountManageApi.unlock(row.accountId, { reason })" @done="reload" />
        <ActionButton
          v-if="can('iam:member:edit')"
          label="비밀번호 초기화"
          confirm="임시 비밀번호(대표 휴대폰 숫자)로 초기화합니다."
          reason="optional"
          :run="(reason) => accountManageApi.resetPassword(row.accountId, { reason })"
        />
        <button v-if="can('iam:account:read')" type="button" @click="openHistory(row)">이력</button>
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
      <h3>{{ processing.mode === 'suspend' ? '회원 처리 (ORG-26)' : '정지 해제' }} — {{ processing.row.name }} ({{ processing.row.loginId }})</h3>
      <KeyValueTable :data="memberInfo" />
      <template v-if="processing.mode === 'suspend'">
        <p>처리 방식</p>
        <label class="inline"><input type="radio" disabled /> A. 전체 DB 조직 귀속 후 탈퇴 <span class="muted">(1차 · API 대기)</span></label>
        <label class="inline"><input type="radio" checked /> B. 계정 정지 · DB 유지</label>
        <p class="muted">
          B안 예상 결과: DB 변경 0건 · 접근 차단 계정 1건 · 상태 {{ processing.row.status }} → SUSPENDED. 로그인 · API 즉시 차단, 보유 DB 그대로(신규 배정에서만 제외).
          DB 현황(취득 유형별) · 진행 중 업무 경고는 API 대기.
        </p>
      </template>
      <p v-else class="muted">정지 해제 — 상태 SUSPENDED → ACTIVE, DB 변경 없음.</p>
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
