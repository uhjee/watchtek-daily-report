# CLAUDE.md

이 파일은 이 저장소에서 코드 작업을 할 때 Claude Code (claude.ai/code)에게 가이드를 제공합니다.

## 프로젝트 개요

이 프로젝트는 Notion 데이터베이스에서 데이터를 추출하여 자동화된 일일, 주간, 월간 보고서를 생성하는 TypeScript Node.js 애플리케이션입니다. 크론 작업을 통해 예약된 시간에 실행되며 한국어로 포맷된 보고서를 생성합니다.

## 명령어

### 개발

- `npm run dev` - nodemon을 사용한 자동 리로드 개발 모드
- `npm run debug` - 디버거가 활성화된 상태로 실행
- `npm run build` - TypeScript를 JavaScript로 컴파일 (출력: `dist/` 디렉토리)
- `npm start` - `dist/index.js`에서 컴파일된 애플리케이션 실행

### 패키징

- `npm run package` - pkg를 사용하여 Windows 실행 파일로 빌드 및 패키징
- 실행 파일 출력: `executable/` 디렉토리

### 테스트

- 현재 테스트 프레임워크가 구성되지 않음 (테스트 스크립트는 오류 반환)

## 아키텍처

### 현재 서비스 구조

리팩토링을 통해 책임이 분리되고 개선된 서비스 기반 아키텍처:

#### 핵심 서비스

- **ReportService** (`src/services/reportService.ts`) - 보고서 생성 프로세스의 메인 오케스트레이터
- **NotionService** (`src/services/notionService.ts`) - NotionApiService와 NotionPageService의 파사드 (Facade Pattern)
- **NotionApiService** (`src/services/notionApiService.ts`) - 순수 Notion API 호출 담당 (API 인터페이스 레이어)
- **NotionPageService** (`src/services/notionPageService.ts`) - Notion 페이지 생성 로직 담당 (Factory Pattern 활용)
- **NotionReportBlockService** (`src/services/notionReportBlockService.ts`) - Notion 보고서 블록 생성 담당 (도메인 로직 포함)
- **SchedulerService** (`src/services/scheduler.ts`) - 크론 기반 스케줄링 관리

#### 데이터 처리 서비스

- **ReportAggregationService** (`src/services/reportAggregationService.ts`) - 데이터 집계 및 계산
  - 멤버별 공수 집계
  - 연차/반차 정보 추출 (getLeaveInfoByPerson)
  - 작성 완료 여부 판단 (checkCompletionStatus)
  - getManHourByPersonWithLeaveInfo: 연차/반차 정보 및 작성 완료 여부를 포함한 데이터 생성
- **ReportDataFormatterService** (`src/services/reportDataFormatterService.ts`) - 데이터 포맷팅 및 구조화
- **ReportTextFormatterService** (`src/services/reportTextFormatterService.ts`) - 데이터를 텍스트로 변환
  - stringifyManHourWithDetails: 연차/반차 정보 및 작성 완료 여부를 포함한 포맷팅
  - formatLeaveInfo: 연차/반차 정보를 "YY.MM.DD(요일) 연차/반차" 형식으로 변환
- **MemberService** (`src/services/memberService.ts`) - 멤버 정보 및 매핑 관리

#### 팩토리 패턴 구현

- **ReportPageFactory** (`src/services/factories/reportPageFactory.ts`) - Factory Pattern + Template Method Pattern으로 보고서 타입별 페이지 생성

### 설정

- **환경 설정** (`src/config/config.ts`) - 여러 위치에서 .env 파일을 로드
- **멤버 설정** (`src/config/members.ts`) - Notion 사용자 이메일을 한국어 이름과 우선순위로 매핑
- **Notion 설정** (`src/config/notion.ts`) - Notion 전용 설정

### 유틸리티

리팩토링을 통해 중복 코드를 제거하고 재사용성을 높인 유틸리티 함수들:

- **dateUtils.ts** (`src/utils/dateUtils.ts`) - 날짜 처리 및 포맷팅
  - 휴일 체크, 주차 계산
  - 근무일수 계산 (getWorkingDaysCount)
  - 이번 주 월요일부터 오늘까지 범위 계산 (getThisWeekMondayToToday)
  - 요일을 한국어로 변환 (getDayOfWeekKorean)
- **memberUtils.ts** (`src/utils/memberUtils.ts`) - 멤버 우선순위 비교 로직
- **sortStrategies.ts** (`src/utils/sortStrategies.ts`) - 정렬 로직 전략 패턴 (Strategy Pattern)
- **reportUtils.ts** (`src/utils/reportUtils.ts`) - 보고서 관련 공통 로직 (텍스트 포맷팅 등)
- **stringUtils.ts** (`src/utils/stringUtils.ts`) - 문자열 처리 유틸리티 (청크 분할 등)
- **notionBlockUtils.ts** (`src/utils/notionBlockUtils.ts`) - Notion 블록 생성 유틸리티 (순수 함수)

