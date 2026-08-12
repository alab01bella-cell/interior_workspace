# 운영형 MVP 아키텍처

## 1. 목표와 경계

Interior Workspace는 인테리어 업체가 Google 계정으로 가입하고, 로그인 없이 접근 가능한 업체별 공개 링크로 고객 상담을 받는 SaaS다. 운영자 시스템은 업체 계정·요금제·Google 연결 상태만 보관한다. 고객 답변, 주소, 연락처, 상담 원본과 사진은 업체 소유 Google Drive에만 영구 저장한다.

서버가 접수를 처리하는 동안 고객 데이터를 메모리로 전달받아 Google API로 전송하는 것은 필요하지만, 운영자 DB·파일 스토리지·캐시·로그·분석 도구에는 저장하지 않는다. 현재 localStorage 프로토타입의 UI와 흐름은 유지하며 저장 경계만 순차적으로 교체한다.

## 2. 전체 시스템 구조

```text
업체 브라우저 ── Google 로그인 ──> Next.js/Vercel 서버 ──> Supabase Auth/PostgreSQL
      │                                  │                         (업체 메타데이터만)
      └── Drive 연결 동의 ────────────────┼── Google OAuth/Token endpoint
                                         └── Google Drive + Sheets API

고객 브라우저 ── /consult/{workspaceSlug} ──> 공개 접수 API
                                              │
                                              ├── 업체/연결 상태 조회 (고객 데이터 없음)
                                              ├── 입력 검증·rate limit·중복 방지
                                              └── 업체 Google Drive/Sheet에 직접 저장
```

공개 접수 API는 업체 로그인 세션에 의존하지 않는다. `workspaceSlug`로 활성 workspace를 찾고 서버만 복호화할 수 있는 refresh token으로 access token을 갱신하여 해당 업체 Drive에 쓴다.

## 3. 구성요소별 역할

### 프론트엔드

- Next.js App Router의 현재 대시보드, 상담목록, 상세, 8단계 체크리스트 UI를 유지한다.
- 업체 화면은 Supabase Auth 세션을 요구하고, 서버가 반환한 업체 Drive 데이터만 렌더링한다.
- 공개 체크리스트는 로그인 없이 렌더링하며 `workspaceSlug`와 공개 설정만 받는다.
- 브라우저는 Google access/refresh token, Drive 내부 ID, DB 서비스 키를 받지 않는다.
- 파일 선택 단계에서 UX 목적의 크기·형식 사전 검사를 하되 서버 검증을 최종 기준으로 한다.

### Next.js 서버

- 인증 callback, 세션 검증, Drive 연결 callback, 공개 접수 API를 담당한다.
- workspace 소유권과 slug 상태를 매 요청 검증한다.
- 고객 입력을 스키마로 검증하고 정규화한 뒤 Drive/Sheets API에 직접 기록한다.
- refresh token을 복호화하는 유일한 애플리케이션 계층이다.
- 고객 개인정보가 포함된 request body, Google 응답, Sheet 행을 로그에 남기지 않는다.

### 운영자 DB

- Supabase PostgreSQL에 업체 사용자 1명당 최소 workspace 메타데이터를 저장한다.
- 고객 상담 답변, 첨부파일 메타데이터, Drive 링크, Sheet 행 복제본은 저장하지 않는다.
- 인증 주체(`googleSub`), 공개 식별자(`workspaceSlug`), 요금제, 온보딩 및 Google 연결 상태를 관리한다.
- RLS와 서버 권한 검사를 함께 적용한다. 공개 제출 API는 service-role을 클라이언트에 노출하지 않고 제한된 서버 경로로만 DB를 조회한다.

### Google API

- Google Identity/OIDC: 업체 로그인 신원 확인.
- Google OAuth 2.0: 업체가 없는 동안에도 Drive에 쓰기 위한 offline 권한 획득.
- Drive API: 루트/하위 폴더, settings.json, PDF, 첨부파일 생성 및 조회.
- Sheets API: 상담목록 Sheet 헤더 관리, 상담 행 append/read/update.

## 4. 업체 로그인과 Drive 연결 흐름

로그인과 Drive 연결은 의도적으로 분리한다.

1. 업체가 Google로 로그인한다. 기본 프로필 범위(`openid email profile`)만 요청한다.
2. 서버가 검증된 Google `sub`로 사용자를 upsert하고 앱 세션을 만든다.
3. 온보딩에서 고유한 `workspaceSlug`를 정한다.
4. 별도의 “Google Drive 연결” 동작에서 `drive.file`과 offline access를 요청한다.
5. callback 서버가 authorization code를 token으로 교환하고 refresh token을 암호화한다.
6. Drive 구조를 idempotent하게 생성/재사용하고 ID를 운영자 DB에 기록한다.
7. 이후 업체 화면과 공개 접수는 서버가 필요할 때 access token을 갱신한다.

