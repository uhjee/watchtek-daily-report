import { NotionService } from './notionService';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import { getToday, getNextDay, getCurrentMonthRange, isLastFridayOfMonth } from '../utils/dateUtils';
import {
  DailyReport,
  DailyReportItem,
  FormattedDailyReport,
  NotionPage,
  DailyReportGroup,
  ManDayByPerson,
  ReportDailyData,
  ReportWeeklyData,
  ReportData,
  ManDayByPersonWithReports,
  ReportMonthlyData,
} from '../types/report.d';
import memberMap from '../config/members';
import { NotionStringifyService } from './notionStringifyService';
import { MemberService } from './memberService';
import { ReportAggregationService } from './reportAggregationService';
import { ReportFormatterService } from './reportFormatterService';

export class ReportService {
  private notionService: NotionService;
  private stringifyService: NotionStringifyService;
  private memberService: MemberService;
  private aggregationService: ReportAggregationService;
  private formatterService: ReportFormatterService;

  constructor() {
    this.notionService = new NotionService();
    this.stringifyService = new NotionStringifyService();
    this.memberService = new MemberService();
    this.aggregationService = new ReportAggregationService();
    this.formatterService = new ReportFormatterService();
  }

  /**
   * 특정 날짜 범위의 일일 보고서를 조회하고 포맷된 데이터를 반환한다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 일일 보고서 데이터
   */
  async getReportData(
    startDate: string,
    endDate?: string,
  ): Promise<ReportData> {
    const date = new Date(getToday());
    const result: ReportData = {};

    // 일일 보고서 조회
    const dailyReport = await this.getDailyReports(startDate, endDate);
    result.dailyData = dailyReport;

    // 금요일이면 이번주 보고서 조회
    if (date.getDay() === 5) {
      const weeklyReport = await this.getWeeklyReports(startDate, endDate);
      result.weeklyData = weeklyReport;

      // 이번 달의 마지막 주 금요일인지 확인
      if (isLastFridayOfMonth(date)) {
        const monthlyReport = await this.getMonthlyReports(startDate, endDate);
        result.monthlyData = monthlyReport;
      }
    }

    return result;
  }

  /**
   * 이번 주 범위의 일일 보고서를 조회하고 포맷된 데이터를 반환합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 일일 보고서 데이터
   */
  async getWeeklyReports(
    startDate: string,
    endDate?: string,
  ): Promise<ReportWeeklyData> {
    const reports = await this.getWeeklyReportsData();
    const formattedReports = this.formatReportData(reports);
    const groupedReports = this.formatterService.formatWeeklyReports(formattedReports);

    const manDayByPerson = this.aggregationService.getManDayByPerson(formattedReports);
    const manDayByPersonText =
      this.stringifyService.stringifyWeeklyManDayByPerson(manDayByPerson);

    const { title, text } = this.stringifyService.stringifyWeeklyReports(
      groupedReports,
      startDate,
    );
    const weeklyManDaySummary = this.aggregationService.getManDaySummary(formattedReports);
    const weeklyManDaySummaryByGroup =
      this.aggregationService.getManDayByGroup(formattedReports);
    const manDayText =
      this.stringifyService.stringifyManDayMap(weeklyManDaySummary);
    const manDayByGroupText = this.stringifyService.stringifyManDayMap(
      weeklyManDaySummaryByGroup,
      true,
    );

    return { 
      reportType: 'weekly',
      title, 
      text, 
      manDayText, 
      manDayByGroupText, 
      manDayByPersonText 
    };
  }


  /**
   * 특정 날짜 범위의 일일 보고서를 조회하고 포맷된 데이터를 반환합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 일일 보고서 데이터
   */
  async getDailyReports(
    startDate: string,
    endDate?: string,
  ): Promise<ReportDailyData> {
    // 1. 원본 데이터 조회 (일일 보고서용)
    const reports = await this.getDailyReportsData(startDate);

    // 2. 기본 데이터 포맷 변환
    const formattedReports = this.formatReportData(reports);

    // 3. member별 manDay 집계
    const manDaySummary = this.aggregationService.getManDaySummary(formattedReports, true);
    const manDayText = this.stringifyService.stringifyManDayMap(manDaySummary);

    // 4. 보고서 포맷으로 변환
    const groupedReports = this.formatterService.formatDailyReports(formattedReports);

    // 5. 텍스트로 변환
    const { title, text } = this.stringifyService.stringifyDailyReports(
      groupedReports,
      startDate,
    );

    // 6. 이번 주 데이터 조회 (manDayByPerson 계산용)
    const weeklyReports = await this.getWeeklyReportsData();
    const formattedWeeklyReports = this.formatReportData(weeklyReports);
    
    // 7. 이번 주 데이터 기준으로 manDayByPerson 계산
    const manDayByPerson = this.aggregationService.getManDayByPerson(formattedWeeklyReports);
    const manDayByPersonText = 
      this.stringifyService.stringifyWeeklyManDayByPerson(manDayByPerson);
    
    // 8. 이번 주 데이터 기준으로 manDayByGroup 계산
    const weeklyManDaySummaryByGroup = 
      this.aggregationService.getManDayByGroup(formattedWeeklyReports);
    const manDayByGroupText = this.stringifyService.stringifyManDayMap(
      weeklyManDaySummaryByGroup,
      true,
    );

    return { 
      reportType: 'daily',
      title, 
      text, 
      manDayText, 
      manDayByGroupText, 
      manDayByPersonText 
    };
  }

