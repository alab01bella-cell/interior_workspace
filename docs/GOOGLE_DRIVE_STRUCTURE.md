# 업체별 Google Drive 구조

## 1. 표준 구조

```text
Interior Workspace/                         (Google Drive folder)
├── 상담목록                               (Google Sheet)
├── 상담원본/                              (PDF files)
├── 고객첨부파일/                          (folder)
│   └── 20260805_CONS-..._홍길동/          (submission folder)
│       ├── 현장사진_01_<safe-name>.jpg
│       └── 참고이미지_01_<safe-name>.png
└── settings.json
```

모든 항목은 업체 Google 계정 소유다. 운영자 DB에는 root folder ID와 Sheet ID만 control-plane metadata로 저장하고 상담별 파일 ID/링크는 Sheet와 Drive 파일 metadata에 둔다.

## 2. 최초 연결 시 provisioning

1. Drive 연결 계정과 token을 확인한다.
2. 앱이 접근 가능한 파일 중 `appProperties`의 `iwKind=root`, `iwSchema=1`을 먼저 검색한다.
3. 없으면 이름이 `Interior Workspace`인 폴더를 생성하고 appProperties를 기록한다.
4. root 아래에서 appProperties로 상담목록 Sheet, 상담원본 폴더, 고객첨부파일 폴더, settings 파일을 각각 찾는다.
5. 없는 항목만 생성한다. 생성 API가 timeout된 경우 재시도 전에 반드시 다시 검색한다.
6. Sheet header를 읽어 누락된 열만 오른쪽에 추가한다.
7. settings.json을 생성 또는 schema migration하고 root/Sheet ID를 운영자 DB에 기록한다.
8. 전체 검증 후 연결 상태를 `connected`로 바꾼다.

권장 appProperties:

```text
iwApp=interior-workspace
iwKind=root | consultation-sheet | originals-folder | attachments-folder | settings | submission | original | attachment
iwSchema=1
iwSubmissionId=<opaque submission id>   (상담별 파일에만)
```

이름만으로 찾으면 사용자가 이름을 변경하거나 같은 폴더를 만들 때 중복될 수 있으므로 ID와 appProperties가 기준이다.

## 3. 기존 폴더 재사용

- DB에 저장된 root ID가 있으면 `files.get`으로 존재, mimeType, appProperties, 접근 권한을 검증한다.
- ID가 없거나 invalid면 `appProperties` 검색으로 복구한다.
- appProperties 결과가 없을 때만 root 직계 하위의 정확한 이름과 타입을 보조 기준으로 검색하고, 단 하나가 확인되면 appProperties를 부여해 채택한다.
- 후보가 여러 개면 자동 병합하지 않고 업체에게 선택/지원 안내를 제공한다.
- 재연결 시 기존 파일은 삭제하거나 덮어쓰지 않는다.

## 4. 상담 제출과 고객별 폴더

서버가 생성한 불투명한 submission ID를 모든 리소스의 공통 키로 사용한다.

1. idempotency key/appProperties로 기존 submission 폴더를 검색한다.
2. 없으면 `고객첨부파일` 아래 고객별 폴더를 생성한다.
3. 검증된 파일을 순서대로 업로드하고 반환된 Drive file ID를 수집한다.
4. PDF 단계가 활성화되면 `상담원본`에 같은 submission ID로 생성한다.
5. 마지막으로 Sheet 한 행을 append한다. Sheet 기록 성공을 제출 완료 기준으로 한다.
6. 재시도 시 기존 folder/file/PDF를 재사용하여 중복 행과 중복 파일을 막는다.

부분 실패 리소스에는 `iwState=staging`을 두고 완료 시 `complete`로 변경할 수 있다. 정리 작업은 Drive 내부 metadata만 사용하며 고객 payload를 운영자 DB에 만들지 않는다.

## 5. 파일명 규칙

- 고객 폴더: `YYYYMMDD_<submissionId>_<safeCustomerName>`
- 원본 PDF: `YYYYMMDD_<submissionId>_상담원본.pdf`
- 첨부: `<category>_<2-digit-index>_<sanitized-original-name>`
- category: `현장사진`, `참고이미지`

파일명은 경로 구분자, 제어문자, bidi 제어문자, 선행/후행 점과 공백을 제거하고 길이를 제한한다. 동일 이름 충돌은 index 또는 짧은 hash로 해소한다. 고객명은 편의 표시일 뿐 식별자는 항상 submission ID다.

