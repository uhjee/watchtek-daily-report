import { NotionService } from './notionService';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import {
  getToday,
  getCurrentMonthRange,
  isLastFridayOfMonth,
  isHoliday,
  isLastWeekdayOfWeek,
  isLastWeekdayOfMonth,
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
import { processManDayData } from '../utils/reportUtils';

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
   * 휴일이 아닌 경우에만 보고서를 생성하며, 각 보고서 타입별로 세분화된 조건을 적용한다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 일일 보고서 데이터 (휴일인 경우 null 반환)
   */
  async getReportData(
    startDate: string,
    endDate?: string,
  ): Promise<ReportData | null> {
    // 1. 휴일 체크 - 휴일인 경우 보고서 생성하지 않음
    if (isHoliday(startDate)) {
      return null;
    }

    const result: ReportData = {};

    // 2. 평일인 경우 보고서 생성
    // Daily: 휴일이 아니므로 무조건 생성
    const dailyReport = await this.getDailyReports(startDate, endDate);
    result.dailyData = dailyReport;

    // Weekly: 해당 주의 마지막 평일인 경우 생성
    if (isLastWeekdayOfWeek(startDate)) {
      const weeklyReport = await this.getWeeklyReports(startDate, endDate);
      result.weeklyData = weeklyReport;
    }

    // Monthly: 해당 월의 마지막 주의 마지막 평일인 경우 생성
    if (isLastWeekdayOfMonth(startDate)) {
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
    const {
      manDayText,
      manDayByGroupText,
      manDaySummary: monthlyManDaySummary,
      manDayByGroup: monthlyManDaySummaryByGroup,
    } = processManDayData(
      distinctReports,
      this.aggregationService,
      this.stringifyService,
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
    const {
      manDayText,
      manDayByGroupText,
      manDaySummary: weeklyManDaySummary,
      manDayByGroup: weeklyManDaySummaryByGroup,
    } = processManDayData(
      distinctReports,
      this.aggregationService,
      this.stringifyService,
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
    // 일일 데이터 처리
    const dailyData = await this.processDailyData(startDate);

    // 주간 데이터 처리 (manDayByPerson 계산용)
    const weeklyData = await this.processWeeklyDataForDaily();

    // 결과 조합
    return this.buildDailyReportResult(startDate, dailyData, weeklyData);
  }

  /**
   * 일일 보고서를 위한 일일 데이터 처리
   * @param startDate - 시작 날짜
   * @returns 처리된 일일 데이터
   */
  private async processDailyData(startDate: string) {
    // 1. 원본 데이터 조회 및 포맷팅
    const reports = await this.getDailyReportsData(startDate);
    const formattedReports = this.formatReportData(reports);
    const distinctReports =
      this.formatterService.distinctReports(formattedReports);

    // 2. 데이터 처리
    const { manDayText } = processManDayData(
      distinctReports,
      this.aggregationService,
      this.stringifyService,
      false,
    );
    const groupedReports =
      this.formatterService.formatDailyReports(distinctReports);
    const title = this.notionService.generateDailyReportTitle(startDate);

    return { distinctReports, manDayText, groupedReports, title };
  }

  /**
   * 일일 보고서를 위한 주간 데이터 처리
   * @returns 처리된 주간 데이터
   */
  private async processWeeklyDataForDaily() {
    // 1. 주간 데이터 조회 및 포맷팅
    const weeklyReports = await this.getWeeklyReportsData();
    const formattedWeeklyReports = this.formatReportData(weeklyReports);
    const distinctWeeklyReports = this.formatterService.distinctReports(
      formattedWeeklyReports,
    );

    // 2. 주간 데이터 집계
    const manDayByPerson = this.aggregationService.getManDayByPerson(
      distinctWeeklyReports,
    );
    const { manDayByGroupText } = processManDayData(
      distinctWeeklyReports,
      this.aggregationService,
      this.stringifyService,
    );

    return { manDayByPerson, manDayByGroupText };
  }

  /**
   * 일일 보고서 결과 구성
   * @param startDate - 시작 날짜
   * @param dailyData - 처리된 일일 데이터
   * @param weeklyData - 처리된 주간 데이터
   * @returns 완성된 일일 보고서 데이터
   */
  private buildDailyReportResult(
    startDate: string,
    dailyData: { groupedReports: any; title: string; manDayText: string },
    weeklyData: { manDayByPerson: any; manDayByGroupText: string },
  ): ReportDailyData {
    return {
      reportType: 'daily',
      title: dailyData.title,
      text: this.stringifyService.stringifyDailyReports(
        dailyData.groupedReports,
        startDate,
      ).text,
      manDayText: dailyData.manDayText,
      manDayByGroupText: weeklyData.manDayByGroupText,
      manDayByPerson: weeklyData.manDayByPerson,
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
