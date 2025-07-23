import {
  DailyReport,
  DailyReportGroup,
  FormattedDailyReport,
  GroupedReportItem,
} from '../types/report.d';
import { getToday } from '../utils/dateUtils';
import { MemberService } from './memberService';
import memberMap from '../config/members';

/**
 * 보고서 포맷팅을 담당하는 서비스
 */
export class ReportFormatterService {
  private memberService: MemberService;

  constructor() {
    this.memberService = new MemberService();
  }

  /**
   * 일일 보고서 데이터를 최종 포맷으로 변환합니다
   * @param reports - 기본 포맷의 일일 보고서 데이터
   * @returns 최종 포맷의 일일 보고서 데이터
   */
  formatDailyReports(reports: DailyReport[]): DailyReportGroup[] {
    const {
      completeTodayReports,
      incompleteTodayReports,
      allTomorrowReports,
      incompleteTomorrowReports,
    } = this.filterReportsByDay(reports);

    return [
      {
        type: '진행업무',
        groups: this.groupReports(completeTodayReports, incompleteTodayReports),
      },
      {
        type: '예정업무',
        groups: this.groupReports(
          allTomorrowReports,
          incompleteTomorrowReports,
        ),
      },
    ];
  }

  /**
   * 주간 보고서 데이터를 포맷팅합니다
   * @param reports - 기본 포맷의 보고서 데이터
   * @returns 포맷된 주간 보고서 데이터
   */
  formatWeeklyReports(reports: DailyReport[]): DailyReportGroup[] {
    return [
      {
        type: '진행업무',
        groups: this.groupReports(reports, []),
      },
    ];
  }

  /**
   * 월간 보고서 데이터를 포맷팅합니다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 포맷된 월간 보고서 데이터
   */
  formatMonthlyReports(reports: DailyReport[]): DailyReportGroup[] {
    // 진행업무와 완료업무로 분류
    const progressReports = reports.filter(
      (report) => report.progressRate > 0 && report.progressRate < 100,
    );
    const completedReports = reports.filter(
      (report) => report.progressRate === 100,
    );

    // 각 그룹 포맷팅
    const progressGroup = this.formatMonthlyReportGroup(
      progressReports,
      '진행업무',
    );
    const completedGroup = this.formatMonthlyReportGroup(
      completedReports,
      '완료업무',
    );

    return [progressGroup, completedGroup];
  }

  /**
   * 일일 보고서를 날짜별로 필터링합니다
   */
  private filterReportsByDay(reports: DailyReport[]) {
    const today = getToday();

    // 1. isToday/isTomorrow로 먼저 그룹핑
    const todayReports = reports.filter((report) => report.isToday);
    const tomorrowReports = reports.filter((report) => report.isTomorrow);

    // 2. 데이터가 부족한 항목들을 별도로 분류
    const incompleteTodayReports = this.filterIncompleteReports(todayReports);
    const incompleteTomorrowReports =
      this.filterIncompleteReports(tomorrowReports);

    // 3. 완전한 데이터만 필터링
    const completeTodayReports = this.filterCompleteReports(todayReports);

    // 4. 진행중인 업무 중 마감일이 오늘이고 미완료된 업무는 예정업무로도 분류
    const additionalTomorrowReports = completeTodayReports.filter(
      ({ date, progressRate }) =>
        (date.end === today || (!date.end && date.start === today)) &&
        progressRate < 100,
    );

    const allTomorrowReports = [
      ...this.filterCompleteReports(tomorrowReports),
      ...additionalTomorrowReports,
    ];

    return {
      completeTodayReports,
      incompleteTodayReports,
      allTomorrowReports,
      incompleteTomorrowReports,
    };
  }

  /**
   * 불완전한 보고서를 필터링합니다
   */
  private filterIncompleteReports(reports: DailyReport[]): DailyReport[] {
    return reports.filter(
      (report) =>
        !report.date.start ||
        !report.group ||
        !report.subGroup ||
        !report.person,
    );
  }

  /**
   * 완전한 보고서를 필터링합니다
   */
  private filterCompleteReports(reports: DailyReport[]): DailyReport[] {
    return reports.filter(
      (report) =>
        report.date.start && report.group && report.subGroup && report.person,
    );
  }

