import { describe, expect, it } from 'vitest'
import { validatePortals } from '@/shared/portal/validate'
import { portals } from './index'

describe('Portal 등록표', () => {
  it('화면 ID · 시작 화면 · 로그인 · 셋업 설정이 맞다', () => {
    expect(validatePortals(portals)).toEqual([])
  })
})
