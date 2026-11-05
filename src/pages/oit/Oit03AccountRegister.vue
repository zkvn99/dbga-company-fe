<script setup lang="ts">
import { accountApi, type AccountMe } from '@/api/account'
import { ALIMTALK, GENDER, PHONES, accountInitial } from '@/forms/accountFields'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import { type FieldDef, opts } from '@/shared/ui/fields'
import { session } from '@/shared/portal/session'

/** OIT-03 계정 등록 (iam:account:register) — 조직 관리자 · 설계사 · 조직 전산관리자. 수정은 API 대기. */
const fields: FieldDef[] = [
  { key: 'role', label: '역할', type: 'select', options: opts(['AGENT', 'ORG_MANAGER', 'ORG_SYSTEM_ADMIN']), required: true },
  { key: 'loginId', label: '아이디', required: true },
  { key: 'name', label: '이름', required: true },
  { key: 'email', label: '이메일', type: 'email' },
  { key: 'employeeNo', label: '사번' },
  { key: 'birthDate', label: '생년월일', type: 'date' },
  { key: 'hireDate', label: '입사일', type: 'date' },
  GENDER,
  { key: 'orgId', label: '소속 조직 ID', required: true },
  { key: 'rankCode', label: '직급 코드' },
  { key: 'positionCode', label: '직책 코드' },
  PHONES,
  ALIMTALK,
  { key: 'scopeType', label: '관리 범위', type: 'select', options: opts(['COMPANY', 'ORG']), help: '조직 관리자 · 전산관리자 필수' },
  { key: 'scopeOrgIds', label: '관리 조직 ID', type: 'csv', help: 'scopeType=ORG 일 때' },
  {
    key: 'delegations',
    label: '위임 기능 (조직 관리자만)',
    type: 'multicheck',
    options: opts(['org:agent:register', 'iam:member:process', 'iam:account:suspend', 'alloc:lead:reassign', 'alloc:lead:reclaim', 'audit:history:download']),
  },
]
const initial = { role: 'AGENT', ...accountInitial(session.me as AccountMe | null) }
</script>

<template>
  <ApiForm :fields="fields" :initial="initial" :submit="accountApi.registerAccount" submit-label="등록">
    <template #buttons="{ values }">
      <ActionButton label="아이디 중복 확인" :run="() => accountApi.accountLoginIdCheck(String(values.loginId))" />
    </template>
  </ApiForm>
</template>
