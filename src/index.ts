import { SchedulerService } from './services/scheduler';
import { ReportService } from './services/report';
import { NotionService } from './services/notionClient';
import { getToday } from './utils/dateUtils';

async function main() {
  try {
    const reportService = new ReportService();
    const notionService = new NotionService();

    // 오늘 날짜 가져오기
    const today = getToday();

    // 특정 날짜의 포맷된 보고서 데이터 조회
    const formattedReports = await reportService.getFormattedDailyReports(
      today,
    );

    // formattedReports의 title과 text를 사용하여 Notion에 저장
    const { id } = await notionService.createReportPage(
      formattedReports.title,
      formattedReports.text,
      today,
    );
    if (id) {
      console.log('보고서가 성공적으로 Notion에 저장되었습니다.');
    } else {
      console.log('보고서 저장 실패');
    }

    // console.dir(formattedReports, { depth: 8 });
  } catch (error) {
    console.error('Error:', error);
  }
}

// 스케줄러 시작
const scheduler = new SchedulerService();
scheduler.scheduleDaily(main);
