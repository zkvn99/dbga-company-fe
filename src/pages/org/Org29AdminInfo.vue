<script setup lang="ts">
import MyInfoView from '@/forms/MyInfoView.vue'

/** ORG-29 관리자 정보(p.106) — 내 정보 + 관리 조직 · 권한(조회만). 수정은 ORG-30. */
</script>

<template>
  <MyInfoView portal="org" edit-screen="ORG-30" admin />
</template>
