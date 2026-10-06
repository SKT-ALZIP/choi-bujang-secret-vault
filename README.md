# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다.

이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 제출 묶음과 실제 배포를 연결하는 설정입니다.

1단계에서는 학생이 직접 편집하지 않고, 2단계 이후 필요한 설정과 보호 기능을 단계별로 추가합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 다음 명령을 사용합니다.

```sh
npm run build -- --local
```

로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다.

저장소의 `src/attack-check.mjs`는 단계별로 실제 배포 주소에 요청을 보내 자기 점검 결과를 만듭니다. 이 결과는 학생의 자기 점검이며 운영 심판의 판정은 아닙니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요.

2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다.

3단계 이후의 로그인과 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다.

비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다.

1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.

---

## 2단계 저장점 — 자료를 코드 밖으로 이동

2단계에서는 가상 메모를 정적 `data.json`에서 제거하고 Supabase의 `vault_notes` 테이블로 옮겼습니다.

`owner_id uuid` 열을 준비했지만 이 단계에서는 아직 사용자별 소유권 제어를 적용하지 않았습니다.

`vault_notes`에는 RLS를 활성화했고, `anon`과 `authenticated` 역할이 브라우저에서 직접 자료를 읽지 못하도록 권한을 제거했습니다.

Vercel 서버 함수는 서버용 환경변수를 사용하여 DB 자료를 읽습니다. 서버 전용 키는 브라우저 파일, API 응답, Git 저장소에 넣지 않습니다.

브라우저는 `/data.json` 대신 `/api/notes`를 호출합니다.

하지만 2단계의 `/api/notes`에는 아직 사용자 인증이 없었으므로, 주소를 아는 비로그인 방문자도 서버 API를 직접 호출할 수 있었습니다.

이 남은 약점은 3단계에서 로그인 토큰 검증을 추가하며 다뤘습니다.

최신 정적 파일과 GitHub 최신 버전에서 메모를 제거했다고 해서 과거 공개가 해소된 것은 아닙니다.

이전 Git 커밋과 이전 Vercel 배포가 남아 있는 동안에는 과거 노출 기록도 남아 있다고 봅니다.

### 2단계 확인 절차

최신 커밋에서 기존 가상 메모 문장이 남았는지 확인합니다.

```sh
git grep -n -E '실습용 가상 .* 기록' HEAD
```

정적 배포 파일도 확인합니다.

```text
/data.json
```

정상 상태에서는 다음처럼 메모 배열이 비어 있어야 합니다.

```json
{
  "notes": []
}
```

---

## 3단계 저장점 — 진짜 로그인을 붙임

3단계에서는 Supabase Auth의 이메일·비밀번호 로그인을 붙였습니다.

브라우저는 Supabase 공식 SDK로 로그인·로그아웃하며 비밀번호나 JWT를 직접 만들지 않습니다.

자료 API는 브라우저가 보낸 사용자 ID나 역할을 신뢰하지 않고, `Authorization: Bearer ...` 토큰을 `src/verify-login.mjs`로 검사합니다.

토큰이 없거나 검증에 실패하면 자료 없이 401로 거부합니다.

로그인 발급자는 다음 Supabase Auth 프로젝트입니다.

- issuer: `https://qzyloovynaqxfbqzhyro.supabase.co/auth/v1`
- audience: `authenticated`

로그인한 사용자는 가상 메모를 추가·수정·삭제할 수 있습니다.

새 메모의 `owner_id`에는 브라우저가 보낸 값이 아니라 서버가 검증한 사용자 ID를 저장합니다.

현재 자료 API 경로는 다음과 같습니다.

- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/:id`
- `PUT /api/notes/:id`
- `DELETE /api/notes/:id`

목록 조회는 로그인한 사용자의 `owner_id`에 해당하는 메모만 반환합니다.

3단계 당시에는 개별 `/:id` GET·PUT·DELETE에서 소유자를 확인하지 않았으므로, 정상 로그인한 다른 사용자가 타인의 메모 UUID를 알면 접근할 수 있는 허점이 남아 있었습니다.

이 문제는 4단계에서 수정했습니다.

서버 전용 `SUPABASE_SECRET_KEY`는 Vercel 환경변수에서만 사용하며 브라우저 코드, Git 저장소, API 응답에 넣지 않습니다.

### 3단계 확인 절차

시크릿 창이나 로그아웃 상태에서 자료 API를 열면 자료 대신 인증 오류가 반환되어야 합니다.

```sh
curl -i https://choi-bujang-secret-vault-inky.vercel.app/api/notes
```

정상 결과는 HTTP 401과 JSON 오류입니다.

예:

```json
{
  "error": "AUTH_REQUIRED"
}
```

정상 로그인 뒤에는 가상 메모 추가·수정·삭제가 가능해야 합니다.

삭제한 메모를 같은 UUID로 다시 조회하면 404가 반환되어야 합니다.

---

## 4단계 저장점 — 로그인해도 내 자료만 보이게 함

4단계에서는 검증된 로그인 사용자 ID와 `vault_notes.owner_id`를 모든 메모 접근에서 비교하도록 변경했습니다.

목록 조회는 로그인한 사용자의 행만 반환합니다.

새 메모는 서버가 검증한 사용자 ID를 `owner_id`로 저장하며, 브라우저가 보낸 `owner_id`, `userId`, `role` 값은 신뢰하지 않습니다.

개별 메모의 GET·PUT·DELETE도 `api_id`뿐 아니라 검증된 사용자 ID와 `owner_id`를 함께 비교합니다.

타인의 메모 UUID를 알고 있더라도 소유자가 일치하지 않으면 다음과 같이 거부합니다.

```json
{
  "error": "NOTE_NOT_FOUND"
}
```

수정에서는 기존 행이 본인 소유인지 먼저 확인하고, 실제 UPDATE 쿼리에서도 다시 `owner_id`를 검사합니다.

요청 본문에서 소유자를 바꾸려는 시도도 거부합니다.

### Supabase RLS와 최소 권한

`vault_notes`에는 RLS가 활성화되어 있습니다.

`anon` 역할은 테이블 권한이 없습니다.

`authenticated` 역할에는 다음 네 권한만 허용합니다.

- SELECT
- INSERT
- UPDATE
- DELETE

각 작업은 다음 정책으로 제한됩니다.

#### SELECT

기존 행이 본인 소유일 때만 읽을 수 있습니다.

```sql
using (
  auth.uid() = owner_id
)
```

#### INSERT

새 행의 `owner_id`가 현재 로그인 사용자와 같아야 합니다.

```sql
with check (
  auth.uid() = owner_id
)
```

#### UPDATE

기존 행도 본인 소유여야 하고 수정 후 새 행도 본인 소유여야 합니다.

```sql
using (
  auth.uid() = owner_id
)
with check (
  auth.uid() = owner_id
)
```

#### DELETE

본인 소유 행만 삭제할 수 있습니다.

```sql
using (
  auth.uid() = owner_id
)
```

### 4단계 직접 확인 결과

A 계정으로 로그인하면 A 소유 메모만 표시됩니다.

B 계정으로 로그인하면 B 소유 메모만 표시됩니다.

B 로그인 상태에서 A 메모 UUID를 직접 요청했을 때:

```text
GET /api/notes/<A의 메모 UUID>
```

결과:

```text
HTTP 404
```

```json
{
  "error": "NOTE_NOT_FOUND"
}
```

B 자신의 메모 UUID를 직접 요청했을 때:

```text
GET /api/notes/<B의 메모 UUID>
```

결과:

```text
HTTP 200
```

따라서 로그인 여부뿐 아니라 메모 소유권까지 서버에서 확인합니다.

### 4단계 DB 권한 확인

`anon`은 다음 권한이 모두 없어야 합니다.

```text
SELECT  false
INSERT  false
UPDATE  false
DELETE  false
```

`authenticated`는 다음 네 권한만 가져야 합니다.

```text
SELECT  true
INSERT  true
UPDATE  true
DELETE  true
```

RLS 정책은 다음 네 개입니다.

```text
vault_notes_select_own
vault_notes_insert_own
vault_notes_update_own
vault_notes_delete_own
```

---

## 4단계 100점 추가 확인

### 1. 비로그인 API는 JSON 오류와 401 또는 403을 반환

로그인하지 않은 상태에서:

```text
/api/notes
```

를 요청하면 빈 화면이나 HTML이 아니라 JSON 오류를 반환해야 합니다.

예:

```json
{
  "error": "AUTH_REQUIRED"
}
```

상태 코드는 401 또는 403이어야 합니다.

### 2. `/aleph.json`이 배포되어 있어야 함

빌드 과정에서 `public/aleph.json`이 자동 생성됩니다.

배포 후 다음 주소가 열려야 합니다.

```text
https://choi-bujang-secret-vault-inky.vercel.app/aleph.json
```

`aleph.json`은 배포 저장소, 커밋, 단계 정보를 심판이 확인하는 데 사용합니다.

### 3. 첫 화면에 보안 헤더가 있어야 함

Vercel 응답에는 다음 헤더를 추가합니다.

```text
X-Content-Type-Options: nosniff
```

`vercel.json`의 `headers` 설정으로 적용합니다.

---

## 4단계 제출 전 확인

아래 항목을 모두 확인합니다.

- A와 B는 각자 자기 메모만 볼 수 있는가?
- A와 B는 자기 메모를 추가·수정·삭제할 수 있는가?
- B가 A의 메모 UUID를 직접 요청하면 거부되는가?
- `anon`에는 `vault_notes` 권한이 없는가?
- `authenticated`에는 SELECT·INSERT·UPDATE·DELETE만 있는가?
- RLS의 SELECT·INSERT·UPDATE·DELETE 정책이 모두 `auth.uid() = owner_id`를 기준으로 하는가?
- 비로그인 `/api/notes` 요청이 JSON 오류와 401 또는 403으로 거부되는가?
- `/aleph.json`이 배포 주소에서 열리는가?
- 첫 화면 응답에 `X-Content-Type-Options: nosniff`가 있는가?
- 서버 전용 키, 토큰, 비밀번호가 Git 저장소나 제출 묶음에 포함되지 않았는가?