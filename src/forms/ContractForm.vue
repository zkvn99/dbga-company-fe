<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  type ContractPartnerResponse,
  type ContractPortal,
  type ContractRequestRequest,
  type ContractTerminateRequest,
  TERMINATE_REASONS,
  contractApi,
} from '@/api/contract'
import { screenPath } from '@/shared/portal/types'
import { usePortal } from '@/shared/portal/usePortal'
import ActionButton from '@/shared/ui/ActionButton.vue'
import ApiForm from '@/shared/ui/ApiForm.vue'
import DataTable from '@/shared/ui/DataTable.vue'
import KeyValueTable from '@/shared/ui/KeyValueTable.vue'
import ResultBox from '@/shared/ui/ResultBox.vue'
import { type FieldDef, opts } from '@/shared/ui/fields'
import type { Column } from '@/shared/ui/table'
import { useAsync } from '@/shared/ui/useAsync'

/**
 * 계약 신청 · 해지(OIT-17 · ORG 위임 화면) — 두 Portal 화면이 같이 쓴다.
 * - contractId 없음 = 신청 모드: 공급업체 검색(업체명 · 사업자등록번호, 진행 중 계약이 있으면 selectable=false — 고를 수는 있게 둠: 센터 409
 *   CONTRACT_OPEN_EXISTS 확인용) → 시작일 · 종료일 · 메모. 저장하면 목록으로.
 * - contractId 있음 = 해지 모드: 해지 신청(사유 코드 · 희망일 · 상세 사유) · 받은 해지 신청 [해지 동의] · [해지 거절](사유) · 보낸 해지 신청
 *   [해지 신청 취소]. 버튼은 상태와 상관없이 모두 보인다(센터 409 확인용) — 지금 누를 수 있는 것은 actions.
 */
const props = defineProps<{ portal: ContractPortal; listScreen: string; contractId?: string }>()
const { portal: portalDef } = usePortal()
const router = useRouter()

const partners = useAsync((keyword: string) => contractApi.partners(props.portal, keyword))
const keyword = ref('')
const picked = ref<ContractPartnerResponse | null>(null)
const detail = useAsync((id: string) => contractApi.contract(props.portal, id))
const contract = computed(() => detail.data.value)

const partnerColumns: Column<ContractPartnerResponse>[] = [
  { key: 'name', label: '업체명' },
  { key: 'bizRegNo', label: '사업자등록번호' },
  { key: 'latestStatus', label: '최근 계약 상태' },
  { key: 'selectable', label: '신청 가능' },
]

const requestFields = computed<FieldDef[]>(() => [
  { key: 'partnerId', label: '공급업체', required: true, help: picked.value ? picked.value.name : '위 표에서 고르세요' },
  { key: 'startDate', label: '시작일', type: 'date', required: true, help: '오늘 이후' },
  { key: 'endDate', label: '종료일', type: 'date', help: '비우면 해지할 때까지' },
  { key: 'memo', label: '메모 (상대에게 보임)', type: 'textarea', help: '500자' },
])
const requestInitial = computed(() => ({ partnerId: picked.value?.partnerId ?? '' }))

const terminateFields: FieldDef[] = [
  { key: 'reasonCode', label: '해지 사유', type: 'select', required: true, options: opts(TERMINATE_REASONS) },
  { key: 'wishDate', label: '해지 희망일', type: 'date', help: '비우면 동의 즉시 해지' },
  { key: 'detail', label: '상세 사유 (상대에게 보임)', type: 'textarea', help: '500자' },
]

function search(): void {
  void partners.run(keyword.value)
}

function load(): void {
  if (props.contractId) void detail.run(props.contractId)
  else search()
}

const request = (body: ContractRequestRequest) => contractApi.request(props.portal, body)
const terminate = (body: ContractTerminateRequest) => contractApi.terminate(props.portal, props.contractId as string, body)

watch(() => props.contractId, load)
onMounted(load)
</script>

<template>
  <div>
    <template v-if="!contractId">
      <form class="filters" @submit.prevent="search">
        <input v-model="keyword" placeholder="업체명 · 사업자등록번호" />
        <button type="submit">검색</button>
      </form>
      <ResultBox :error="partners.error.value" />
      <DataTable v-if="partners.data.value" :rows="partners.data.value" :columns="partnerColumns" @row-click="(row) => (picked = row)" />
      <ApiForm
        :fields="requestFields"
        :initial="requestInitial"
        :submit="request"
        title="계약 신청"
        submit-label="계약 신청"
        @success="router.push(screenPath(portalDef, listScreen))"
      />
    </template>
    <template v-else>
      <ResultBox :error="detail.error.value" />
      <p v-if="contract">지금 누를 수 있는 처리: {{ contract.actions.join(' · ') || '없음' }}</p>
      <KeyValueTable :data="contract" />

      <ApiForm :fields="terminateFields" :submit="terminate" title="해지 신청" submit-label="해지 신청" @success="load" />

      <h3>받은 · 보낸 해지 신청 처리</h3>
      <ActionButton label="해지 동의" confirm="해지에 동의할까요?" :run="() => contractApi.acceptTermination(portal, contractId!)" @done="load" />
      <ActionButton
        label="해지 거절"
        reason="required"
        :run="(reason) => contractApi.rejectTermination(portal, contractId!, { reason: reason as string })"
        @done="load"
      />
      <ActionButton
        label="해지 신청 취소"
        confirm="해지 신청을 취소할까요?"
        :run="() => contractApi.cancelTermination(portal, contractId!)"
        @done="load"
      />
    </template>
  </div>
</template>
