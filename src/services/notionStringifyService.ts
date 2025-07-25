import {
  DailyReportGroup,
  ReportForm,
  ManDayByPerson,
  DailyReport,
} from '../types/report.d';
import {
  formatReportItemText,
  formatReportGroupTitle,
} from '../utils/reportUtils';

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
      text += formatReportGroupTitle(reportGroup.type) + '\n';

      // 각 업무 그룹 처리
      reportGroup.groups.forEach((group, groupIndex) => {
        // Group 제목 (numbering 포함)
        text += `${groupIndex + 1}. ${group.group}\n`;

        // 기존 로직 유지 (다른 그룹들은 subGroup 표시)
        group.subGroups.forEach((subGroup) => {
          text += `[${subGroup.subGroup}]\n`;

          subGroup.items.forEach((item) => {
            const includeProgress = reportGroup.type === '진행업무';
            text += formatReportItemText(item, includeProgress) + '\n';
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
}
