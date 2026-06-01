# WoW Raid Roster Dashboard

World of Warcraft 공격대 구인 명단을 관리하는 웹 대시보드입니다.

## 주요 기능

- WCL 캐릭터 조회
- 공격대 명단 관리
- 직업 구성/역할 밸런스 확인
- 여러 일정 저장
- 인게임 애드온 문자열 가져오기/내보내기

## 로컬 실행

```bash
npm start
```

기본 주소:

```text
http://localhost:8787
```

## 배포

Render + Supabase 배포는 `RENDER_SUPABASE_배포.md`를 참고하세요.

Supabase 테이블은 `supabase-schema.sql`을 SQL Editor에서 실행해 생성합니다.

## 비밀값

`.env`, Supabase service role key, WCL client secret은 GitHub에 올리면 안 됩니다.
