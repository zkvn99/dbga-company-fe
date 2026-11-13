<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { AccountPortal } from '@/api/account'
import type { EditAlimtalkRequest, EditContactsRequest } from '@/api/accountManage'
import { codeApi } from '@/api/code'
import { type ChangePhoneRequest, type EditMyInfoRequest, type OtpSendResponse, type SendPhoneOtpRequest, meApi } from '@/api/me'
import { ALIMTALK } from '@/forms/accountFields'
import { reloadMe } from '@/shared/portal/session'
import { screenPath } from '@/shared/portal/types'
import { usePortal } from '@/shared/portal/usePortal'
import ApiForm from '@/shared/ui/ApiForm.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { type FieldDef, opts } from '@/shared/ui/fields'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 내 정보 수정(FP-21 · ORG-30 · OIT-X-ME-EDIT) — 세 Portal 화면이 같이 쓴다. 섹션마다 각자 [저장](각자 API, 결과 changed).
 * - 기본: 이름 · 이메일(가린 값이 내려오므로 새 값 입력 시만 변경, 비우면 그대로).
 * - 연락처: OIT-03 과 같은 규칙 — 추가 번호 전체 교체, phoneId + 빈 번호 = 번호 그대로, 대표 행은 무시.
 * - 알림톡 · 대표 휴대폰 변경(새 번호로 인증번호 → 번호 + 인증번호로 변경 → 새 쿠키, 내 정보 다시 읽기).
 * - 직급 · 직책 · 소속 · 역할 · 범위 · 권한은 조회만(OIT-03). 비밀번호는 passwordScreen 링크.
 * 입력 차단 검증 없음 — 서버 fieldErrors 를 그대로 본다.
 */
const props = defineProps<{ portal: AccountPortal; viewScreen: string; passwordScreen: string }>()
const { portal: portalDef } = usePortal()

const profile = useAsync(() => meApi.profile(props.portal))
const codes = useAsync(() => codeApi.options(props.portal, ['RANK', 'POSITION']))
const a = computed(() => profile.data.value?.account ?? null)
const codeName = (group: 'RANK' | 'POSITION', code: string | null) =>
  code ? (codes.data.value?.[group]?.find((c) => c.code === code)?.name ?? code) : null

function reload(): void {
  void profile.run()
}
async function reloadAll(): Promise<void> {
  await profile.run()
  await reloadMe(portalDef.value)
}

const fixedRows = computed(() => {
  const v = a.value
  if (!v) return null
  return {
    '아이디 (변경 불가)': v.loginId,
    소속: v.org?.orgName,
    직급: codeName('RANK', v.rankCode),
    직책: codeName('POSITION', v.positionCode),
    역할: v.roleName ? `${v.roleName} (${v.role})` : v.role,
    '관리 조직': v.scope?.scopeType === 'COMPANY' ? '회사 전체 (COMPANY)' : (v.scope?.orgs?.map((o) => o.orgName) ?? null),
    '권한 세트': v.permissionSet ? `${v.permissionSet.name}${v.permissionSet.assigned ? ' (지정)' : ' (기본 따름)'}` : null,
    '위임 기능': v.delegations,
  }
})

// ── 기본 ──
const basicFields = computed<FieldDef[]>(() => [
  { key: 'name', label: '이름', required: true },
  { key: 'email', label: '이메일 — 새 값 입력 시 변경', type: 'email', placeholder: a.value?.email ?? '', help: `현재 ${a.value?.email ?? '-'} · 비우면 그대로` },
])
const basicInitial = computed(() => (a.value ? { name: a.value.name, email: '' } : null))
const saveBasic = (body: EditMyInfoRequest) => meApi.editInfo(props.portal, body)

// ── 연락처 ──
const primaryPhone = computed(() => a.value?.phones.find((p) => p.primary) ?? null)
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
  a.value
    ? { phones: a.value.phones.filter((p) => !p.primary).map((p) => ({ phoneId: p.phoneId, current: p.number, kind: p.kind, number: '', memo: p.memo })) }
    : null,
)
/** 추가 번호만 보내므로 primary=false 를 붙인다. */
const saveContacts = (body: EditContactsRequest) =>
  meApi.editContacts(props.portal, { phones: (body.phones ?? []).map((p) => ({ ...p, primary: false })) })

// ── 알림톡 ──
const alimtalkFields: FieldDef[] = [ALIMTALK]
const saveAlimtalk = (body: EditAlimtalkRequest) => meApi.editAlimtalk(props.portal, body)

