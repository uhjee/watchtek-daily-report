import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { splitTextIntoChunks } from './stringUtils';

/**
 * Notion 기본 블록 생성 유틸리티 함수들
 * 순수 함수로 구성되며, 비즈니스 로직은 포함하지 않는다
 */

/**
 * 코드 블록을 생성한다 (2000자 제한 적용)
 * @param text - 코드 블록에 들어갈 텍스트
 * @param language - 코드 언어 (기본값: javascript)
 * @returns 코드 블록 배열
 */
export function createCodeBlocks(
  text: string,
  language: any = 'javascript',
): BlockObjectRequest[] {
  const chunks = splitTextIntoChunks(text);
  return chunks.map((chunk) => ({
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
      language,
    },
  }));
}

/**
 * 단락(paragraph) 블록을 생성한다
 * @param text - 단락에 들어갈 텍스트
 * @returns 단락 블록
 */
export function createParagraphBlock(text: string): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [
        {
          type: 'text' as const,
          text: {
            content: text,
          },
        },
      ],
    },
  };
}

/**
 * heading_2 블록을 생성한다
 * @param text - 제목 텍스트
 * @param color - 텍스트 색상 (선택사항)
 * @returns heading_2 블록
 */
export function createHeading2Block(
  text: string,
  color?: string,
): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'heading_2' as const,
    heading_2: {
      rich_text: [
        {
          type: 'text' as const,
          text: {
            content: text,
          },
          annotations: color
            ? {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: color as any,
              }
            : undefined,
        },
      ],
    },
  };
}

/**
 * heading_3 블록을 생성한다
 * @param text - 제목 텍스트
 * @returns heading_3 블록
 */
export function createHeading3Block(text: string): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'heading_3' as const,
    heading_3: {
      rich_text: [
        {
          type: 'text' as const,
          text: {
            content: text,
          },
        },
      ],
    },
  };
}

/**
 * bulleted_list_item 블록을 생성한다
 * @param text - 리스트 아이템 텍스트
 * @returns bulleted_list_item 블록
 */
export function createBulletedListItemBlock(text: string): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'bulleted_list_item' as const,
    bulleted_list_item: {
      rich_text: [
        {
          type: 'text' as const,
          text: {
            content: text,
          },
        },
      ],
    },
  };
}

/**
 * divider 블록을 생성한다
 * @returns divider 블록
 */
export function createDividerBlock(): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'divider' as const,
    divider: {},
  };
}

/**
 * 테이블 행(table_row) 블록을 생성한다
 * @param cells - 각 셀의 텍스트 배열
 * @returns table_row 블록
 */
export function createTableRowBlock(cells: string[]): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'table_row' as const,
    table_row: {
      cells: cells.map((cellText) => [
        {
          type: 'text' as const,
          text: {
            content: cellText,
          },
        },
      ]),
    },
  };
}

/**
 * 테이블 셀 데이터 타입 (텍스트 또는 하이퍼링크 포함)
 */
export type TableCellData = string | { text: string; link?: string };

/**
 * 하이퍼링크를 지원하는 테이블 행(table_row) 블록을 생성한다
 * @param cells - 각 셀의 데이터 배열 (문자열 또는 {text, link} 객체)
 * @returns table_row 블록
 */
export function createTableRowBlockWithLinks(cells: TableCellData[]): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'table_row' as const,
    table_row: {
      cells: cells.map((cellData) => {
        if (typeof cellData === 'string') {
          // 단순 텍스트인 경우
          return [
            {
              type: 'text' as const,
              text: {
                content: cellData,
              },
            },
          ];
        } else {
          // 하이퍼링크가 포함된 경우
          return [
            {
              type: 'text' as const,
              text: {
                content: cellData.text,
                link: cellData.link ? { url: cellData.link } : undefined,
              },
            },
          ];
        }
      }),
    },
  };
}

/**
 * 테이블 헤더와 데이터 행들을 생성한다
 * @param data - 테이블 데이터 (2차원 배열, 첫 번째 행은 헤더)
 * @returns table 블록 (children 포함)
 */
export function createTableWithRows(
  data: string[][],
  hasColumnHeader: boolean = true,
): BlockObjectRequest {
  if (!data || data.length === 0) {
    throw new Error('테이블 데이터가 비어있습니다');
  }

  const columnCount = data[0]?.length || 1;
  const tableRows = data.map((row) => createTableRowBlock(row));

  return {
    object: 'block' as const,
    type: 'table' as const,
    table: {
      table_width: columnCount,
      has_column_header: hasColumnHeader,
      has_row_header: false,
      children: tableRows as any, // Notion API 타입 이슈 회피
    },
  };
}

/**
 * 하이퍼링크를 지원하는 테이블을 생성한다
 * @param data - 테이블 데이터 (각 행은 TableCellData 배열)
 * @param hasColumnHeader - 컬럼 헤더 여부
 * @returns table 블록
 */
export function createTableWithLinksAndRows(
  data: TableCellData[][],
  hasColumnHeader: boolean = true,
): BlockObjectRequest {
  if (!data || data.length === 0) {
    throw new Error('테이블 데이터가 비어있습니다');
  }

  const columnCount = data[0]?.length || 1;
  const tableRows = data.map((row) => createTableRowBlockWithLinks(row));

  return {
    object: 'block' as const,
    type: 'table' as const,
    table: {
      table_width: columnCount,
      has_column_header: hasColumnHeader,
      has_row_header: false,
      children: tableRows as any, // Notion API 타입 이슈 회피
    },
  };
}

/**
 * 블록 배열을 지정된 크기의 청크로 나눈다 (Notion API 제한 대응)
 * @param blocks - 나눌 블록 배열
 * @param chunkSize - 청크 크기 (기본값: 100)
 * @returns 청크로 나뉜 블록 배열들의 배열
 */
export function chunkBlocks(
  blocks: BlockObjectRequest[],
  chunkSize: number = 100,
): BlockObjectRequest[][] {
  const chunks: BlockObjectRequest[][] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * heading_1 블록을 생성한다
 * @param text - 제목 텍스트
 * @returns heading_1 블록
 */
export function createHeading1Block(text: string): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'heading_1' as const,
    heading_1: {
      rich_text: [
        {
          type: 'text' as const,
          text: {
            content: text,
          },
        },
      ],
    },
  };
}