  /**
   * 보고서를 그룹화하고 정렬합니다
   */
  private groupReports(
    reports: DailyReport[],
    incompleteReports: DailyReport[],
  ): FormattedDailyReport[] {
    // Group으로 먼저 그룹핑
    const groupedByMain = this.groupByMainCategory(reports);

    // 각 그룹 내에서 SubGroup으로 다시 그룹핑하고 정렬
    const formattedGroups = this.formatGroups(groupedByMain);

    // 불완전한 데이터를 '데이터 부족' 그룹으로 추가
    if (incompleteReports.length > 0) {
      formattedGroups.push(this.createIncompleteGroup(incompleteReports));
    }

    return formattedGroups;
  }

  /**
   * 메인 카테고리별로 보고서를 그룹화합니다
   */
  private groupByMainCategory(
    reports: DailyReport[],
  ): Map<string, DailyReport[]> {
    const groupedByMain = new Map<string, DailyReport[]>();

    reports.forEach((report) => {
      if (!groupedByMain.has(report.group)) {
        groupedByMain.set(report.group, []);
      }
      groupedByMain.get(report.group)?.push(report);
    });

    return groupedByMain;
  }

  /**
   * 그룹화된 보고서를 포맷팅합니다
   */
  private formatGroups(
    groupedByMain: Map<string, DailyReport[]>,
  ): FormattedDailyReport[] {
    return Array.from(groupedByMain.entries())
      .sort(this.sortGroups)
      .map(([group, items]) => this.formatGroupItems(group, items));
  }

  /**
   * 그룹 정렬 로직을 처리합니다
   * DCIM프로젝트 > 일반 그룹 > 특수 그룹 순으로 정렬
   * - 특수 그룹: 사이트 지원, 결함처리, OJT, 기타
   */
  private sortGroups(
    [a]: [string, DailyReport[]],
    [b]: [string, DailyReport[]],
  ): number {
    // DCIM프로젝트 우선 처리
    if (a === 'DCIM프로젝트') return -1;
    if (b === 'DCIM프로젝트') return 1;

    const specialGroups = ['사이트 지원', '결함처리', 'OJT', '기타'];
    const aIndex = specialGroups.indexOf(a);
    const bIndex = specialGroups.indexOf(b);

    // 둘 다 특수 그룹인 경우
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // a만 특수 그룹인 경우
    if (aIndex !== -1) return 1;

    // b만 특수 그룹인 경우
    if (bIndex !== -1) return -1;

    // 둘 다 일반 그룹인 경우 알파벳 순 정렬
    return a.localeCompare(b);
  }

  /**
   * 보고서 항목을 정렬합니다
   * 1. progressRate 내림차순
   * 2. members priority 오름차순
   * 3. 담당자 이름 사전순
   */
  private sortReportItems(a: DailyReport, b: DailyReport): number {
    // 1. progressRate 내림차순
    if (a.progressRate !== b.progressRate) {
      return b.progressRate - a.progressRate;
    }

    // 2. members priority 오름차순
    const emailA = this.memberService.getEmailByName(a.person);
    const emailB = this.memberService.getEmailByName(b.person);
    const priorityA = memberMap[emailA]?.priority ?? 999;
    const priorityB = memberMap[emailB]?.priority ?? 999;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 3. 이름 순 (같은 우선순위일 경우)
    return a.person.localeCompare(b.person);
  }

  /**
   * 그룹 내 아이템들을 포맷팅합니다
   * ex) subGroup: '분석' 하위 아이템 포맷팅
   */
  private formatGroupItems(
    group: string,
    items: DailyReport[],
  ): FormattedDailyReport {
    const subGroupMap = new Map<string, DailyReport[]>();

    // 사이트 지원의 경우 customer로 그룹핑
    const subGroupKey = group === '사이트 지원' ? 'customer' : 'subGroup';

    // 서브그룹별로 아이템 그룹화
    items.forEach((item) => {
      if (!subGroupMap.has(item[subGroupKey])) {
        subGroupMap.set(item[subGroupKey], []);
      }
      subGroupMap.get(item[subGroupKey])?.push({
        title: item.title,
        customer: item.customer,
        group: item.group,
        subGroup: item.subGroup,
        person: item.person,
        progressRate: item.progressRate,
        date: item.date,
        isToday: item.isToday,
        isTomorrow: item.isTomorrow,
        manDay: item.manDay ?? 0,
        pmsNumber: item.pmsNumber,
      });
    });

    // 각 서브그룹의 아이템들 정렬
    subGroupMap.forEach((reports, subGroup) => {
      const sortedReports = reports.sort(this.sortReportItems.bind(this));
      subGroupMap.set(subGroup, sortedReports);
    });

    return {
      group,
      subGroups: this.formatSubGroups(subGroupMap),
    };
  }