로그인은 성공했지만 Drive가 연결되지 않은 사용자는 관리 화면에 들어갈 수 있으나 공개 링크 활성화와 실제 접수는 차단한다.

## 5. 고객 공개 접수 흐름

1. 고객이 `/consult/[workspaceSlug]`를 연다.
2. 서버는 slug에 대응하는 활성 workspace의 공개 가능 여부만 반환한다. `userId`, Google 파일 ID, email은 반환하지 않는다.
3. 고객이 기존 8단계 체크리스트를 작성한다.
4. 서버는 Origin/콘텐츠 길이/rate limit/idempotency key를 확인하고 모든 필드를 재검증한다.
5. 서버가 workspace의 암호화된 refresh token을 복호화하고 단기 access token을 발급받는다.
6. submission ID를 생성하고 고객 첨부 폴더를 생성한다. 각 파일을 검사·업로드한다.
7. 상담 원본 파일을 생성하는 단계가 활성화된 경우 상담원본 폴더에 저장한다.
8. Sheet에 파일 ID/링크와 답변을 한 행으로 append한다.
9. 완료 응답에는 불투명한 접수번호만 반환한다.

Drive 장애 시 고객 데이터를 운영자 DB에 임시 보관하지 않는다. MVP에서는 명확한 재시도 안내를 반환한다. 부분 저장은 동일 idempotency key와 Drive `appProperties`로 찾아 이어서 처리하거나 정리할 수 있게 설계한다.

## 6. 업체별 데이터 격리

- 인증 주체의 `userId`와 요청 workspace의 소유자를 서버에서 매번 비교한다.
- `workspaceSlug`는 공개 라우팅 키일 뿐 권한 증명이 아니다.
- refresh token과 Drive/Sheet ID는 해당 workspace row에서만 조회하며 클라이언트 응답에서 제거한다.
- Drive 작업마다 DB에서 얻은 `googleDriveRootFolderId`/`consultationSheetId`를 시작점으로 사용하고, 임의의 클라이언트 파일 ID를 신뢰하지 않는다.
- 각 Drive 파일에 `appProperties`로 앱 schema와 submission ID를 넣어 다른 업체 파일과 혼동하지 않는다.
- Supabase RLS는 로그인 사용자가 자기 row만 읽도록 하고, 서버 service-role 사용 경로도 명시적 소유권 검사 함수를 통과시킨다.
- 운영자 지원 계정이 고객 Drive 데이터를 열람하는 기능은 만들지 않는다.

## 7. localStorage 저장소 교체

현재 `ConsultationRepository`의 `list`, `findById`, `save`, `updateStatus`가 교체 경계다. 다만 현재 동기식 브라우저 인터페이스를 그대로 네트워크에 적용하지 않고 다음처럼 비동기 port로 확장한다.

```text
ConsultationReader: list(), findById(), getDashboardSummary()
ConsultationWriter: submitPublic(), updateStatus()
Prototype adapter: LocalStorageConsultationRepository
Production adapter: Server API → GoogleDriveConsultationRepository
```

- 1단계: 기존 adapter를 유지하며 UI가 repository를 직접 import하지 않도록 서비스 계층을 둔다.
- 2단계: 인증 업체 화면의 read/status 변경만 서버 adapter로 전환한다.
- 3단계: `/consult/demo`는 회귀 테스트용으로 유지하고 `/consult/[workspaceSlug]` 제출만 서버 adapter를 사용한다.
- 4단계: 대시보드 selector 입력을 서버 결과로 바꾼다.
- 5단계: 운영 기능이 동등해진 뒤 localStorage와 mock fallback을 제거한다.

이 과정에서 현재 `ChecklistSubmission`/`StoredConsultation` mapper는 도메인 변환의 출발점으로 재사용하되, Google 저장 DTO와 화면 DTO를 분리한다.

## 8. 개발 환경과 운영 환경

