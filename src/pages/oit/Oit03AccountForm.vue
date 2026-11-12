<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ACCOUNT_ROLES, type AccountRole, CREATE_FEATURE, type RegisterAccountRequest, accountApi } from '@/api/account'
import {
  type AccountDetail,
  type ChangeDelegationsRequest,
  type ChangePermissionSetRequest,
  type ChangeRoleRequest,
  type ChangeScopeRequest,
  type EditAccountRequest,
  type EditAlimtalkRequest,
  type EditContactsRequest,
  accountManageApi,
} from '@/api/accountManage'
import { type CodeOption, codeApi } from '@/api/code'
import { orgApi } from '@/api/org'
import { type PermissionSet, permissionSetApi } from '@/api/permissionSet'
import { ALIMTALK, GENDER, HISTORY_COLUMNS, PHONES, accountInitial, codeOptions, hasFeature, orgOptions, orgTreeOptions, roleNameOf, useFeatureGate } from '@/forms/accountFields'
import { oit } from '@/portals/oit'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { type FieldDef, type Option, opts } from '@/shared/ui/fields'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * OIT-03 계정 등록 · 수정. ?accountId= 가 없으면 등록, 있으면 수정.
 * - 등록: 역할 선택 → 그 역할의 만들기 경로(생성 등급 = 경로). 만들기 기능이 없는 역할은 숨김. 관리 범위는 조직 관리자 · 전산관리자만, 위임은 조직 관리자만.
 * - 수정: 기본 정보 · 연락처 · 알림톡 · 역할 · 관리 범위 · 위임을 각자 [저장](각자 API, 결과 changed). 이메일 · 생년월일 · 번호는 가린 값만 내려오므로
 *   "새 값 입력 시 변경". 추가 번호는 phoneId + 빈 번호로 보내면 번호 그대로(구분 · 메모만 변경), 새 번호를 입력하면 바뀐다.
 * - 권한 세트(ADR-0031): 고른 역할의 세트만(GET /api/oit/permission-sets?role=). 비우면 역할 기본 세트 따름. 등록은 permissionSetId,
 *   수정은 별도 섹션(PUT …/permission-set). 역할을 바꾸면 서버가 지정 세트를 지우므로 상세를 다시 읽는다.
 * - 직급 · 직책은 고른 소속 조직의 코드 선택지(code:option:read). 입력 차단 검증 없음 — 서버 fieldErrors 를 그대로 본다.
 */
const route = useRoute()
const accountId = computed(() => (typeof route.query.accountId === 'string' && route.query.accountId) || null)

const { me, showAll, can } = useFeatureGate()

// 공통 선택지 — 조직 · 위임 기능
const orgs = useAsync(orgApi.oitOrgs)
const orgOpts = computed(() => orgOptions(orgs.data.value))
const orgTreeOpts = computed(() => orgTreeOptions(orgs.data.value))
const catalog = useAsync(accountManageApi.permissions)
const roleName = (r: AccountRole) => roleNameOf(catalog.data.value, r)
/** 그 역할에 위임할 수 있는 기능(GET /api/oit/permissions roles[].delegable — 역할 Portal 기능 − 잠금 − 위임 금지, ADR-0032). */
const delegableFor = (r: AccountRole | null | undefined): Option[] =>
  catalog.data.value?.roles.find((x) => x.role === r)?.delegable.map((d) => ({ value: d.code, label: `${d.label} (${d.code})` })) ?? []
const SCOPE_ORGS_HELP = '조직 관리자 · 전산관리자. 고른 조직과 그 아래 조직 전부가 범위(저장은 맨 위 조직만). 회사(맨 위)를 고르면 회사 전체'
/** 회사(최상위) 조직 — 관리 범위가 회사 전체(COMPANY)면 트리에서 이 조직이 체크된 것으로 보인다. */
const topOrgId = computed(() => orgs.data.value?.find((o) => o.parentOrgId == null)?.orgId ?? null)
/**
 * 관리 범위는 관리 조직 트리 하나로 고른다 — 고른 조직이 있으면 scopeType ORG(회사 조직이면 서버가 COMPANY로 저장), 없으면 범위 없음(설계사).
 */
