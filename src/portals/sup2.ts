import { type PortalDef, pending } from '@/shared/portal/types'

/**
 * 회사별 공급 Portal(SUP②) — 화면설계서 p.26~43. 센터 SUP-38 진입 토큰으로 들어온다(security.md 2장).
 * 진입 토큰 API 가 아직 없어 로그인 · 화면 모두 대기.
 */
export const sup2: PortalDef = {
  key: 'sup2',
  name: '회사별 공급 Portal (SUP②)',
  home: 'SUP-07',
  screens: [
    pending('SUP-07', 'DB 목록', 27),
    pending('SUP-08', 'DB 단건 등록 (모달)', 28),
    pending('SUP-09', 'DB Excel 일괄 등록 (모달)', 29),
    pending('SUP-10', 'DB 상세', 30),
    pending('SUP-11', 'DB 수정 요청 (모달)', 31),
    pending('SUP-12', '증빙자료 목록 (팝업)', 32),
    pending('SUP-13', '이미지 보기 (모달)', 33),
    pending('SUP-14', '녹취 · 증빙 목록', 34),
    pending('SUP-15', '녹취 · 증빙 등록 (모달)', 35),
    pending('SUP-17', '구매 요청 목록', 36),
    pending('SUP-18', '주문 상세 · 승인 (모달)', 37),
    pending('SUP-19', '구매 요청 반려 (모달)', 38),
    pending('SUP-20', '입금 확인 (모달)', 39),
    pending('SUP-22', '공급 필요수량', 40),
    pending('SUP-23', '공급 대상 지정', 41),
    pending('SUP-24', 'AS 심사 — 대기 목록', 42),
    pending('SUP-25', 'AS 심사 — 심사 · 처리 (모달)', 43),
  ],
}