// ── 대표 휴대폰 변경 ──
const otpFields: FieldDef[] = [{ key: 'phone', label: '새 대표 휴대폰', type: 'tel', required: true, help: '인증번호는 새 번호로 발송' }]
const changeFields: FieldDef[] = [
  { key: 'phone', label: '새 대표 휴대폰', type: 'tel', required: true, help: '인증번호를 받은 번호' },
  { key: 'code', label: '인증번호', required: true },
]
const sent = ref<OtpSendResponse | null>(null)
const sentPhone = ref<{ phone: string } | null>(null)
const elapsed = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const codeLeft = computed(() => (sent.value ? Math.max(0, sent.value.codeExpiresIn - elapsed.value) : 0))
const resendLeft = computed(() => (sent.value ? Math.max(0, sent.value.resendAvailableIn - elapsed.value) : 0))

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = null
}
const sendOtp = (body: SendPhoneOtpRequest) => {
  sentPhone.value = { phone: body.phone }
  return meApi.sendPhoneOtp(props.portal, body)
}
function onOtpSent(result: OtpSendResponse): void {
  sent.value = result
  elapsed.value = 0
  stopTimer()
  timer = setInterval(() => {
    elapsed.value += 1
    if (codeLeft.value <= 0 && resendLeft.value <= 0) stopTimer()
  }, 1000)
}
const changePhone = (body: ChangePhoneRequest) => meApi.changePhone(props.portal, body)
/** 새 쿠키가 왔다(다른 세션은 로그아웃) — 비밀번호 변경 화면처럼 /me 와 내 정보를 다시 읽는다. */
async function onPhoneChanged(): Promise<void> {
  stopTimer()
  sent.value = null
  sentPhone.value = null
  await reloadAll()
}

onMounted(() => {
  void codes.run()
  reload()
})
onUnmounted(stopTimer)
</script>

<template>
  <div>
    <p>
      <RouterLink :to="screenPath(portalDef, viewScreen)">← 내 정보 ({{ viewScreen }})</RouterLink>
      <RouterLink :to="screenPath(portalDef, passwordScreen)" style="margin-left: 8px">비밀번호 변경 ({{ passwordScreen }}) ›</RouterLink>
      <button type="button" style="margin-left: 8px" @click="reload">다시 읽기</button>
    </p>
    <ResultBox :error="profile.error.value" />
    <template v-if="a">
      <section class="box">
        <h3>본인이 바꿀 수 없는 항목 (조회만 — OIT-03)</h3>
        <KeyValueTable :data="fixedRows" />
        <ResultBox :error="codes.error.value" />
      </section>

      <ApiForm title="기본 정보 — PUT …/me" :fields="basicFields" :initial="basicInitial" :submit="saveBasic" @success="reloadAll" />

      <section class="box">
        <h3>연락처 — PUT …/me/contacts</h3>
        <p>대표 휴대폰(여기서 변경 불가 — 아래 인증 후 변경): <b>{{ primaryPhone?.number ?? '-' }}</b> <span class="muted">phoneId {{ primaryPhone?.phoneId ?? '-' }}</span></p>
        <ApiForm :fields="contactFields" :initial="contactInitial" :submit="saveContacts" @success="reload" />
      </section>

      <ApiForm title="알림톡 — PUT …/me/alimtalk" :fields="alimtalkFields" :initial="a" :submit="saveAlimtalk" @success="reload" />

      <section class="box">
        <h3>대표 휴대폰 변경 — POST …/me/phone/otp → PUT …/me/phone</h3>
        <p class="muted">현재 {{ primaryPhone?.number ?? '-' }}. 성공하면 새 인증 쿠키(지금 세션 유지 · 다른 세션은 로그아웃).</p>
        <ApiForm title="1. 인증번호 받기" :fields="otpFields" :submit="sendOtp" submit-label="인증번호 받기" @success="onOtpSent" />
        <p v-if="sent">
          발송: <b>{{ sent.maskedPhone }}</b> · 인증번호 유효 {{ codeLeft }}초 · 재발송 {{ resendLeft > 0 ? `${resendLeft}초 후` : '가능' }}
        </p>
        <ApiForm title="2. 변경" :fields="changeFields" :initial="sentPhone" :submit="changePhone" submit-label="변경" @success="onPhoneChanged" />
      </section>
    </template>
  </div>
</template>