function withScope<T extends { scopeOrgIds?: string[] | null }>(body: T): T & { scopeType: 'ORG' | null; scopeOrgIds: string[] } {
  const ids = body.scopeOrgIds ?? []
  return { ...body, scopeType: ids.length ? 'ORG' : null, scopeOrgIds: ids }
}
const DELEGATION_HELP = '권한 세트에 더해 이 계정만 추가로 갖는 기능. 세트에 이미 있는 기능을 넣어도 됨(세트에서 빠져도 유지)'

/** 직급 · 직책 선택지 — 회사 단위 하나라 한 번만 읽는다(ADR-0038). 등록 · 수정이 같이 쓴다. */
const codes = useAsync(() => codeApi.options('oit', ['RANK', 'POSITION']))
const rankOpts = computed(() => codeOptions((codes.data.value as Record<string, CodeOption[]> | undefined)?.RANK))
const positionOpts = computed(() => codeOptions((codes.data.value as Record<string, CodeOption[]> | undefined)?.POSITION))

/** 역할별 권한 세트 선택지(역할 바뀔 때마다 다시 읽음). */
function useRoleSets() {
  const call = useAsync(permissionSetApi.list)
  function load(r: AccountRole | null | undefined): void {
    if (r) void call.run(r)
  }
  const options = computed<Option[]>(() =>
    (call.data.value ?? []).map((s: PermissionSet) => ({ value: s.setId, label: `${s.name}${s.isDefault ? ' [기본]' : ''} · ${s.features.length}개 기능 · ${s.accountCount}명` })),
  )
  return { call, load, options }
}
const SET_HELP = '(선택 안 함) = 역할 기본 세트 따르기'

function basicFields(rank: Option[], position: Option[]): FieldDef[] {
  return [
    { key: 'orgId', label: '소속 조직', type: 'select', options: orgOpts.value, required: true },
    { key: 'rankCode', label: '직급', type: 'select', options: rank },
    { key: 'positionCode', label: '직책', type: 'select', options: position },
  ]
}

// ── 등록 ────────────────────────────────────────────
const creatable = computed(() => ACCOUNT_ROLES.filter((r) => can(CREATE_FEATURE[r])))
const role = ref<AccountRole>('AGENT')
const createSets = useRoleSets()
watch(role, (r) => createSets.load(r), { immediate: true })

const createFields = computed<FieldDef[]>(() => {
  const r = role.value
  const fields: FieldDef[] = [
    { key: 'loginId', label: '아이디', required: true, help: '영문 · 숫자 · . _ - 3~50자, 등록 후 변경 불가' },
    { key: 'name', label: '이름', required: true },
    { key: 'email', label: '이메일', type: 'email' },
    { key: 'employeeNo', label: '사번' },
    { key: 'birthDate', label: '생년월일', type: 'date' },
    { key: 'hireDate', label: '입사일', type: 'date' },
    GENDER,
    ...basicFields(rankOpts.value, positionOpts.value),
    PHONES,
    ALIMTALK,
  ]
  if (r !== 'AGENT') {
    fields.push({ key: 'scopeOrgIds', label: '관리 범위', type: 'treecheck', options: orgTreeOpts.value, required: true, help: SCOPE_ORGS_HELP })
  }
  fields.push({ key: 'delegations', label: `위임 기능 (${r})`, type: 'multicheck', options: delegableFor(r), help: DELEGATION_HELP })
  fields.push({ key: 'permissionSetId', label: `권한 세트 (${r})`, type: 'select', options: createSets.options.value, help: SET_HELP })
  return fields
})
const createInitial = computed(() => ({ ...accountInitial(me.value), scopeOrgIds: [] }))
const CREATE: Record<AccountRole, (body: RegisterAccountRequest) => Promise<unknown>> = {
  ORG_SYSTEM_ADMIN: accountApi.createSystemAdmin,
  ORG_MANAGER: accountApi.createManager,
  AGENT: accountApi.createAgent,
}
const createSubmit = (body: RegisterAccountRequest) => CREATE[role.value](withScope(body))

