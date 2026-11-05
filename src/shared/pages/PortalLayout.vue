<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import RequestLogPanel from '../ui/RequestLogPanel.vue'
import { clearMe, session } from '../portal/session'
import { screenPath } from '../portal/types'
import { usePortal } from '../portal/usePortal'

const { portal, screen } = usePortal()
const router = useRouter()

const menu = computed(() => portal.value.screens.filter((s) => s.menu !== false && !s.params && !s.public))

async function logout(): Promise<void> {
  await portal.value.auth?.logout().catch(() => undefined)
  clearMe()
  if (portal.value.login) await router.push(screenPath(portal.value, portal.value.login))
}
</script>

<template>
  <div class="layout">
    <nav>
      <RouterLink to="/">← 처음</RouterLink>
      <RouterLink to="/console">API 콘솔</RouterLink>
      <h3>{{ portal.name }}</h3>
      <RouterLink v-for="s in menu" :key="s.id" :to="screenPath(portal, s.id)" :class="{ pending: !s.page }">
        {{ s.id }} {{ s.title }}{{ s.page ? '' : ' (대기)' }}
      </RouterLink>
    </nav>
    <main>
      <div class="topbar">
        <b>{{ portal.name }}</b>
        <span v-if="session.me && session.portalKey === portal.key">
          {{ session.me.loginId }} {{ session.me.name ?? '' }}
          <span v-if="session.me.setupRequired" class="req">(셋업 필요)</span>
        </span>
        <span v-else class="muted">로그인 안 됨</span>
        <button v-if="portal.auth" type="button" @click="logout">로그아웃</button>
      </div>
      <div v-if="screen" class="screen-info">
        <b>{{ screen.id }}</b> {{ screen.title }}
        <span v-if="screen.specPage" class="muted"> · 화면설계서 p.{{ screen.specPage }}</span>
        <span v-if="screen.apis?.length" class="muted"> · API: {{ screen.apis.join(' | ') }}</span>
        <div v-if="screen.note" class="muted">{{ screen.note }}</div>
      </div>
      <RouterView :key="$route.fullPath" />
    </main>
    <RequestLogPanel />
  </div>
</template>
