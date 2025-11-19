import { DailyReport, ManHourByPersonWithReports, LeaveInfo, LeaveType } from '../types/report.d';
import { MemberService } from './memberService';
import { compareMemberPriorityByName } from '../utils/memberUtils';
import { SortContext, MemberPriorityByNameNumberSortStrategy, MemberPriorityByNameArraySortStrategy } from '../utils/sortStrategies';
import { getWorkingDaysCount, getDayOfWeekKorean, formatDateToShortFormat } from '../utils/dateUtils';

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
  getManHourSummary(
    reports: DailyReport[],
    skipEmpty: boolean = false,
  ): [string, number][] {
    let filteredReports = reports;
    if (skipEmpty) {
      filteredReports = filteredReports.filter((report) => report.manHour > 0);
    }

    // 1. 멤버별 공수 합계 계산
    const manHourMap = filteredReports.reduce((acc, report) => {
      acc[report.person] = (acc[report.person] || 0) + (report.manHour || 0);
      return acc;
    }, {} as { [key: string]: number });

    // 2. [멤버이름, 공수] 배열로 변환
    const manHourEntries = Object.entries(manHourMap);

    // 3. 멤버 우선순위에 따라 정렬
    const sortStrategy = new MemberPriorityByNameNumberSortStrategy(this.memberService);
    const sortContext = new SortContext(sortStrategy);
    return sortContext.executeSort(manHourEntries);
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
  private sortGroupedReportsByManHour(
    groupedByPerson: Map<string, DailyReport[]>,
  ): [string, DailyReport[]][] {
    // Map의 엔트리를 배열로 변환
    const entries = Array.from(groupedByPerson.entries());

    // 멤버 우선순위로 정렬
    const sortStrategy = new MemberPriorityByNameArraySortStrategy(this.memberService);
    const sortContext = new SortContext(sortStrategy);
    const sortedEntries = sortContext.executeSort(entries);

    // 각 멤버의 보고서를 group, progressRate 기준으로 정렬
    return sortedEntries.map(([person, reports]) => [
      person,
      [...reports].sort((a, b) => {
        // 1. group 값 오름차순 비교
        const groupA = a.group ?? '';
        const groupB = b.group ?? '';
        
        if (groupA !== groupB) {
          return groupA.localeCompare(groupB);
        }
        
        // 2. group이 같으면 progressRate 값 내림차순 비교
        const progressRateA = a.progressRate ?? 0;
        const progressRateB = b.progressRate ?? 0;
        return progressRateB - progressRateA;
      }),
    ]);
  }

  /**
   * 담당자별 보고서 데이터에서 각 담당자의 총 공수를 계산합니다
   * @param reportsByPerson - [담당자, 보고서[]] 형태의 배열
   * @returns 담당자별 총 공수와 보고서 목록이 포함된 객체 배열
   */
  private accumulateSumManHourByPerson(
    reportsByPerson: [string, DailyReport[]][],
  ): ManHourByPersonWithReports[] {
    return reportsByPerson.map(([person, reports]) => {
      const sumManhour = reports.reduce((sum, report) => {
        sum += report.manHour;
        return sum;
      }, 0);
      return {
        name: person,
        totalManHour: sumManhour,
        reports,
      };
    });
  }

  /**
   * 보고서 데이터를 담당자별로 그룹화하고 manHour 기준으로 정렬합니다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 담당자별로 그룹화되고 manHour 기준으로 정렬된 보고서 데이터
   */
  getManHourByPerson(reports: DailyReport[]): ManHourByPersonWithReports[] {
    const groupedByPerson = this.groupByPerson(reports);
    const sorted = this.sortGroupedReportsByManHour(groupedByPerson);
    return this.accumulateSumManHourByPerson(sorted);
  }

  /**
   * 그룹별 공수를 계산합니다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 그룹별 공수 합계
   */
  getManHourByGroup(reports: DailyReport[]): Record<string, number> {
    return reports.reduce((acc, report) => {
      acc[report.group] = (acc[report.group] ?? 0) + report.manHour;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * 보고서 데이터에서 멤버별 연차/반차 정보를 추출합니다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 멤버별 연차/반차 정보 Map
   */
  private getLeaveInfoByPerson(reports: DailyReport[]): Map<string, LeaveInfo[]> {
    const leaveInfoMap = new Map<string, LeaveInfo[]>();

    reports.forEach((report) => {
      // Group='기타', SubGroup='연차' 또는 '반차'인 경우
      if (report.group === '기타' && (report.subGroup === '연차' || report.subGroup === '반차')) {
        const person = report.person;
        const leaveInfo: LeaveInfo = {
          date: report.date.start,
          type: report.subGroup as LeaveType,
          dayOfWeek: getDayOfWeekKorean(report.date.start),
        };

        if (!leaveInfoMap.has(person)) {
          leaveInfoMap.set(person, []);
        }
        leaveInfoMap.get(person)?.push(leaveInfo);
      }
    });

    // 각 멤버의 연차/반차 정보를 날짜순으로 정렬
    leaveInfoMap.forEach((leaveList) => {
      leaveList.sort((a, b) => a.date.localeCompare(b.date));
    });

    return leaveInfoMap;
  }

  /**
   * 작성 완료 여부를 판단합니다 (일간 보고서용)
   * @param personName - 멤버 이름
   * @param totalManHour - 총 공수
   * @param reports - 해당 멤버의 보고서 데이터 배열
   * @param startDate - 시작 날짜 (YYYY-MM-DD)
   * @param endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns 작성 완료 여부
   */
  private checkCompletionStatus(
    personName: string,
    totalManHour: number,
    reports: DailyReport[],
    startDate: string,
    endDate: string,
  ): boolean {
    // 1. 해당 기간의 근무일수 계산
    const workingDays = getWorkingDaysCount(startDate, endDate);

    // 2. 기대되는 총 공수 계산 (근무일수 * 8)
    const expectedManHour = workingDays * 8;

    // 3. 실제 작성한 공수와 기대 공수 비교
    return totalManHour === expectedManHour;
  }

  /**
   * 보고서 데이터를 담당자별로 그룹화하고 연차/반차 정보 및 작성 완료 여부를 포함합니다
   * @param reports - 일일 보고서 데이터 배열
   * @param startDate - 시작 날짜 (작성 완료 판단용, optional)
   * @param endDate - 종료 날짜 (작성 완료 판단용, optional)
   * @returns 담당자별로 그룹화되고 연차/반차 정보가 포함된 보고서 데이터
   */
  getManHourByPersonWithLeaveInfo(
    reports: DailyReport[],
    startDate?: string,
    endDate?: string,
  ): ManHourByPersonWithReports[] {
    // 1. 기존 로직으로 기본 데이터 생성
    const basicData = this.getManHourByPerson(reports);

    // 2. 연차/반차 정보 추출
    const leaveInfoMap = this.getLeaveInfoByPerson(reports);

    // 3. 각 멤버에 연차/반차 정보 및 작성 완료 여부 추가
    return basicData.map((personData) => {
      const leaveInfo = leaveInfoMap.get(personData.name) || [];

      // 작성 완료 여부 판단 (startDate와 endDate가 있을 때만)
      let isCompleted: boolean | undefined = undefined;
      if (startDate && endDate) {
        isCompleted = this.checkCompletionStatus(
          personData.name,
          personData.totalManHour,
          personData.reports,
          startDate,
          endDate,
        );
      }

      return {
        ...personData,
        leaveInfo: leaveInfo.length > 0 ? leaveInfo : undefined,
        isCompleted,
      };
    });
  }
}