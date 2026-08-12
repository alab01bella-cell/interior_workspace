# Google 로그인 및 Drive OAuth 흐름

## 1. 로그인과 Drive 권한 연결은 다르다

Google 로그인은 업체가 누구인지 확인하고 앱 세션을 만드는 인증(authentication)이다. 범위는 `openid email profile`이며 Google Drive를 읽거나 쓸 권한을 주지 않는다.

Drive 연결은 인증된 업체가 자기 Google Drive에 앱이 파일을 생성·관리하도록 위임하는 권한 부여(authorization)다. 공개 접수는 업체가 브라우저에 없을 때도 실행되므로 offline access와 refresh token이 필요하다. 로그인 성공을 Drive 연결 성공으로 간주하지 않는다.

권장 구성은 Supabase Auth로 로그인 세션을 관리하고, 별도의 서버 측 Google OAuth client/authorization code flow로 Drive 권한을 연결하는 것이다. Supabase Auth도 provider token을 반환할 수 있지만 provider token 갱신을 대신 관리하지 않으므로 장기 Drive 연결의 source of truth로 사용하지 않는다.

## 2. Authorization code flow

### 로그인

1. 브라우저가 Supabase Auth의 Google login을 시작한다.
2. Google은 기본 프로필 동의를 받고 callback으로 code를 보낸다.
3. Supabase/서버가 code를 교환하고 앱 session cookie를 설정한다.
4. 서버는 검증된 `sub`, issuer, audience를 기준으로 운영자 row를 upsert한다.

### Drive 연결

1. 로그인된 업체가 “Drive 연결”을 선택한다.
2. 서버가 암호학적으로 안전한 `state`와 PKCE verifier/challenge를 만들고 짧은 수명의 HttpOnly SameSite 쿠키 또는 서버 저장소에 연결한다.
3. Google authorization endpoint로 redirect한다. `response_type=code`, 정확한 redirect URI, `access_type=offline`, `include_granted_scopes=true`, 필요한 경우 최초/재연결에 `prompt=consent`를 사용한다.
4. callback은 state, 현재 로그인 사용자, redirect URI를 검증한다.
5. 서버가 code verifier와 함께 code를 Google token endpoint에서 교환한다.
6. 받은 refresh token을 즉시 암호화 저장하고 access token은 provisioning 호출에만 메모리에서 쓴다.
7. 폴더/Sheet provisioning이 성공하면 `googleConnectionStatus=connected`로 변경한다.

authorization code, access token, refresh token은 URL query(authorization code callback 제외), 브라우저 storage, client state, analytics에 넣지 않는다.

## 3. token 역할

- access token: Google API 호출용 단기 bearer credential. DB에 영구 저장하지 않고 서버 메모리에서만 사용한다.
- refresh token: 업체가 없는 동안 새 access token을 얻는 장기 credential. 서버 DB에 암호화해 저장한다.
- 앱 session token/cookie: Interior Workspace 로그인 세션이다. Google API token과 별개다.

Google은 refresh token을 매번 반환하지 않을 수 있다. callback에 새 refresh token이 없으면 기존 유효 ciphertext를 보존하며, 최초 연결인데 없으면 명시적 재동의를 안내한다. 무조건 `prompt=consent`를 반복하면 token 발급 한도와 사용자 경험에 악영향을 줄 수 있다.

## 4. 암호화 저장

- AES-256-GCM envelope encryption과 token별 nonce를 사용한다.
- key는 DB 밖의 Vercel encrypted env/secret manager에 저장한다.
- ciphertext에 key version을 넣어 회전을 지원한다.
- `userId + googleSub + provider`를 AAD로 사용해 다른 row로 ciphertext를 옮기는 공격을 탐지한다.
- 평문 refresh token의 수명은 단일 server request로 제한하고 log/telemetry/exception에서 redaction한다.
- DB 권한 탈취만으로 Drive 접근이 되지 않도록 encryption key와 DB credential의 관리 경계를 분리한다.

