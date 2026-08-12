# localStorage 프로토타입 운영 전환 계획

## 1. 현재 기준점

`prototype-v1`의 현재 구조:

- `LocalStorageConsultationRepository`가 `interior-workspace:consultations:v1` 문서를 저장한다.
- `ConsultationRepository`는 `list`, `findById`, `save`, `updateStatus` 경계를 제공한다.
- mock 상담과 localStorage 상담을 selector에서 합친다.
- `/consult/demo`가 기존 8단계 체크리스트를 제공한다.
- `/consultations`, `/consultations/[id]`가 목록/상세를 표시한다.
- 대시보드가 같은 selector 결과로 상태 수, 오늘 일정, 최근 상담을 집계한다.
- 선택 파일은 metadata만 localStorage에 저장하며 실제 binary는 영구 저장하지 않는다.

운영 전환에서는 UI와 문항을 유지하고 데이터 source를 adapter 단위로 교체한다. `prototype-v1` 태그는 변경하지 않는다.

## 2. 목표 adapter 구조

```text
UI components
  └── application services / hooks
        ├── Prototype adapters
        │     └── LocalStorageConsultationRepository + mock
        └── Production adapters
              ├── AuthenticatedConsultationApiClient
              ├── PublicSubmissionApiClient
              └── server GoogleDriveConsultationRepository
                    ├── Drive file adapter
                    └── Sheets row adapter
```

현재 repository는 동기식 브라우저 API이므로 production port는 Promise 기반으로 새로 정의한다. UI가 구체 repository singleton을 직접 import하지 않게 한 후 읽기/쓰기 경계를 분리한다.

## 3. 단계별 전환

### 1. 인증 기반 구조

- Supabase Auth Google 로그인과 server-side session 검증을 도입한다.
- 공개 `/consult/demo`와 업체 보호 route 경계를 분리한다.
- 이 단계에서는 기존 localStorage 데이터 화면을 유지한다.
- 완료 조건: 미로그인 업체 route 차단, 공개 데모 회귀 통과.

### 2. 운영자 DB

- 업체 최소 metadata schema, RLS, migration, 개발/운영 환경 분리를 만든다.
- 고객 상담 table은 만들지 않는다.
- 완료 조건: 자기 workspace만 조회/수정, service key 비노출.

### 3. Google Drive 연결

- 로그인과 별도인 authorization code flow를 구현한다.
- refresh token AES-GCM 암호화, 갱신, revoke, reauth 상태를 구현한다.
- Drive/Sheet provisioning을 idempotent하게 만든다.
- 완료 조건: 재연결/중복 callback에도 기존 폴더를 삭제하거나 중복 생성하지 않음.

### 4. 업체별 workspaceSlug

- slug 생성/변경/예약어/uniqueness와 공개 가능 projection을 구현한다.
- `/consult/[workspaceSlug]`는 처음에는 기존 ChecklistPage를 같은 schema로 렌더링한다.
- `/consult/demo`는 개발/회귀 기준으로 유지한다.
- 완료 조건: slug에서 내부 userId/Google ID 비노출, 두 업체 격리 테스트.

### 5. 실제 공개 접수 API

- 파일을 제외한 답변 DTO부터 구현한다.
- 서버 validation, idempotency, rate limit, PII log redaction을 적용한다.
- production `PublicSubmissionApiClient`만 새 route에서 사용하고 demo는 localStorage adapter를 유지한다.
- 완료 조건: 업체 로그아웃 상태에서 제출 API가 해당 업체 credential을 선택.

### 6. Google Sheet 저장

- canonical header, schema version, header 확장, append 및 duplicate 확인을 구현한다.
- `ChecklistSubmission` mapper를 Google row mapper로 확장하되 화면 type과 분리한다.
- 완료 조건: 모든 기존 문항 값 보존, 기존 열/행 삭제 없음, 수식 주입 방지.

### 7. 사진 업로드

- 파일 형식/크기/개수/magic-byte 검사를 추가한다.
- 고객별 folder와 appProperties idempotency를 구현한다.
- 부분 실패/재시도 검증 후 공개 route에 파일 업로드를 켠다.
- 완료 조건: token client 비노출, 중복 파일 없음, 악성 형식 거부.

