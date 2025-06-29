import {
  DailyReportGroup,
  ReportForm,
  ManDayByPerson,
  ManDayByPersonWithReports,
  MonthlyReportForm,
  DailyReport,
} from '../types/report.d';
import { getWeekOfMonth } from '../utils/dateUtils';
import { formatReportItemText, formatReportGroupTitle } from '../utils/reportUtils';
import { TEXT_LIMITS } from '../constants/reportConstants';

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
      text += formatReportGroupTitle(reportGroup.type, true) + '\n';

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

  /**
   * 월간 보고서를 문자열로 변환합니다
   * 각 그룹별로 분리된 텍스트 배열을 반환합니다
   */
  stringifyMonthlyReports(
    reports: DailyReportGroup[],
    date: string,
  ): MonthlyReportForm {
    const monthYear = new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
    });

    // 헤더
    const title = `${monthYear} 큐브 파트 월간업무 보고`;
    const texts: string[] = [];

    // 제목 텍스트 추가
    texts.push(`${title}\n\n`);

    // 각 그룹(진행업무/완료업무)에 대해 처리
    reports.forEach((reportGroup) => {
      // 그룹 제목 추가
      const titleMap: Record<string, string> = {
        '진행업무': '****진행 중인 업무****',
        '완료업무': '****완료된 업무****',
      };
      const groupTitle = titleMap[reportGroup.type] || `****${reportGroup.type}****`;
      texts.push(groupTitle + '\n');

      // 각 업무 그룹 처리
      reportGroup.groups.forEach((group, groupIndex) => {
        let groupText = `${groupIndex + 1}. ${group.group}\n`;

        // 기존 로직 유지 (다른 그룹들은 subGroup 표시)
        group.subGroups.forEach((subGroup) => {
          groupText += `[${subGroup.subGroup}]\n`;

          subGroup.items.forEach((item) => {
            groupText += formatReportItemText(item, true) + '\n';
          });
          groupText += '\n';
        });

        // 각 그룹을 별도의 텍스트로 추가
        texts.push(groupText);
      });
    });

    // 마지막에 빈 줄 추가
    texts.push('\n');

    return {
      title,
      texts,
      // 전체 텍스트도 함께 제공 (기존 호환성 유지)
      text: texts.join(''),
    };
  }

  /**
   * 월간 보고서의 인원별 공수 정보를 문자열 배열로 변환한다
   * @param manDayByPerson - 인원별 공수 및 보고서 정보
   * @returns 인원별로 분리된 공수 정보 문자열 배열
   */
  stringifyMonthlyManDayByPerson(
    manDayByPerson: ManDayByPersonWithReports[],
  ): string[] {
    const result: string[] = [];
    const MAX_TEXT_LENGTH = TEXT_LIMITS.MONTHLY_REPORT_MAX_LENGTH;

    // 각 인원별로 별도의 문자열 생성
    manDayByPerson.forEach((personData) => {
      // 인원 헤더 생성
      const headerText = `[${
        personData.name
      }] - 총 공수: ${personData.totalManDay.toFixed(1)}MD\n\n`;

      // 그룹별로 정리
      const reportsByGroup = this.groupReportsByGroup(personData.reports);

      // 각 그룹의 보고서 정보를 별도의 텍스트 조각으로 생성
      const groupTexts: string[] = [];

      Object.entries(reportsByGroup).forEach(([group, reports]) => {
        let groupText = `* ${group}\n`;

        // 각 보고서 항목 추가
        reports.forEach((report) => {
          const title = report.customer
            ? `[${report.customer}] ${report.title}`
            : report.title;

          const progress = `, ${report.progressRate}%`;
          const manDay = `, ${report.manDay.toFixed(1)}MD`;

          groupText += `  - ${title}${progress}${manDay}\n`;
        });

        groupText += '\n';
        groupTexts.push(groupText);
      });

      // 텍스트 조각들을 최대 길이를 초과하지 않도록 결합
      let currentText = headerText;

      for (const groupText of groupTexts) {
        // 현재 텍스트에 그룹 텍스트를 추가했을 때 최대 길이를 초과하는지 확인
        if (currentText.length + groupText.length > MAX_TEXT_LENGTH) {
          // 최대 길이 초과 시 현재 텍스트를 결과에 추가하고 새 텍스트 시작
          result.push(currentText);

          // 새 텍스트는 인원 이름으로 시작 (계속)
          currentText = `[${personData.name}] (계속)\n\n${groupText}`;
        } else {
          // 최대 길이 이내면 현재 텍스트에 그룹 텍스트 추가
          currentText += groupText;
        }
      }

      // 마지막 텍스트 조각 추가
      if (currentText.length > 0) {
        result.push(currentText);
      }
    });

    return result;
  }

  /**
   * 보고서를 그룹별로 분류한다
   * @param reports - 보고서 배열
   * @returns 그룹별로 분류된 보고서 객체
   */
  private groupReportsByGroup(
    reports: DailyReport[],
  ): Record<string, DailyReport[]> {
    const result: Record<string, DailyReport[]> = {};

    reports.forEach((report) => {
      if (!result[report.group]) {
        result[report.group] = [];
      }
      result[report.group].push(report);
    });

    return result;
  }
}
