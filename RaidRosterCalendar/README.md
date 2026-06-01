# RaidRosterCalendar

Retail 12.0.5용 테스트 애드온입니다.

## 설치

`RaidRosterCalendar` 폴더를 아래 위치에 복사합니다.

```txt
World of Warcraft/_retail_/Interface/AddOns/RaidRosterCalendar
```

게임을 재시작하거나 `/reload` 후 애드온 목록에서 `Raid Roster Calendar`를 켭니다.

## 사용

1. 웹 대시보드에서 `애드온 문자열 복사`를 누릅니다.
2. 인게임 달력에서 일정을 만들거나 편집하는 창을 엽니다.
3. 달력 창 오른쪽에 생긴 `대시보드 초대 문자열` 칸에 붙여넣습니다.
4. `초대`를 누릅니다.

창이 안 보이면 채팅창에 `/rrc` 또는 `/wrd`를 입력하면 가져오기 칸이 열립니다.

이 애드온은 `C_Calendar.EventInvite`만 호출합니다. 파티 초대 함수는 사용하지 않으므로 게임 파티/공격대에는 초대하지 않습니다.
