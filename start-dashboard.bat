@echo off
cd /d "%~dp0"
echo 공격대 구인 대시보드를 시작합니다.
echo.
echo WCL API 키를 설정하려면 .env.example 파일을 참고해서 .env 파일을 만들어 주세요.
echo 서버 주소: http://localhost:8787
echo.
start "" "http://localhost:8787"
node server.js
pause
