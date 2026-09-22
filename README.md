# 역탐현 수행평가 제출

역사로 탐구하는 현대 세계 수행평가 제출 사이트.

- 학생 제출: https://yeoktamhyeon.higgsfield.app/s1
- 교사용 열람: https://yeoktamhyeon.higgsfield.app/teacher
- 이 저장소의 GitHub Pages 주소는 위 사이트로 자동 이동한다.

## 폴더

| 폴더 | 내용 |
|---|---|
| `higgsfield-site/` | 현재 운영 중인 사이트에서 직접 작성한 부분(백업). 힉스필드 웹사이트 템플릿(React + TanStack Start, Cloudflare D1) 위에 얹혀 동작한다. |
| `legacy-apps-script/` | 처음 만든 GitHub Pages + Google Apps Script 버전(사용하지 않음). |

### `higgsfield-site/app/`

| 파일 | 역할 |
|---|---|
| `src/routes/index.tsx` | 첫 화면(스크롤로 재생되는 지구본 영상 + 수행평가 1~4 목록) |
| `src/routes/s1.tsx` | 수행평가 1 제출 양식(워크북 1 빈칸, AI 사용 기록·공유 링크) |
| `src/routes/teacher.tsx` | 교사용 열람(반별 필터, 검색, 미제출 작성 기록, 이전 제출본, CSV) |
| `src/lib/api/submissions.functions.ts` | 서버 함수: 제출·임시저장·마감·교사 조회 |
| `migrations/*.sql` | 데이터베이스 표(제출본, 제출 이력, 기기별 임시저장) |
| `src/components/site/site.css` | 디자인 |
| `public/assets/` | 영상·포스터·헤더 그림 |

## 기록 보호 방식

1. 작성 중: 학생 기기에 즉시 저장 + 15초마다·창을 닫을 때 서버에 기기별 백업(`drafts`).
2. 제출: 모든 제출을 먼저 `submission_log`에 쌓은 뒤 학번별 최신본(`submissions`)을 갱신한다. 다시 제출해도 이전 제출본은 지워지지 않는다.
3. 마감(`DEADLINES`)은 서버 시각으로 판정하며, 마감 뒤에는 제출·임시저장을 서버에서 거부한다.

## 공개 저장소 주의

교사 비밀번호의 해시(`TEACHER_HASH`)는 이 저장소에서 지워 두었다. 운영 사이트에만 실제 값이 들어 있다.
