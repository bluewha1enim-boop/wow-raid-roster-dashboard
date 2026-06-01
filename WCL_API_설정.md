# WCL API 설정

이 대시보드는 WCL client id와 client secret을 브라우저에 노출하지 않기 위해 로컬 서버에서 WCL API를 호출합니다.

1. Warcraft Logs에서 API client를 만듭니다.
2. 이 폴더의 `.env.example`을 참고해 `.env` 파일을 만듭니다.
3. 아래 값을 실제 발급값으로 채웁니다.

```txt
WCL_CLIENT_ID=발급받은-client-id
WCL_CLIENT_SECRET=발급받은-client-secret
PORT=8787
```

설정 후 `start-dashboard.bat`을 실행하면 `http://localhost:8787`에서 대시보드를 사용할 수 있습니다.
