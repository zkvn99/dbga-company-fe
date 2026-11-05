import type { PortalDef } from './types'

const SCREEN_ID = /^[A-Z]+-(\d{2}(-\d)?|X-[A-Z0-9-]+)$/

/** Portal 등록표 검사 — 각 앱의 portals.test.ts 가 부른다. 문제 목록(없으면 []). */
export function validatePortals(portals: readonly PortalDef[]): string[] {
  const problems: string[] = []
  const keys = new Set<string>()
  const ids = new Set<string>()
  for (const p of portals) {
    if (keys.has(p.key)) problems.push(`Portal key 중복: ${p.key}`)
    keys.add(p.key)
    const byId = new Map(p.screens.map((s) => [s.id, s]))
    for (const s of p.screens) {
      if (!SCREEN_ID.test(s.id)) problems.push(`${p.key}: 화면 ID 형식 ${s.id}`)
      if (ids.has(s.id)) problems.push(`${p.key}: 화면 ID 중복 ${s.id}`)
      ids.add(s.id)
      if (s.page && !s.apis?.length) problems.push(`${p.key}: ${s.id} 구현 화면은 apis 를 적는다`)
    }
    const home = byId.get(p.home)
    if (!home) problems.push(`${p.key}: home ${p.home} 없음`)
    if (p.login && !byId.get(p.login)?.public) problems.push(`${p.key}: login ${p.login} 은 public 화면이어야 함`)
    if (p.login && !p.auth) problems.push(`${p.key}: login 이 있으면 auth 필요`)
    if (p.setupScreen && !byId.get(p.setupScreen)?.setup) problems.push(`${p.key}: setupScreen ${p.setupScreen} 은 setup 화면이어야 함`)
    if (p.screens.some((s) => s.page?.toString().includes('ChangePasswordPage')) && !p.changePassword) problems.push(`${p.key}: 비밀번호 변경 화면은 changePassword 필요`)
  }
  return problems
}
