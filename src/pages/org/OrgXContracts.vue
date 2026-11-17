<script setup lang="ts">
import ContractList from '@/forms/ContractList.vue'

/** 공급업체 계약 — 조직 관리자가 위임(hub:contract:read · manage)받았을 때만(설계서 밖, ADR-0043). OIT-16과 같은 forms/ContractList. */
</script>

<template>
  <ContractList portal="org" form-screen="ORG-X-CONTRACT-FORM" />
</template>
