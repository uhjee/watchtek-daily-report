import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

/**
 * 환경 설정을 위한 설정 객체 인터페이스
 */
interface ConfigInterface {
  notion: {
    apiKey: string | undefined;
    databaseId: string | undefined;
    reportDatabaseId: string | undefined;
  };
  scheduler: {
    cronSchedule: string;
    timezone: string;
  };
}

/**
 * 가능한 모든 위치에서 .env 파일을 찾아 환경 변수를 로드
 * @returns 환경 변수 파일 로드 성공 여부
 */
function loadEnvFile(): boolean {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(process.execPath, '..', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`환경 변수 파일을 로드합니다: ${envPath}`);
      dotenv.config({ path: envPath });
      return true;
    }
  }

  console.warn('경고: .env 파일을 찾을 수 없습니다. 기본 환경 변수를 사용합니다.');
  return false;
}

// 환경 변수 로드
const envLoaded = loadEnvFile();
if (!envLoaded) {
  console.warn('환경 변수 파일이 로드되지 않았습니다. 기본값을 사용합니다.');
}

/**
 * 애플리케이션 설정
 */
export const config: ConfigInterface = {
  notion: {
    apiKey: process.env.NOTION_API_KEY,
    databaseId: process.env.NOTION_DATABASE_ID,
    reportDatabaseId: process.env.NOTION_REPORT_DATABASE_ID,
  },
  scheduler: {
    cronSchedule: process.env.CRON_SCHEDULE || '30 17 * * *', // 기본값: 매일 오후 5:30
    timezone: process.env.CRON_TIMEZONE || 'Asia/Seoul',
  },
}; 