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
  DailyReportGroup,
} from '../types/report.d';
import { splitTextIntoChunks } from '../utils/stringUtils';
import {
  createCodeBlocks,
  createParagraphBlock,
  createPageProperties,
  createHeading2Block,
  createHeading3Block,
  createBulletedListItemBlock,
  createManDayByPersonBlocks,
  createWeeklyReportBlocks,
  createWeeklyReportBlocksFromData,
  createMonthlyReportBlocksFromData,
  chunkBlocks,
} from '../utils/notionBlockUtils';
import { getWeekOfMonth } from '../utils/dateUtils';

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
    const { title, manDayText, reportType } = reportData;

    try {
      let response;

      switch (reportType) {
        case 'weekly':
          // 주간 보고서 생성
          const weeklyData = reportData as ReportWeeklyData;
          response = await this.createWeeklyReportPage(
            title,
            date,
            manDayText,
            weeklyData.manDayByGroupText,
            weeklyData.manDayByPerson,
            weeklyData.groupedReports,
          );
          break;

        case 'monthly':
          // 월간 보고서 생성
          const monthlyData = reportData as ReportMonthlyData;
          response = await this.createMonthlyReportPage(
            title,
            date,
            manDayText,
            monthlyData.manDayByGroupText,
            monthlyData.manDayByPerson,
            monthlyData.groupedReports,
          );
          break;

        case 'daily':
        default:
          // 일일 보고서 생성
          const dailyData = reportData as ReportDailyData;
          response = await this.createDailyReportPage(
            title,
            date,
            dailyData.text,
            manDayText,
            dailyData.manDayByGroupText,
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
   * @param manDayText - 공수 요약 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPerson - 인원별 상세 공수 및 보고서 정보
   * @param groupedReports - 구조화된 보고서 데이터
   * @returns 생성된 Notion 페이지
   */
  async createWeeklyReportPage(
    title: string,
    date: string,
    manDayText: string,
    manDayByGroupText: string,
    manDayByPerson?: ManDayByPersonWithReports[],
    groupedReports?: DailyReportGroup[],
  ) {
    // 모든 블록 생성
    const allBlocks: BlockObjectRequest[] = [];
    
    // 구조화된 데이터를 사용하여 블록 생성
    if (groupedReports && groupedReports.length > 0) {
      allBlocks.push(...createWeeklyReportBlocksFromData(groupedReports, date));
    }
    
    allBlocks.push(
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText)
    );

    // 블록을 청크로 나누기 (100개 제한 대응)
    const blockChunks = chunkBlocks(allBlocks, 100);
    
    // 첫 번째 청크로 페이지 생성
    const firstChunk = blockChunks[0] || [];

    // 페이지 생성
    const page = await notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '🔶',
      },
      properties: createPageProperties(title, date),
      children: firstChunk,
    });

    // 나머지 청크들을 순차적으로 추가
    for (let i = 1; i < blockChunks.length; i++) {
      await this.appendBlocksToPage(page.id, blockChunks[i]);
    }

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
   * @param manDayByPerson - 인원별 상세 공수 및 보고서 정보
   * @returns 생성된 Notion 페이지
   */
  async createDailyReportPage(
    title: string,
    date: string,
    text: string,
    manDayText: string,
    manDayByGroupText?: string,
    manDayByPerson?: ManDayByPersonWithReports[],
  ) {
    // 모든 블록 생성
    const allBlocks: BlockObjectRequest[] = [
      ...createCodeBlocks(text),
      createParagraphBlock(manDayText),
    ];

    if (manDayByGroupText) {
      allBlocks.push(createParagraphBlock(manDayByGroupText));
    }

    // 블록을 청크로 나누기 (100개 제한 대응)
    const blockChunks = chunkBlocks(allBlocks, 100);
    
    // 첫 번째 청크로 페이지 생성
    const firstChunk = blockChunks[0] || [];

    // 페이지 생성
    const page = await notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📝',
      },
      properties: createPageProperties(title, date),
      children: firstChunk,
    });

    // 나머지 청크들을 순차적으로 추가
    for (let i = 1; i < blockChunks.length; i++) {
      await this.appendBlocksToPage(page.id, blockChunks[i]);
    }

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
   * @param manDayText - 인원별 공수 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPerson - 인원별 상세 공수 및 보고서 정보
   * @param groupedReports - 구조화된 보고서 데이터
   * @returns 생성된 Notion 페이지
   */
  async createMonthlyReportPage(
    title: string,
    date: string,
    manDayText: string,
    manDayByGroupText: string,
    manDayByPerson?: ManDayByPersonWithReports[],
    groupedReports?: DailyReportGroup[],
  ) {
    // 모든 블록 생성
    const allBlocks: BlockObjectRequest[] = [];
    
    // 구조화된 데이터를 사용하여 블록 생성
    if (groupedReports && groupedReports.length > 0) {
      allBlocks.push(...createMonthlyReportBlocksFromData(groupedReports, date));
    }
    
    allBlocks.push(
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText)
    );

    // 블록을 청크로 나누기 (100개 제한 대응)
    const blockChunks = chunkBlocks(allBlocks, 100);
    
    // 첫 번째 청크로 페이지 생성
    const firstChunk = blockChunks[0] || [];
    
    const page = await notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📊',
      },
      properties: createPageProperties(title, date),
      children: firstChunk,
    });

    // 나머지 청크들을 순차적으로 추가
    for (let i = 1; i < blockChunks.length; i++) {
      await this.appendBlocksToPage(page.id, blockChunks[i]);
    }

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

  /**
   * 일일 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 일일 보고서 제목
   */
  generateDailyReportTitle(date: string): string {
    // 날짜 포맷 변환 (YYYY-MM-DD -> YY.MM.DD)
    const formattedDate = date.slice(2).replace(/-/g, '.');
    return `큐브 파트 일일업무 보고 (${formattedDate})`;
  }

  /**
   * 주간 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 주간 보고서 제목
   */
  generateWeeklyReportTitle(date: string): string {
    const weekOfMonth = getWeekOfMonth(date);
    return `${weekOfMonth} 큐브 파트 주간업무 보고`;
  }

  /**
   * 월간 보고서 제목을 생성한다
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 월간 보고서 제목
   */
  generateMonthlyReportTitle(date: string): string {
    const monthYear = new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    });
    return `${monthYear} 큐브 파트 월간업무 보고`;
  }
}
