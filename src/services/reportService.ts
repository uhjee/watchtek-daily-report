import { NotionService } from './notionService';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import {
  getToday,
  getCurrentMonthRange,
  isLastFridayOfMonth,
} from '../utils/dateUtils';
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
    }
    // 이번 달의 마지막 주 금요일인지 확인
    if (isLastFridayOfMonth(date, true)) {
      const monthlyReport = await this.getMonthlyReports(startDate, endDate);
      result.monthlyData = monthlyReport;
    }

    return result;
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
    const distinctReports =
      this.formatterService.distinctReports(formattedReports);
    const groupedReports =
      this.formatterService.formatMonthlyReports(distinctReports);

    const manDayByPerson =
      this.aggregationService.getManDayByPerson(distinctReports);

    const title = this.notionService.generateMonthlyReportTitle(startDate);
    const monthlyManDaySummary =
      this.aggregationService.getManDaySummary(distinctReports);
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
      manDayText,
      manDayByGroupText,
      manDayByPerson,
      groupedReports,
      isMonthlyReport: true,
    };
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

    // 중복 제거 처리
    const distinctReports =
      this.formatterService.distinctReports(formattedReports);
    const groupedReports =
      this.formatterService.formatWeeklyReports(distinctReports);

    const manDayByPerson =
      this.aggregationService.getManDayByPerson(distinctReports);

    const title = this.notionService.generateWeeklyReportTitle(startDate);
    const weeklyManDaySummary =
      this.aggregationService.getManDaySummary(distinctReports);
    const weeklyManDaySummaryByGroup =
      this.aggregationService.getManDayByGroup(distinctReports);
    const manDayText =
      this.stringifyService.stringifyManDayMap(weeklyManDaySummary);
    const manDayByGroupText = this.stringifyService.stringifyManDayMap(
      weeklyManDaySummaryByGroup,
      true,
    );

    return {
      reportType: 'weekly',
      title,
      manDayText,
      manDayByGroupText,
      manDayByPerson,
      groupedReports,
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

    // 중복 제거 처리
    const distinctReports =
      this.formatterService.distinctReports(formattedReports);

    // 3. member별 manDay 집계
    const manDaySummary = this.aggregationService.getManDaySummary(
      distinctReports,
      true,
    );
    const manDayText = this.stringifyService.stringifyManDayMap(manDaySummary);

    // 4. 보고서 포맷으로 변환
    const groupedReports =
      this.formatterService.formatDailyReports(distinctReports);

    // 5. 제목 생성
    const title = this.notionService.generateDailyReportTitle(startDate);

    // 일주일 기준
    // 6. 이번 주 데이터 조회 (manDayByPerson 계산용)
    const weeklyReports = await this.getWeeklyReportsData();
    const formattedWeeklyReports = this.formatReportData(weeklyReports);

    // 중복 제거 처리
    const distinctWeeklyReports = this.formatterService.distinctReports(
      formattedWeeklyReports,
    );

    // 7. 이번 주 데이터 기준으로 manDayByPerson 계산
    const manDayByPerson = this.aggregationService.getManDayByPerson(
      distinctWeeklyReports,
    );

    // 8. 이번 주 데이터 기준으로 manDayByGroup 계산
    const weeklyManDaySummaryByGroup = this.aggregationService.getManDayByGroup(
      distinctWeeklyReports,
    );
    const manDayByGroupText = this.stringifyService.stringifyManDayMap(
      weeklyManDaySummaryByGroup,
      true,
    );

    return {
      reportType: 'daily',
      title,
      text: this.stringifyService.stringifyDailyReports(
        groupedReports,
        startDate,
      ).text,
      manDayText,
      manDayByGroupText,
      manDayByPerson,
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

      // console.dir({ results }, { depth: 20 });
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
   * Notion API 응답 데이터를 일일 보고서 형식으로 변환한다
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
      pmsNumber: report.properties.PmsNumber?.number,
      pmsLink: report.properties.PmsLink?.formula?.string,
    }));
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
}
