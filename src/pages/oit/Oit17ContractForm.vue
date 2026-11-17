<script setup lang="ts">
import ContractForm from '@/forms/ContractForm.vue'

/** OIT-17 계약 신청 · 동의(모달, p.125) — contractId 없으면 신청, 있으면 해지 신청 · 동의 · 거절. 동의 · 거절(신청)은 OIT-16 목록에서. */
defineProps<{ contractId?: string }>()
</script>

<template>
  <ContractForm portal="oit" list-screen="OIT-16" :contract-id="contractId" />
</template>
