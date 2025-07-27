import { NotionApiService } from './notionApiService';
import { NotionPageService } from './notionPageService';
import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';
import {
  ReportDataForCreatePage,
} from '../types/report.d';

/**
 * Notion 서비스의 파사드 클래스
 * NotionApiService와 NotionPageService를 조합하여 사용
 * 하위 호환성을 위해 기존 인터페이스 유지
 */
export class NotionService {
  private notionApiService: NotionApiService;
  private notionPageService: NotionPageService;

  constructor() {
    this.notionApiService = new NotionApiService();
    this.notionPageService = new NotionPageService();
  }

  /**
   * Notion 데이터베이스를 조회하고 필터링된 결과를 반환한다
   * @param filter - Notion API filter 객체
   * @param sorts - Notion API sort 객체 배열
   * @param startCursor - 페이지네이션을 위한 시작 커서
   * @returns Notion 데이터베이스 쿼리 결과
   */
  async queryDatabase(
    filter?: QueryDatabaseParameters['filter'],
    sorts?: QueryDatabaseParameters['sorts'],
    startCursor?: string,
  ): Promise<QueryDatabaseResponse> {
    return this.notionApiService.queryDatabase(filter, sorts, startCursor);
  }

  /**
   * 모든 데이터베이스 결과를 페이지네이션하여 조회한다
   * @param filter - Notion API filter 객체
   * @param sorts - Notion API sort 객체 배열
   * @returns 전체 데이터베이스 결과
   */
  async queryDatabaseAll(
    filter?: QueryDatabaseParameters['filter'],
    sorts?: QueryDatabaseParameters['sorts'],
  ): Promise<QueryDatabaseResponse['results']> {
    return this.notionApiService.queryDatabaseAll(filter, sorts);
  }

  /**
   * 리포트 데이터베이스에 새로운 페이지를 생성한다
   * @param reportData - 생성할 보고서 데이터 (일일/주간/월간)
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 생성된 Notion 페이지
   */
  async createReportPage(reportData: ReportDataForCreatePage, date: string) {
    return this.notionPageService.createReportPage(reportData, date);
  }

  /**
   * 일일 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 일일 보고서 제목
   */
  generateDailyReportTitle(date: string): string {
    return this.notionPageService.generateDailyReportTitle(date);
  }

  /**
   * 주간 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 주간 보고서 제목
   */
  generateWeeklyReportTitle(date: string): string {
    return this.notionPageService.generateWeeklyReportTitle(date);
  }

  /**
   * 월간 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 월간 보고서 제목
   */
  generateMonthlyReportTitle(date: string): string {
    return this.notionPageService.generateMonthlyReportTitle(date);
  }
}