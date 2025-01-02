import { notionClient } from '../config/notion';
import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';

export class NotionService {
  private databaseId: string;
  private reportDatabaseId: string;

  constructor() {
    if (
      !process.env.NOTION_DATABASE_ID ||
      !process.env.NOTION_REPORT_DATABASE_ID
    ) {
      throw new Error('Database IDs are not defined in environment variables');
    }

    this.databaseId = process.env.NOTION_DATABASE_ID;
    this.reportDatabaseId = process.env.NOTION_REPORT_DATABASE_ID;
  }

  /**
   * Notion 데이터베이스를 조회하고 필터링된 결과를 반환합니다
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

      console.log(response);
      return response;
    } catch (error) {
      console.error('Notion 데이터베이스 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 모든 데이터베이스 결과를 페이지네이션하여 조회합니다
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
}
