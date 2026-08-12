# 운영자 데이터 모델

## 1. 저장 원칙

운영자 DB는 업체 계정과 Google 연결을 운영하는 최소 control plane이다. 고객 이름, 전화번호, 주소, 체크리스트 답변, 상담 상태, 사진, PDF 및 이들의 Drive 링크는 저장하지 않는다. 이 데이터는 업체 Google Drive/Sheet에만 존재한다.

초기 MVP는 사용자 1명당 workspace 1개를 가정해 아래 필드를 하나의 `workspaces` 성격 row로 시작할 수 있다. 유료 SaaS에서 다중 사용자/다중 workspace가 필요해지면 `users`, `workspaces`, `workspace_memberships`, `google_connections`로 분리한다.

## 2. 최소 필드

| 필드 | 권장 타입 | 필수 | 목적 | 보안 및 무결성 주의사항 |
|---|---|---:|---|---|
| `userId` | `uuid` | 예 | 앱 내부 사용자/row PK 또는 Supabase `auth.users.id` FK | 공개 URL에 노출하지 않는다. FK 삭제 정책을 명시한다. |
| `googleSub` | `text` | 예 | Google 계정의 불변 OIDC subject | `UNIQUE`, email 대신 계정 식별에 사용. 토큰의 issuer/audience 검증 후만 기록. |
| `email` | `citext` 또는 정규화 `text` | 예 | 로그인 표시·운영 연락 | 계정 식별 PK로 쓰지 않는다. 로그/분석 도구 전송 최소화. 변경 가능성을 고려. |
| `name` | `text` | 예 | 업체 사용자 표시명 | HTML escape, 길이 제한. 인증 provider 갱신 정책 필요. |
| `profileImage` | `text` nullable | 아니요 | Google 프로필 이미지 URL | 외부 URL allowlist/프록시 정책, 장기 불변값으로 가정하지 않음. |
| `workspaceSlug` | `text` | 예 | `/consult/[workspaceSlug]` 공개 라우팅 키 | `UNIQUE`, 소문자/숫자/하이픈 제한, 예약어·길이 제한. 내부 ID/메일 유추값 금지. |
| `plan` | enum/text | 예 | `free`, `pro` 등 기능·한도 결정 | 서버만 변경. 결제 provider 결과 검증 없이 승격 금지. 기본값 `free`. |
| `createdAt` | `timestamptz` | 예 | 가입 시각 | DB `now()` 기본값, 클라이언트 값 불신. |
| `updatedAt` | `timestamptz` | 예 | row 변경 시각 | trigger 또는 서버에서 일관되게 갱신. |
| `onboardingCompleted` | `boolean` | 예 | 공개 링크 사용 가능 여부 판단의 한 요소 | 기본값 `false`; Drive provisioning 성공 전 true 금지. |
| `encryptedRefreshToken` | `text` nullable | 조건부 | 업체 부재 시 Drive access token 발급 | 평문 금지. ciphertext뿐 아니라 key version/nonce/auth tag를 포함한 envelope 저장. 클라이언트/RLS 일반 조회에서 제외. |
| `googleDriveRootFolderId` | `text` nullable | 조건부 | 앱이 생성/재사용한 업체 루트 폴더 | 공개 응답 금지. 연결 계정으로 해당 ID 재검증. 클라이언트 입력으로 덮어쓰기 금지. |
| `consultationSheetId` | `text` nullable | 조건부 | 상담목록 Google Sheet | 공개 응답 금지. root/소유권/appProperties 확인 후 사용. |
| `googleConnectionStatus` | enum/text | 예 | 연결 상태 및 접수 가능성 | `not_connected`, `connecting`, `connected`, `reauth_required`, `revoked`, `error` 권장. 상세 Google 오류는 별도 보안 로그에만 제한적으로 기록. |

`조건부` 필드는 Google 연결 전에는 null이며 `connected` 상태에서는 모두 유효해야 한다. DB check constraint 또는 트랜잭션 서비스 로직으로 이 invariant를 보장한다.

## 3. 권장 논리 schema

```text
workspace_accounts
  user_id uuid primary key references auth.users(id)
  google_sub text unique not null
  email citext not null
  name text not null
  profile_image text null
  workspace_slug text unique not null
  plan plan_enum not null default 'free'
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
  onboarding_completed boolean not null default false
  encrypted_refresh_token text null
  google_drive_root_folder_id text null
  consultation_sheet_id text null
  google_connection_status google_connection_status_enum not null default 'not_connected'
```

물리 컬럼은 snake_case, 애플리케이션 DTO는 요청된 camelCase를 사용할 수 있다. refresh token key version을 별도 컬럼으로 두거나 ciphertext envelope에 포함한다.

## 4. refresh token 암호화

- 서버 전용 256-bit master key로 AES-256-GCM authenticated encryption을 사용한다.
- token마다 무작위 96-bit nonce를 생성하고 `userId`, provider, key version을 AAD에 결합한다.
- 저장 예: `v1.<keyId>.<base64Nonce>.<base64Ciphertext>.<base64Tag>`.
- 키는 DB와 분리된 Vercel encrypted environment variable 또는 secret manager에 둔다.
- 복호화는 Google token refresh 직전에 서버에서만 수행하고 평문을 로그·예외·metric에 넣지 않는다.
- 키 회전 시 새 쓰기는 최신 key로, 읽기는 keyId에 맞는 구키를 허용하고 background re-encryption한다.
- 연결 해제 시 Google revoke를 시도한 뒤 ciphertext와 Drive/Sheet ID를 트랜잭션으로 제거한다.

Supabase Vault도 authenticated encryption을 제공하지만 decrypted view 접근 권한과 이식성을 세밀하게 관리해야 한다. 사용자별 token에는 앱 계층 envelope encryption을 기본으로 하고, OAuth client secret 같은 시스템 비밀에는 관리형 secret storage를 사용한다.

## 5. 접근 제어

- 로그인 사용자는 자신의 비민감 프로필/연결 상태만 조회 가능하다.
- `encryptedRefreshToken`, Drive root ID, Sheet ID는 browser-facing select에서 제외하고 server-only repository로만 읽는다.
- 공개 slug lookup은 `workspaceSlug`, 표시용 업체명, 접수 가능 여부만 projection한다.
- service-role은 Next.js 서버 환경에서만 사용하며 브라우저 bundle에 포함하지 않는다.
- 운영자 console도 refresh token 원문/암호문을 표시하지 않는다.
- DB backup에도 ciphertext만 존재해야 한다.

## 6. 고객 데이터 비저장 확인

다음 항목은 운영자 DB table에 만들지 않는다.

- consultation/customer/answer/attachment/PDF row
- Sheet row cache 또는 검색 index
- 고객 PII가 포함된 job payload/dead-letter queue
- Drive `webViewLink` 복제본

실제 검색·대시보드는 로그인 요청 시 업체 Sheet를 읽어 필요한 화면 DTO를 생성한다. 성능 때문에 cache가 필요해지는 시점에는 원칙 변경과 개인정보 영향 평가를 별도 승인받아야 한다.

## 참고 자료

- [Supabase Auth and RLS](https://supabase.com/docs/guides/auth)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [Google OAuth security best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
