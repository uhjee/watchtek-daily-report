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
  ManDayByPersonWithReports,
} from '../types/report.d';
import { splitTextIntoChunks } from '../utils/stringUtils';
import {
  createCodeBlocks,
  createParagraphBlock,
  createMultipleCodeBlocks,
  createPageProperties,
  createHeading2Block,
  createHeading3Block,
  createBulletedListItemBlock,
  createManDayByPersonBlocks,
  chunkBlocks,
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
            weeklyData.manDayByPersonText,
            weeklyData.manDayByPerson,
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
            monthlyData.manDayByPerson,
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
            dailyData.manDayByPersonText,
            dailyData.manDayByPerson,
          );
          break;
      }

      return response;
    } catch (error) {
      console.error('리포트 페이지 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 주간 보고서 페이지를 생성한다
   * @param title - 보고서 제목
   * @param date - 보고서 날짜
   * @param text - 보고서 내용 텍스트
   * @param manDayText - 공수 요약 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPersonText - 인원별 공수 텍스트 (더 이상 사용되지 않음)
   * @param manDayByPerson - 인원별 상세 공수 및 보고서 정보
   * @returns 생성된 Notion 페이지
   */
  async createWeeklyReportPage(
    title: string,
    date: string,
    text: string,
    manDayText: string,
    manDayByGroupText: string,
    manDayByPersonText: string,
    manDayByPerson?: ManDayByPersonWithReports[],
  ) {
    // 기본 내용으로 페이지 생성
    const children: BlockObjectRequest[] = [
      ...createCodeBlocks(text),
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText),
    ];

    // manDayByPerson이 없으면 기존 방식 사용
    if (!manDayByPerson || manDayByPerson.length === 0) {
      children.push(...createCodeBlocks(manDayByPersonText));
    }

    // 페이지 생성
    const page = await notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '🔶',
      },
      properties: createPageProperties(title, date),
      children,
    });

    // manDayByPerson 블록을 별도로 추가
    if (manDayByPerson && manDayByPerson.length > 0) {
      const manDayBlocks = createManDayByPersonBlocks(manDayByPerson);
      await this.appendBlocksToPage(page.id, manDayBlocks);
    }

    return page;
  }

  /**
   * 일일 보고서 페이지를 생성한다
   * @param title - 보고서 제목
   * @param date - 보고서 날짜
   * @param text - 보고서 내용 텍스트
   * @param manDayText - 공수 요약 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPersonText - 인원별 공수 텍스트 (더 이상 사용되지 않음)
   * @param manDayByPerson - 인원별 상세 공수 및 보고서 정보
   * @returns 생성된 Notion 페이지
   */
  async createDailyReportPage(
    title: string,
    date: string,
    text: string,
    manDayText: string,
    manDayByGroupText?: string,
    manDayByPersonText?: string,
    manDayByPerson?: ManDayByPersonWithReports[],
  ) {
    // 기본 내용으로 페이지 생성
    const children: BlockObjectRequest[] = [
      ...createCodeBlocks(text),
      createParagraphBlock(manDayText),
    ];

    if (manDayByGroupText) {
      children.push(createParagraphBlock(manDayByGroupText));
    }

    // manDayByPerson이 없으면 기존 방식 사용
    if (!manDayByPerson || manDayByPerson.length === 0) {
      if (manDayByPersonText) {
        children.push(...createCodeBlocks(manDayByPersonText));
      }
    }

    // 페이지 생성
    const page = await notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📝',
      },
      properties: createPageProperties(title, date),
      children,
    });

    // manDayByPerson 블록을 별도로 추가
    if (manDayByPerson && manDayByPerson.length > 0) {
      const manDayBlocks = createManDayByPersonBlocks(manDayByPerson);
      await this.appendBlocksToPage(page.id, manDayBlocks);
    }

    return page;
  }

  /**
   * 월간 보고서 페이지를 생성한다
   * @param title - 보고서 제목
   * @param date - 보고서 날짜
   * @param texts - 보고서 내용 배열
   * @param manDayText - 인원별 공수 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPerson - 인원별 상세 공수 및 보고서 정보
   * @returns 생성된 Notion 페이지
   */
  async createMonthlyReportPage(
    title: string,
    date: string,
    texts: string[],
    manDayText: string,
    manDayByGroupText: string,
    manDayByPerson?: ManDayByPersonWithReports[],
  ) {
    // 기본 내용으로 페이지 생성
    const children: BlockObjectRequest[] = [
      ...createMultipleCodeBlocks(texts),
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText),
    ];

    // 페이지 생성
    const page = await notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📊',
      },
      properties: createPageProperties(title, date),
      children,
    });

    // manDayByPerson 블록을 별도로 추가
    if (manDayByPerson && manDayByPerson.length > 0) {
      const manDayBlocks = createManDayByPersonBlocks(manDayByPerson);
      await this.appendBlocksToPage(page.id, manDayBlocks);
    }

    return page;
  }

  /**
   * 페이지에 블록들을 추가한다 (100개 제한 대응)
   * @param pageId - 블록을 추가할 페이지 ID
   * @param blocks - 추가할 블록 배열
   * @returns append 완료 여부
   */
  async appendBlocksToPage(pageId: string, blocks: BlockObjectRequest[]): Promise<void> {
    if (!blocks || blocks.length === 0) {
      return;
    }

    try {
      // 블록을 100개씩 청크로 나누어 처리
      const blockChunks = chunkBlocks(blocks, 100);
      
      for (const chunk of blockChunks) {
        await notionClient.blocks.children.append({
          block_id: pageId,
          children: chunk,
        });
      }
    } catch (error) {
      console.error('블록 추가 중 오류 발생:', error);
      throw error;
    }
  }
}
