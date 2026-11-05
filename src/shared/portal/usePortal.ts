import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { PortalDef } from './types'

/** 지금 화면의 Portal · 화면 정의(라우트 meta). 공통 화면(로그인 · 내 정보 · 비밀번호)이 쓴다. */
export function usePortal() {
  const route = useRoute()
  const portal = computed(() => route.meta.portal as PortalDef)
  const screen = computed(() => route.meta.screen)
  return { portal, screen, route }
}
