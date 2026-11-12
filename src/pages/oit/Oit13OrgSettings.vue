<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { type AccountListItem, type AccountSearchQuery, accountManageApi } from '@/api/accountManage'
import { companyApi } from '@/api/company'
import { type OrgUnit, orgManageApi } from '@/api/org'
import { useFeatureGate } from '@/forms/accountFields'
import { EDIT_FIELDS, LEADER_FIELDS, ORG_HISTORY_COLUMNS, ORG_MANAGE, TREE_COLUMNS, createFields, detailRows, moveFields } from '@/forms/orgFields'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import type { FieldDef } from '@/shared/ui/fields'
import { screenPath } from '@/shared/portal/types'
import { type Column, cols } from '@/shared/ui/table'
import { useAsync } from '@/shared/ui/useAsync'
import { oit } from '@/portals/oit'

/**
 * OIT-13 조직 설정
 * - 회사 정보: 조회(GET /api/oit/company) · 주소 · 대표 연락처 수정(PUT). 회사명 · 두 번호는 설치 셋업 값이라 조회만. 회사 전체 관리 범위만.
 * - 조직도(ORG-27과 같은 원본 · 같은 규칙): 트리 · 선택한 조직 정보 · [조직 추가] · [수정] · [조직장] · [이동] · [사용 안 함]/[다시 사용] · [삭제] · [이력].
 * - 소속 조직원: 선택한 조직과 그 아래 조직의 계정(GET /api/oit/accounts?orgId=) → [수정](OIT-03).
 * 조직 관리자 · 관리 범위 목록은 OIT-03(범위) · OIT-10(세트)에서 — 여기에 따로 두지 않는다.
 */
const api = orgManageApi('oit')
const { can } = useFeatureGate()
const company = useAsync(companyApi.get)
const companyFields: FieldDef[] = [
  { key: 'address', label: '주소', help: '빈 값 = 없음 · 200자 이하' },
  { key: 'phone', label: '대표 연락처', help: '빈 값 = 없음' },
]
const companyRows = computed(() => {
  const c = company.data.value
  if (!c) return {}
  return {
    회사명: c.name,
    사업자등록번호: c.bizRegNo,
    '대리점 등록번호': c.agencyRegNo ?? '-',
    주소: c.address ?? '-',
    '대표 연락처': c.phone ?? '-',
    '통계 센터 전송': c.statSendEnabled ? '사용' : '사용 안 함',
    '조직 구매 허용': c.allowOrgPurchase ? '허용' : '허용 안 함',
    '설계사 개인 구매 허용': c.allowPersonalPurchase ? '허용' : '허용 안 함',
  }
})
const memberColumns: Column<AccountListItem>[] = cols<AccountListItem>(['name:이름', 'loginId:아이디', 'roleName:역할', 'status:상태'])
const memberLoad = (query: AccountSearchQuery) => accountManageApi.accounts({ ...query, orgId: selectedId.value })
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
const addFields = computed(() => createFields(tree.data.value))

onMounted(() => {
  void tree.run()
  void company.run()
})
</script>

<template>
  <div>
    <section class="box">
      <h3>회사 정보</h3>
      <ResultBox :error="company.error.value" />
      <KeyValueTable v-if="company.data.value" :data="companyRows" />
      <ApiForm
        v-if="company.data.value && can('org:company:manage')"
        :key="`company-${company.data.value.address}-${company.data.value.phone}`"
        title="주소 · 대표 연락처 — PUT /api/oit/company"
        :fields="companyFields"
        :initial="{ address: company.data.value.address, phone: company.data.value.phone }"
        :submit="companyApi.edit"
        @success="company.run()"
      />
      <p class="muted">회사명 · 사업자등록번호 · 대리점 등록번호는 설치 셋업 값(조회만). 통계 전송 · 구매 허용 설정은 그 기능 때.</p>
    </section>

    <h3>조직도</h3>
    <ResultBox :error="tree.error.value" />
    <DataTable :rows="tree.data.value ?? []" :columns="TREE_COLUMNS" @row-click="select">
      <template #actions="{ row }">
        <button type="button" @click="select(row)">선택</button>
      </template>
    </DataTable>

    <ApiForm
      v-if="can(ORG_MANAGE)"
      :key="`add-${tree.data.value?.length ?? 0}`"
      title="조직 추가 — POST /api/oit/orgs"
      :fields="addFields"
      :initial="{ parentOrgId: selectedId }"
      :submit="api.create"
      submit-label="추가"
      @success="reload"
    />

    <section v-if="selected" class="box">
      <h3>{{ selected.name }} <code class="muted">{{ selected.orgId }}</code></h3>
      <ResultBox :error="detail.error.value" />
      <KeyValueTable :data="detailRows(selected)" />
      <template v-if="editable">
        <ApiForm
          :key="`edit-${selected.orgId}-${selected.name}-${selected.sortOrder}`"
          title="수정 — PUT /api/oit/orgs/{orgId}"
          :fields="EDIT_FIELDS"
          :initial="{ name: selected.name, phone: selected.phone, sortOrder: selected.sortOrder }"
          :submit="(body) => api.edit(id(), body as never)"
          @success="reload"
        />
        <ApiForm
          :key="`leader-${selected.orgId}-${selected.leaderAccountId}`"
          title="조직장 — PUT /api/oit/orgs/{orgId}/leader"
          :fields="LEADER_FIELDS"
          :initial="{ leaderAccountId: selected.leaderAccountId }"
          :submit="(body) => api.changeLeader(id(), body as never)"
          @success="reload"
        />
        <ApiForm
          :key="`move-${selected.orgId}-${selected.parentOrgId}`"
          title="이동 — POST /api/oit/orgs/{orgId}/move"
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
      <h4>소속 조직원 (아래 조직 포함)</h4>
      <PagedList :key="`members-${selected.orgId}`" :load="memberLoad" :columns="memberColumns">
        <template #actions="{ row }">
          <RouterLink v-if="can('iam:account:read')" :to="{ path: screenPath(oit, 'OIT-03'), query: { accountId: row.accountId } }">수정</RouterLink>
        </template>
      </PagedList>
      <h4>이력</h4>
      <ResultBox :error="history.error.value" />
      <DataTable :rows="history.data.value?.items ?? []" :columns="ORG_HISTORY_COLUMNS" />
    </section>
  </div>
</template>
