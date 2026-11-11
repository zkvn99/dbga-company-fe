import type { Component } from 'vue'
import type { OtpAuthApi } from '../auth/otpAuthApi'

/**
 * 화면 하나 = 화면설계서 화면 ID 하나. src/portals/<portal>.ts 에 배열로 등록한다.
 * page 가 없으면 '백엔드 API 대기' 화면(PendingScreen)으로 열린다 — 기획서의 모든 화면을 빠짐없이 등록한다.
 */
export interface ScreenDef {
  /** 화면설계서 ID 'ADM-08-1' · 공통 내 정보 'ADM-ME' · 'SUP-PW'. 설계서에 없는 화면은 '<PORTAL>-X-<NAME>'. */
  id: string
  title: string
  page?: () => Promise<{ default: Component }>
  /** 경로 변수 ':partnerId' — 있으면 메뉴에 나오지 않는다(목록 행에서 이동). */
  params?: string
  /** false 면 메뉴에서 숨김(모달 · 하위 화면). 기본 true. */
  menu?: boolean
  /** 로그인 전에 여는 화면(로그인). */
  public?: boolean
  /** 셋업 필요(setupRequired) 계정도 여는 화면. */
  setup?: boolean
  /** 화면이 부르는 API — 화면 상단에 표시(화이트박스 추적용). */
  apis?: readonly string[]
  /** 화면설계서 PAGE 번호. */
  specPage?: number
  note?: string
}

/** /me 응답 중 공통 프레임이 쓰는 값. 나머지는 Portal 마다 다르다. */
export interface PortalMe {
  loginId?: string
  name?: string
  setupRequired?: boolean
}

/** Portal = 로그인 단위 하나. 공통 화면(로그인 · 내 정보 · 비밀번호 변경)이 쓰는 API 를 여기서 명시적으로 넘긴다. */
export interface PortalDef {
  /** URL 첫 단(/adm). 소문자. */
  key: string
  name: string
  auth?: OtpAuthApi
  me?: () => Promise<PortalMe>
  changePassword?: (body: { currentPassword: string; newPassword: string }) => Promise<unknown>
  /** 로컬 테스트 채널 인증번호를 보는 Redis 키 접두어(…:otp:). 개발 서버에서만 표시. */
  otpRedisKeyPrefix?: string
  home: string
  login?: string
  setupScreen?: string
  /**
   * 설치 셋업 화면(로그인 전). {@link installRequired}가 true면 로그인 화면을 포함한 모든 화면에서 여기로 보낸다 — 계정이 아직 없는 설치 직후.
   * 회사 앱 OIT만(ADR-0028).
   */
  installScreen?: string
  installRequired?: () => Promise<boolean>
  screens: readonly ScreenDef[]
}

export function screenPath(portal: PortalDef, id: string, param?: string): string {
  const base = `/${portal.key}/${id.toLowerCase()}`
  return param === undefined ? base : `${base}/${encodeURIComponent(param)}`
}

/** 백엔드 API 가 아직 없는 화면(기획서에 있으므로 등록만). API 가 생기면 page · apis 를 채운 객체로 바꾼다. */
export function pending(id: string, title: string, specPage?: number, note?: string): ScreenDef {
  return { id, title, specPage, note }
}
