import { notionClient } from '../config/notion';
import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { config } from '../config/config';

/**
 * Notion API 호출을 담당하는 서비스
 * 순수한 API 인터페이스 역할만 수행
 */
export class NotionApiService {
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
   * 보고서 데이터베이스에 새로운 페이지를 생성한다
   * @param properties - 페이지 속성
   * @param children - 페이지 블록 내용
   * @param icon - 페이지 아이콘 (선택사항)
   * @returns 생성된 Notion 페이지
   */
  async createPage(properties: any, children: any[], icon?: any) {
    try {
      const pageData: any = {
        parent: {
          database_id: this.reportDatabaseId,
        },
        properties,
        children,
      };

      // 아이콘이 제공된 경우 추가
      if (icon) {
        pageData.icon = icon;
      }

      return await notionClient.pages.create(pageData);
    } catch (error) {
      console.error('Notion 페이지 생성 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 기존 페이지에 블록을 추가한다 (100개 블록 제한 고려)
   * @param pageId - 페이지 ID
   * @param blocks - 추가할 블록 배열
   */
  async appendBlocks(pageId: string, blocks: any[]): Promise<void> {
    try {
      // Notion API의 100개 블록 제한으로 인한 청크 처리
      const BLOCK_LIMIT = 100;
      for (let i = 0; i < blocks.length; i += BLOCK_LIMIT) {
        const chunk = blocks.slice(i, i + BLOCK_LIMIT);
        await notionClient.blocks.children.append({
          block_id: pageId,
          children: chunk,
        });
      }
    } catch (error) {
      console.error('Notion 블록 추가 중 오류 발생:', error);
      throw error;
    }
  }
}