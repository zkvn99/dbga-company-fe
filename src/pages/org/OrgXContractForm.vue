<script setup lang="ts">
import ContractForm from '@/forms/ContractForm.vue'

/** 계약 신청 · 해지 — 조직 관리자 위임 화면(설계서 밖, ADR-0043). OIT-17과 같은 forms/ContractForm. */
defineProps<{ contractId?: string }>()
</script>

<template>
  <ContractForm portal="org" list-screen="ORG-X-CONTRACTS" :contract-id="contractId" />
</template>
