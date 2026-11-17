<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CONTRACT_DIRECTIONS,
  type ContractAction,
  type ContractHistoryResponse,
  type ContractPortal,
  type ContractResponse,
  type ContractSearchQuery,
  contractApi,
} from '@/api/contract'
import { screenPath } from '@/shared/portal/types'
import { usePortal } from '@/shared/portal/usePortal'
import ActionButton from '@/shared/ui/ActionButton.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import PagedList from '@/shared/ui/PagedList.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { type FieldDef, opts } from '@/shared/ui/fields'
import type { Column } from '@/shared/ui/table'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 공급업체 계약 목록(OIT-16 · ORG 위임 화면) — 두 Portal 화면이 같이 쓴다(화면끼리 import 금지라 forms 에 둠).
 * 보기 카드 · 신청 구분 · 검색, 업체마다 최근 차수 한 줄. 행 버튼은 서버가 준 actions 그대로: 취소 · 동의 · 거절(사유) · 해지 신청 취소 ·
 * 해지 동의 · 해지 거절(사유)은 여기서, [해지 신청] · [새 계약 신청]은 신청 · 해지 화면(formScreen). 행 → 상세 + 이력.
 * 처리는 센터로 가므로 센터가 꺼져 있으면 503 HUB_CENTER_UNAVAILABLE, 센터 거절은 그 코드 그대로(CONTRACT_*).
 */
const props = defineProps<{ portal: ContractPortal; formScreen: string }>()
const { portal: portalDef } = usePortal()
const router = useRouter()
const list = ref<{ reload: () => Promise<void> } | null>(null)
const awaiting = useAsync(() => contractApi.awaitingCount(props.portal))
const detail = useAsync((id: string) => contractApi.contract(props.portal, id))
const history = useAsync((id: string) => contractApi.history(props.portal, id))
const load = (query: ContractSearchQuery) => contractApi.contracts(props.portal, query)

const filters: FieldDef[] = [
  { key: 'direction', label: '신청 구분', type: 'select', options: opts(CONTRACT_DIRECTIONS) },
  { key: 'keyword', label: '검색어', placeholder: '업체명 · 사업자등록번호' },
]

const columns: Column<ContractResponse>[] = [
  { key: 'contractNo', label: '계약번호' },
  { key: 'partnerName', label: '공급업체' },
  { key: 'partnerBizRegNo', label: '사업자등록번호' },
  { key: 'seq', label: '차수' },
  { key: 'status', label: '상태', value: (r) => (r.terminationScheduled ? `${r.status} (해지 예정)` : r.status) },
  { key: 'direction', label: '구분' },
  { key: 'requestedByName', label: '신청자' },
  { key: 'requestedAt', label: '신청일' },
  { key: 'startDate', label: '시작일' },
  { key: 'endDate', label: '종료일' },
  { key: 'awaitingMe', label: '내 처리 대기' },
]

const historyColumns: Column<ContractHistoryResponse>[] = [
  { key: 'at', label: '일시' },
  { key: 'kind', label: '처리' },
  { key: 'fromStatus', label: '이전' },
  { key: 'toStatus', label: '이후' },
  { key: 'actorType', label: '처리 쪽' },
  { key: 'actorName', label: '처리자' },
  { key: 'reason', label: '사유' },
]

const LABEL: Record<ContractAction, string> = {
  REQUEST: '새 계약 신청',
  CANCEL: '신청 취소',
  ACCEPT: '동의',
  REJECT: '거절',
  TERMINATE: '해지 신청',
  TERMINATE_CANCEL: '해지 신청 취소',
  TERMINATE_ACCEPT: '해지 동의',
  TERMINATE_REJECT: '해지 거절',
}

/** 여기서 바로 부르는 처리(사유가 필요한 것은 입력창). */
const inline: Partial<Record<ContractAction, { run: (id: string, reason?: string) => Promise<unknown>; reason?: 'required' }>> = {
  CANCEL: { run: (id) => contractApi.cancel(props.portal, id) },
  ACCEPT: { run: (id) => contractApi.accept(props.portal, id) },
  REJECT: { run: (id, reason) => contractApi.reject(props.portal, id, { reason: reason as string }), reason: 'required' },
  TERMINATE_CANCEL: { run: (id) => contractApi.cancelTermination(props.portal, id) },
  TERMINATE_ACCEPT: { run: (id) => contractApi.acceptTermination(props.portal, id) },
  TERMINATE_REJECT: {
    run: (id, reason) => contractApi.rejectTermination(props.portal, id, { reason: reason as string }),
    reason: 'required',
  },
}

function open(row: ContractResponse): void {
  void detail.run(row.contractId)
  void history.run(row.contractId)
}

function reload(contractId: string): void {
  void list.value?.reload()
  void awaiting.run()
  if (detail.data.value?.contractId === contractId) {
    void detail.run(contractId)
    void history.run(contractId)
  }
}

function go(row: ContractResponse, action: ContractAction): void {
  void router.push(screenPath(portalDef.value, props.formScreen, action === 'TERMINATE' ? row.contractId : undefined))
}

onMounted(() => void awaiting.run())
</script>

<template>
  <div>
    <p>
      <RouterLink :to="screenPath(portalDef, formScreen)">계약 신청 ({{ formScreen }})</RouterLink>
      · 내 처리 대기 <b>{{ awaiting.data.value?.count ?? '-' }}</b>건
    </p>
    <ResultBox :error="awaiting.error.value" />
    <PagedList ref="list" :load="load" :columns="columns" :filters="filters" summary-key="view" @row-click="open">
      <template #actions="{ row }">
        <template v-for="a in row.actions" :key="a">
          <ActionButton
            v-if="inline[a]"
            :label="LABEL[a]"
            :confirm="`${row.partnerName}: ${LABEL[a]}`"
            :reason="inline[a]!.reason"
            :run="(reason) => inline[a]!.run(row.contractId, reason)"
            @done="reload(row.contractId)"
          />
          <button v-else type="button" @click="go(row, a)">{{ LABEL[a] }}</button>
        </template>
      </template>
    </PagedList>

    <h3>상세</h3>
    <ResultBox :error="detail.error.value" />
    <KeyValueTable :data="detail.data.value" />
    <h3>이력</h3>
    <ResultBox :error="history.error.value" />
    <DataTable v-if="history.data.value" :rows="history.data.value" :columns="historyColumns" />
  </div>
</template>
