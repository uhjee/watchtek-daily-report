import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { ManHourByPersonWithReports, DailyReportGroup } from '../types/report.d';
import { getWeekOfMonth } from '../utils/dateUtils';
import { formatReportGroupTitle, formatReportItemText } from '../utils/reportUtils';
import {
  createHeading1Block,
  createHeading2Block,
  createHeading3Block,
  createParagraphBlock,
  createBulletedListItemBlock,
  createDividerBlock,
  createTableWithLinksAndRows,
  TableCellData,
} from '../utils/notionBlockUtils';

/**
 * Notion 보고서 전용 블록 생성 서비스
 * 도메인 로직이 포함된 보고서 특화 블록 생성을 담당한다
 */
export class NotionReportBlockService {
  /**
   * 보고서 페이지의 기본 속성을 생성한다
   * @param title - 페이지 제목
   * @param date - 보고서 날짜
   * @param reportType - 보고서 타입 ('daily' | 'weekly' | 'monthly')
   * @returns 페이지 속성 객체
   */
  createPageProperties(title: string, date: string, reportType?: string) {
    const properties: any = {
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

    // Tags select property 추가
    if (reportType) {
      const tagMap = {
        'daily': '일간',
        'weekly': '주간',
        'monthly': '월간'
      };

      const tagName = tagMap[reportType as keyof typeof tagMap];
      if (tagName) {
        properties.Tags = {
          select: {
            name: tagName
          }
        };
      }
    }

    return properties;
  }

  /**
   * 보고서 타입에 따른 페이지 아이콘을 생성한다
   * @param reportType - 보고서 타입 ('daily' | 'weekly' | 'monthly')
   * @returns 아이콘 객체 또는 undefined
   */
  createPageIcon(reportType: string) {
    const iconMap = {
      'daily': '📝',
      'weekly': '🔶',
      'monthly': '📊'
    };

    const emoji = iconMap[reportType as keyof typeof iconMap];
    if (emoji) {
      return {
        type: 'emoji' as const,
        emoji: emoji
      };
    }

    return undefined;
  }

  /**
   * 인원별 상세 공수 정보 블록들을 생성한다 (테이블 형태)
   * @param manHourByPerson - 인원별 공수 및 보고서 정보 배열
   * @param sectionTitle - 섹션 제목 (기본값: '[인원별 공수]')
   * @returns 인원별 상세 공수 블록 배열
   */
  createManHourByPersonBlocks(
    manHourByPerson: ManHourByPersonWithReports[],
    sectionTitle: string = '[인원별 공수]',
  ): BlockObjectRequest[] {
    const blocks: BlockObjectRequest[] = [];

    if (manHourByPerson && manHourByPerson.length > 0) {
      // 섹션 제목 추가
      blocks.push(createHeading2Block(sectionTitle));

      // 각 인원별로 상세 정보 블록 추가
      manHourByPerson.forEach((personData) => {
        // 인원명과 총 공수 헤딩 추가
        const personHeading = `${personData.name} - total: ${personData.totalManHour}m/h, ${personData.reports.length}건`;
        blocks.push(createHeading3Block(personHeading));

        // manHour가 0보다 큰 보고서만 필터링
        const filteredReports = personData.reports.filter(
          (report) => report.manHour > 0,
        );

        // '회의' 그룹을 가장 아래로 정렬
        const sortedReports = filteredReports.sort((a, b) => {
          const aIsMeeting = a.group === '회의';
          const bIsMeeting = b.group === '회의';

          if (aIsMeeting && !bIsMeeting) return 1;  // a가 회의면 뒤로
          if (!aIsMeeting && bIsMeeting) return -1; // b가 회의면 뒤로
          return 0; // 둘 다 회의이거나 둘 다 아니면 순서 유지
        });

        // 보고서가 있는 경우에만 테이블 생성
        if (sortedReports.length > 0) {
          // 테이블 헤더
          const tableHeader: TableCellData[] = [
            '번호',
            'PMS 관리 번호',
            '타이틀',
            '그룹',
            '진행도',
            '공수(m/d)',
          ];

          // 테이블 데이터 생성 (PmsLink 활용)
          const tableDataRows: TableCellData[][] = sortedReports.map((report, index) => [
            `${index + 1}`,
            // PmsLink가 있으면 하이퍼링크로, 없으면 일반 텍스트로
            report.pmsLink && report.pmsNumber
              ? { text: this.getPmsNumberAfterEmptyCheck(report.pmsNumber), link: report.pmsLink }
              : this.getPmsNumberAfterEmptyCheck(report.pmsNumber),
            this.cleanTitle(report.title || ''),
            report.group || '',
            `${report.progressRate}%`,
            `${report.manHour}`,
          ]);

          const tableData: TableCellData[][] = [tableHeader, ...tableDataRows];

          // 하이퍼링크를 지원하는 테이블 블록 추가
          const tableBlock = createTableWithLinksAndRows(tableData, true);
          blocks.push(tableBlock);
        }
      });
    }

    return blocks;
  }

  /**
   * Weekly report의 구조화된 데이터에서 직접 Notion 블록들을 생성한다
   * @param groupedReports - 포맷된 보고서 데이터
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 구조화된 블록 배열
   */
  createWeeklyReportBlocksFromData(
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
      // 그룹 제목 (Heading 2)
      const groupTitle = formatReportGroupTitle(reportGroup.type, true);
      blocks.push(createHeading2Block(groupTitle, 'yellow_background'));

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
            const cleanItemText = itemText.startsWith('- ')
              ? itemText.substring(2)
              : itemText;
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
  createMonthlyReportBlocksFromData(
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

      // 완료된 업무 섹션 전에 divider 추가
      if (groupTitle === '완료된 업무') {
        blocks.push(createDividerBlock());
      }

      blocks.push(createHeading2Block(groupTitle, 'yellow_background'));

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
            const cleanItemText = itemText.startsWith('- ')
              ? itemText.substring(2)
              : itemText;
            blocks.push(createBulletedListItemBlock(cleanItemText));
          });
        });
      });
    });

    return blocks;
  }

  /**
   * PMS 번호를 반환한다. 없을 경우 빈 문자열 반환
   * @param pmsNumber - PMS 번호
   * @returns 포맷된 PMS 번호 문자열
   */
  private getPmsNumberAfterEmptyCheck(pmsNumber: number | undefined): string {
    if (pmsNumber === null || pmsNumber === undefined) {
      return '';
    }
    return '#' + pmsNumber.toString();
  }

  /**
   * 타이틀에서 불필요한 접두사를 제거한다
   * @param title - 원본 타이틀
   * @returns 정리된 타이틀
   */
  private cleanTitle(title: string): string {
    if (!title) return '';

    // "#-" 접두사 제거
    if (title.startsWith('#-')) {
      return title.substring(2).trim();
    }

    return title;
  }
}