  /**
   * 특정 날짜 범위의 일일 보고서를 조회합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 일일 보고서 데이터
   */
  async getDailyReportsData(startDate: string) {
    const filter = {
      and: [
        {
          or: [
            {
              property: 'isToday',
              formula: {
                checkbox: {
                  equals: true,
                },
              },
            },
            {
              property: 'isTomorrow',
              formula: {
                checkbox: {
                  equals: true,
                },
              },
            },
          ],
        },
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
      ],
    } as QueryDatabaseParameters['filter'];

    const sorts = [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ] as QueryDatabaseParameters['sorts'];

    try {
      // 전체 결과 조회
      const results = await this.notionService.queryDatabaseAll(filter, sorts);
      return results;
    } catch (error) {
      console.error('일일 보고서 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 이번 주 일일 보고서를 조회합니다
   * @returns 이번 주 보고서 데이터
   */
  async getWeeklyReportsData() {
    const filter = {
      and: [
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
        {
          property: 'Date',
          date: {
            this_week: {},
          },
        },
      ],
    } as QueryDatabaseParameters['filter'];

    const sorts = [
      {
        timestamp: 'created_time',
        direction: 'descending',
      },
    ] as QueryDatabaseParameters['sorts'];

    try {
      // 전체 결과 조회
      const results = await this.notionService.queryDatabaseAll(filter, sorts);
      return results;
    } catch (error) {
      console.error('일일 보고서 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * Notion API로부터 받은 보고서 데이터를 원하는 형식으로 변환합니다
   * @param reports - Notion API 응답 데이터
   * @returns 포맷된 보고서 데이터
   */
  private formatReportData(reports: unknown[]): DailyReport[] {
    return (reports as NotionPage[]).map((report) => ({
      title:
        report.properties.Name.title.map((t) => t.plain_text).join('') ?? '',
      customer: report.properties.Customer.select?.name ?? '',
      group: report.properties.Group.select?.name ?? '',
      subGroup: report.properties.SubGroup.select?.name ?? '',
      person: this.memberService.getMemberName(
        report.properties.Person.people[0]?.person.email,
      ),
      progressRate: (report.properties.Progress.number ?? 0) * 100, // 0~100 사이의 값으로 변환
      date: {
        start: report.properties.Date.date?.start ?? '',
        end: report.properties.Date.date?.end ?? null,
      },
      isToday: report.properties.isToday.formula['boolean'] ?? false,
      isTomorrow: report.properties.isTomorrow.formula['boolean'] ?? false,
      manDay: report.properties.ManDay.number ?? 0,
    }));
  }


  /**
   * 일일 보고서 데이터를 최종 포맷으로 변환합니다
   * @param reports - 기본 포맷의 일일 보고서 데이터
   * @returns 최종 포맷의 일일 보고서 데이터
   */
  private formatDailyReports(reports: DailyReport[]): DailyReportGroup[] {
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
  private formatWeeklyReports(reports: DailyReport[]): DailyReportGroup[] {
    return [
      {
        type: '진행업무',
        groups: this.groupReports(reports, []),
      },
    ];
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
  private formatSubGroups(subGroupMap: Map<string, DailyReport[]>) {
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
   * 담당자별로 그룹화된 보고서를 manDay 기준으로 정렬하고, 멤버 우선순위를 반영합니다
   * @param groupedByPerson - 담당자별로 그룹화된 보고서 Map
   * @returns 우선순위와 manDay로 정렬된 [담당자, 보고서[]] 배열
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
   * @returns 담당자별로 그룹화되고 manDay 기준으로 정렬된 보고서 Map
   */
  private getManDayByPerson(reports: DailyReport[]) {
    const groupedByPerson = this.groupByPerson(reports);
    const sorted = this.sortGroupedReportsByManDay(groupedByPerson);
    return this.accumulateSumManDayByPerson(sorted);
  }

  /**
   * 이번 달의 일일 보고서를 조회하고 포맷된 데이터를 반환한다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 월간 보고서 데이터
   */
  async getMonthlyReports(
    startDate: string,
    endDate?: string,
  ): Promise<ReportMonthlyData> {
    const reports = await this.getMonthlyReportsData();
    const formattedReports = this.formatReportData(reports);
    // 중복 제거 처리
    const distinctReports = this.formatterService.distinctReports(formattedReports);
    const groupedReports = this.formatterService.formatMonthlyReports(distinctReports);

    const manDayByPerson = this.aggregationService.getManDayByPerson(distinctReports);
    const manDayByPersonTexts =
      this.stringifyService.stringifyMonthlyManDayByPerson(manDayByPerson);

    const { title, texts } = this.stringifyService.stringifyMonthlyReports(
      groupedReports,
      startDate,
    );
    const monthlyManDaySummary = this.aggregationService.getManDaySummary(distinctReports);
    const monthlyManDaySummaryByGroup =
      this.aggregationService.getManDayByGroup(distinctReports);
    const manDayText =
      this.stringifyService.stringifyManDayMap(monthlyManDaySummary);
    const manDayByGroupText = this.stringifyService.stringifyManDayMap(
      monthlyManDaySummaryByGroup,
      true,
    );

    return {
      reportType: 'monthly',
      title,
      texts,
      manDayText,
      manDayByGroupText,
      manDayByPersonTexts,
      isMonthlyReport: true,
    };
  }


  /**
   * 이번 달의 일일 보고서를 조회한다
   * @returns 이번 달의 일일 보고서 데이터
   */
  async getMonthlyReportsData() {
    // 이번 달의 첫날과 마지막 날 가져오기
    const { firstDay: firstDayStr, lastDay: lastDayStr } =
      getCurrentMonthRange();

    const filter = {
      and: [
        {
          property: 'Date',
          date: {
            on_or_after: firstDayStr,
          },
        },
        {
          property: 'Date',
          date: {
            on_or_before: lastDayStr,
          },
        },
        {
          property: 'Person',
          people: {
            is_not_empty: true,
          },
        },
      ],
    } as QueryDatabaseParameters['filter'];

    const sorts = [
      {
        property: 'Date',
        direction: 'ascending',
      },
    ] as QueryDatabaseParameters['sorts'];

    try {
      // 전체 결과 조회
      const results = await this.notionService.queryDatabaseAll(filter, sorts);
      return results;
    } catch (error) {
      console.error('월간 보고서 조회 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 월간 보고서 데이터를 포맷팅한다
   * @param reports - 일일 보고서 데이터 배열
   * @returns 포맷된 월간 보고서 데이터
   */
  private formatMonthlyReports(reports: DailyReport[]): DailyReportGroup[] {
    // 진행업무와 예정업무로 분류
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
   * 보고서 그룹을 포맷팅한다
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
   * 중복된 보고서를 제거하고 최신 데이터로 병합한다
   * @param reports - 보고서 데이터 배열
   * @returns 중복이 제거된 보고서 데이터 배열
   */
  private distinctReports(reports: DailyReport[]): DailyReport[] {
    // 중복 체크를 위한 맵 (키: title-customer-person)
    const uniqueMap = new Map<string, DailyReport>();

    // manDay 합계를 저장할 맵
    const manDaySumMap = new Map<string, number>();

    // 모든 보고서를 순회하며 중복 체크 및 manDay 합산
    reports.forEach((report) => {
      // 중복 체크 키 생성
      const key = `${report.title}-${report.customer}-${report.person}`;

      // manDay 합산 처리
      const currentManDay = manDaySumMap.get(key) || 0;
      manDaySumMap.set(key, currentManDay + report.manDay);

      // 이미 맵에 존재하는 경우, 날짜 비교 후 최신 데이터로 업데이트
      if (uniqueMap.has(key)) {
        const existingReport = uniqueMap.get(key)!;
        const existingDate = new Date(existingReport.date.start);
        const currentDate = new Date(report.date.start);

        // 현재 보고서의 날짜가 더 최신인 경우에만 업데이트
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
        manDay: manDaySumMap.get(key) || report.manDay,
      };
    });
  }
}
