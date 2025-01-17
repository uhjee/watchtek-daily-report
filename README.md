# Watchtek Daily Report

## 실행 방법

1. 실행 파일과 함께 제공되는 .env 파일을 같은 디렉토리에 위치시킵니다.
2. .env 파일에 필요한 설정을 입력합니다:

   ```env
   # Notion API Configuration
   NOTION_API_KEY="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   NOTION_REPORT_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Scheduler Configuration
   CRON_SCHEDULE="45 17 * * *"  # 매일 17:45 실행
   CRON_TIMEZONE="Asia/Seoul"   # 한국 시간대
   ```

3. src/config/members.ts 파일을 생성하고 멤버 정보를 설정합니다:

   ```typescript
   // src/config/members.ts
   const memberMap: { [key: string]: string } = {
     'user1@example.com': '홍길동',
     'user2@example.com': '김철수',
     'user3@example.com': '이영희',
   } as const;

   export default memberMap;
   ```

   - 키(key): Notion 사용자의 이메일 주소
   - 값(value): 보고서에 표시될 이름

4. watchtek-daily-report.exe 파일을 실행합니다.

## 주의사항

- .env 파일과 members.ts 파일이 누락될 경우 동작하지 않습니다.
- members.ts 파일의 이메일 주소는 Notion 데이터베이스에서 사용하는 계정의 이메일과 정확히 일치해야 합니다.
- CRON_SCHEDULE은 cron 표현식 형식을 따릅니다 (기본값: 매일 17:45 실행)
