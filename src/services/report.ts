import { NotionService } from './notionClient';
import {
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialDatabaseObjectResponse,
  PartialPageObjectResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { getNextDay } from '../utils/dateUtils';
import {
  DailyReport,
  DailyReportItem,
  FormattedDailyReport,
  NotionPage,
  DailyReportGroup,
  FinalReport,
} from '../types/report';
import memberMap from '../config/members';

export class ReportService {
  private notionService: NotionService;

  constructor() {
    this.notionService = new NotionService();
  }

  /**
   * 특정 날짜 범위의 일일 보고서를 조회하고 포맷된 데이터를 반환합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 포맷된 일일 보고서 데이터
   */
  async getFormattedDailyReports(startDate: string, endDate?: string) {
    // 1. 원본 데이터 조회
    const reports = await this.getDailyReports(startDate, endDate);

    // 2. 기본 데이터 포맷 변환
    const formattedReports = this.formatReportData(reports);

    // 3. 최종 포맷으로 변환
    const groupedReports = this.convertToFinalFormat(formattedReports);

    // 4. 텍스트로 변환
    return this.convertToText(groupedReports, startDate);
  }

  /**
   * 특정 날짜 범위의 일일 보고서를 조회합니다
   * @param startDate - 시작 날짜 (YYYY-MM-DD 형식)
   * @param endDate - 종료 날짜 (YYYY-MM-DD 형식). 미입력시 startDate + 1일
   * @returns 일일 보고서 데이터
   */
  async getDailyReports(startDate: string, endDate?: string) {
    // endDate가 없을 경우 startDate + 1일로 설정
    const calculatedEndDate = endDate || getNextDay(startDate);

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
      isToday: report.properties.isToday.formula.boolean || false,
      isTomorrow: report.properties.isTomorrow.formula.boolean || false,
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
   * 일일 보고서 데이터를 최종 포맷으로 변환합니다
   * @param reports - 기본 포맷의 일일 보고서 데이터
   * @returns 최종 포맷의 일일 보고서 데이터
   */
  private convertToFinalFormat(reports: DailyReport[]): DailyReportGroup[] {
    const today = new Date().toISOString().split('T')[0];

    // 1. isToday/isTomorrow로 먼저 그룹핑
    const todayReports = reports.filter((report) => report.isToday);
    const tomorrowReports = reports.filter((report) => report.isTomorrow);

    // 2. 데이터가 부족한 항목들을 별도로 분류
    const incompleteTodayReports = todayReports.filter(
      (report) =>
        !report.date.start ||
        !report.group ||
        !report.subGroup ||
        !report.person,
    );

    const incompleteTomorrowReports = tomorrowReports.filter(
      (report) =>
        !report.date.start ||
        !report.group ||
        !report.subGroup ||
        !report.person,
    );

    // 3. 완전한 데이터만 필터링
    const completeTodayReports = todayReports.filter(
      (report) =>
        report.date.start && report.group && report.subGroup && report.person,
    );

    // 4. 진행중인 업무 중 마감일이 오늘이고 미완료된 업무는 예정업무로도 분류
    const additionalTomorrowReports = completeTodayReports.filter(
      (report) => report.date.end === today && report.progressRate !== 100,
    );

    const allTomorrowReports = [
      ...tomorrowReports.filter(
        (report) =>
          report.date.start && report.group && report.subGroup && report.person,
      ),
      ...additionalTomorrowReports,
    ];

    const formatGroup = (
      reports: DailyReport[],
      incompleteReports: DailyReport[],
    ): FormattedDailyReport[] => {
      // Group으로 먼저 그룹핑
      const groupedByMain = new Map<string, DailyReport[]>();

      reports.forEach((report) => {
        if (!groupedByMain.has(report.group)) {
          groupedByMain.set(report.group, []);
        }
        groupedByMain.get(report.group)?.push(report);
      });

      // 각 그룹 내에서 SubGroup으로 다시 그룹핑하고 정렬
      const formattedGroups = Array.from(groupedByMain.entries())
        .sort((a, b) => {
          if (a[0] === '기타') return 1;
          if (b[0] === '기타') return -1;
          if (a[0] === '사이트 지원') return b[0] === '기타' ? -1 : 1;
          if (b[0] === '사이트 지원') return a[0] === '기타' ? 1 : -1;
          return a[0].localeCompare(b[0]);
        })
        .map(([group, items]) => {
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

          const subGroupOrder = ['분석', '구현', '기타'];

          return {
            group,
            subGroups: Array.from(subGroupMap.entries())
              .sort((a, b) => {
                const aIndex = subGroupOrder.indexOf(a[0]);
                const bIndex = subGroupOrder.indexOf(b[0]);
                return aIndex - bIndex;
              })
              .map(([subGroup, items]) => ({
                subGroup,
                items: items.sort((a, b) => b.progressRate - a.progressRate),
              })),
          };
        });

      // 불완전한 데이터를 '데이터 부족' 그룹으로 추가
      if (incompleteReports.length > 0) {
        formattedGroups.push({
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
        });
      }

      return formattedGroups;
    };

    return [
      {
        type: '진행업무',
        groups: formatGroup(completeTodayReports, incompleteTodayReports),
      },
      {
        type: '예정업무',
        groups: formatGroup(allTomorrowReports, incompleteTomorrowReports),
      },
    ];
  }

  /**
   * 포맷된 보고서 데이터를 텍스트로 변환합니다
   * @param reports - 포맷된 보고서 데이터
   * @param date - 보고서 날짜 (YYYY-MM-DD 형식)
   * @returns 텍스트로 변환된 보고서
   */
  private convertToText(
    reports: DailyReportGroup[],
    date: string,
  ): FinalReport {
    // 날짜 포맷 변환 (YYYY-MM-DD -> YY.MM.DD)
    const formattedDate = date.slice(2).replace(/-/g, '.');

    // 헤더
    const title = `큐브 파트 일일업무 보고 (${formattedDate})`;
    let text = `${title}\n\n`;

    // 각 그룹(진행업무/예정업무)에 대해 처리
    reports.forEach((reportGroup) => {
      // 그룹 제목 추가
      text += `[${reportGroup.type}]\n`;

      // 각 업무 그룹 처리
      reportGroup.groups.forEach((group, groupIndex) => {
        // Group 제목 (numbering 포함)
        text += `${groupIndex + 1}. ${group.group}\n`;

        // SubGroup 처리
        group.subGroups.forEach((subGroup) => {
          // SubGroup 제목
          text += `[${subGroup.subGroup}]\n`;

          // 각 항목 처리
          subGroup.items.forEach((item) => {
            // 고객사가 있는 경우 제목 앞에 추가
            const title = item.customer
              ? `[${item.customer}] ${item.title}`
              : item.title;

            // 진행업무인 경우 진행률 포함, 예정업무인 경우 제외
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
}