### 8. 상담 원본 PDF

- 검증된 답변으로 server-side PDF를 생성해 상담원본 folder에 저장한다.
- PDF/첨부/Sheet를 submission ID로 연결한다.
- 기존 공개/관리 흐름이 안정된 뒤 독립 feature flag로 활성화한다.
- 완료 조건: 운영자 서버 영구 저장 없음, 한글/페이지/링크 회귀 검증.

### 9. 대시보드 실제 데이터 연결

- Google Sheet reader를 화면 `Consultation` DTO로 매핑한다.
- 먼저 `/consultations`, 다음 `/consultations/[id]`, 마지막 대시보드 selector를 전환한다.
- status 변경은 Sheet의 submission ID 행을 안전하게 찾아 update한다.
- 완료 조건: 목록·상세·상태·통계가 동일 Google source를 사용하고 업체 간 격리됨.

### 10. localStorage 제거

- production route에 mock/localStorage import가 없는지 확인한다.
- `/consult/demo` 유지 여부를 결정하고 demo 전용이면 명확히 격리한다.
- migration 기간의 feature flag와 rollback adapter를 제거한다.
- localStorage key를 강제로 삭제하지 않는다. 브라우저의 기존 prototype 데이터는 운영 데이터로 자동 업로드하지 않는다.
- 완료 조건: 기능 동등성, 보안 테스트, 관측성, 운영 runbook 승인.

## 4. 단계별 병행/rollback 전략

| 단계 | 기존 경로 | 새 경로 | rollback |
|---|---|---|---|
| 인증/DB | localStorage 화면 유지 | 업체 session/control plane | auth feature flag 비활성화 |
| 공개 접수 | `/consult/demo` localStorage | `/consult/[slug]` API/Sheet | 공개 slug 비활성, demo 영향 없음 |
| 목록 | mock + localStorage | Google Sheet reader | 사용자별 read adapter flag |
| 상태 변경 | localStorage write | Sheet row update | production write feature 중지 |
| 대시보드 | 기존 selector | server summary DTO | read adapter 원복 |

dual-write는 고객 데이터를 운영자 localStorage/DB에 복제하므로 사용하지 않는다. 대신 route/tenant 단위로 source를 명확히 하나만 선택한다.

## 5. 데이터 계약 유지

- 체크리스트 field name, option value, 필수 검증을 schema contract로 고정한다.
- `schemaVersion`을 제출과 Sheet에 기록한다.
- 화면 DTO, 공개 제출 DTO, Google row DTO를 분리한다.
- 배열/boolean/date/budget 직렬화 규칙을 계약 테스트한다.
- 기존 `ConsultationStatus` 네 값을 유지하고 Sheet status validation을 추가한다.
- localStorage v1 데이터를 운영 Google Drive로 자동 migration하지 않는다. 실제 고객 데이터로 간주할 근거가 없기 때문이다.

## 6. 각 단계 공통 완료 기준

- lint, TypeScript, production build 통과
- 기존 8단계 문항/선택지 snapshot 또는 schema 회귀 통과
- 모바일/데스크톱 주요 흐름 확인
- workspace A/B 교차 접근 차단 테스트
- 고객 PII/token이 DB와 log에 남지 않는지 확인
- Google timeout, 401/403, 429, 5xx 및 재시도 테스트
- rollback 방법과 운영 상태 코드 문서화

## 7. 주요 위험과 대응

- refresh token 무효화: 연결 상태 machine과 재연결 UX를 먼저 구현한다.
- 공개 접수 중 Google 장애: PII queue 없이 안전한 재시도와 idempotency를 제공한다.
- Drive/Sheet 비트랜잭션: staging appProperties와 Sheet append를 commit point로 사용한다.
- serverless 파일 제한: 낮은 파일 한도로 시작하고 실제 Vercel 환경에서 측정한다.
- Sheet 확장/성능: append/read 범위를 제한하고 header schema version을 관리한다.
- tenant 격리 실수: tenant-aware repository만 공개하고 두 업체 통합 테스트를 CI 필수로 둔다.
- OAuth 검증/심사: 최소 `drive.file` 범위, 개인정보처리방침, 검증 일정을 초기 계획에 포함한다.
