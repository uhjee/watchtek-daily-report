# Watchtek Daily Report

Notion 데이터베이스에서 자동으로 일일/주간/월간 보고서를 생성하는 TypeScript Node.js 애플리케이션입니다.

## 🚀 빠른 시작

### 1. 환경 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 설정을 입력하세요:

```env
# Notion API 설정
NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
NOTION_REPORT_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 스케줄러 설정
CRON_SCHEDULE="45 17 * * *"  # 매일 17:45 실행
CRON_TIMEZONE="Asia/Seoul"   # 한국 시간대
```

### 2. 멤버 설정

`src/config/members.ts` 파일을 생성하고 팀 멤버 정보를 설정하세요:

```typescript
const memberMap: { [key: string]: { name: string; priority: number } } = {
  'user1@example.com': { name: '홍길동', priority: 1 },
  'user2@example.com': { name: '김철수', priority: 2 },
  'user3@example.com': { name: '이영희', priority: 3 },
} as const;

export default memberMap;
```

- **키(key)**: Notion에서 사용하는 사용자 이메일 주소
- **name**: 보고서에 표시될 한국어 이름
- **priority**: 멤버 우선순위 (낮은 숫자가 높은 우선순위)

## 🛠️ 개발 명령어

```bash
# 개발 모드 (자동 리로드)
npm run dev

# 디버그 모드
npm run debug

# 프로덕션 빌드
npm run build

# 빌드된 앱 실행
npm start

# Windows 실행 파일 생성
npm run package
```

## 📋 기능

- **일일 보고서**: 매일 오늘/내일 작업 정보로 보고서 생성
- **주간 보고서**: 매주 금요일 주간 요약 보고서 생성
- **월간 보고서**: 매월 마지막 금요일 월간 요약 보고서 생성
- **휴일 감지**: 한국 휴일에는 자동으로 보고서 생성 건너뛰기
- **자동 스케줄링**: 크론 작업으로 자동 실행

## 🏗️ 아키텍처

### 주요 서비스
- **ReportService**: 보고서 생성 메인 오케스트레이터
- **NotionApiService**: 순수 Notion API 호출 담당
- **NotionPageService**: Notion 페이지 생성 로직
- **SchedulerService**: 크론 기반 스케줄링 관리
- **MemberService**: 멤버 정보 및 우선순위 관리

### 유틸리티
- **dateUtils**: 날짜 처리 및 포맷팅
- **memberUtils**: 멤버 우선순위 비교 로직
- **sortStrategies**: 정렬 전략 패턴
- **reportUtils**: 보고서 관련 공통 로직

## ⚠️ 주의사항

1. **필수 파일 확인**
   - `.env` 파일과 `src/config/members.ts` 파일이 누락되면 동작하지 않습니다
   
2. **이메일 주소 일치**
   - `members.ts`의 이메일 주소는 Notion 데이터베이스에서 사용하는 계정과 정확히 일치해야 합니다
   
3. **크론 스케줄**
   - `CRON_SCHEDULE`은 cron 표현식 형식을 따릅니다
   - 기본값: `45 17 * * *` (매일 17:45 실행)

4. **휴일 처리**
   - 한국 휴일에는 자동으로 보고서 생성이 건너뛰어집니다

## 📦 배포

Windows 실행 파일 생성:
```bash
npm run package
```

`executable/` 폴더에 `.exe` 파일이 생성되며, 이 파일과 함께 `.env` 파일을 같은 디렉토리에 배치하여 사용하세요.

## 🔧 기술 스택

- **TypeScript** - 타입 안전성
- **Node.js** - 런타임 환경
- **@notionhq/client** - Notion API 통합
- **node-cron** - 스케줄링
- **holiday-kr** - 한국 휴일 감지
- **pkg** - 실행 파일 패키징