// ── 수정 ────────────────────────────────────────────
const detail = useAsync(accountManageApi.account)
const d = computed(() => detail.data.value ?? null)
const showHistory = ref(false)
function reloadDetail(): void {
  if (accountId.value) void detail.run(accountId.value)
}

const editSets = useRoleSets()
watch(
  () => d.value?.role,
  (r) => editSets.load(r),
)

const summaryFields = [
  { key: 'accountId', label: '계정 ID' },
  { key: 'loginId', label: '아이디 (변경 불가)' },
  { key: 'role', label: '역할 (코드)' },
  { key: 'roleName', label: '역할 이름' },
  {
    key: 'permissionSet',
    label: '권한 세트',
    value: (r: Record<string, unknown>) => {
      const p = r.permissionSet as AccountDetail['permissionSet']
      return p ? `${p.name}${p.isDefault ? ' [기본]' : ''} — ${p.assigned ? '지정' : '기본 따름'} (${p.setId})` : null
    },
  },
  { key: 'status', label: '상태' },
  { key: 'org', label: '소속', value: (r: Record<string, unknown>) => (r.org as AccountDetail['org'] | null)?.orgName },
  { key: 'email', label: '이메일 (가림)' },
  { key: 'birthDate', label: '생년월일 (가림)' },
  { key: 'scope', label: '관리 범위', value: (r: Record<string, unknown>) => JSON.stringify(r.scope) },
  { key: 'delegations', label: '위임' },
  { key: 'locked', label: '잠김' },
  { key: 'mustChangePassword', label: '비밀번호 변경 필요' },
  { key: 'lastLoginAt', label: '최근 로그인' },
  { key: 'lastActiveSystemAdmin', label: '마지막 활동 전산관리자' },
]

const editBasicFields = computed<FieldDef[]>(() => [
  { key: 'name', label: '이름', required: true },
  { key: 'email', label: '이메일 — 새 값 입력 시 변경', type: 'email', placeholder: d.value?.email ?? '', help: `현재 ${d.value?.email ?? '-'} · 비우면 그대로` },
  { key: 'employeeNo', label: '사번', help: '비우면 지움' },
  { key: 'birthDate', label: '생년월일 — 새 값 입력 시 변경', type: 'date', help: `현재 ${d.value?.birthDate ?? '-'} · 비우면 그대로` },
  { key: 'hireDate', label: '입사일', type: 'date' },
  GENDER,
  ...basicFields(rankOpts.value, positionOpts.value),
  { key: 'status', label: '상태', type: 'select', options: opts(['ACTIVE', 'LEAVE']), help: '활동 · 휴직만. 비우면 그대로 · 정지 · 탈퇴는 회원 처리(OIT-02)' },
])
const editBasicInitial = computed(() => {
  const v = d.value
  if (!v) return null
  return {
    name: v.name,
    email: '',
    employeeNo: v.employeeNo,
    birthDate: '',
    hireDate: v.hireDate,
    gender: v.gender,
    orgId: v.org?.orgId,
    rankCode: v.rankCode,
    positionCode: v.positionCode,
    status: v.status === 'ACTIVE' || v.status === 'LEAVE' ? v.status : '',
  }
})

const primaryPhone = computed(() => d.value?.phones.find((p) => p.primary) ?? null)
const contactFields: FieldDef[] = [
  {
    key: 'phones',
    label: '추가 번호 (전체 교체)',
    type: 'list',
    help: 'phoneId 있으면 수정(번호를 비우면 그대로 · 입력하면 변경) · phoneId 비우면 새 번호 · 행을 지우면 삭제',
    itemFields: [
      { key: 'phoneId', label: 'phoneId (기존)', placeholder: '비우면 새 번호' },
      { key: 'current', label: '현재 번호 (가림)', type: 'readonly' },
      { key: 'kind', label: '종류', type: 'select', options: opts(['MOBILE', 'LANDLINE']), required: true },
      { key: 'number', label: '번호 (원문)', type: 'tel', required: true },
      { key: 'memo', label: '메모' },
    ],
  },
]
const contactInitial = computed(() =>
  d.value
    ? { phones: d.value.phones.filter((p) => !p.primary).map((p) => ({ phoneId: p.phoneId, current: p.number, kind: p.kind, number: '', memo: p.memo })) }
    : null,
)

