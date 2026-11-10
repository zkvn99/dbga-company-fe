<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ACCOUNT_ROLES, type AccountMe, type AccountRole, CREATE_FEATURE, type RegisterAccountRequest, accountApi } from '@/api/account'
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
import { ALIMTALK, DELEGABLE_FALLBACK, GENDER, HISTORY_COLUMNS, PHONES, SCOPE_TYPE, accountInitial, codeOptions, hasFeature, orgOptions } from '@/forms/accountFields'
import { oit } from '@/portals/oit'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { type FieldDef, type FormValues, type Option, opts } from '@/shared/ui/fields'
import { session } from '@/shared/portal/session'
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

const me = computed(() => session.me as AccountMe | null)
const showAll = ref(true) // frontend.md 5장: features로 숨기지 않는 게 기본(403 확인). 끄면 /me features대로 미리보기
const can = (feature: string) => showAll.value || hasFeature(me.value, feature)

// 공통 선택지 — 조직 · 위임 기능
const orgs = useAsync(orgApi.oitOrgs)
const orgOpts = computed(() => orgOptions(orgs.data.value))
const catalog = useAsync(accountManageApi.permissions)
const roleName = (r: AccountRole) => catalog.data.value?.roles.find((x) => x.role === r)?.roleName ?? null
const delegable = computed<Option[]>(() => catalog.data.value?.delegable.map((d) => ({ value: d.code, label: `${d.label} (${d.code})` })) ?? DELEGABLE_FALLBACK)

/** 조직별 직급 · 직책 선택지(조직 바뀔 때마다 다시 읽음). */
function useOrgCodes() {
  const call = useAsync(codeApi.options)
  let last: string | null = null
  function load(orgId: unknown): void {
    const id = typeof orgId === 'string' && orgId ? orgId : null
    if (id === last && call.data.value) return
    last = id
    void call.run('oit', ['RANK', 'POSITION'], id)
  }
  const rank = computed(() => codeOptions((call.data.value as Record<string, CodeOption[]> | undefined)?.RANK))
  const position = computed(() => codeOptions((call.data.value as Record<string, CodeOption[]> | undefined)?.POSITION))
  return { call, load, rank, position }
}

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
    { key: 'rankCode', label: '직급 (조직 코드)', type: 'select', options: rank },
    { key: 'positionCode', label: '직책 (조직 코드)', type: 'select', options: position },
  ]
}

// ── 등록 ────────────────────────────────────────────
const creatable = computed(() => ACCOUNT_ROLES.filter((r) => can(CREATE_FEATURE[r])))
const role = ref<AccountRole>('AGENT')
const createForm = ref<{ values: FormValues } | null>(null)
const createCodes = useOrgCodes()
const createSets = useRoleSets()
watch(role, (r) => createSets.load(r), { immediate: true })
watch(
  () => createForm.value?.values.orgId,
  (orgId) => createCodes.load(orgId),
)

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
    ...basicFields(createCodes.rank.value, createCodes.position.value),
    PHONES,
    ALIMTALK,
  ]
  if (r !== 'AGENT') {
    fields.push({ ...SCOPE_TYPE, required: true }, { key: 'scopeOrgIds', label: '관리 조직', type: 'multicheck', options: orgOpts.value, help: 'scopeType=ORG 일 때' })
  }
  if (r === 'ORG_MANAGER') fields.push({ key: 'delegations', label: '위임 기능', type: 'multicheck', options: delegable.value })
  fields.push({ key: 'permissionSetId', label: `권한 세트 (${r})`, type: 'select', options: createSets.options.value, help: SET_HELP })
  return fields
})
const createInitial = computed(() => ({ ...accountInitial(me.value), scopeType: role.value === 'AGENT' ? '' : 'COMPANY' }))
const CREATE: Record<AccountRole, (body: RegisterAccountRequest) => Promise<unknown>> = {
  ORG_SYSTEM_ADMIN: accountApi.createSystemAdmin,
  ORG_MANAGER: accountApi.createManager,
  AGENT: accountApi.createAgent,
}
const createSubmit = (body: RegisterAccountRequest) => CREATE[role.value](body)

// ── 수정 ────────────────────────────────────────────
const detail = useAsync(accountManageApi.account)
const d = computed(() => detail.data.value ?? null)
const showHistory = ref(false)
function reloadDetail(): void {
  if (accountId.value) void detail.run(accountId.value)
}

const editForm = ref<{ values: FormValues } | null>(null)
const editCodes = useOrgCodes()
const editSets = useRoleSets()
watch(
  () => d.value?.role,
  (r) => editSets.load(r),
)
watch(
  () => editForm.value?.values.orgId,
  (orgId) => editCodes.load(orgId),
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
  ...basicFields(editCodes.rank.value, editCodes.position.value),
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
  { ...SCOPE_TYPE, help: '조직 관리자 · 전산관리자면 필수, 설계사면 비움' },
  { key: 'scopeOrgIds', label: '관리 조직', type: 'multicheck', options: orgOpts.value },
])
const scopeFields = computed<FieldDef[]>(() => [
  { ...SCOPE_TYPE, required: true },
  { key: 'scopeOrgIds', label: '관리 조직', type: 'multicheck', options: orgOpts.value, help: 'scopeType=ORG 일 때' },
])
const scopeInitial = computed(() => (d.value ? { role: d.value.role, scopeType: d.value.scope?.scopeType, scopeOrgIds: d.value.scope?.orgs.map((o) => o.orgId) ?? [] } : null))
const delegationFields = computed<FieldDef[]>(() => [{ key: 'features', label: '위임 기능 (전체 교체)', type: 'multicheck', options: delegable.value }])
const permissionSetFields = computed<FieldDef[]>(() => [{ key: 'setId', label: `권한 세트 (${d.value?.role ?? '-'})`, type: 'select', options: editSets.options.value, help: SET_HELP }])
const permissionSetInitial = computed(() => (d.value ? { setId: d.value.permissionSet?.assigned ? d.value.permissionSet.setId : '' } : null))
const delegationInitial = computed(() => (d.value ? { features: [...d.value.delegations] } : null))

const id = () => accountId.value!
const saveBasic = (body: EditAccountRequest) => accountManageApi.edit(id(), body)
const saveContacts = (body: EditContactsRequest) => accountManageApi.editContacts(id(), body)
const saveAlimtalk = (body: EditAlimtalkRequest) => accountManageApi.editAlimtalk(id(), body)
const saveRole = (body: ChangeRoleRequest) => accountManageApi.changeRole(id(), body)
const saveScope = (body: ChangeScopeRequest) => accountManageApi.changeScope(id(), body)
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
        <ResultBox :error="createCodes.call.error.value" />
        <ResultBox :error="createSets.call.error.value" />
        <ApiForm ref="createForm" :key="role" :fields="createFields" :initial="createInitial" :submit="createSubmit" submit-label="등록">
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
          <ResultBox :error="editCodes.call.error.value" />
          <ApiForm ref="editForm" title="기본 정보 — PUT /api/oit/accounts/{id}" :fields="editBasicFields" :initial="editBasicInitial" :submit="saveBasic" @success="reloadDetail" />

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
          v-if="can('iam:account:delegate') && (d.role === 'ORG_MANAGER' || showAll)"
          title="위임 — PUT …/delegations (조직 관리자만)"
          :fields="delegationFields"
          :initial="delegationInitial"
          :submit="saveDelegations"
          @success="reloadDetail"
        />
      </template>
    </template>
  </div>
</template>
