<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { AccountPortal } from '@/api/account'
import type { AccountDetail, AccountDetailPhone } from '@/api/accountManage'
import { codeApi } from '@/api/code'
import { meApi } from '@/api/me'
import { reloadMe, session } from '@/shared/portal/session'
import { screenPath } from '@/shared/portal/types'
import { usePortal } from '@/shared/portal/usePortal'
import DataTable from '@/shared/ui/DataTable.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { cols } from '@/shared/ui/table'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 내 정보 조회(FP-20 · ORG-29 · OIT-ME) — 세 Portal 화면이 같이 쓴다(화면끼리 import 금지라 forms 에 둠).
 * GET …/me/profile. 직급 · 직책 · 소속 · 권한은 조회만(변경은 OIT-03). 최근 로그인은 account.lastLoginAt 하나만(기기 · 목록 없음).
 * admin = 관리 조직(scope) · 권한 세트 · 위임 표시(ORG-29 · OIT).
 * 셋업(임시 비밀번호) 계정은 profile 이 403 이라 등록표에서 이 화면을 setup 화면으로 두지 않는다(가드가 셋업 화면으로 보냄).
 */
const props = withDefaults(defineProps<{ portal: AccountPortal; editScreen: string; admin?: boolean }>(), { admin: false })
const { portal: portalDef } = usePortal()

const profile = useAsync(() => meApi.profile(props.portal))
const codes = useAsync(() => codeApi.options(props.portal, ['RANK', 'POSITION']))
const a = computed<AccountDetail | null>(() => profile.data.value?.account ?? null)
const codeName = (group: 'RANK' | 'POSITION', code: string | null) =>
  code ? (codes.data.value?.[group]?.find((c) => c.code === code)?.name ?? code) : null

const infoRows = computed(() => {
  const v = a.value
  if (!v) return null
  return {
    아이디: v.loginId,
    이름: v.name,
    소속: v.org?.orgName,
    직급: codeName('RANK', v.rankCode),
    직책: codeName('POSITION', v.positionCode),
    '이메일 (가림)': v.email,
    역할: v.roleName ? `${v.roleName} (${v.role})` : v.role,
    '비밀번호 최근 변경일': profile.data.value?.passwordChangedAt ?? null,
    '최근 로그인 일시': v.lastLoginAt,
  }
})
const adminRows = computed(() => {
  const v = a.value
  if (!v) return null
  const scope = v.scope?.scopeType === 'COMPANY' ? '회사 전체 (COMPANY)' : v.scope?.orgs?.length ? v.scope.orgs.map((o) => o.orgName) : null
  const set = v.permissionSet
  return {
    '관리 조직': scope,
    '권한 세트': set ? `${set.name}${set.isDefault ? ' [기본]' : ''} — ${set.assigned ? '지정' : '역할 기본 세트 따름'}` : null,
    '위임 기능': v.delegations,
  }
})
const phoneColumns = cols<AccountDetailPhone>(['kind:구분', 'number:번호 (가림)', 'memo:메모', 'primary:대표'])
const showMe = ref(false)

/** 세션(/me)은 라우터 가드가 이미 읽어 둔다 — 여기서 다시 읽지 않는다(같은 요청 두 번 방지). [다시 읽기]만 세션도 갱신. */
async function load(): Promise<void> {
  void codes.run()
  await profile.run()
}
async function reload(): Promise<void> {
  await load()
  await reloadMe(portalDef.value)
}

onMounted(load)
</script>

<template>
  <div>
    <p>
      <button type="button" @click="reload">다시 읽기</button>
      <RouterLink :to="screenPath(portalDef, editScreen)" style="margin-left: 8px">내 정보 수정 ({{ editScreen }}) ›</RouterLink>
    </p>
    <ResultBox :error="profile.error.value" />
    <template v-if="a">
      <h4>기본 정보</h4>
      <KeyValueTable :data="infoRows" />
      <ResultBox :error="codes.error.value" />
      <p class="muted">직급 · 직책 · 소속 · 역할은 본인이 바꿀 수 없음(조직 전산관리자 OIT-03). 코드 이름을 못 읽으면 코드 그대로.</p>

      <template v-if="admin">
        <h4>관리 범위 · 권한 (조회만)</h4>
        <KeyValueTable :data="adminRows" />
      </template>

      <h4>연락처</h4>
      <DataTable :rows="a.phones" :columns="phoneColumns" />
      <h4>알림톡으로 받을 알림 (대표 휴대폰)</h4>
      <KeyValueTable :data="a.alimtalk" />
    </template>

    <p>
      <button type="button" @click="showMe = !showMe">로그인 세션 원본 (GET …/me — features · setupRequired) {{ showMe ? '접기' : '보기' }}</button>
    </p>
    <KeyValueTable v-if="showMe" :data="session.me" />
  </div>
</template>