const alimtalkFields: FieldDef[] = [ALIMTALK]
const roleFields = computed<FieldDef[]>(() => [
  { key: 'role', label: '역할', type: 'select', options: opts(ACCOUNT_ROLES), required: true },
  { key: 'scopeOrgIds', label: '관리 범위', type: 'treecheck', options: orgTreeOpts.value, help: `${SCOPE_ORGS_HELP} · 설계사로 바꾸면 비움` },
])
const scopeFields = computed<FieldDef[]>(() => [
  { key: 'scopeOrgIds', label: '관리 범위', type: 'treecheck', options: orgTreeOpts.value, required: true, help: SCOPE_ORGS_HELP },
])
const scopeInitial = computed(() => {
  if (!d.value) return null
  const company = d.value.scope?.scopeType === 'COMPANY'
  const ids = company ? (topOrgId.value ? [topOrgId.value] : []) : (d.value.scope?.orgs.map((o) => o.orgId) ?? [])
  return { role: d.value.role, scopeOrgIds: ids }
})
const delegationFields = computed<FieldDef[]>(() => [{ key: 'features', label: `위임 기능 (${d.value?.role ?? '-'}, 전체 교체)`, type: 'multicheck', options: delegableFor(d.value?.role), help: `${DELEGATION_HELP} · 목록에 없는 옛 위임은 체크를 풀어 해제만 가능` }])
const permissionSetFields = computed<FieldDef[]>(() => [{ key: 'setId', label: `권한 세트 (${d.value?.role ?? '-'})`, type: 'select', options: editSets.options.value, help: SET_HELP }])
const permissionSetInitial = computed(() => (d.value ? { setId: d.value.permissionSet?.assigned ? d.value.permissionSet.setId : '' } : null))
const delegationInitial = computed(() => (d.value ? { features: [...d.value.delegations] } : null))

const id = () => accountId.value!
const saveBasic = (body: EditAccountRequest) => accountManageApi.edit(id(), body)
const saveContacts = (body: EditContactsRequest) => accountManageApi.editContacts(id(), body)
const saveAlimtalk = (body: EditAlimtalkRequest) => accountManageApi.editAlimtalk(id(), body)
const saveRole = (body: ChangeRoleRequest) => accountManageApi.changeRole(id(), withScope(body))
const saveScope = (body: ChangeScopeRequest) => accountManageApi.changeScope(id(), withScope(body))
const saveDelegations = (body: ChangeDelegationsRequest) => accountManageApi.changeDelegations(id(), body)
const savePermissionSet = (body: ChangePermissionSetRequest) => accountManageApi.changePermissionSet(id(), body)
const historyLoad = (q: { page?: number; size?: number }) => accountManageApi.history(id(), q)

watch(accountId, () => {
  showHistory.value = false
  reloadDetail()
})
watch(
  creatable,
  (list) => {
    if (list.length && !list.includes(role.value)) role.value = list[0]
  },
  { immediate: true },
)
onMounted(() => {
  void orgs.run()
  void codes.run()
  if (hasFeature(me.value, 'iam:permission:read')) void catalog.run()
  reloadDetail()
})
</script>

