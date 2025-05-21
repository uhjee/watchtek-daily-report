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
    return notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '🔶',
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
          object: 'block' as const,
          type: 'code' as const,
          code: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: text,
                },
              },
            ],
            language: 'javascript',
          },
        },
        {
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: manDayText,
                },
              },
            ],
          },
        },
        {
          object: 'block' as const,
          type: 'paragraph' as const,
          paragraph: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: manDayByGroupText,
                },
              },
            ],
          },
        },
        {
          object: 'block' as const,
          type: 'code' as const,
          code: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: manDayByPersonText,
                },
              },
            ],
            language: 'javascript',
          },
        },
      ],
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
    // 기본 블록 구성
    const children: BlockObjectRequest[] = [];

    // 텍스트를 2000자 단위로 나누는 함수
    const splitTextIntoChunks = (text: string): string[] => {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += 2000) {
        chunks.push(text.slice(i, i + 2000));
      }
      return chunks;
    };

    // text가 2000자 이상인 경우 나누기
    const textChunks = splitTextIntoChunks(text);
    textChunks.forEach(chunk => {
      children.push({
        object: 'block' as const,
        type: 'code' as const,
        code: {
          rich_text: [
            {
              type: 'text' as const,
              text: {
                content: chunk,
              },
            },
          ],
          language: 'javascript',
        },
      });
    });

    // manDayText 블록 추가
    children.push({
      object: 'block' as const,
      type: 'paragraph' as const,
      paragraph: {
        rich_text: [
          {
            type: 'text' as const,
            text: {
              content: manDayText,
            },
          },
        ],
      },
    });

    // manDayByGroupText가 있으면 추가
    if (manDayByGroupText) {
      children.push({
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [
            {
              type: 'text' as const,
              text: {
                content: manDayByGroupText,
              },
            },
          ],
        },
      });
    }

    // manDayByPersonText가 있으면 추가 (2000자 제한 적용)
    if (manDayByPersonText) {
      const personTextChunks = splitTextIntoChunks(manDayByPersonText);
      personTextChunks.forEach(chunk => {
        children.push({
          object: 'block' as const,
          type: 'code' as const,
          code: {
            rich_text: [
              {
                type: 'text' as const,
                text: {
                  content: chunk,
                },
              },
            ],
            language: 'javascript',
          },
        });
      });
    }

    return notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📝',
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
    // 각 텍스트에 대한 코드 블록 생성
    const textBlocks = texts.map((text) => ({
      object: 'block' as const,
      type: 'code' as const,
      code: {
        rich_text: [
          {
            type: 'text' as const,
            text: {
              content: text,
            },
          },
        ],
        language: 'javascript',
      },
    }));

    // 인원별 공수 정보 블록 생성
    const personManDayBlocks = manDayByPersonTexts.map((text) => ({
      object: 'block' as const,
      type: 'code' as const,
      code: {
        rich_text: [
          {
            type: 'text' as const,
            text: {
              content: text,
            },
          },
        ],
        language: 'javascript',
      },
    }));

    // 공수 정보 블록
    const manDayBlocks = [
      {
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [
            {
              type: 'text' as const,
              text: {
                content: manDayText,
              },
            },
          ],
        },
      },
      {
        object: 'block' as const,
        type: 'paragraph' as const,
        paragraph: {
          rich_text: [
            {
              type: 'text' as const,
              text: {
                content: manDayByGroupText,
              },
            },
          ],
        },
      },
    ];

    // 모든 블록 합치기
    const children = [...textBlocks, ...manDayBlocks, ...personManDayBlocks] as BlockObjectRequest[];

    return notionClient.pages.create({
      parent: {
        database_id: this.reportDatabaseId,
      },
      icon: {
        emoji: '📊',
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
      children,
    });
  }
}
