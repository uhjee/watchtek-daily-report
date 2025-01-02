import { ReportService } from './services/report';

async function main() {
  try {
    const reportService = new ReportService();
    
    // 특정 날짜의 포맷된 보고서 데이터 조회
    const formattedReports = await reportService.getFormattedDailyReports('2024-12-31');
    console.log('포맷된 보고서:', formattedReports);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
