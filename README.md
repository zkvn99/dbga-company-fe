# dbga-company-fe

DBGA 화면설계서(최소운영 v2.2) 기능을 `dbga-company` (localhost:8081) 에 직접 호출해 확인하는 **화이트박스 테스트 화면**. 디자인 없음.
규칙은 workspace `docs/frontend.md`, 에이전트 지침은 `AGENTS.md`.

```bash
npm ci && npm run dev    # http://localhost:5174  (백엔드를 먼저 띄운다)
```

- 브라우저는 **Chrome**으로 — Safari는 `http://localhost`에서 Secure 인증 쿠키를 저장하지 않아 로그인 직후 401이 난다.
- 첫 화면: Portal별 구현 / 전체 화면 수, 로그인 링크, API 콘솔.
- 로그인: 아이디 · 비밀번호 → [인증번호 받기] → 로컬 테스트 채널 번호는 화면에 나오는 `docker exec dbga-redis redis-cli HGET … code` 명령으로 확인.
- 모든 화면: 위에 화면 ID · 설계서 페이지 · 쓰는 API, 아래에 요청 기록(상태 · 오류 코드 · requestId).
- `/console`: 임의 API 호출(쿠키 · CSRF 자동).
