import { NotionApiService } from './notionApiService';
import { ReportPageFactory } from './factories/reportPageFactory';
import {
  ReportDataForCreatePage,
} from '../types/report.d';
import { getWeekOfMonth, formatDateToShortFormat } from '../utils/dateUtils';

/**
 * Notion 페이지 생성을 담당하는 서비스
 * 팩토리 패턴을 사용하여 보고서 타입별 페이지 생성
 */
export class NotionPageService {
  private notionApiService: NotionApiService;
  private reportPageFactory: ReportPageFactory;

  constructor() {
    this.notionApiService = new NotionApiService();
    this.reportPageFactory = new ReportPageFactory(this.notionApiService);
  }

  /**
   * 리포트 데이터베이스에 새로운 페이지를 생성한다
   * @param reportData - 생성할 보고서 데이터 (일일/주간/월간)
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 생성된 Notion 페이지
   */
  async createReportPage(reportData: ReportDataForCreatePage, date: string) {
    try {
      const response = await this.reportPageFactory.createReportPage(reportData, date);
      console.log(`${reportData.reportType} 보고서 페이지 생성 완료:`, response.id);
      return response;
    } catch (error) {
      console.error('보고서 페이지 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 일일 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 일일 보고서 제목
   */
  generateDailyReportTitle(date: string): string {
    // 날짜 포맷 변환 (YYYY-MM-DD -> YY.MM.DD)
    const formattedDate = formatDateToShortFormat(date);
    return `큐브 파트 일일업무 보고 (${formattedDate})`;
  }

  /**
   * 주간 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 주간 보고서 제목
   */
  generateWeeklyReportTitle(date: string): string {
    const weekOfMonth = getWeekOfMonth(date);
    return `큐브 파트 주간업무 보고 (${weekOfMonth})`;
  }

  /**
   * 월간 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 월간 보고서 제목
   */
  generateMonthlyReportTitle(date: string): string {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1; // getMonth()는 0부터 시작
    return `큐브 파트 월간업무 보고 (${year}년 ${month}월)`;
  }
}