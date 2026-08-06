# Interior Workspace

인테리어 상담 관리 SaaS의 운영형 MVP 프로토타입입니다. Next.js와 OpenNext를 사용해 Cloudflare Workers에서 실행되며, 업체 화면은 Google OpenID Connect 로그인으로 보호합니다.

## 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. 실제 Google 로그인 검증 전에는 `.env.local`에 유효한 OAuth 값을 입력해야 합니다.

## Google Cloud OAuth 설정

Google Cloud Console에서 OAuth 동의 화면을 구성하고 **OAuth 클라이언트 ID > 웹 애플리케이션** 유형의 클라이언트를 만듭니다.

승인된 JavaScript 원본:

```text
http://localhost:3000
https://<worker-name>.<subdomain>.workers.dev
```

승인된 리디렉션 URI:

```text
http://localhost:3000/api/auth/google/callback
https://<worker-name>.<subdomain>.workers.dev/api/auth/google/callback
```

요청 scope는 `openid email profile`뿐입니다. Drive 권한과 오프라인 접근을 요청하지 않으며 refresh token을 저장하지 않습니다.

## 환경변수

| 이름 | 민감 정보 | 사용 시점 | 설명 |
| --- | --- | --- | --- |
| `GOOGLE_CLIENT_ID` | 아니요 | 런타임 | Google OAuth 웹 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | 예 | 런타임 | authorization code 교환용 비밀값 |
| `AUTH_SECRET` | 예 | 런타임 | OAuth 임시 상태와 로그인 세션 암호화 키, 32자 이상 |
| `AUTH_URL` | 아니요 | 런타임 | 앱 공개 기본 URL, 끝 슬래시 제외 |

Next.js/OpenNext 빌드는 이 값을 읽거나 인라인하지 않으므로 **Workers Builds의 Build Variables and Secrets에는 필수값이 없습니다.** 네 값은 배포된 Worker의 **Settings > Variables & Secrets**에 런타임 값으로 설정해야 합니다. Workers Builds 변수는 런타임에 전달되지 않습니다.

민감값은 Wrangler로 다음과 같이 등록합니다. 실제 값은 프롬프트에서 입력합니다.

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put AUTH_SECRET
```

`GOOGLE_CLIENT_ID`와 `AUTH_URL`은 Cloudflare Dashboard의 Worker **Settings > Variables & Secrets**에서 일반 텍스트 변수로 등록할 수 있습니다. 운영 정책상 모두 secret으로 관리하려면 다음 명령을 사용해도 됩니다.

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put AUTH_URL
```

로컬 개발 값은 `.env.local`에 둡니다. `.env*`는 `.env.example`을 제외하고 Git에서 무시됩니다.

## 인증 구조

- Google OIDC Authorization Code + PKCE 흐름
- `state` 및 OIDC `nonce` 검증
- Google JWKS와 `jose`를 사용한 ID token 서명·issuer·audience 검증
- AES-GCM 암호화 세션 쿠키 (`httpOnly`, `secure`, `sameSite=lax`, 7일 유지)
- 로그아웃 POST 요청의 Origin 검증
- 세션에는 `googleSub`, `email`, `name`, `profileImage`만 유지
- 사용자 DB 연결을 위한 `UserRepository` interface만 정의하고 구현체는 연결하지 않음

## 라우트

공개:

- `/login`
- `/consult/demo` — localStorage 기반 체험용 체크리스트
- `/api/auth/google`
- `/api/auth/google/callback`

인증 필요:

- `/dashboard`
- `/consultations`
- `/consultations/[id]`

`/`는 세션이 없으면 `/login`, 있으면 `/dashboard`로 이동합니다. `/api/auth/session`은 현재 사용자를 조회하고 `/api/auth/logout`은 세션을 종료합니다.

## 검증

```bash
npm run lint
npm run typecheck
npm run build
npm run build:cloudflare
```

실제 Google 로그인 성공 검증에는 Google Cloud OAuth 설정과 유효한 런타임 환경변수가 필요합니다.

## Cloudflare D1

애플리케이션은 `DB` binding을 통해 D1에 접근합니다. `wrangler.jsonc`의 `database_id` placeholder는 실제 D1을 생성한 뒤 발급된 ID로 교체합니다.

로컬 migration 적용과 확인:

```bash
npx wrangler d1 migrations apply interior-workspace --local
npx wrangler d1 migrations list interior-workspace --local
```

개발 seed는 migration과 분리되어 운영에 자동 적용되지 않습니다. 필요한 경우 로컬 DB에만 명시적으로 실행합니다.

```bash
npx wrangler d1 execute interior-workspace --local --file=./seeds/development.sql
```

운영 D1을 생성하고 `database_id`를 설정한 이후 운영 migration은 다음처럼 별도로 적용합니다.

```bash
npx wrangler d1 migrations apply interior-workspace --remote
```

운영 migration은 적용 전에 Cloudflare D1 백업과 대상 database 확인을 선행합니다.