## 6. 상담목록 Sheet 컬럼

컬럼은 안정적인 machine key를 첫 행에 사용하고, 필요하면 두 번째 행 또는 별도 schema sheet에 한글 표시명을 둔다. 권장 순서는 다음과 같다.

### 시스템/요약 컬럼

```text
schemaVersion, submissionId, submittedAt, status,
customerName, phone, region, fullAddress, housingType, areaSize,
visitDate, visitTime, budget,
originalPdfFileId, originalPdfWebViewLink,
attachmentFolderId, attachmentFolderWebViewLink,
sitePhotoFileIds, referenceImageFileIds
```

### 체크리스트 답변 컬럼

```text
address, addressDetail, housingTypeOther, currentStatus, occupancyType,
renovationReason, renovationReasonOther, callDays, callTime,
constructionScope, targetSpaces, spaceDetails, spaceDetailsOther,
inconvenience, skipOk, priority, nonNegotiable, budgetType,
moveInDate, preferredStart, livingDuringConstruction, scheduleNote,
styles, otherStyle, colorTone, avoidStyle, residents, hasChild, hasPet,
storageNeed, cookingFrequency, workSpace, lifestyleNote,
referenceLinks, referenceLike, ageGroup, consultationExperience,
decisionStyle, preferredContact, questions, etc, privacyConsent
```

배열은 JSON 문자열로 저장하여 구분자 충돌을 피한다. 날짜는 ISO 8601, 금액은 만원 단위 정수, boolean은 `TRUE/FALSE`로 정규화한다. 수식 주입을 막기 위해 고객 문자열이 `=`, `+`, `-`, `@`로 시작하면 Sheets `USER_ENTERED` 대신 `RAW`를 사용하거나 안전한 문자열 처리 정책을 적용한다.

## 7. header 확장 규칙

- 기존 첫 행을 읽고 canonical key별 현재 열 index를 만든다.
- 기존 열의 이름/순서/데이터를 변경하거나 삭제하지 않는다.
- 새 schema의 누락 key만 마지막 열 오른쪽에 append한다.
- `settings.json`에 `sheetSchemaVersion`과 key 목록을 기록한다.
- 두 provisioning 요청이 동시에 실행되지 않도록 workspace 단위 lock 또는 idempotent 재검증을 적용한다.
- 알 수 없는 사용자 정의 열은 보존한다.
- migration 전 backup copy를 만들 수 있지만 원본 Sheet를 삭제하거나 교체하지 않는다.

## 8. PDF와 첨부파일 연결

- PDF와 모든 첨부 파일에 동일한 `iwSubmissionId` appProperty를 기록한다.
- Sheet 행에는 PDF file ID/link, 첨부 folder ID/link, category별 file ID 배열을 기록한다.
- PDF 본문에는 접수번호와 첨부파일 목록을 넣되 공개 다운로드 URL을 만들지 않는다.
- 첨부 파일 metadata에는 category와 원본 파일명을 appProperties 또는 description에 최소한으로 기록한다.
- Drive 파일 이동/이름 변경 후에도 file ID는 연결의 기준이며 link는 표시 편의값이다.

## 9. file ID와 webViewLink 관리

- file ID는 API 조회/업데이트용 불변 식별자로 사용한다.
- `webViewLink`는 사용자 이동용이며 권한을 우회하지 않는다.
- 운영자 DB에는 root/Sheet ID만 둔다. 상담별 ID/link는 상담목록 Sheet에 저장한다.
- API 요청은 필요한 `fields=id,name,mimeType,parents,appProperties,webViewLink`만 선택한다.
- link가 없거나 오래됐다고 판단되면 file ID로 metadata를 다시 조회한다.
- client가 보낸 file ID로 Drive 접근하지 않고 로그인 workspace의 root에서 유도한 ID만 사용한다.

## 참고 자료

- [Search Drive files and appProperties](https://developers.google.com/workspace/drive/api/guides/search-files)
- [Add custom file properties](https://developers.google.com/workspace/drive/api/guides/properties)
- [Drive files resource and webViewLink](https://developers.google.com/workspace/drive/api/reference/rest/v3/files)
- [Sheets values append](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append)
