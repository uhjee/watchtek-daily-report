import { notionClient } from '../config/notion';
import {
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { config } from '../config/config';
import { ReportDataForCreatePage, ReportWeeklyData } from '../types/report';

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

  /**
   * 주어진 데이터가 주간 보고서 데이터인지 확인합니다
   * @param data - 확인할 보고서 데이터
   * @returns 주간 보고서 데이터 여부
   */
  isWeeklyData(data: ReportDataForCreatePage): data is ReportWeeklyData {
    return 'manDayByGroupText' in data;
  }

  /**
   * 리포트 데이터베이스에 새로운 페이지를 생성합니다
   * @param reportData - 생성할 보고서 데이터 (일일/주간)
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 생성된 Notion 페이지
   */
  async createReportPage(reportData: ReportDataForCreatePage, date: string) {
    const { title, text, manDayText } = reportData;
    let manDayByGroupText: string | null = null;
    if (this.isWeeklyData(reportData)) {
      manDayByGroupText = reportData.manDayByGroupText;
    }

    try {
      const response = await notionClient.pages.create({
        parent: {
          database_id: this.reportDatabaseId,
        },
        icon: {
          emoji: !!manDayByGroupText ? '🔶' : '📝',
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
          Date: {
            date: {
              start: date,
            },
          },
        },
        children: [
          {
            object: 'block',
            type: 'code',
            code: {
              rich_text: [
                {
                  type: 'text',

                  text: {
                    content: text,
                  },
                },
              ],
              language: 'javascript',
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: manDayText,
                  },
                },
              ],
            },
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: manDayByGroupText ?? '',
                  },
                },
              ],
            },
          },
        ],
      });

      return response;
    } catch (error) {
      console.error('리포트 페이지 생성 중 오류 발생:', error);
      throw error;
    }
  }
}
