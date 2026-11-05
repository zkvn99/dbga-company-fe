<script setup lang="ts">
import { usePortal } from '../portal/usePortal'

const { screen } = usePortal()
</script>

<template>
  <div class="box">
    <h2>백엔드 API 대기</h2>
    <p>
      <b>{{ screen?.id }}</b> {{ screen?.title }} 화면은 아직 백엔드 API 가 없어 화면을 만들지 않았다.
      API 가 생기면 <code>src/api</code> 에 함수를 추가하고 <code>src/pages</code> 에 화면을 만든 뒤 등록표의 <code>page</code> 를 채운다.
    </p>
    <p class="muted">그 전에는 <RouterLink to="/console">API 콘솔</RouterLink>로 직접 호출해 확인한다.</p>
  </div>
</template>
