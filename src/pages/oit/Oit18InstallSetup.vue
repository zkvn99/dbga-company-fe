<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { type InstallSetupDone, setupApi } from '@/api/setup'
import { oit } from '@/portals/oit'
import ApiForm from '@/shared/ui/ApiForm.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import type { FieldDef } from '@/shared/ui/fields'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 설치 셋업 (화면설계서 밖 — ADR-0028). 설치 직후(회사 없음) 회사 전산관리자 화면의 첫 화면: 센터 설치 코드 + 회사 + 첫 회사 전산관리자 →
 * [센터에 등록하고 셋업]. 성공하면 그 아이디로 로그인(임시 비밀번호 = 휴대폰 숫자) → OIT-15 비밀번호 변경. 실패하면 등록 대기로 남고 같은 버튼으로
 * 다시(서버가 같은 키를 다시 씀). 회사가 생긴 뒤에는 409.
 */
const status = useAsync(setupApi.status)
const done = ref<InstallSetupDone | null>(null)
const fields: FieldDef[] = [
  { key: 'code', label: '설치 코드', required: true, placeholder: 'XXXX-XXXX-XXXX-XXXX', help: '센터 담당자에게 받은 1회용 코드' },
  { key: 'companyName', label: '회사명', required: true, help: '셋업 후 변경 불가' },
  { key: 'bizRegNo', label: '사업자등록번호', required: true, placeholder: '123-45-67890' },
  { key: 'agencyRegNo', label: '대리점 등록번호', required: true, help: '영문 · 숫자 · 하이픈 30자 이하 — GA마다 유일(센터에 이미 있으면 거부)' },
  { key: 'adminLoginId', label: '회사 전산관리자 아이디', required: true },
  { key: 'adminName', label: '회사 전산관리자 이름', required: true },
  { key: 'adminPhone', label: '회사 전산관리자 휴대폰', type: 'tel', required: true, placeholder: '010-1234-5678', help: '임시 비밀번호 = 숫자만 · 로그인 인증번호도 이 번호' },
]

function onDone(result: InstallSetupDone): void {
  done.value = result
  void status.run()
}
onMounted(() => void status.run())
</script>

<template>
  <div>
    <ResultBox :error="status.error.value" />
    <p v-if="status.data.value">
      상태: <strong>{{ status.data.value.setupNeeded ? '셋업 필요' : '셋업 완료' }}</strong> · 센터 등록 {{ status.data.value.registration }}
      <span v-if="status.data.value.lastError" class="muted"> · 마지막 실패 {{ status.data.value.lastError }}</span>
    </p>
    <ApiForm v-if="status.data.value?.setupNeeded" :fields="fields" :submit="setupApi.setup" submit-label="센터에 등록하고 셋업" @success="onDone" />
    <p v-if="done">
      셋업 완료 — 아이디 <strong>{{ done.adminLoginId }}</strong>, 임시 비밀번호는 휴대폰 번호 숫자.
      <RouterLink :to="screenPath(oit, 'OIT-00')">로그인으로 →</RouterLink>
    </p>
    <p v-else-if="status.data.value && !status.data.value.setupNeeded">
      <RouterLink :to="screenPath(oit, 'OIT-00')">로그인으로 →</RouterLink>
    </p>
  </div>
</template>
