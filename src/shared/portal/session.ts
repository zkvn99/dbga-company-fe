import { reactive, readonly } from 'vue'
import type { PortalDef, PortalMe } from './types'

/**
 * 로그인한 계정(/me). 한 앱의 Portal 들은 같은 인증 쿠키를 쓰므로(마지막 로그인이 남음) 값도 하나만 둔다.
 * Portal 이 바뀌면 다시 읽는다.
 */
const state = reactive<{ portalKey: string | null; me: PortalMe | null }>({ portalKey: null, me: null })

export const session = readonly(state)

export async function ensureMe(portal: PortalDef): Promise<PortalMe | null> {
  if (!portal.me) return null
  if (state.portalKey === portal.key && state.me) return state.me
  return reloadMe(portal)
}

export async function reloadMe(portal: PortalDef): Promise<PortalMe | null> {
  if (!portal.me) return null
  try {
    state.me = await portal.me()
    state.portalKey = portal.key
  } catch {
    clearMe()
  }
  return state.me
}

export function clearMe(): void {
  state.me = null
  state.portalKey = null
}
