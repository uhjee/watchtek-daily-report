import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// 실행 파일 디렉토리 또는 현재 작업 디렉토리에서 .env 파일 찾기
function loadEnvFile() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(process.execPath, '..', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      return dotenv.config({ path: envPath });
    }
  }

  throw new Error('.env 파일을 찾을 수 없습니다.');
}

loadEnvFile();

export const config = {
  notion: {
    apiKey: process.env.NOTION_API_KEY,
    databaseId: process.env.NOTION_DATABASE_ID,
    reportDatabaseId: process.env.NOTION_REPORT_DATABASE_ID,
  },
  scheduler: {
    cronSchedule: process.env.CRON_SCHEDULE || '30 17 * * *',
    timezone: process.env.CRON_TIMEZONE || 'Asia/Seoul',
  },
}; 