## 5. access token 갱신

1. 서버 repository가 workspace의 `connected` 상태와 ciphertext를 조회한다.
2. refresh token을 복호화한다.
3. Google token endpoint에 `grant_type=refresh_token`으로 요청한다.
4. 받은 access token으로 Drive/Sheets API를 호출한다.
5. 갱신 실패가 일시 오류면 제한된 exponential backoff를 적용한다.
6. `invalid_grant` 등 영구 오류면 `reauth_required`로 바꾸고 공개 접수를 비활성화한다.
7. Google이 새 refresh token을 반환한 경우에만 암호화 값을 원자적으로 교체한다.

동시 공개 접수에서 refresh가 겹쳐도 기존 token을 성급히 삭제하지 않는다. refresh single-flight/짧은 서버 cache를 고려하되 access token이나 PII가 외부 cache에 평문으로 남지 않도록 한다.

## 6. 연결 해제와 만료

- 업체가 연결 해제를 요청하면 Google revoke endpoint 호출을 시도한다.
- 성공 여부와 무관하게 로컬 ciphertext를 삭제하고 상태를 `revoked` 또는 `not_connected`로 바꾼다.
- Drive의 업체 소유 파일은 기본적으로 삭제하지 않는다. 재연결 시 appProperties와 settings.json으로 재사용한다.
- `invalid_grant`, 계정 비활성화, 사용자 철회는 `reauth_required`로 전환하고 고객에게는 “현재 접수를 받을 수 없습니다”만 보여준다.
- 운영자 화면에는 재연결 CTA를 표시한다.
- 장기적으로 Google Cross-Account Protection/RISC 이벤트로 revoke를 빠르게 반영하는 것을 검토한다.

## 7. 최소 권한 범위

권장 범위:

- 로그인: `openid`, `email`, `profile`
- Drive 연결: `https://www.googleapis.com/auth/drive.file`

`drive.file`은 앱이 생성했거나 사용자가 앱을 통해 선택/공유한 파일에 한정되며 Drive/Sheets 리소스 작업에 사용할 수 있다. 전체 `drive` 범위는 요청하지 않는다. 별도 `spreadsheets` 범위는 `drive.file`로 앱이 생성한 Sheet를 운영할 수 있는지 통합 테스트 후에만 추가 검토한다. `drive.appdata`는 사용자에게 보이는 `settings.json` 요구와 맞지 않아 기본 선택이 아니다.

## 8. 업체가 로그아웃한 동안 고객 접수

공개 API는 앱 session 대신 slug로 대상 workspace를 찾는다. 서버가 해당 workspace refresh token을 복호화해 새 access token을 발급받고 업체 Drive로 직접 쓴다. 따라서 업체 브라우저나 로그인 세션은 필요하지 않다.

운영자 DB에는 접수 payload를 저장하지 않는다. Google 연결이 끊겼거나 Drive가 실패하면 MVP는 서버 큐에 PII를 쌓지 않고 제출 실패/재시도를 안내한다. 이후 durable queue가 꼭 필요해지면 업체별 암호화, 짧은 TTL, 명시적 개인정보 정책을 별도 설계해야 한다.

## 9. token 비노출 구조

- 모든 Google token exchange와 API 호출은 Route Handler/서버 서비스에서만 수행한다.
- browser에는 앱 session cookie만 전달하며 HttpOnly, Secure, SameSite 정책을 적용한다.
- 공개 고객에게는 token, Drive ID, Sheet ID, Google 오류 본문을 반환하지 않는다.
- server action/route 응답 DTO는 allowlist로 직렬화한다.
- `NEXT_PUBLIC_` 환경변수에는 OAuth client secret, encryption key, service role key를 넣지 않는다.

## 참고 자료

- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [OAuth 2.0 security best practices](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)
- [Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase provider token behavior](https://supabase.com/docs/guides/auth/social-login)
