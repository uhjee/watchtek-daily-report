import { notionClient } from '../config/notion';
import {
  BlockObjectRequest,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { config } from '../config/config';
import {
  ReportDataForCreatePage,
  ReportWeeklyData,
  ReportMonthlyData,
  ReportDailyData,
} from '../types/report.d';
import { splitTextIntoChunks } from '../utils/stringUtils';
import { 
  createCodeBlocks, 
  createParagraphBlock, 
  createMultipleCodeBlocks,
  createPageProperties 
} from '../utils/notionBlockUtils';

export class NotionService {
  private databaseId: string;
  private reportDatabaseId: string;

  constructor() {
    if (!config.notion.databaseId || !config.notion.reportDatabaseId) {
      throw new Error('Database IDs are not defined in environment variables');
    }

    this.databaseId = config.notion.databaseId;
    this.reportDatabaseId = config.notion.reportDatabaseId;
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
    try {
      const response = await notionClient.databases.query({
        database_id: this.databaseId,
        filter: filter,
        sorts: sorts,
        start_cursor: startCursor,
        page_size: 100, // Notion API의 최대 페이지 크기
      });

      return response;
    } catch (error) {
      console.error('Notion 데이터베이스 조회 중 오류 발생:', error);
      throw error;
    }
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
    const allResults: QueryDatabaseResponse['results'] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response = await this.queryDatabase(filter, sorts, startCursor);
      allResults.push(...response.results);

      hasMore = response.has_more;
      startCursor = response.next_cursor ?? undefined;
    }

    return allResults;
  }

  /**
   * 리포트 데이터베이스에 새로운 페이지를 생성한다
   * @param reportData - 생성할 보고서 데이터 (일일/주간/월간)
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 생성된 Notion 페이지
   */
  async createReportPage(reportData: ReportDataForCreatePage, date: string) {
    const { title, text, manDayText, reportType } = reportData;

    try {
      let response;

      switch (reportType) {
        case 'weekly':
          // 주간 보고서 생성
          const weeklyData = reportData as ReportWeeklyData;
          response = await this.createWeeklyReportPage(
            title,
            date,
            text ?? '',
            manDayText,
            weeklyData.manDayByGroupText,
            weeklyData.manDayByPersonText
          );
          break;
          
        case 'monthly':
          // 월간 보고서 생성
          const monthlyData = reportData as ReportMonthlyData;
          response = await this.createMonthlyReportPage(
            title,
            date,
            monthlyData.texts,
            manDayText,
            monthlyData.manDayByGroupText,
            monthlyData.manDayByPersonTexts
          );
          break;
          
        case 'daily':
        default:
          // 일일 보고서 생성
          const dailyData = reportData as ReportDailyData;
          response = await this.createDailyReportPage(
            title,
            date,
            text ?? '',
            manDayText,
            dailyData.manDayByGroupText,
            dailyData.manDayByPersonText
          );
          break;
      }

      return response;
    } catch (error) {
      console.error('리포트 페이지 생성 중 오류 발생:', error);
      throw error;
    }
  }

  createWeeklyReportPage(
    title: string,
    date: string,
    text: string,
    manDayText: string,
    manDayByGroupText: string,
    manDayByPersonText: string,
  ) {
    const children: BlockObjectRequest[] = [
      ...createCodeBlocks(text),
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText),
      ...createCodeBlocks(manDayByPersonText),
    ];

    return notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '🔶',
      },
      properties: createPageProperties(title, date),
      children,
    });
  }

  createDailyReportPage(
    title: string,
    date: string,
    text: string,
    manDayText: string,
    manDayByGroupText?: string,
    manDayByPersonText?: string,
  ) {
    const children: BlockObjectRequest[] = [
      ...createCodeBlocks(text),
      createParagraphBlock(manDayText),
    ];

    if (manDayByGroupText) {
      children.push(createParagraphBlock(manDayByGroupText));
    }

    if (manDayByPersonText) {
      children.push(...createCodeBlocks(manDayByPersonText));
    }

    return notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📝',
      },
      properties: createPageProperties(title, date),
      children,
    });
  }

  /**
   * 월간 보고서 페이지를 생성한다
   * @param title - 보고서 제목
   * @param date - 보고서 날짜
   * @param texts - 보고서 내용 배열
   * @param manDayText - 인원별 공수 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPersonTexts - 인원별 공수 정보 문자열 배열
   * @returns 생성된 Notion 페이지
   */
  createMonthlyReportPage(
    title: string,
    date: string,
    texts: string[],
    manDayText: string,
    manDayByGroupText: string,
    manDayByPersonTexts: string[],
  ) {
    const children: BlockObjectRequest[] = [
      ...createMultipleCodeBlocks(texts),
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText),
      ...createMultipleCodeBlocks(manDayByPersonTexts),
    ];

    return notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📊',
      },
      properties: createPageProperties(title, date),
      children,
    });
  }
}
