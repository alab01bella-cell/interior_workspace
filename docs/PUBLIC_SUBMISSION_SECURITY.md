# 공개 상담 접수 보안

## 1. 공개 링크와 식별자

공개 URL은 `/consult/[workspaceSlug]`를 사용한다. slug는 업체가 공유하는 공개 라우팅 키이며 비밀값이나 인증 수단이 아니다.

- slug는 6~48자 소문자, 숫자, 하이픈으로 제한한다.
- email, Google `sub`, DB UUID, 순차 번호를 변형해 만들지 않는다.
- 충돌 방지를 위해 무작위 entropy를 포함하거나 업체가 선택한 값의 uniqueness를 DB에서 보장한다.
- 예약어(`admin`, `api`, `login`, `demo` 등)와 공격적/혼동 문자를 차단한다.
- 공개 lookup 응답은 업체 표시명, branding, 접수 가능 여부만 포함한다.
- slug 변경 시 이전 URL 폐기/redirect 정책을 명시하고 brute-force를 권한 우회로 보지 않는다.

## 2. 서버 입력 검증

클라이언트 검증은 UX일 뿐이다. 서버는 공유 schema로 다음을 검증한다.

- 알려진 필드만 허용하고 unknown key 제거 또는 요청 거부
- 문자열 trim, Unicode 정규화, 필드별 최대 길이
- enum/배열 값은 현재 체크리스트 선택지 allowlist와 일치
- 필수값: 주소, 평수, 상담 희망일, 예산, 이름, 전화, 개인정보 동의
- 날짜 형식/범위, 전화번호 숫자 길이, 예산 정수 범위
- 배열 개수와 중복 제한
- addressDetail 등 자유 텍스트는 HTML로 해석하지 않고 text로 저장
- Sheet formula injection 방지 (`RAW` 입력 또는 위험 선행문자 처리)
- 전체 body와 multipart part 수 제한

검증 실패는 필드 단위의 안전한 코드만 반환하고 받은 값을 echo하지 않는다.

## 3. rate limiting과 abuse 제어

- key는 `workspaceSlug + privacy-preserving IP hash + route` 조합을 기본으로 한다.
- burst와 sustained 두 구간을 둔다. 예: 1분 소량, 1시간 누적 한도.
- IP 원문 대신 매일 회전하는 서버 secret HMAC을 사용하고 짧은 TTL 뒤 삭제한다.
- Vercel instance memory가 아닌 Upstash Redis 같은 공유 atomic store를 사용한다.
- workspace별 한도로 특정 업체 Drive quota 고갈 공격을 막는다.
- 초과 시 `429`와 일반화된 재시도 시간을 반환한다.
- CAPTCHA는 공격 관측 후 단계적으로 적용하되 개인정보를 추가 수집하는 provider 사용을 검토한다.

rate limit 저장소에는 request body, 이름, 전화, 주소를 넣지 않는다.

## 4. 파일 제한

초기 권장 정책:

- 허용: JPEG, PNG, WebP만. 필요성이 확인되기 전 HEIC/SVG/PDF는 공개 업로드에서 제외.
- 파일당 최대 10 MB, category당 최대 10개, 요청 전체 최대 50 MB보다 낮게 시작하고 Vercel 제한에 맞춰 조정.
- 확장자, browser MIME, magic bytes를 모두 비교한다.
- 이미지 decode 가능 여부, 실제 pixel dimensions, decompression bomb 한도를 확인한다.
- 원본 파일명은 표시용으로만 정제하고 Drive 이름은 서버 규칙으로 생성한다.
- 실행 가능 파일, archive, HTML, SVG, 이중 확장자를 거부한다.

서버리스 request body 한도와 실행 시간을 실제 배포 환경에서 먼저 측정해야 한다. client에 Google token이나 임의 Drive upload URL을 주지 않기 위해 MVP는 서버를 통과시켜 업로드한다.

