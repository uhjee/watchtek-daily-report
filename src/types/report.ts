export interface DailyReportItem {
  title: string;
  customer: string;
  group: string;
  subGroup: string;
  person: string;
  progressRate: number;
  date: {
    start: string;
    end: string | null;
  };
  isToday: boolean;
  isTomorrow: boolean;
}

export interface DailyReport extends DailyReportItem {
  manDay: number;
}

export interface GroupedReportItem {
  subGroup: string;
  items: DailyReport[];
}

export interface FormattedDailyReport {
  group: string;
  subGroups: GroupedReportItem[];
}

// Notion API 응답 타입 (필요한 부분만 정의)
export interface NotionResponse {
  results: NotionPage[];
}

export interface NotionPage {
  properties: {
    Name: {
      title: [
        {
          plain_text: string;
        },
      ];
    };
    Customer: {
      select: {
        name: string;
      };
    };
    Group: {
      select: {
        name: string;
      };
    };
    SubGroup: {
      select: {
        name: string;
      };
    };
    Person: {
      people: [
        {
          person: {
            email: string;
          };
        },
      ];
    };
    Progress: {
      number: number;
    };
    Date: {
      date: {
        start: string;
        end: string | null;
      };
    };
    isToday: {
      formula: {
        boolean: boolean;
      };
    };
    isTomorrow: {
      formula: {
        boolean: boolean;
      };
    };
    ManDay: {
      number: number;
    };
  };
}

export interface DailyReportGroup {
  type: '진행업무' | '예정업무';
  groups: FormattedDailyReport[];
}

export interface ReportForm {
  title: string;
  text: string;
}

export interface ReportDailyData extends ReportForm {
  manDayText: string;
}

export interface ReportWeeklyData extends ReportDailyData {
  manDayByGroupText: string;
  manDayByPersonText: string;
}

export interface ReportData {
  dailyData: ReportDailyData;
  weeklyData?: ReportWeeklyData;
}

export type ReportDataForCreatePage = ReportDailyData | ReportWeeklyData;

export interface ManDayByPerson {
  [key: string]: number;
}

export interface ManDayByPersonWithReports {
  name: string;
  totalManDay: number;
  reports: DailyReport[];
}
