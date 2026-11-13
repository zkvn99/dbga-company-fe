<script setup lang="ts">
import MyInfoEdit from '@/forms/MyInfoEdit.vue'

/** ORG-30 관리자 정보 수정(p.107). 비밀번호 변경은 셋업 계정도 여는 ORG-PW. */
</script>

<template>
  <MyInfoEdit portal="org" view-screen="ORG-29" password-screen="ORG-PW" />
</template>
