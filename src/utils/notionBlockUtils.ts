import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { splitTextIntoChunks } from './stringUtils';
import { ManDayByPersonWithReports, DailyReportGroup } from '../types/report.d';
import { getWeekOfMonth } from './dateUtils';
import { formatReportGroupTitle, formatReportItemText } from './reportUtils';

/**
 * Notion 블록 생성 관련 유틸리티 함수들
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
 * @returns heading_2 블록
 */
export function createHeading2Block(text: string): BlockObjectRequest {
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
 * 블록 배열을 지정된 크기의 청크로 나눈다 (Notion API 제한 대응)
 * @param blocks - 나눌 블록 배열
 * @param chunkSize - 청크 크기 (기본값: 100)
 * @returns 청크로 나뉜 블록 배열들의 배열
 */
export function chunkBlocks(blocks: BlockObjectRequest[], chunkSize: number = 100): BlockObjectRequest[][] {
  const chunks: BlockObjectRequest[][] = [];
  for (let i = 0; i < blocks.length; i += chunkSize) {
    chunks.push(blocks.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 보고서 페이지의 기본 속성을 생성한다
 * @param title - 페이지 제목
 * @param date - 보고서 날짜
 * @returns 페이지 속성 객체
 */
export function createPageProperties(title: string, date: string) {
  return {
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
  };
}

/**
 * 인원별 상세 공수 정보 블록들을 생성한다 (테이블 형태)
 * @param manDayByPerson - 인원별 공수 및 보고서 정보 배열
 * @returns 인원별 상세 공수 블록 배열
 */
export function createManDayByPersonBlocks(
  manDayByPerson: ManDayByPersonWithReports[],
): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  if (manDayByPerson && manDayByPerson.length > 0) {
    // 섹션 제목 추가
    blocks.push(createHeading2Block('[일주일 인원별 공수]'));

    // 각 인원별로 상세 정보 블록 추가
    manDayByPerson.forEach((personData) => {
      // 인원명과 총 공수 헤딩 추가
      const personHeading = `${personData.name} - total: ${personData.totalManDay}m/d, ${personData.reports.length}건`;
      blocks.push(createHeading3Block(personHeading));

      // manDay가 0보다 큰 보고서만 필터링
      const filteredReports = personData.reports.filter(
        (report) => report.manDay > 0,
      );

      // 보고서가 있는 경우에만 테이블 생성
      if (filteredReports.length > 0) {
        // 테이블 헤더
        const tableHeader = [
          '번호',
          'PMS 관리 번호',
          '타이틀',
          '그룹',
          '진행도',
          '공수(m/d)',
        ];

        // 테이블 데이터 생성
        const tableData = [
          tableHeader,
          ...filteredReports.map((report, index) => [
            `${index + 1}`,
            getPmsNumberAfterEmptyCheck(report.pmsNumber),
            report.title || '',
            report.group || '',
            `${report.progressRate}%`,
            `${report.manDay}`,
          ]),
        ];

        // 테이블 블록 추가
        const tableBlock = createTableWithRows(tableData, true);
        blocks.push(tableBlock);
      }
    });
  }

  return blocks;
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

/**
 * 텍스트 라인의 타입을 판별한다
 * @param line - 판별할 텍스트 라인
 * @param isFirstLine - 첫 번째 라인 여부
 * @returns 블록 타입과 정리된 텍스트
 */
function analyzeLineType(line: string, isFirstLine: boolean): { type: string; cleanText: string } {
  const trimmedLine = line.trim();
  
  if (!trimmedLine) {
    return { type: 'empty', cleanText: '' };
  }
  
  if (isFirstLine) {
    return { type: 'heading_1', cleanText: trimmedLine };
  }
  
  // ****텍스트**** 패턴 (Heading 2)
  if (/^\*{4}.*\*{4}$/.test(trimmedLine)) {
    const cleanText = trimmedLine.replace(/^\*{4}/, '').replace(/\*{4}$/, '').trim();
    return { type: 'heading_2', cleanText };
  }
  
  // 숫자. 텍스트 패턴 (Heading 3 - Group)
  if (/^\d+\.\s/.test(trimmedLine)) {
    return { type: 'heading_3', cleanText: trimmedLine };
  }
  
  // [텍스트] 패턴 (Paragraph - Sub Group)
  if (/^\[.*\]$/.test(trimmedLine)) {
    return { type: 'paragraph', cleanText: trimmedLine };
  }
  
  // - 텍스트 패턴 (Bulleted List Item)
  if (/^-\s/.test(trimmedLine)) {
    return { type: 'bulleted_list_item', cleanText: trimmedLine.substring(2).trim() };
  }
  
  // 기타 (Paragraph)
  return { type: 'paragraph', cleanText: trimmedLine };
}

/**
 * Weekly report 텍스트를 구조화된 Notion 블록들로 변환한다
 * @param text - Weekly report 텍스트
 * @returns 구조화된 블록 배열
 */
export function createWeeklyReportBlocks(text: string): BlockObjectRequest[] {
  if (!text || !text.trim()) {
    return [];
  }
  
  const lines = text.split('\n');
  const blocks: BlockObjectRequest[] = [];
  
  lines.forEach((line, index) => {
    const { type, cleanText } = analyzeLineType(line, index === 0);
    
    if (type === 'empty') {
      return; // 빈 라인은 건너뛰기
    }
    
    switch (type) {
      case 'heading_1':
        blocks.push(createHeading1Block(cleanText));
        break;
      case 'heading_2':
        blocks.push(createHeading2Block(cleanText));
        break;
      case 'heading_3':
        blocks.push(createHeading3Block(cleanText));
        break;
      case 'paragraph':
        blocks.push(createParagraphBlock(cleanText));
        break;
      case 'bulleted_list_item':
        blocks.push(createBulletedListItemBlock(cleanText));
        break;
      default:
        blocks.push(createParagraphBlock(cleanText));
        break;
    }
  });
  
  return blocks;
}



/**
 * PMS 번호를 반환한다. 없을 경우 빈 문자열 반환
 * @param pmsNumber - PMS 번호
 * @returns 포맷된 PMS 번호 문자열
 */
function getPmsNumberAfterEmptyCheck(pmsNumber: number | undefined): string {
  if (pmsNumber === null || pmsNumber === undefined) {
    return '';
  }
  return '#' + pmsNumber.toString();
}

/**
 * Weekly report의 구조화된 데이터에서 직접 Notion 블록들을 생성한다
 * @param groupedReports - 포맷된 보고서 데이터
 * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
 * @returns 구조화된 블록 배열
 */
export function createWeeklyReportBlocksFromData(
  groupedReports: DailyReportGroup[],
  date: string,
): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];
  const weekOfMonth = getWeekOfMonth(date);

  // 제목 (Heading 1)
  const title = `${weekOfMonth} 큐브 파트 주간업무 보고`;
  blocks.push(createHeading1Block(title));

  // 각 그룹(진행업무/예정업무)에 대해 처리
  groupedReports.forEach((reportGroup) => {
    // 그룹 제목 (Heading 2) - ****로 감싸진 형태
    const groupTitle = formatReportGroupTitle(reportGroup.type, true);
    // ****를 제거하고 Heading 2로 변환
    const cleanGroupTitle = groupTitle.replace(/^\*{4}/, '').replace(/\*{4}$/, '').trim();
    blocks.push(createHeading2Block(cleanGroupTitle));

    // 각 업무 그룹 처리
    reportGroup.groups.forEach((group, groupIndex) => {
      // Group 제목 (Heading 3) - numbering 포함
      const groupHeading = `${groupIndex + 1}. ${group.group}`;
      blocks.push(createHeading3Block(groupHeading));

      // 각 서브그룹 처리
      group.subGroups.forEach((subGroup) => {
        // 서브그룹 제목 (Paragraph) - [서브그룹명] 형태
        const subGroupTitle = `[${subGroup.subGroup}]`;
        blocks.push(createParagraphBlock(subGroupTitle));

        // 각 아이템을 Bulleted List로 추가
        subGroup.items.forEach((item) => {
          const includeProgress = reportGroup.type === '진행업무';
          const itemText = formatReportItemText(item, includeProgress);
          // "- " 접두사 제거 (formatReportItemText에서 이미 포함됨)
          const cleanItemText = itemText.startsWith('- ') ? itemText.substring(2) : itemText;
          blocks.push(createBulletedListItemBlock(cleanItemText));
        });
      });
    });
  });

  return blocks;
}

/**
 * Monthly report의 구조화된 데이터에서 직접 Notion 블록들을 생성한다
 * @param groupedReports - 포맷된 보고서 데이터
 * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
 * @returns 구조화된 블록 배열
 */
export function createMonthlyReportBlocksFromData(
  groupedReports: DailyReportGroup[],
  date: string,
): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];
  const monthYear = new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  // 제목 (Heading 1)
  const title = `${monthYear} 큐브 파트 월간업무 보고`;
  blocks.push(createHeading1Block(title));

  // 각 그룹(진행업무/완료업무)에 대해 처리
  groupedReports.forEach((reportGroup) => {
    // 그룹 제목 매핑
    const titleMap: Record<string, string> = {
      진행업무: '진행 중인 업무',
      완료업무: '완료된 업무',
    };
    const groupTitle = titleMap[reportGroup.type] || reportGroup.type;
    blocks.push(createHeading2Block(groupTitle));

    // 각 업무 그룹 처리
    reportGroup.groups.forEach((group, groupIndex) => {
      // Group 제목 (Heading 3) - numbering 포함
      const groupHeading = `${groupIndex + 1}. ${group.group}`;
      blocks.push(createHeading3Block(groupHeading));

      // 각 서브그룹 처리
      group.subGroups.forEach((subGroup) => {
        // 서브그룹 제목 (Paragraph) - [서브그룹명] 형태
        const subGroupTitle = `[${subGroup.subGroup}]`;
        blocks.push(createParagraphBlock(subGroupTitle));

        // 각 아이템을 Bulleted List로 추가
        subGroup.items.forEach((item) => {
          // 월간 보고서는 항상 진행률 포함
          const itemText = formatReportItemText(item, true);
          // "- " 접두사 제거 (formatReportItemText에서 이미 포함됨)
          const cleanItemText = itemText.startsWith('- ') ? itemText.substring(2) : itemText;
          blocks.push(createBulletedListItemBlock(cleanItemText));
        });
      });
    });
  });

  return blocks;
}
