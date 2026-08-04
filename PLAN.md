# Interior Workspace 프로토타입 구현 계획

## 1. 목표

첨부된 대시보드 이미지를 전체 웹앱의 디자인 기준으로 사용해, 인테리어 업체가 상담 접수부터 상담 원본 확인과 상태 변경까지 경험할 수 있는 프론트엔드 프로토타입을 만든다.

이번 결과물의 목적은 실제 운영 인프라를 구축하는 것이 아니라 다음 사용자 흐름과 정보 구조를 검증하는 것이다.

1. 담당자가 대시보드에서 상담 현황을 확인한다.
2. 고객이 업체별 상담 링크에서 8단계 체크리스트를 작성한다.
3. 제출한 상담이 상담목록에 즉시 나타난다.
4. 담당자가 상담 상세 및 상담 원본을 확인한다.
5. 담당자가 상담 상태를 접수, 예약, 완료, 계약으로 변경한다.
6. 변경 결과가 대시보드와 상담목록에 반영된다.

## 2. 이번 구현 범위

### 포함

- 첨부 이미지 기반 공통 디자인 시스템
- 반응형 앱 셸과 사이드바
- 대시보드 홈
- 상담목록
- 공개 상담 접수 링크
- 기존 문항을 보존한 8단계 체크리스트
- 체크리스트 제출 성공 화면
- 제출 결과가 상담목록과 대시보드에 반영되는 흐름
- 상담 상세 및 상담 원본 보기 화면
- 접수, 예약, 완료, 계약 상태 변경
- 예약, 서류, 이미지, File 메뉴의 준비 화면
- 브라우저에서 동작하는 mock 데이터 계층

### 제외

- PostgreSQL 및 Prisma
- 실제 Google 로그인과 Google Identity Services
- Google OAuth 2.0
- Google Drive API 및 Google Sheets API
- refresh token 저장과 암호화
- 서버 운영 데이터베이스
- 실제 PDF 생성 및 업로드
- 실제 파일 업로드 및 영구 저장
- 운영 환경용 rate limiting
- 결제, 요금제, 멀티테넌트 운영 기능

## 3. 기술 구성

- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- React Server/Client Component 분리
- 아이콘 라이브러리
- Zod 기반 체크리스트 입력 검증
- localStorage 기반 프로토타입 전용 mock 저장소

localStorage는 기존 체크리스트의 문구 편집 기능에는 사용하지 않는다. 프로토타입에서 페이지 이동 및 새로고침 후에도 제출·상태 변경 결과를 확인하기 위한 mock 데이터 저장에만 사용한다.

브라우저 저장소가 없거나 초기화된 경우에는 코드에 정의된 seed 데이터로 시작한다.

## 4. 라우트 구조

```text
/
  /login                      더미 로그인 진입 화면
  /dashboard                  대시보드 홈
  /consultations              상담목록
  /consultations/[id]         상담 상세 및 원본 보기
  /consult/[workspaceSlug]    고객용 공개 체크리스트
  /reservations               예약 준비 화면
  /documents                  서류 준비 화면
  /images                     이미지 준비 화면
  /files                      File 준비 화면
  /settings                   설정 준비 화면
```

루트 경로는 프로토타입 시작 편의를 위해 `/dashboard`로 이동한다. 로그인 화면에서는 실제 인증 없이 “프로토타입 시작하기” 버튼으로 대시보드에 진입한다.

## 5. 공통 디자인 시스템

### 디자인 원칙

- 밝은 오렌지를 핵심 브랜드 색상으로 사용한다.
- 메인 배경은 흰색 또는 아주 옅은 회색으로 유지한다.
- 카드에는 작은 라운드와 약한 그림자를 적용한다.
- 텍스트는 검정과 중성 회색을 사용해 정보 위계를 만든다.
- 넉넉한 여백과 얇은 구분선으로 밀도를 조절한다.
- 인터랙션은 짧고 절제된 hover, focus, transition을 사용한다.

### 디자인 토큰

- Brand: orange 계열
- Background: white, zinc-50
- Text: zinc-950, zinc-600, zinc-400
- Border: zinc-100, zinc-200
- Radius: 10px, 14px, 18px
- Shadow: 낮은 불투명도의 small/medium shadow
- 상태색:
  - 접수: orange
  - 예약: blue
  - 완료: neutral/green
  - 계약: violet 또는 dark orange

### 공통 컴포넌트

- `AppShell`
- `Sidebar`
- `MobileNavigation`
- `Topbar`
- `PageHeader`
- `Card`
- `StatCard`
- `StatusBadge`
- `StatusSelect`
- `Button`
- `Input`, `Select`, `Textarea`, `Checkbox`, `RadioChip`
- `SearchField`
- `EmptyState`
- `Pagination`
- `Modal` 또는 모바일 상세 패널
- `PrototypeNotice`

### 반응형 정책

