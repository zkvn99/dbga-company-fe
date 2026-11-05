import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 구조 규칙 검사 (백엔드 ArchitectureTest 에 해당, docs/frontend.md 3장). 끄거나 건너뛰지 않는다.
 */
const SRC = resolve(__dirname, '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : /\.(ts|vue)$/.test(name) ? [path] : []
  })
}

const sources = files(SRC)
  .filter((f) => !f.endsWith('.test.ts'))
  .map((path) => ({ path, rel: relative(SRC, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }))

function importsOf(text: string): string[] {
  return [...text.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2])
}

/** '@/x' 나 상대 경로를 src 기준 경로('api/adm')로. 패키지는 그대로. */
function target(from: string, spec: string): string {
  if (spec.startsWith('@/')) return spec.slice(2)
  if (spec.startsWith('.')) return relative(SRC, resolve(dirname(from), spec)).split(sep).join('/')
  return spec
}

function violations(filter: (rel: string) => boolean, bad: (to: string) => boolean): string[] {
  return sources
    .filter((s) => filter(s.rel))
    .flatMap((s) => importsOf(s.text).map((spec) => ({ s, to: target(s.path, spec) })))
    .filter(({ to }) => bad(to))
    .map(({ s, to }) => `${s.rel} → ${to}`)
}

describe('구조 규칙', () => {
  it('shared 는 앱 코드(api · pages · portals)를 모르고, @/ 별칭 대신 상대 경로만 쓴다 — 두 앱에 그대로 복사되므로', () => {
    const aliasUsers = sources.filter((s) => s.rel.startsWith('shared/') && importsOf(s.text).some((i) => i.startsWith('@/')))
    expect(aliasUsers.map((s) => s.rel)).toEqual([])
    expect(violations((r) => r.startsWith('shared/'), (to) => /^(api|pages|portals)(\/|$)/.test(to))).toEqual([])
  })

  it('axios 는 shared/http/client.ts 만 쓴다', () => {
    expect(violations((r) => r !== 'shared/http/client.ts', (to) => to === 'axios')).toEqual([])
  })

  it('HTTP 클라이언트는 api 와 shared 만 부른다 — 화면은 src/api 함수로만 호출한다', () => {
    expect(violations((r) => !r.startsWith('api/') && !r.startsWith('shared/'), (to) => to === 'shared/http/client')).toEqual([])
  })

  it('api 는 화면(pages · portals · .vue)을 모른다', () => {
    expect(violations((r) => r.startsWith('api/'), (to) => /^(pages|portals)(\/|$)/.test(to) || to.endsWith('.vue'))).toEqual([])
  })

  it('pages 끼리 서로 부르지 않는다 — 공통은 shared/ui 로', () => {
    expect(violations((r) => r.startsWith('pages/'), (to) => to.startsWith('pages/'))).toEqual([])
  })

  it('화면 파일 이름은 <Portal><화면 번호|X><이름>.vue', () => {
    const bad = sources.filter((s) => s.rel.startsWith('pages/')).filter((s) => !/^pages\/[a-z0-9]+\/[A-Z][a-z]+\d*(\d{2}(_\d)?|X)[A-Z][A-Za-z0-9]*\.vue$/.test(s.rel))
    expect(bad.map((s) => s.rel)).toEqual([])
  })

  it('fetch · XMLHttpRequest · Web Storage · console.log 를 쓰지 않는다 (토큰 · 개인정보를 브라우저에 남기지 않음)', () => {
    const bad = sources.filter((s) => /\bfetch\(|XMLHttpRequest|localStorage|sessionStorage|console\.log/.test(s.text) && s.rel !== 'shared/structure.test.ts')
    expect(bad.map((s) => s.rel)).toEqual([])
  })
})
