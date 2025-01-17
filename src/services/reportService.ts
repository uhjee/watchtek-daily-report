import { NotionService } from './notionService';
import {
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialDatabaseObjectResponse,
  PartialPageObjectResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { getToday, getNextDay } from '../utils/dateUtils';
import {
  DailyReport,
  DailyReportItem,
  FormattedDailyReport,
  NotionPage,
  DailyReportGroup,
  DailySummary,
  ReportForm,
  ReportDailyData,
  ReportWeeklyData,
  ReportData,
} from '../types/report';
import memberMap from '../config/members';
import { NotionStringifyService } from './notionStringifyService';

export class ReportService {
  private notionService: NotionService;
  private stringifyService: NotionStringifyService;

  constructor() {
    this.notionService = new NotionService();
    this.stringifyService = new NotionStringifyService();
  }

  /**
   * 특정 날짜 범위의 일일 보고서를 조회하고 포맷된 데이터를 반환합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 일일 보고서 데이터
   */
  async getReportData(
    startDate: string,
    endDate?: string,
  ): Promise<ReportData> {
    const date = new Date(getToday());
    console.log(date.getDay());

    const dailyReport = await this.getDailyReports(startDate, endDate);
    const result: ReportData = { dailyData: dailyReport };

    // 금요일이면 이번주 보고서 조회
    if (date.getDay() === 5) {
      const weeklyReport = await this.getWeeklyReports(startDate, endDate);
      result.weeklyData = weeklyReport;
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
    const groupedReports = this.formatWeeklyReports(formattedReports);

    const { title, text } = this.stringifyService.stringifyWeeklyReports(
      groupedReports,
      startDate,
    );
    const weekLyManDaySummary = this.getManDaySummary(formattedReports);
    const weeklyManDaySummaryByGroup =
      this.calculateWeeklyManDay(formattedReports);
    const manDayText =
      this.stringifyService.stringifyManDayMap(weekLyManDaySummary);
    const manDayByGroupText = this.stringifyService.stringifyManDayMap(
      weeklyManDaySummaryByGroup,
      true,
    );

    return { title, text, manDayText, manDayByGroupText };
  }

  /**
   * 주간 보고서 manDay를 계산하는 함수
   * 집계 기준: report.group
   * 집계 결과: 각 그룹별 manDay 합계
   */
  private calculateWeeklyManDay(reports: DailyReport[]): DailySummary {
    return reports.reduce((acc, report) => {
      acc[report.group] = (acc[report.group] || 0) + report.manDay;
      return acc;
    }, {});
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
    // 1. 원본 데이터 조회
    const reports = await this.getDailyReportsData(startDate);

    // 2. 기본 데이터 포맷 변환
    const formattedReports = this.formatReportData(reports);

    // 3. member별 manDay 집계
    const manDaySummary = this.getManDaySummary(formattedReports, true);
    const manDayText = this.stringifyService.stringifyManDayMap(manDaySummary);

    // 4. 최종 포맷으로 변환
    const groupedReports = this.formatDailyReports(formattedReports);

    // 5. 텍스트로 변환
    const { title, text } = this.stringifyService.stringifyDailyReports(
      groupedReports,
      startDate,
    );

    return { title, text, manDayText };
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
   *이번 주 일일 보고서를 조회합니다
   *
   * @return  {[type]}  [return description]
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
      title: report.properties.Name.title[0]?.plain_text || '',
      customer: report.properties.Customer.select?.name || '',
      group: report.properties.Group.select?.name || '',
      subGroup: report.properties.SubGroup.select?.name || '',
      person: this.getMemberName(
        report.properties.Person.people[0]?.person.email,
      ),
      progressRate: (report.properties.Progress.number || 0) * 100, // 0~100 사이의 값으로 변환
      date: {
        start: report.properties.Date.date?.start || '',
        end: report.properties.Date.date?.end || null,
      },
      isToday: report.properties.isToday.formula['boolean'] || false,
      isTomorrow: report.properties.isTomorrow.formula['boolean'] || false,
      manDay: report.properties.ManDay.number || 0,
    }));
  }

  /**
   * 특정 이메일에 해당하는 멤버 이름을 반환합니다
   * @param email - 이메일 주소
   * @returns 멤버 이름
   */
  private getMemberName(email: string) {
    return memberMap[email] || email;
  }

  /**
   * 멤버별 manDay 집계
   * @param reports - 포맷된 일일 보고서 데이터
   * @returns 멤버별 manDay 집계 데이터
   */
  private getManDaySummary(
    reports: DailyReport[],
    todayOnly: boolean = false,
  ): DailySummary {
    let filteredReports = reports;
    if (todayOnly) {
      filteredReports = filteredReports.filter((report) => report.isToday);
    }

    return filteredReports.reduce((acc, report) => {
      acc[report.person] = (acc[report.person] || 0) + report.manDay;
      return acc;
    }, {});
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
   */
  private sortGroups(
    [a]: [string, DailyReport[]],
    [b]: [string, DailyReport[]],
  ): number {
    const specialGroups = ['사이트 지원', 'OJT', '기타'];
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
   * 그룹 내 아이템들을 포맷팅합니다
   */
  private formatGroupItems(
    group: string,
    items: DailyReport[],
  ): FormattedDailyReport {
    const subGroupMap = new Map<string, DailyReportItem[]>();

    items.forEach((item) => {
      if (!subGroupMap.has(item.subGroup)) {
        subGroupMap.set(item.subGroup, []);
      }
      subGroupMap.get(item.subGroup)?.push({
        title: item.title,
        customer: item.customer,
        group: item.group,
        subGroup: item.subGroup,
        person: item.person,
        progressRate: item.progressRate,
        date: item.date,
        isToday: item.isToday,
        isTomorrow: item.isTomorrow,
      });
    });

    return {
      group,
      subGroups: this.formatSubGroups(subGroupMap),
    };
  }

  /**
   * 서브그룹을 포맷팅하고 정렬합니다
   */
  private formatSubGroups(subGroupMap: Map<string, DailyReportItem[]>) {
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
            progressRate: report.progressRate || 0,
            date: report.date,
            isToday: report.isToday,
            isTomorrow: report.isTomorrow,
          })),
        },
      ],
    };
  }
}