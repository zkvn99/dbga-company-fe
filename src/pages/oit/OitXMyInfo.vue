<script setup lang="ts">
import MyInfoView from '@/forms/MyInfoView.vue'

/** OIT-ME 내 정보(공통 p.10) — 관리 조직 · 권한 포함(조회만). 수정은 OIT-X-ME-EDIT. */
</script>

<template>
  <MyInfoView portal="oit" edit-screen="OIT-X-ME-EDIT" admin />
</template>
