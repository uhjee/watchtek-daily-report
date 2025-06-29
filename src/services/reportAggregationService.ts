import { DailyReport, ManDayByPersonWithReports } from '../types/report.d';
import { MemberService } from './memberService';
import { calculateManDayByGroup } from '../utils/reportUtils';
import memberMap from '../config/members';

/**
 * 보고서 데이터 집계를 담당하는 서비스
 */
export class ReportAggregationService {
  private memberService: MemberService;

  constructor() {
    this.memberService = new MemberService();
  }

  /**
   * 보고서의 멤버별 공수를 계산하고 우선순위에 따라 정렬합니다
   * @param reports - 일일 보고서 데이터 배열
   * @param skipEmpty - 공수가 0인 멤버 제외 여부
   * @returns 우선순위로 정렬된 [멤버이름, 공수] 배열
   */
  getManDaySummary(
    reports: DailyReport[],
    skipEmpty: boolean = false,
  ): [string, number][] {
    let filteredReports = reports;
    if (skipEmpty) {
      filteredReports = filteredReports.filter((report) => report.manDay > 0);
    }

    // 1. 멤버별 공수 합계 계산
    const manDayMap = filteredReports.reduce((acc, report) => {
      acc[report.person] = (acc[report.person] || 0) + (report.manDay || 0);
      return acc;
    }, {} as { [key: string]: number });

    // 2. [멤버이름, 공수] 배열로 변환
    const manDayEntries = Object.entries(manDayMap);

    // 3. 멤버 우선순위에 따라 정렬
    return manDayEntries.sort(([nameA], [nameB]) => {
      const emailA = this.memberService.getEmailByName(nameA);
      const emailB = this.memberService.getEmailByName(nameB);

      const priorityA = this.memberService.getMemberPriority(emailA);
      const priorityB = this.memberService.getMemberPriority(emailB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return nameA.localeCompare(nameB);
    });
  }

  /**
   * 보고서를 담당자별로 그룹화합니다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 담당자별로 그룹화된 보고서 Map
   */
  private groupByPerson(reports: DailyReport[]): Map<string, DailyReport[]> {
    const groupedByPerson = new Map<string, DailyReport[]>();

    reports.forEach((report) => {
      if (!groupedByPerson.has(report.person)) {
        groupedByPerson.set(report.person, []);
      }
      groupedByPerson.get(report.person)?.push(report);
    });

    return groupedByPerson;
  }

  /**
   * 담당자별로 그룹화된 보고서를 멤버 우선순위를 반영하여 정렬합니다
   * @param groupedByPerson - 담당자별로 그룹화된 보고서 Map
   * @returns 우선순위로 정렬된 [담당자, 보고서[]] 배열
   */
  private sortGroupedReportsByManDay(
    groupedByPerson: Map<string, DailyReport[]>,
  ): [string, DailyReport[]][] {
    // Map의 엔트리를 배열로 변환
    const entries = Array.from(groupedByPerson.entries());

    // 멤버 우선순위로 정렬
    const sortedEntries = entries.sort(([personA], [personB]) => {
      const priorityA =
        memberMap[this.memberService.getEmailByName(personA)]?.priority ?? 999;
      const priorityB =
        memberMap[this.memberService.getEmailByName(personB)]?.priority ?? 999;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return personA.localeCompare(personB);
    });

    // 각 멤버의 보고서를 manDay 기준으로 정렬
    return sortedEntries.map(([person, reports]) => [
      person,
      [...reports].sort((a, b) => {
        const manDayA = a.manDay ?? 0;
        const manDayB = b.manDay ?? 0;
        return manDayB - manDayA;
      }),
    ]);
  }

  /**
   * 담당자별 보고서 데이터에서 각 담당자의 총 공수를 계산합니다
   * @param reportsByPerson - [담당자, 보고서[]] 형태의 배열
   * @returns 담당자별 총 공수와 보고서 목록이 포함된 객체 배열
   */
  private accumulateSumManDayByPerson(
    reportsByPerson: [string, DailyReport[]][],
  ): ManDayByPersonWithReports[] {
    return reportsByPerson.map(([person, reports]) => {
      const sumManday = reports.reduce((sum, report) => {
        sum += report.manDay;
        return sum;
      }, 0);
      return {
        name: person,
        totalManDay: sumManday,
        reports,
      };
    });
  }

  /**
   * 보고서 데이터를 담당자별로 그룹화하고 manDay 기준으로 정렬합니다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 담당자별로 그룹화되고 manDay 기준으로 정렬된 보고서 데이터
   */
  getManDayByPerson(reports: DailyReport[]): ManDayByPersonWithReports[] {
    const groupedByPerson = this.groupByPerson(reports);
    const sorted = this.sortGroupedReportsByManDay(groupedByPerson);
    return this.accumulateSumManDayByPerson(sorted);
  }

  /**
   * 그룹별 공수를 계산합니다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 그룹별 공수 합계
   */
  getManDayByGroup(reports: DailyReport[]): Record<string, number> {
    return calculateManDayByGroup(reports);
  }
}