- 데스크톱: 좌측 고정 사이드바와 2열/4열 카드 레이아웃
- 태블릿: 축소 사이드바와 2열 카드 레이아웃
- 모바일: 상단 메뉴 또는 drawer, 단일 열 카드, 가로 스크롤 없는 상담 카드 목록
- 표는 모바일에서 핵심 필드 중심 카드 형태로 전환한다.

## 6. Mock 데이터 설계

### 상담 데이터

```ts
type ConsultationStatus = "접수" | "예약" | "완료" | "계약";

interface Consultation {
  id: string;
  submissionId: string;
  receivedAt: string;
  status: ConsultationStatus;
  customerName: string;
  phone: string;
  region: string;
  fullAddress: string;
  housingType: string;
  areaSize: string;
  visitDate: string;
  visitTime: string;
  budget: number;
  answers: ChecklistAnswers;
  attachments: MockAttachment[];
}
```

목록에서는 `region`만 표시하고 전체 주소와 연락처는 상세 화면에서만 표시한다.

### Mock 저장소 동작

- 최초 접근: seed 상담 데이터 로드
- 체크리스트 제출: 새 `Consultation` 생성 후 localStorage에 추가
- 상태 변경: 해당 상담의 status 갱신
- 대시보드: 동일 저장소 데이터를 집계
- 초기화 버튼: seed 데이터로 복구
- 다른 브라우저나 기기와 데이터는 공유되지 않음

`src/lib/mock/consultation-store.ts`를 데이터 접근 경계로 두어, 나중에 실제 API로 바꿀 때 화면 컴포넌트 변경을 최소화한다.

## 7. 대시보드 홈

### 화면 구성

- 사용자 인사말과 현재 날짜
- 검색창, 알림, 사용자 프로필
- 접수, 예약, 완료, 계약 상태별 건수 카드
- 오늘 상담 일정
- To do list 더미 항목
- 캘린더 영역
- 고객용 상담 링크 복사 버튼

### 실제 연결 범위

- 네 가지 상태 건수 모두 mock 상담 데이터에서 실시간 집계
- 오늘 상담 일정은 `visitDate`가 오늘인 상담을 표시
- 새 상담 제출 및 상태 변경 즉시 반영
- 캘린더와 To do list는 시각적 프로토타입으로 제공

## 8. 상담목록

### 표시 항목

- 상태
- 고객 이름
- 지역
- 평수
- 상담 희망일
- 예상 금액(만원)
- 접수일
- 상담 원본
- 관리

### 기능

- 고객 이름 검색
- 지역 검색
- 상태 필터
- 최신 접수순 정렬
- 페이지네이션
- 상태 변경
- 상담 원본 보기
- 빈 결과 안내
- 모바일 카드형 목록

검색과 필터는 클라이언트에서 mock 데이터에 적용한다. 페이지당 표시 개수는 기본 10개로 한다.

## 9. 기존 8단계 체크리스트 마이그레이션

기존 `참고/Index.html`의 질문, 설명, 선택지는 임의로 삭제하거나 이름을 변경하지 않는다. 현재 확인된 8개 단계는 다음과 같다.

1. 기본 정보
2. 상담 일정
3. 공사 범위 및 우선순위
4. 예산 및 일정
5. 원하는 분위기
6. 생활 방식
7. 사진 및 참고자료
8. 상담 및 연락 정보

### 유지할 상호작용

- 단계 진행률
- 이전/다음 이동
- 칩 형태의 단일/다중 선택
- 공간 선택에 따른 세부 항목 노출
- “기타” 선택에 따른 직접 입력
- 휴대폰 번호 표시 형식
- 예산 숫자 표시 형식
- 오늘 이전 날짜 선택 방지
- 주소 입력 UI
- 첨부 이미지 선택 및 파일명 미리보기
- 개인정보 수집 및 이용 동의
- 제출 중/성공 상태

### 프로토타입에서 변경할 부분

- Daum 주소 검색이 불가능한 경우 직접 주소 입력이 가능하도록 한다.
- 파일은 Drive에 업로드하지 않고 이름, MIME 타입, 크기만 mock 데이터에 기록한다.
- 실제 파일 내용과 object URL은 새로고침 후 유지하지 않는다.
- 편집 모드, HTML 다운로드, 문구 localStorage 편집, `google.script.run`은 완전히 제거한다.
- 필수값은 각 단계와 최종 제출 시 모두 검증한다.
- 예산은 만원 단위 숫자로 저장하고 표시한다.

### 필수 항목

- 성함
- 휴대폰 번호
- 현장 주소
- 평수
- 상담 희망일
- 생각 중인 예산
- 개인정보 수집 및 이용 동의

## 10. 제출 후 흐름

1. 고객이 `/consult/demo-interior`에서 체크리스트를 작성한다.
2. 클라이언트에서 필수값과 입력 형식을 검증한다.
3. mock 저장소에 새 상담을 `접수` 상태로 추가한다.
4. 제출 성공 화면에 접수번호를 표시한다.
5. “상담 현황 보기” 프로토타입 버튼으로 상담 상세를 확인할 수 있다.
6. 관리자 상담목록과 대시보드 집계에 새 상담이 나타난다.

