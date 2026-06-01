# 닷홈 배포 메모

이 폴더 안의 파일을 닷홈 FTP 웹 루트에 올리면 됩니다.

## 준비할 정보

- FTP 주소, 아이디, 비밀번호
- FTP 업로드 루트 폴더 이름
- MySQL DB 호스트
- MySQL DB 이름
- MySQL DB 아이디
- MySQL DB 비밀번호
- PHP 버전: 가능하면 8.2 또는 8.4
- 실제 접속 주소: 예) `https://raid.example.com`
- HTTPS/SSL 사용 가능 여부
- PHP `curl` 사용 가능 여부

## 설치 순서

1. 닷홈 관리 페이지에서 PHP 버전을 8.2 이상으로 선택합니다.
2. phpMyAdmin 또는 MySQL 관리 화면에서 `schema.sql` 내용을 실행합니다.
3. `config.example.php`를 `config.php`로 복사합니다.
4. `config.php`에 닷홈 MySQL 정보와 WCL API 정보를 입력합니다.
5. 이 폴더 안의 파일과 `assets` 폴더를 FTP 웹 루트에 업로드합니다.
6. 브라우저에서 `https://내주소/api.php?action=health`를 열어 `{ "ok": true }`가 나오는지 확인합니다.
7. `https://내주소/`로 접속해서 계정을 만들고 일정을 생성합니다.

## 업로드해야 하는 주요 파일

- `index.html`
- `app.js`
- `styles.css`
- `api.php`
- `config.php`
- `.htaccess`
- `assets/`

`schema.sql`과 `README_DOTHOME.md`는 설치 후 서버에 남겨둘 필요가 없습니다.

## 주의

- `config.php`에는 DB 비밀번호와 WCL secret이 들어가므로 외부에 공유하면 안 됩니다.
- 구글 로그인은 HTTPS가 안정적으로 켜진 뒤 붙이는 편이 좋습니다.
- 닷홈에서 `curl`이 막혀 있으면 WCL 자동 조회가 실패할 수 있습니다. 이 경우 닷홈 고객센터 또는 관리 화면에서 PHP curl 지원 여부를 확인해야 합니다.
