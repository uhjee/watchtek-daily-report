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
- **NotionApiService** (`src/services/notionApiService.ts`) - 순수 Notion API 호출 담당
- **NotionPageService** (`src/services/notionPageService.ts`) - Notion 페이지 생성 로직 담당
- **NotionService** (`src/services/notionService.ts`) - 상위 레벨 Notion 관련 로직
- **SchedulerService** (`src/services/scheduler.ts`) - 크론 기반 스케줄링 관리

#### 데이터 처리 서비스

- **ReportAggregationService** - 데이터 집계 및 계산
- **ReportFormatterService** - 데이터 포맷팅 및 구조화
- **NotionStringifyService** - 데이터를 Notion 호환 텍스트로 변환
- **MemberService** - 멤버 정보 및 매핑 관리

### 설정

- **환경 설정** (`src/config/config.ts`) - 여러 위치에서 .env 파일을 로드
- **멤버 설정** (`src/config/members.ts`) - Notion 사용자 이메일을 한국어 이름과 우선순위로 매핑
- **Notion 설정** (`src/config/notion.ts`) - Notion 전용 설정

### 유틸리티

리팩토링을 통해 중복 코드를 제거하고 재사용성을 높인 유틸리티 함수들:

- **dateUtils.ts** - 날짜 처리 및 포맷팅
- **memberUtils.ts** - 멤버 우선순위 비교 및 처리
- **sortStrategies.ts** - 정렬 로직 전략 패턴
- **reportUtils.ts** - 보고서 관련 공통 로직
- **stringUtils.ts** - 문자열 처리 유틸리티
- **notionBlockUtils.ts** - Notion 블록 관련 유틸리티

### 보고서 타입

애플리케이션은 세 가지 유형의 보고서를 생성합니다:

1. **일일 보고서** - 오늘/내일 작업 정보가 포함된 매일 생성
2. **주간 보고서** - 주 요약이 포함된 금요일 생성
3. **월간 보고서** - 매월 마지막 금요일에 생성

### 데이터 플로우

1. 스케줄러가 크론 스케줄에 따라 보고서 생성을 트리거
2. ReportService가 관련 데이터에 대해 Notion 데이터베이스를 쿼리
3. 각각의 서비스에 의해 데이터가 포맷팅되고 집계됨
4. 포맷된 보고서가 Notion 보고서 데이터베이스에 다시 저장됨

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

- `src/` - 모든 TypeScript 소스 코드
- `src/services/` - 비즈니스 로직을 처리하는 서비스 클래스들
- `src/utils/` - 재사용 가능한 유틸리티 함수들
- `src/types/` - TypeScript 타입 정의
- `src/config/` - 설정 파일들
- `src/constants/` - 상수 정의
- `tests/` - 테스트 파일들 (현재 최소한으로 구성됨)

## 리팩토링 현황

### 완료된 개선사항

1. **서비스 분리**: NotionService에서 NotionApiService와 NotionPageService로 분리
2. **유틸리티 통합**: 중복된 로직을 유틸리티 함수로 추출
3. **전략 패턴 적용**: 정렬 로직에 전략 패턴 적용
4. **타입 안정성 향상**: 타입 정의 개선 및 확장

### 주요 개선점

- **코드 중복 제거**: 멤버 우선순위 비교 로직, 날짜 포맷팅 등 통합
- **단일 책임 원칙**: 각 서비스의 책임 명확화
- **재사용성 향상**: 공통 로직의 유틸리티 함수화
- **유지보수성 개선**: 관심사의 분리를 통한 코드 구조 개선

## 개발 가이드

### 코드 스타일

- 깔끔하고 유지보수 가능한 TypeScript 코드 작성
- DRY 원칙에 따른 반복과 모듈화 강조
- 메서드나 함수에 대한 주석은 역할을 표현하는 '문장'으로 명확하게 작성

### 아키텍처 원칙

- 서비스별 단일 책임 원칙 유지
- 공통 로직은 유틸리티 함수로 추출
- 타입 안정성을 위한 적절한 타입 정의
- 의존성 주입 패턴 활용으로 테스트 용이성 확보
