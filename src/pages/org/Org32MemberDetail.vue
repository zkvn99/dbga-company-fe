<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { codeApi } from '@/api/code'
import { type MemberDetail, type MemberPhone, orgMemberApi } from '@/api/orgMember'
import { HISTORY_COLUMNS } from '@/forms/accountFields'
import { org } from '@/portals/org'
import DataTable from '@/shared/ui/DataTable.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { cols } from '@/shared/ui/table'
import { screenPath } from '@/shared/portal/types'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * ORG-32 조직원 상세(조회만) — 탭은 정의 목록(TABS)으로 그린다(설계서: 자격 · 위촉 · 첨부 같은 탭을 화면 틀 수정 없이 추가).
 * 기본 정보(계정 · 상태 포함) · 연락처 · 알림톡 · 이력(ORG-34와 같은 원본). 보유 DB 요약은 DB 배정 작업 때. 수정은 FP-21 · OIT-03.
 */
const props = defineProps<{ accountId: string }>()
const detail = useAsync(orgMemberApi.member)
const codes = useAsync(() => codeApi.options('org', ['RANK', 'POSITION']))
const m = computed(() => detail.data.value ?? null)
const codeName = (group: 'RANK' | 'POSITION', code: string | null) =>
  code ? (codes.data.value?.[group]?.find((c) => c.code === code)?.name ?? code) : null

const TABS = [
  { key: 'info', label: '기본 정보' },
  { key: 'contacts', label: '연락처 · 알림톡' },
  { key: 'history', label: '이력' },
] as const
const tab = ref<(typeof TABS)[number]['key']>('info')

const infoRows = (v: MemberDetail) => ({
  아이디: v.loginId,
  사번: v.employeeNo,
  이름: v.name,
  이메일: v.email,
  생년월일: v.birthDate,
  성별: v.gender,
  입사일: v.hireDate,
  소속: v.org?.orgName,
  직급: codeName('RANK', v.rankCode),
  직책: codeName('POSITION', v.positionCode),
  대표휴대폰: v.phones.find((p) => p.primary)?.number ?? null,
})
const accountRows = (v: MemberDetail) => ({
  계정상태: v.status,
  잠금: v.locked,
  최근로그인: v.lastLoginAt,
  비밀번호변경일: v.passwordChangedAt,
})
const phoneColumns = cols<MemberPhone>(['kind:구분', 'number:번호', 'memo:메모', 'primary:대표'])
const historyLoad = (q: { page?: number; size?: number }) => orgMemberApi.history(props.accountId, q)

onMounted(async () => {
  void codes.run()
  await detail.run(props.accountId)
})
</script>

<template>
  <div>
    <p><RouterLink :to="screenPath(org, 'ORG-24')">← 조직원 목록 (ORG-24)</RouterLink></p>
    <ResultBox :error="detail.error.value" />
    <template v-if="m">
      <h3>{{ m.name }} <code class="muted">{{ m.status }}</code> · {{ m.roleName ?? m.role }} · {{ m.employeeNo ?? '-' }} · {{ m.org?.orgName }} · {{ codeName('RANK', m.rankCode) ?? '-' }}</h3>
      <p class="muted">조직 관리자는 조회만 — 정보 · 연락처 · 알림 설정 변경은 설계사 본인(FP-21) · 조직 전산관리자(OIT-03). 회원 처리는 ORG-24.</p>
      <div class="cards">
        <button v-for="t in TABS" :key="t.key" type="button" :class="{ on: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
      </div>

      <section v-if="tab === 'info'">
        <h4>기본 정보</h4>
        <KeyValueTable :data="infoRows(m)" />
        <h4>계정 · 상태</h4>
        <KeyValueTable :data="accountRows(m)" />
        <p class="muted">보유 DB 요약은 DB 배정(alloc) 작업 때.</p>
      </section>

      <section v-else-if="tab === 'contacts'">
        <h4>연락처</h4>
        <DataTable :rows="m.phones" :columns="phoneColumns" />
        <h4>알림톡으로 받을 알림 (대표 휴대폰)</h4>
        <KeyValueTable :data="m.alimtalk" />
      </section>

      <section v-else>
        <PagedList :key="m.accountId" :load="historyLoad" :columns="HISTORY_COLUMNS" />
      </section>
    </template>
  </div>
</template>
