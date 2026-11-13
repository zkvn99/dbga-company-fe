<script setup lang="ts">
import MyInfoEdit from '@/forms/MyInfoEdit.vue'

/** OIT-X-ME-EDIT 내 정보 수정(공통 p.10 — 설계서에 OIT 별도 ID 없음). 비밀번호는 OIT-15. */
</script>

<template>
  <MyInfoEdit portal="oit" view-screen="OIT-ME" password-screen="OIT-15" />
</template>
