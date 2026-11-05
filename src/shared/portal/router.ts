import { createRouter, createWebHistory, type RouteRecordRaw, type Router } from 'vue-router'
import { setAuthHooks } from '../http/client'
import ApiConsolePage from '../pages/ApiConsolePage.vue'
import HomePage from '../pages/HomePage.vue'
import PendingScreen from '../pages/PendingScreen.vue'
import PortalLayout from '../pages/PortalLayout.vue'
import { clearMe, ensureMe } from './session'
import { type PortalDef, type ScreenDef, screenPath } from './types'

declare module 'vue-router' {
  interface RouteMeta {
    portal?: PortalDef
    screen?: ScreenDef
  }
}

function screenRoute(portal: PortalDef, screen: ScreenDef): RouteRecordRaw {
  const segment = screen.id.toLowerCase() + (screen.params ? `/${screen.params}` : '')
  return {
    path: segment,
    name: `${portal.key}:${screen.id}`,
    component: screen.page ?? PendingScreen,
    props: true,
    meta: { portal, screen },
  }
}

function portalRoute(portal: PortalDef): RouteRecordRaw {
  return {
    path: `/${portal.key}`,
    component: PortalLayout,
    meta: { portal },
    children: [
      { path: '', redirect: screenPath(portal, portal.home) },
      ...portal.screens.map((screen) => screenRoute(portal, screen)),
    ],
  }
}

/** Portal 등록표로 라우터를 만든다. 화면 경로 = /<portal>/<화면 ID 소문자>[/<경로 변수>]. */
export function createPortalRouter(appName: string, portals: readonly PortalDef[]): Router {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: HomePage, props: { appName, portals } },
      { path: '/console', component: ApiConsolePage, props: { portals } },
      ...portals.map(portalRoute),
      { path: '/:rest(.*)*', redirect: '/' },
    ],
  })

  router.beforeEach(async (to) => {
    const { portal, screen } = to.meta
    if (!portal) return true
    setAuthHooks({
      refresh: portal.auth?.refresh,
      onUnauthenticated: () => {
        clearMe()
        if (portal.login) void router.push({ path: screenPath(portal, portal.login), query: { redirect: router.currentRoute.value.fullPath } })
      },
      onForbidden: clearMe,
    })
    if (screen?.public || !portal.me || !portal.login) return true
    const me = await ensureMe(portal)
    if (!me) return { path: screenPath(portal, portal.login), query: { redirect: to.fullPath } }
    if (me.setupRequired && portal.setupScreen && !screen?.setup) return screenPath(portal, portal.setupScreen)
    return true
  })

  return router
}