고객 화면에서 관리자 화면으로 이동하는 버튼은 프로토타입임을 명확히 표시하며, 운영 버전에서는 제거할 대상으로 문서화한다.

## 11. 상담 원본 보기

실제 PDF 대신 제출 당시 답변을 읽기 좋은 문서 레이아웃으로 렌더링한다.

### 화면 구성

- 접수번호, 접수일, 상태
- 고객 기본 정보
- 8개 단계별 질문과 답변
- 첨부파일 메타데이터
- 인쇄 버튼
- 상태 변경 컨트롤
- 목록으로 돌아가기

브라우저 인쇄용 CSS를 제공해 PDF와 유사한 문서 검토 경험을 확인할 수 있게 한다. 실제 PDF 생성이나 파일 다운로드 기능은 구현하지 않는다.

## 12. 상태 변경

- 허용 상태: 접수, 예약, 완료, 계약
- 상담목록과 상담 상세 양쪽에서 변경 가능
- 상태 변경 즉시 localStorage에 저장
- 대시보드 상태별 카운트에 즉시 반영
- 상태별 배지 색상과 선택 컨트롤을 공통 컴포넌트로 사용

프로토타입에서는 상태 전이 제한을 두지 않는다. 운영 MVP에서 필요한 권한 및 상태 전이 규칙은 별도 설계 대상으로 남긴다.

## 13. 프로젝트 구조

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    login/page.tsx
    dashboard/page.tsx
    consultations/page.tsx
    consultations/[id]/page.tsx
    consult/[workspaceSlug]/page.tsx
    reservations/page.tsx
    documents/page.tsx
    images/page.tsx
    files/page.tsx
    settings/page.tsx
  components/
    layout/
    dashboard/
    consultations/
    checklist/
    ui/
  config/
    navigation.ts
    checklist.ts
  hooks/
    use-consultations.ts
  lib/
    mock/
      consultation-store.ts
      seed-data.ts
    validation/
      checklist.ts
    utils/
  types/
    consultation.ts
    checklist.ts
public/
  reference/
```

## 14. 구현 순서

### 1단계: 프로젝트 기반

- 기존 정적 프로토타입을 참고 자료로 보존
- Next.js App Router 프로젝트 구성
- TypeScript strict 및 Tailwind 설정
- 폰트, 컬러, 그림자, 반경 토큰 구성

### 2단계: 공통 레이아웃

- 데스크톱/모바일 앱 셸
- 사이드바, 상단바, 공통 UI 컴포넌트
- 준비 화면

### 3단계: Mock 데이터 계층

- 타입과 seed 데이터
- localStorage 저장소
- React 구독 훅
- 초기화 기능

### 4단계: 대시보드

- 상태별 집계 카드
- 오늘 상담 일정
- To do list와 캘린더 프로토타입
- 상담 링크 복사

### 5단계: 상담목록과 원본 보기

- 검색, 필터, 정렬, 페이지네이션
- 상태 변경
- 상담 상세/원본 문서 화면
- 인쇄 스타일

### 6단계: 체크리스트

- 기존 8단계 문항 전체 이전
- 단계별 컴포넌트와 조건부 필드
- 입력 검증
- 첨부파일 mock 처리
- 제출 및 성공 흐름

### 7단계: 통합 검증

- 제출 → 목록 → 상세 → 상태 변경 → 대시보드 반영 확인
- 모바일 및 데스크톱 반응형 확인
- 키보드 접근성과 focus 상태 확인
- lint, TypeScript 검사, production build
- README에 실행 방법과 프로토타입 제약사항 기록

## 15. 완료 기준

- Next.js 개발 서버와 production build가 오류 없이 실행된다.
- 첨부 이미지의 시각 언어가 모든 관리자 화면에서 일관되게 유지된다.
- 기존 체크리스트의 8단계 질문과 선택지가 보존된다.
- 필수 입력 누락 시 제출되지 않고 해당 오류를 확인할 수 있다.
- 제출한 상담이 상담목록과 대시보드에 나타난다.
- 검색, 지역 검색, 상태 필터, 최신순 정렬, 페이지네이션이 동작한다.
- 접수, 예약, 완료, 계약 상태 변경이 목록·상세·대시보드에 반영된다.
- 상담 원본 화면에서 제출한 전체 답변을 확인할 수 있다.
- 데스크톱과 모바일에서 핵심 흐름을 사용할 수 있다.
- 실제 Google API, 운영 DB, 실제 PDF 생성 코드가 포함되지 않는다.

## 16. 승인 후 첫 작업

이 계획이 승인되면 기존 참고 파일을 보존한 상태에서 Next.js 프로젝트 기반을 구성한다. 구현 중 기존 질문이나 선택지를 변경해야 할 상황이 생기면 임의로 수정하지 않고 먼저 확인을 요청한다.
