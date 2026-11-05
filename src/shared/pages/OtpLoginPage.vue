<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { LoginChallenge, OtpSent, TokenExpiry } from '../auth/otpAuthApi'
import { clearMe } from '../portal/session'
import { screenPath } from '../portal/types'
import { usePortal } from '../portal/usePortal'
import ActionButton from '../ui/ActionButton.vue'
import ApiForm from '../ui/ApiForm.vue'
import type { FieldDef } from '../ui/fields'

/** XXX-00 로그인 → XXX-00-1 휴대폰 인증 (모든 Portal 공통). Portal 의 auth API 를 쓴다. */
const { portal, route } = usePortal()
const router = useRouter()
const auth = portal.value.auth!

const challenge = ref<LoginChallenge | null>(null)
const sent = ref<OtpSent | null>(null)
const isDev = import.meta.env.DEV

const passwordFields: FieldDef[] = [
  { key: 'loginId', label: '아이디', required: true },
  { key: 'password', label: '비밀번호', type: 'password', required: true },
]
const codeFields: FieldDef[] = [{ key: 'code', label: '인증번호 (6자리)', required: true }]

function verify(body: { code: string }): Promise<TokenExpiry> {
  return auth.verifyOtp({ challengeToken: challenge.value!.challengeToken, code: body.code })
}

async function onLoggedIn(result: TokenExpiry): Promise<void> {
  clearMe()
  const p = portal.value
  if (result.setupRequired && p.setupScreen) return void router.replace(screenPath(p, p.setupScreen))
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : screenPath(p, p.home)
  await router.replace(redirect)
}

function restart(): void {
  challenge.value = null
  sent.value = null
}
</script>

<template>
  <div>
    <ApiForm v-if="!challenge" title="1단계: 아이디 · 비밀번호" :fields="passwordFields" :submit="auth.login" submit-label="로그인" @success="(r) => (challenge = r)" />

    <div v-else class="box">
      <h3>2단계: 휴대폰 인증</h3>
      <p>휴대폰 {{ challenge.maskedPhone }} · 인증 세션 {{ challenge.expiresIn }}초</p>
      <ActionButton label="인증번호 받기 / 재전송" :run="() => auth.sendOtp(challenge!.challengeToken)" @done="(r) => (sent = r)" />
      <p v-if="sent" class="muted">인증번호 유효 {{ sent.codeExpiresIn }}초 · 재전송 가능까지 {{ sent.resendAvailableIn }}초</p>
      <p v-if="isDev && portal.otpRedisKeyPrefix" class="muted">
        로컬 테스트 채널 인증번호: <code>docker exec dbga-redis redis-cli HGET {{ portal.otpRedisKeyPrefix }}{{ challenge.challengeToken }} code</code>
      </p>
      <ApiForm :fields="codeFields" :submit="verify" submit-label="확인" @success="onLoggedIn" />
      <button type="button" @click="restart">처음부터</button>
    </div>
  </div>
</template>
