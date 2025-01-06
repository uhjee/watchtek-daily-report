# Watchtek Daily Report

## 실행 방법

1. 실행 파일과 함께 제공되는 .env 파일을 같은 디렉토리에 위치시킵니다.
2. .env 파일에 필요한 설정을 입력합니다:
   - NOTION_API_KEY
   - NOTION_DATABASE_ID
   - NOTION_REPORT_DATABASE_ID
   - CRON_SCHEDULE (선택, 기본값: "30 17 * * *")
   - CRON_TIMEZONE (선택, 기본값: "Asia/Seoul")
3. watchtek-daily-report.exe 파일을 실행합니다. 