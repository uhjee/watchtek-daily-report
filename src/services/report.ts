import { NotionService } from './notionClient';
import {
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialDatabaseObjectResponse,
  PartialPageObjectResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { getNextDay } from '../utils/dateUtils';
import { DailyReport, NotionPage } from '../types/report';

export class ReportService {
  private notionService: NotionService;

  constructor() {
    this.notionService = new NotionService();
  }

  /**
   * 특정 날짜 범위의 일일 보고서를 조회하고 포맷된 데이터를 반환합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 일일 보고서 데이터
   */
  async getFormattedDailyReports(startDate: string, endDate?: string) {
    // 1. 원본 데이터 조회
    const reports = await this.getDailyReports(startDate, endDate);

    // 2. 데이터 포맷 변환
    return this.formatReportData(reports);
  }

  /**
   * 특정 날짜 범위의 일일 보고서를 조회합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 일일 보고서 데이터
   */
  async getDailyReports(startDate: string, endDate?: string) {
    // endDate가 없을 경우 startDate + 1일로 설정
    const calculatedEndDate = endDate || getNextDay(startDate);

    const filter = {
      and: [
        {
          property: 'Date',
          date: {
            on_or_after: startDate,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: calculatedEndDate,
          },
        },
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
      ],
    } as QueryDatabaseParameters['filter'];

    const sorts = [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ] as QueryDatabaseParameters['sorts'];

    try {
      // 전체 결과 조회
      const results = await this.notionService.queryDatabaseAll(filter, sorts);
      return results;
    } catch (error) {
      console.error('일일 보고서 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * Notion API로부터 받은 보고서 데이터를 원하는 형식으로 변환합니다
   * @param reports - Notion API 응답 데이터
   * @returns 포맷된 보고서 데이터
   */
  private formatReportData(reports: unknown[]): DailyReport[] {
    return (reports as NotionPage[]).map((report) => ({
      title: report.properties.Name.title[0]?.plain_text || '',
      customer: report.properties.Customer.select?.name || '',
      group: report.properties.Group.select?.name || '',
      subGroup: report.properties.SubGroup.select?.name || '',
      person: report.properties.Person.people[0]?.person.email || '',
      progressRate: report.properties.Progress.number || 0,
      date: {
        start: report.properties.Date.date?.start || '',
        end: report.properties.Date.date?.end || null,
      },
    }));
  }
}