### 타입 정의

- **report.d.ts** (`src/types/report.d.ts`) - 보고서 관련 인터페이스 및 타입
  - DailyReport, WeeklyReport, MonthlyReport 등 보고서 데이터 타입
  - LeaveInfo, LeaveType - 연차/반차 정보 타입
  - ManHourByPersonWithReports - 인원별 공수 정보 (연차/반차 정보 및 작성 완료 여부 포함)
- **reportTypes.ts** (`src/types/reportTypes.ts`) - 보고서 타입 리터럴 및 기본 타입 정의
- **dotenv.d.ts, holiday-kr.d.ts** - 외부 라이브러리 타입 선언

### 상수

- **reportConstants.ts** (`src/constants/reportConstants.ts`) - 보고서 관련 상수 (Notion 블록 길이 제한 등)

### 보고서 타입

애플리케이션은 세 가지 유형의 보고서를 생성합니다:

1. **일일 보고서** - 오늘/내일 작업 정보가 포함된 매일 생성
   - 최상단 [인원별 공수]: 주간 누적 공수 표시 (이번 주 월요일부터 오늘까지)
   - 작성 완료 표시: 개인이 작성한 공수가 (근무일수 * 8m/h)와 같으면 "(작성 완료)" 표기
   - 근무일수: 이번 주 월요일부터 오늘까지 중 공휴일을 제외한 평일(월~금) 수
2. **주간 보고서** - 주 요약이 포함된 금요일 생성
   - [인원별 공수]: 연차/반차 정보 표시 (예: "25.11.11(수) 연차")
3. **월간 보고서** - 매월 마지막 금요일에 생성
   - [인원별 공수]: 연차/반차 정보 표시 (주간 보고서와 동일)

### 데이터 플로우

#### 일일 보고서 생성 플로우

1. **스케줄링**: SchedulerService가 크론 스케줄에 따라 보고서 생성 트리거
2. **데이터 조회**: ReportService가 NotionApiService를 통해 Notion 데이터베이스 쿼리
3. **데이터 처리**:
   - 다중 담당자 작업 분할 (processMultiplePeople)
   - 중복 제거 (ReportDataFormatterService.distinctReports)
   - 그룹화 및 정렬 (ReportDataFormatterService.formatDailyReports)
4. **집계**: ReportAggregationService가 멤버별 공수 계산 및 우선순위 정렬
   - 주간 데이터 기반으로 공수 집계 (이번 주 월요일부터 오늘까지)
   - 연차/반차 정보 추출 (Group='기타', SubGroup='연차'/'반차')
   - 작성 완료 여부 판단 (총 공수 === 근무일수 * 8m/h)
5. **텍스트 변환**: ReportTextFormatterService가 포맷된 데이터를 텍스트로 변환
   - stringifyManHourWithDetails로 작성 완료 여부 포함
6. **페이지 생성**: NotionPageService가 Factory Pattern을 사용하여 보고서 타입별 페이지 생성
   - ReportPageFactory가 DailyReportPageCreator 선택
   - Template Method Pattern으로 공통 플로우 실행
   - NotionReportBlockService가 보고서 블록 생성
   - NotionApiService가 Notion API 호출 (100개 블록 제한 자동 처리)

#### 주간/월간 보고서 생성 플로우

- 일일 보고서와 유사하나, 데이터 범위 및 포맷팅이 다름
- 주간: 이번 주 전체 작업 정보 (금주 진행 사항)
  - 연차/반차 정보를 포함한 [인원별 공수] 생성
  - stringifyManHourWithDetails로 연차/반차 정보 포함 (예: "25.11.11(수) 연차")
- 월간: 이번 달 전체 작업 정보 (진행업무/완료업무)
  - 연차/반차 정보를 포함한 [인원별 공수] 생성 (주간 보고서와 동일)

## 환경 설정

필수 `.env` 파일:

```env
NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_REPORT_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CRON_SCHEDULE="45 17 * * *"
CRON_TIMEZONE="Asia/Seoul"
```

필수 `src/config/members.ts` 파일 (멤버 매핑):

```typescript
const memberMap: { [key: string]: { name: string; priority: number } } = {
  'user@example.com': { name: '한국이름', priority: 1 },
};
export default memberMap;
```

## 주요 의존성

- `@notionhq/client` - Notion API 통합
- `node-cron` - 예약된 작업 실행
- `holiday-kr` - 한국 휴일 감지
- `pkg` - Windows 배포를 위한 실행 파일 패키징

## 파일 구조

```
watchtek-daily-report/
├── src/                      # 모든 TypeScript 소스 코드
│   ├── services/             # 비즈니스 로직을 처리하는 서비스 클래스들
│   │   └── factories/        # 팩토리 패턴 구현 (reportPageFactory.ts)
│   ├── utils/                # 재사용 가능한 유틸리티 함수들
│   ├── types/                # TypeScript 타입 정의
│   ├── config/               # 설정 파일들
│   └── constants/            # 상수 정의
├── dist/                     # 컴파일된 JavaScript 출력
├── executable/               # 패키징된 실행 파일
└── node_modules/             # 의존성 패키지
```