| 항목 | 개발 | 운영 |
|---|---|---|
| URL | localhost | HTTPS 고정 도메인 |
| DB | 별도 Supabase 개발 프로젝트 | 운영 Supabase 프로젝트 |
| OAuth client | 개발 client/redirect URI | 검증된 운영 client/redirect URI |
| Drive | 전용 테스트 Google 계정 | 업체별 실제 Google Drive |
| 암호화 키 | 개발 전용 키 | Vercel encrypted env 또는 secret manager, 버전 관리 |
| rate limit | 낮은 임계값/테스트 bypass | 공유 저장소 기반 강제 적용 |
| 로그 | synthetic 데이터만 | 구조화 로그, 개인정보 필드 금지 |
| 오류 | 상세 원인을 서버에서 확인 | 고객에게 일반화된 오류 코드만 제공 |
| 데이터 | 가짜 고객 데이터 | 실제 개인정보, 최소 보존 원칙 적용 |

preview deployment마다 운영 OAuth/DB를 공유하지 않는다. Google redirect URI와 쿠키 도메인이 고정되지 않는 임시 preview는 mock 또는 전용 staging 도메인을 사용한다.

## 9. 운영자 DB 후보 비교와 권고

| 기준 | Supabase PostgreSQL | 일반 PostgreSQL + Prisma | Neon PostgreSQL + Drizzle(대안) |
|---|---|---|---|
| 초기 구축 | DB/Auth/UI/RLS가 통합되어 낮음 | DB 제공자·인증·migration·관리 UI를 각각 구성 | serverless DB는 쉽지만 인증과 관리 계층 별도 |
| 초기 비용 | Free 가능, 운영 Pro는 현재 월 $25부터 | 선택한 호스팅·인증 비용에 따라 다름 | 사용량 기반/scale-to-zero에 유리 |
| Google OAuth | Supabase Auth가 기본 지원 | Auth.js 등 별도 구성 | 별도 인증 필요 |
| Vercel 적합성 | 공식 Marketplace, pooler 사용 가능 | provider와 pool 설정에 좌우 | 공식 Marketplace와 serverless driver 강점 |
| 토큰 암호화 | 앱 계층 AES-GCM 또는 Vault 가능 | 앱 계층/KMS를 직접 설계 | 앱 계층/KMS를 직접 설계 |
| 관리자 확장 | SQL/RLS/대시보드/Edge Functions 선택지 | Prisma schema와 custom admin 자유도 높음 | SQL 기반 확장, 관리 기능 별도 |
| 1인 유지보수 | 가장 낮음 | 가장 높음 | 중간 |
| 유료 SaaS 확장 | Postgres 이식성, Auth/RLS 장점 | 높은 통제력과 이식성 | serverless 확장 및 branching 장점 |

### 추천: Supabase PostgreSQL + Supabase Auth

현재 팀 규모와 최소 운영자 데이터 모델에는 Supabase가 가장 적합하다. Google 로그인, Postgres, RLS, 관리 UI, Vercel 연결을 한 공급자에서 시작할 수 있고 고객 데이터는 Drive에 두므로 DB 용량 요구도 작다. 단, Supabase Auth의 Google provider token 갱신에 의존하지 않는다. Drive 권한은 별도의 서버 OAuth flow로 받고 refresh token은 애플리케이션이 암호화해 저장한다.

단점은 공급자 기능에 대한 결합, Free 프로젝트 pause, 운영 시 최소 고정비, RLS 오설정 위험이다. Vault의 decrypted view 권한도 주의가 필요하므로 MVP의 사용자별 refresh token은 versioned AES-256-GCM 앱 암호화를 우선 권고한다. 향후 일반 PostgreSQL로 옮길 수 있도록 핵심 schema와 repository는 Supabase 전용 API에 과도하게 결합하지 않는다.

## 10. 단계별 구현 순서

1. 도메인 port와 환경 경계를 문서/테스트로 고정한다.
2. Supabase 개발/운영 프로젝트와 최소 users/workspaces table, RLS를 준비한다.
3. Supabase Auth Google 로그인과 보호 라우트를 구현한다.
4. 별도 Drive authorization code flow, token 암호화/갱신/해제를 구현한다.
5. Drive 폴더/Sheet provisioning을 idempotent하게 구현한다.
6. `workspaceSlug` 생성·예약·공개 상태를 구현한다.
7. 파일 없는 공개 접수 API와 Sheet append를 먼저 구현한다.
8. 첨부파일 검사·업로드와 부분 실패 복구를 추가한다.
9. 상담 원본 PDF 생성을 추가한다.
10. 업체 상담목록/상세/상태 변경 adapter를 Google 저장소로 전환한다.
11. 대시보드 집계를 실제 데이터에 연결한다.
12. 회귀 검증 후 mock/localStorage를 제거한다.

## 참고 자료

- [Google OAuth 2.0 web server flow](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase pricing](https://supabase.com/pricing)
- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)
