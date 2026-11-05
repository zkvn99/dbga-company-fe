<script setup lang="ts">
import RequestLogPanel from '../ui/RequestLogPanel.vue'
import { type PortalDef, screenPath } from '../portal/types'

defineProps<{ appName: string; portals: readonly PortalDef[] }>()
</script>

<template>
  <main style="padding: 8px 16px 240px">
    <h1>{{ appName }} — 화이트박스 테스트 화면</h1>
    <p class="muted">디자인 없음. 화면설계서의 화면 ID 단위로 백엔드 기능을 호출 · 확인한다. <RouterLink to="/console">API 콘솔</RouterLink></p>
    <table class="table">
      <tr><th>Portal</th><th>시작</th><th>화면 (구현 / 전체)</th></tr>
      <tr v-for="p in portals" :key="p.key">
        <td>{{ p.name }}</td>
        <td>
          <RouterLink v-if="p.login" :to="screenPath(p, p.login)">로그인</RouterLink>
          <RouterLink :to="screenPath(p, p.home)" style="margin-left: 8px">홈</RouterLink>
        </td>
        <td>{{ p.screens.filter((s) => s.page).length }} / {{ p.screens.length }}</td>
      </tr>
    </table>
    <RequestLogPanel />
  </main>
</template>