<template>
  <div>
    <p>
      <RouterLink :to="screenPath(oit, 'OIT-02')">← 계정 목록 (OIT-02)</RouterLink>
      <label class="inline"><input v-model="showAll" type="checkbox" /> 권한 없는 역할 · 섹션도 보기 (403 확인용)</label>
    </p>
    <ResultBox :error="orgs.error.value" />
    <ResultBox :error="catalog.error.value" />

    <!-- 등록 -->
    <template v-if="!accountId">
      <h2>계정 등록</h2>
      <p v-if="!creatable.length" class="muted">만들 수 있는 역할이 없습니다(iam:account:create-* 없음).</p>
      <template v-else>
        <label>
          역할 *
          <select v-model="role">
            <option v-for="r in creatable" :key="r" :value="r">{{ roleName(r) ? `${roleName(r)} (${r})` : r }} — {{ CREATE_FEATURE[r] }}</option>
          </select>
        </label>
        <ResultBox :error="codes.error.value" />
        <ResultBox :error="createSets.call.error.value" />
        <ApiForm :key="role" :fields="createFields" :initial="createInitial" :submit="createSubmit" submit-label="등록">
          <template #buttons="{ values }">
            <ActionButton label="아이디 중복 확인" :run="() => accountApi.accountLoginIdCheck(String(values.loginId))" />
          </template>
        </ApiForm>
      </template>
    </template>

    <!-- 수정 -->
    <template v-else>
      <h2>계정 수정 <span v-if="d">— {{ d.name }} ({{ d.loginId }})</span></h2>
      <ResultBox :error="detail.error.value" />
      <template v-if="d">
        <KeyValueTable :data="d" :fields="summaryFields" />
        <p>
          <button type="button" @click="showHistory = !showHistory">이 계정 이력 보기 ›</button>
          <button type="button" @click="reloadDetail">상세 다시 읽기</button>
        </p>
        <section v-if="showHistory" class="box">
          <h3>이력 (ORG-34)</h3>
          <PagedList :key="d.accountId" :load="historyLoad" :columns="HISTORY_COLUMNS" />
        </section>

        <template v-if="can('iam:member:edit')">
          <ResultBox :error="codes.error.value" />
          <ApiForm title="기본 정보 — PUT /api/oit/accounts/{id}" :fields="editBasicFields" :initial="editBasicInitial" :submit="saveBasic" @success="reloadDetail" />

          <section class="box">
            <h3>연락처 — PUT …/contacts</h3>
            <p>대표 휴대폰(변경 불가): <b>{{ primaryPhone?.number ?? '-' }}</b> <span class="muted">phoneId {{ primaryPhone?.phoneId ?? '-' }}</span></p>
            <ApiForm :fields="contactFields" :initial="contactInitial" :submit="saveContacts" @success="reloadDetail" />
          </section>

          <ApiForm title="알림톡 — PUT …/alimtalk" :fields="alimtalkFields" :initial="d" :submit="saveAlimtalk" @success="reloadDetail" />
        </template>

        <template v-if="can('iam:account:role')">
          <p v-if="d.lastActiveSystemAdmin && !showAll" class="muted">역할 변경 — 마지막 활동 전산관리자는 변경 불가(서버도 409 IAM_LAST_SYSTEM_ADMIN).</p>
          <ApiForm v-else title="역할 — PUT …/role (지정 세트가 있었으면 새 역할 기본 세트로 되돌아감)" :fields="roleFields" :initial="scopeInitial" :submit="saveRole" @success="reloadDetail" />
        </template>

        <ApiForm
          v-if="can('iam:account:scope') && (d.role !== 'AGENT' || showAll)"
          title="관리 범위 — PUT …/scope (조직 관리자 · 전산관리자)"
          :fields="scopeFields"
          :initial="scopeInitial"
          :submit="saveScope"
          @success="reloadDetail"
        />

        <section v-if="can('iam:account:permission-set')" class="box">
          <ResultBox :error="editSets.call.error.value" />
          <ApiForm
            title="권한 세트 — PUT …/permission-set"
            :fields="permissionSetFields"
            :initial="permissionSetInitial"
            :submit="savePermissionSet"
            @success="reloadDetail"
          />
          <p class="muted">비우고 저장 = setId null(역할 기본 세트 따르기). 저장 후 그 계정의 /me features 가 바로 바뀜.</p>
        </section>

        <ApiForm
          v-if="can('iam:account:delegate')"
          title="위임 — PUT …/delegations (세 역할 모두)"
          :fields="delegationFields"
          :initial="delegationInitial"
          :submit="saveDelegations"
          @success="reloadDetail"
        />
      </template>
    </template>
  </div>
</template>