  /**
   * 서브그룹을 포맷팅하고 정렬합니다
   */
  private formatSubGroups(subGroupMap: Map<string, DailyReport[]>): GroupedReportItem[] {
    const subGroupOrder = ['분석', '구현', '기타'];

    return Array.from(subGroupMap.entries())
      .sort((a, b) => {
        const aIndex = subGroupOrder.indexOf(a[0]);
        const bIndex = subGroupOrder.indexOf(b[0]);
        return aIndex - bIndex;
      })
      .map(([subGroup, items]) => ({
        subGroup,
        items: items.sort((a, b) => b.progressRate - a.progressRate),
      }));
  }

  /**
   * 불완전한 데이터 그룹을 생성합니다
   */
  private createIncompleteGroup(
    incompleteReports: DailyReport[],
  ): FormattedDailyReport {
    return {
      group: '데이터 부족',
      subGroups: [
        {
          subGroup: '-',
          items: incompleteReports.map((report) => ({
            title: report.title || '-',
            customer: report.customer || '-',
            group: report.group || '-',
            subGroup: report.subGroup || '-',
            person: report.person || '-',
            progressRate: report.progressRate ?? 0,
            date: report.date,
            isToday: report.isToday,
            isTomorrow: report.isTomorrow,
            manDay: report.manDay ?? 0,
          })),
        },
      ],
    };
  }

  /**
   * 보고서 그룹을 포맷팅합니다
   * @param reports - 보고서 데이터 배열
   * @param type - 그룹 타입 ('진행업무' | '예정업무' | '완료업무')
   * @returns 포맷된 보고서 그룹
   */
  private formatMonthlyReportGroup(
    reports: DailyReport[],
    type: '진행업무' | '예정업무' | '완료업무',
  ): DailyReportGroup {
    const groupedByMain = this.groupByMainCategory(reports);
    const formattedGroups = this.formatGroups(groupedByMain);

    return {
      type,
      groups: formattedGroups,
    };
  }

  /**
   * 중복된 보고서를 제거하고 날짜가 가장 큰 데이터로 병합합니다 (end 우선, 없으면 start)
   * @param reports - 보고서 데이터 배열
   * @returns 중복이 제거된 보고서 데이터 배열
   */
  distinctReports(reports: DailyReport[]): DailyReport[] {
    // 중복 체크를 위한 맵 (키: person-pmsNumber 또는 person-title(빈문자열 제거))
    const uniqueMap = new Map<string, DailyReport>();

    // manDay 합계를 저장할 맵
    const manDaySumMap = new Map<string, number>();

    // 모든 보고서를 순회하며 중복 체크 및 manDay 합산
    reports.forEach((report) => {
      // 중복 체크 키 생성
      let key: string;
      if (report.pmsNumber && report.pmsNumber !== null) {
        // pmsNumber가 있는 경우 pmsNumber로 중복 체크
        key = `${report.person}-${report.pmsNumber}`;
      } else {
        // pmsNumber가 없는 경우 title(빈문자열 제거)로 중복 체크
        const normalizedTitle = report.title.replace(/\s+/g, '');
        key = `${report.person}-${normalizedTitle}`;
      }

      // manDay 합산 처리
      const currentManDay = manDaySumMap.get(key) || 0;
      manDaySumMap.set(key, currentManDay + (report.manDay || 0));

      // 이미 맵에 존재하는 경우, 날짜 비교 후 가장 큰 값으로 업데이트
      if (uniqueMap.has(key)) {
        const existingReport = uniqueMap.get(key)!;
        // end가 있으면 end, 없으면 start를 사용하여 비교
        const existingDate = existingReport.date.end 
          ? new Date(existingReport.date.end) 
          : new Date(existingReport.date.start);
        const currentDate = report.date.end 
          ? new Date(report.date.end) 
          : new Date(report.date.start);

        // 현재 보고서의 날짜가 더 큰 경우에만 업데이트
        if (currentDate > existingDate) {
          uniqueMap.set(key, report);
        }
      } else {
        // 맵에 없는 경우 추가
        uniqueMap.set(key, report);
      }
    });

    // 최종 결과 생성 (manDay 합계 적용)
    return Array.from(uniqueMap.entries()).map(([key, report]) => {
      // 해당 키의 manDay 합계로 업데이트
      return {
        ...report,
        manDay: manDaySumMap.get(key) || report.manDay || 0,
      };
    });
  }
}