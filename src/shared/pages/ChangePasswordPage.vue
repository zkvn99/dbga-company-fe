<script setup lang="ts">
import { useRouter } from 'vue-router'
import { clearMe } from '../portal/session'
import { screenPath } from '../portal/types'
import { usePortal } from '../portal/usePortal'
import ApiForm from '../ui/ApiForm.vue'
import type { FieldDef } from '../ui/fields'

/** 비밀번호 변경(PUT …/me/password). 성공하면 token_version 이 올라 새 쿠키가 온다 → 내 정보를 다시 읽고 홈으로. */
const { portal } = usePortal()
const router = useRouter()

const fields: FieldDef[] = [
  { key: 'currentPassword', label: '현재 비밀번호', type: 'password', required: true },
  { key: 'newPassword', label: '새 비밀번호', type: 'password', required: true, help: '8~64자 · 공백 없음 · 영문/숫자/특수문자 중 2종 이상 · 아이디/휴대폰/현재 비밀번호와 다름' },
]

async function onChanged(): Promise<void> {
  clearMe()
  await router.push(screenPath(portal.value, portal.value.home))
}
</script>

<template>
  <ApiForm :fields="fields" :submit="portal.changePassword!" submit-label="변경" @success="onChanged" />
</template>
