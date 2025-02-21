import {
  DailyReportGroup,
  ReportForm,
  ManDayByPerson,
  ManDayByPersonWithReports,
} from '../types/report';
import { getWeekOfMonth } from '../utils/dateUtils';

export class NotionStringifyService {
  /**
   * 일일 보고서 데이터를 텍스트로 변환한다
   * @param reports - 포맷된 보고서 데이터
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 제목과 내용이 포함된 보고서 텍스트
   */
  stringifyDailyReports(reports: DailyReportGroup[], date: string): ReportForm {
    // 날짜 포맷 변환 (YYYY-MM-DD -> YY.MM.DD)
    const formattedDate = date.slice(2).replace(/-/g, '.');

    // 헤더
    const title = `큐브 파트 일일업무 보고 (${formattedDate})`;
    let text = `${title}\n\n`;

    // 각 그룹(진행업무/예정업무)에 대해 처리
    reports.forEach((reportGroup) => {
      // 그룹 제목 추가
      text += `****${
        reportGroup.type === '진행업무' ? '업무 진행 사항' : '업무 계획 사항'
      }****\n`;

      // 각 업무 그룹 처리
      reportGroup.groups.forEach((group, groupIndex) => {
        // Group 제목 (numbering 포함)
        text += `${groupIndex + 1}. ${group.group}\n`;

        // 기존 로직 유지 (다른 그룹들은 subGroup 표시)
        group.subGroups.forEach((subGroup) => {
          text += `[${subGroup.subGroup}]\n`;

          subGroup.items.forEach((item) => {
            const title = item.customer
              ? `[${item.customer}] ${item.title}`
              : item.title;

            const progress =
              reportGroup.type === '진행업무' ? `, ${item.progressRate}%` : '';

            text += `- ${title}(${item.person}${progress})\n`;
          });
          text += '\n';
        });
      });
      text += '\n';
    });

    return { title, text };
  }

  /**
   * 공수 데이터를 포맷된 문자열로 변환한다
   * @param manDayData - 멤버별 또는 그룹별 공수 데이터
   * @param isGroup - 그룹별 공수 여부
   * @returns 포맷된 공수 문자열
   */
  stringifyManDayMap(
    manDayData: [string, number][] | ManDayByPerson,
    isGroup = false,
  ): string {
    let result = `[${isGroup ? '그룹별' : '인원별'} 공수]\n`;

    if (Array.isArray(manDayData)) {
      // 배열 형태 (멤버별 공수)
      manDayData.forEach(([name, value]) => {
        result += `- ${name}: ${value} m/d\n`;
      });
    } else {
      // 객체 형태 (그룹별 공수)
      const entries = Object.entries(manDayData).sort((a, b) => b[1] - a[1]);
      entries.forEach(([name, value]) => {
        result += `- ${name}: ${value} m/d\n`;
      });
    }

    return result;
  }

  /**
   * 주간 보고서 데이터를 텍스트로 변환합니다
   * @param reports - 포맷된 보고서 데이터
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 제목과 내용이 포함된 주간 보고서 텍스트
   */
  stringifyWeeklyReports(
    reports: DailyReportGroup[],
    date: string,
  ): ReportForm {
    const weekOfMonth = getWeekOfMonth(date);

    // 헤더
    const title = `${weekOfMonth} 큐브 파트 주간업무 보고`;
    let text = `${title}\n\n`;

    // 각 그룹(진행업무/예정업무)에 대해 처리
    reports.forEach((reportGroup) => {
      // 그룹 제목 추가
      text += `****${
        reportGroup.type === '진행업무' ? '금주 진행 사항' : '차주 계획 사항'
      }****\n`;

      // 각 업무 그룹 처리
      reportGroup.groups.forEach((group, groupIndex) => {
        // Group 제목 (numbering 포함)
        text += `${groupIndex + 1}. ${group.group}\n`;

        // 기존 로직 유지 (다른 그룹들은 subGroup 표시)
        group.subGroups.forEach((subGroup) => {
          text += `[${subGroup.subGroup}]\n`;

          subGroup.items.forEach((item) => {
            const title = item.customer
              ? `[${item.customer}] ${item.title}`
              : item.title;

            const progress =
              reportGroup.type === '진행업무' ? `, ${item.progressRate}%` : '';

            text += `- ${title}(${item.person}${progress})\n`;
          });
          text += '\n';
        });
      });
      text += '\n';
    });

    return { title, text };
  }

  /**
   * 주간 인원별 공수와 업무 내역을 포맷팅한다
   * @param manDayByPerson - 인원별 공수와 보고서 데이터 배열
   * @returns 포맷된 문자열
   */
  stringifyWeeklyManDayByPerson(
    manDayByPerson: ManDayByPersonWithReports[],
  ): string {
    let result = '[일주일 인원별 공수]\n';

    manDayByPerson.forEach(({ name, totalManDay, reports }) => {
      // 인원별 헤더 (이름과 총 공수)
      result += `\n${name} - total: ${totalManDay}m/d\n`;

      // 해당 인원의 업무 내역
      reports
        .filter((report) => report.manDay > 0) // manDay가 0인 항목은 제외
        .forEach((report) => {
          const title = report.customer
            ? `[${report.group}][${report.customer}] ${report.title}`
            : `[${report.group}] ${report.title}`;

          result += `- ${title} - ${report.manDay}m/d\n`;
        });
    });

    return result;
  }
}
