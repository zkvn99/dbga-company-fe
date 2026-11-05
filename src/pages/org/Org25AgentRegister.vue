<script setup lang="ts">
import { accountApi, type AccountMe } from '@/api/account'
import { ALIMTALK, GENDER, PHONES, accountInitial } from '@/forms/accountFields'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import type { FieldDef } from '@/shared/ui/fields'
import { session } from '@/shared/portal/session'

/** ORG-25 설계사 등록 (기능 org:agent:register — 위임으로만). 임시 비밀번호 = 대표 휴대폰 숫자. */
const fields: FieldDef[] = [
  { key: 'loginId', label: '아이디 (= 사번)', required: true },
  { key: 'name', label: '이름', required: true },
  { key: 'email', label: '이메일', type: 'email', required: true },
  { key: 'birthDate', label: '생년월일', type: 'date' },
  { key: 'hireDate', label: '입사일', type: 'date', required: true },
  GENDER,
  { key: 'orgId', label: '소속 조직 ID', required: true, help: '기본값 = 내 조직. 관리 범위 밖이면 403' },
  { key: 'rankCode', label: '직급 코드', required: true },
  { key: 'positionCode', label: '직책 코드' },
  PHONES,
  ALIMTALK,
]
const initial = accountInitial(session.me as AccountMe | null)
</script>

<template>
  <ApiForm :fields="fields" :initial="initial" :submit="accountApi.registerAgent" submit-label="등록">
    <template #buttons="{ values }">
      <ActionButton label="아이디 중복 확인" :run="() => accountApi.agentLoginIdCheck(String(values.loginId))" />
    </template>
  </ApiForm>
</template>