## 5. 악성 파일 방지

- content signature와 이미지 decoder 검사를 통과한 파일만 Drive에 쓴다.
- 가능하면 metadata 제거 및 안전한 재인코딩을 적용하되 화질/회전 정보를 테스트한다.
- 멀웨어 검사 서비스 도입 전에는 허용 형식을 raster image로 좁힌다.
- 파일 내용을 서버 로그, error tracker breadcrumb, APM payload에 넣지 않는다.
- Drive에 공개 공유 권한을 만들지 않는다.
- 다운로드/미리보기는 업체 인증과 workspace 소유권 확인 후 Google의 권한 있는 link로 이동한다.

## 6. 개인정보 로그 금지

로그에 금지할 값:

- request/response body, FormData, 파일명 원문
- 고객 이름, 전화번호, 주소, 자유서술 답변
- Google token, authorization code, Drive/Sheet API 전체 응답
- signed cookie/session 내용

허용되는 구조화 항목은 request ID, opaque submission ID, workspace 내부 hash, 결과 코드, 단계, 지연시간, 파일 개수/총 byte 정도다. error 객체를 그대로 직렬화하지 않고 Google 오류를 allowlist된 내부 코드로 매핑한다.

## 7. 중복 제출과 원자성

- 체크리스트 진입 또는 최종 제출 직전에 서버가 고엔트로피 idempotency key를 발급한다.
- 같은 workspace/key는 동일 submission ID를 사용한다.
- Drive submission folder의 `appProperties.iwSubmissionId`와 Sheet `submissionId`로 완료 여부를 확인한다.
- 버튼 중복 클릭은 클라이언트에서도 막지만 서버가 최종 보장한다.
- Sheet append 전에 기존 submission ID를 검색한다.
- 부분 업로드 재시도는 기존 파일을 재사용하며 동일 Sheet 행을 두 번 append하지 않는다.
- rate-limit store에는 key 상태와 짧은 TTL만 두고 고객 데이터는 저장하지 않는다.

## 8. 업체 간 접근 차단

- 업체 관리 API는 session `userId`와 workspace 소유자를 비교한다.
- 공개 API는 slug가 가리키는 workspace의 server-side Drive credential만 사용한다.
- client가 `userId`, rootFolderId, sheetId를 지정할 수 없게 한다.
- 모든 Drive 파일 작업은 workspace root와 appProperties를 재검증한다.
- Supabase RLS로 사용자의 own-row access만 허용한다.
- service role 경로에도 tenant-aware repository API를 강제하고 raw DB client 사용을 제한한다.
- 테스트는 두 workspace fixture로 교차 접근 거부를 반드시 포함한다.

## 9. 안전한 오류 응답

고객 응답 예:

- `WORKSPACE_NOT_AVAILABLE`: “현재 상담 접수를 받을 수 없습니다.”
- `INVALID_SUBMISSION`: “입력 내용을 확인해주세요.”
- `RATE_LIMITED`: “잠시 후 다시 시도해주세요.”
- `UPLOAD_REJECTED`: “지원하지 않는 이미지가 포함되어 있습니다.”
- `SUBMISSION_FAILED`: “접수를 완료하지 못했습니다. 잠시 후 다시 시도해주세요.”

DB row 존재 여부, Google 계정 email, token 상태, Drive folder/Sheet ID, stack trace, provider response는 노출하지 않는다. 내부 request ID만 고객지원용으로 제공한다.

## 10. 배포 전 필수 검증

- slug enumeration 및 다른 workspace 접근 테스트
- CSRF/state/Origin 정책 테스트
- schema fuzzing, 큰 payload, 중첩 배열 테스트
- MIME spoofing, polyglot, decompression bomb 테스트
- rate limit 분산 instance 테스트
- token/PII log redaction 테스트
- 중복 클릭·timeout·Google 429/5xx 부분 실패 테스트
- 연결 해제 중 접수 race condition 테스트
