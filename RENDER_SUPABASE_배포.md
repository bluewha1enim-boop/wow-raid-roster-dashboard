# Render + Supabase 배포 메모

닷홈 SSL 비용을 쓰지 않고 배포하려면 이 구성을 사용합니다.

```text
strb.kr 또는 raid.strb.kr
  -> Render 무료 Web Service
  -> Supabase 무료 DB
```

Render는 커스텀 도메인에도 무료 TLS/SSL 인증서를 자동으로 붙일 수 있습니다.

## 1. Supabase 준비

1. Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase-schema.sql` 내용을 실행합니다.
3. Project Settings -> API에서 아래 값을 확인합니다.
   - Project URL
   - service_role key

`service_role key`는 서버 전용 비밀키라서 브라우저 코드에 넣거나 공개하면 안 됩니다.

## 2. Render 준비

Render에서 새 Web Service를 만들고 이 프로젝트를 연결합니다.

설정값:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free
Health Check Path: /api/health
```

환경 변수:

```text
SUPABASE_URL=Supabase Project URL
SUPABASE_SERVICE_ROLE_KEY=Supabase service_role key
SESSION_SECRET=긴 랜덤 문자열
WCL_CLIENT_ID=Warcraft Logs client id
WCL_CLIENT_SECRET=Warcraft Logs client secret
```

`SESSION_SECRET`은 아무 긴 문자열이면 됩니다. 예: 비밀번호 생성기로 만든 32자 이상 문자열.

## 3. 도메인 연결

돈을 아끼려면 루트 도메인 `strb.kr`보다 서브도메인 `raid.strb.kr`이 편합니다.

추천:

```text
raid.strb.kr
```

Render의 Custom Domains에서 `raid.strb.kr`을 추가하면 DNS에 넣을 CNAME 값을 알려줍니다.
닷홈 도메인 DNS 관리 화면에서 그 CNAME 레코드를 추가하면 됩니다.

Render가 도메인 확인을 끝내면 HTTPS 인증서를 자동 발급합니다.

## 4. 확인 주소

배포 후 아래 주소가 열리면 서버가 정상입니다.

```text
https://raid.strb.kr/api/health
```

정상 응답 예:

```json
{"ok":true,"configured":true,"storage":"supabase"}
```

## 5. 구글 로그인

구글 로그인은 HTTPS 도메인이 정상 작동한 다음 붙이는 편이 좋습니다.
그때 리디렉션 URI는 대략 아래처럼 등록합니다.

```text
https://raid.strb.kr/api/auth/google/callback
```
