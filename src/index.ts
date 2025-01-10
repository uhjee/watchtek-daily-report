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
    const formattedReports = await reportService.getReportData(
      today,
    );

    // null 체크 추가 (휴일인 경우)
    if (formattedReports) {
      // formattedReports의 title과 text를 사용하여 Notion에 저장
      const { id } = await notionService.createReportPage(
        formattedReports.title,
        formattedReports.text,
        formattedReports.manDayText,
        today,
      );
      if (id) {
        console.log('보고서가 성공적으로 Notion에 저장되었습니다.');
      } else {
        console.log('보고서 저장 실패');
      }
    } else {
      console.log('오늘은 휴일이므로 보고서가 생성되지 않았습니다.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// 프로그램 시작
console.log('프로그램을 시작합니다...');

// 스케줄러 시작 (false: 휴일에는 실행하지 않음)
const scheduler = new SchedulerService(false);
scheduler.scheduleDaily(main);

// 시작 메시지 출력
console.log('프로그램이 백그라운드에서 실행 중입니다.');
console.log('종료하려면 Ctrl+C를 누르세요.');
