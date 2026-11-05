# dbga-company-fe — 화이트박스 테스트 화면

workspace 루트 `AGENTS.md`와 `docs/frontend.md`(프론트 규칙 원본)를 먼저 따른다. 여기에는 이 앱에만 해당하는 것만 둔다.

- Portal: `fp` 설계사 · `org` 조직 관리자 · `oit` 조직 전산관리자 · `sup2` 회사별 공급 Portal(SUP②). 백엔드 `dbga-company` (localhost:8081), 개발 서버 `http://localhost:5174`.
- 등록표: `src/portals/<portal>.ts` — 화면설계서의 모든 화면 ID. 백엔드 API가 생기면 `pending(...)`을 화면 정의로 바꾼다.
- `src/shared`는 다른 프론트 앱과 같은 내용이다. 고치면 workspace에서 `scripts/sync-fe-shared.sh` 후 두 앱 모두 `npm run verify`.
- 세 Portal(fp · org · oit)은 같은 쿠키 이름(`dbga_company_*`) — 마지막 로그인만 남는다. Portal마다 그 역할 계정만 로그인된다(다른 역할은 `IAM_LOGIN_FAILED`).
- 임시 비밀번호 계정(`setupRequired`)은 내 정보 · 비밀번호 변경 밖이 403 → `setupScreen`(FP-22 · ORG-X-PASSWORD · OIT-15).
- 계정 등록(ORG-25 · OIT-03)이 같이 쓰는 필드는 `src/forms/accountFields.ts`.
- `sup2`는 센터 SUP-38 진입 토큰 API가 생기기 전까지 로그인 없이 화면 목록만 있다.

## 명령

```bash
npm ci
npm run dev       # /api → 백엔드 프록시 (다른 주소: API_TARGET=http://host:port npm run dev)
npm run verify    # vue-tsc + 빌드 + Vitest(구조 규칙 · 등록표) — 통과해야 끝
```

## 화면 하나 추가 (요약 — 상세는 docs/frontend.md 4장)

1. `src/api/*.ts`에 함수 + 백엔드 record와 같은 이름의 타입.
2. `src/pages/<portal>/<Portal><번호|X><이름>.vue` — `PagedList` · `ApiForm` · `ActionButton`에 api 함수를 그대로 넘긴다.
3. 등록표의 `pending('ID', ...)` → `{ id, title, page, apis, specPage }`.
4. `npm run verify`.
