import { SchedulerService } from './services/scheduler';
import { ReportService } from './services/reportService';
import { NotionService } from './services/notionService';
import { getToday } from './utils/dateUtils';
import {
  ReportDataForCreatePage,
  ReportData,
} from './types/report.d';

/**
 * 일일 보고서를 생성하고 Notion에 저장하는 메인 함수
 */
async function generateAndSaveReports(): Promise<void> {
  try {
    const reportService = new ReportService();
    const notionService = new NotionService();

    // 오늘 날짜 가져오기
    const today = getToday();
    console.log(`${today} 날짜의 보고서를 생성합니다.`);

    // 특정 날짜의 포맷된 보고서 데이터 조회
    const reportData = await reportService.getReportData(today);

    // 휴일 체크 (reportData가 null인 경우)
    if (!reportData) {
      console.log('오늘은 휴일이므로 보고서가 생성되지 않았습니다.');
      return;
    }

    // 보고서 데이터를 Notion에 저장
    await saveReportsToNotion(notionService, reportData, today);
  } catch (error) {
    console.error('보고서 생성 중 오류가 발생했습니다:', error);
    throw error; // 상위 호출자가 오류를 처리할 수 있도록 다시 던짐
  }
}

/**
 * 포맷된 보고서 데이터를 Notion에 저장
 * @param notionService - Notion 서비스 인스턴스
 * @param reportData - 포맷된 보고서 데이터
 * @param date - 보고서 날짜
 */
async function saveReportsToNotion(
  notionService: NotionService,
  reportData: ReportData,
  date: string
): Promise<void> {
  try {
    const createPagePromises = (
      Object.entries(reportData) as [string, ReportDataForCreatePage][]
    ).map(([_, report]) => {
      return notionService.createReportPage(report, date);
    });

    const results = await Promise.all(createPagePromises);

    // 모든 페이지가 성공적으로 생성되었는지 확인
    if (results.every((result) => result.id)) {
      console.log('보고서가 성공적으로 Notion에 저장되었습니다.');
    } else {
      console.log('일부 보고서 저장에 실패했습니다.');
      const failedCount = results.filter(result => !result.id).length;
      console.log(`실패한 페이지 수: ${failedCount}`);
    }
  } catch (error) {
    console.error('Notion에 보고서 저장 중 오류가 발생했습니다:', error);
    throw error;
  }
}

/**
 * 애플리케이션 메인 함수
 */
async function main(): Promise<void> {
  try {
    await generateAndSaveReports();
  } catch (error) {
    console.error('애플리케이션 실행 중 오류가 발생했습니다:', error);
  }
}

/**
 * 애플리케이션 초기화 및 스케줄러 시작
 */
function initializeApp(): void {
  console.log('프로그램을 시작합니다...');

  // 스케줄러 시작 (false: 휴일에는 실행하지 않음)
  const scheduler = new SchedulerService(true);
  scheduler.scheduleDaily(main);

  // 시작 메시지 출력
  console.log('프로그램이 백그라운드에서 실행 중입니다.');
  console.log('종료하려면 Ctrl+C를 누르세요.');
}

// 애플리케이션 시작
initializeApp();