## 적용된 디자인 패턴

### Facade Pattern (파사드 패턴)
- **NotionService**: NotionApiService와 NotionPageService를 통합하는 파사드
- 하위 호환성을 유지하면서 내부 구조를 개선

### Factory Pattern (팩토리 패턴)
- **ReportPageFactory**: 보고서 타입에 따라 적절한 페이지 생성기 선택
- DailyReportPageCreator, WeeklyReportPageCreator, MonthlyReportPageCreator

### Template Method Pattern (템플릿 메서드 패턴)
- **AbstractReportPageCreator**: 보고서 페이지 생성의 공통 플로우 정의
- 각 서브클래스가 특정 단계를 구체적으로 구현

### Strategy Pattern (전략 패턴)
- **SortStrategies**: 다양한 정렬 로직을 전략 객체로 캡슐화
- 멤버 우선순위, 보고서 우선순위, 그룹 우선순위 정렬

### Service Layer Pattern (서비스 레이어 패턴)
- 비즈니스 로직을 서비스 클래스로 분리
- 각 서비스가 명확한 단일 책임을 가짐

### Dependency Injection (의존성 주입)
- 서비스 간 의존성을 생성자를 통해 주입
- 테스트 용이성 및 결합도 감소

## 리팩토링 현황

### 완료된 개선사항

1. **서비스 분리**:
   - NotionService → NotionApiService + NotionPageService + NotionReportBlockService
   - 관심사의 분리를 통한 명확한 책임 분담
2. **팩토리 패턴 도입**:
   - reportPageFactory로 보고서 타입별 페이지 생성 로직 분리
   - Template Method Pattern으로 공통 플로우 추상화
3. **유틸리티 통합**:
   - 중복된 로직을 유틸리티 함수로 추출 (dateUtils, memberUtils 등)
4. **전략 패턴 적용**:
   - 정렬 로직을 Strategy 객체로 캡슐화
5. **타입 안정성 향상**:
   - report.d.ts, reportTypes.ts로 타입 정의 개선 및 확장

### 주요 개선점

- **코드 중복 제거**: 멤버 우선순위 비교 로직, 날짜 포맷팅 등 통합
- **단일 책임 원칙**: 각 서비스의 책임 명확화 (API 호출, 페이지 생성, 블록 생성 분리)
- **재사용성 향상**: 공통 로직의 유틸리티 함수화
- **유지보수성 개선**: 관심사의 분리를 통한 코드 구조 개선
- **확장성 향상**: Factory Pattern으로 새로운 보고서 타입 추가 용이
- **Notion API 제약 처리**: 100개 블록 제한, 2000자 텍스트 제한 자동 처리

## 개발 가이드

### 코드 스타일

- 깔끔하고 유지보수 가능한 TypeScript 코드 작성
- DRY 원칙에 따른 반복과 모듈화 강조
- 메서드나 함수에 대한 주석은 역할을 표현하는 '문장'으로 명확하게 작성
- 함수와 메서드는 단일 책임을 가지도록 작성

### 아키텍처 원칙

- **단일 책임 원칙 (SRP)**: 각 서비스가 명확한 단일 책임을 가짐
- **의존성 주입 (DI)**: 서비스 간 의존성을 생성자를 통해 주입
- **관심사의 분리 (SoC)**: API 호출, 데이터 처리, 포맷팅, 텍스트 변환을 별도 서비스로 분리
- **DRY 원칙**: 공통 로직을 유틸리티 함수로 추출
- **타입 안정성**: 적절한 타입 정의로 컴파일 타임 오류 방지
- **디자인 패턴 활용**: 재사용성과 확장성을 위한 패턴 적극 활용

### 새로운 보고서 타입 추가 방법

1. `src/types/reportTypes.ts`에 새로운 ReportType 리터럴 추가
2. `src/services/factories/reportPageFactory.ts`에 새로운 Creator 클래스 작성
3. `ReportPageFactory.createReportPage()`에 새로운 타입 케이스 추가
4. `ReportService`에 새로운 보고서 생성 메서드 추가

### Notion API 사용 시 주의사항

- **100개 블록 제한**: `notionBlockUtils.chunkBlocks()` 사용 또는 Factory의 자동 처리 활용
- **2000자 텍스트 제한**: `stringUtils.splitTextIntoChunks()` 사용
- **페이지네이션**: `NotionApiService.queryDatabaseAll()` 사용으로 자동 처리

### 보고서 정렬 우선순위

1. **멤버 우선순위**: `src/config/members.ts`의 priority 값 기준
2. **그룹 정렬**: DCIM프로젝트 우선 → 일반 그룹 → 특수 그룹 (사이트 지원, 결함처리, OJT, 회의, 기타)
3. **보고서 정렬**: 진행률 내림차순 → 멤버 우선순위 오름차순
