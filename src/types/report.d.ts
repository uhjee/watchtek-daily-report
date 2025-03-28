// 일일 보고서 아이템 인터페이스
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

// 일일 보고서 인터페이스 (공수 정보 포함)
export interface DailyReport extends DailyReportItem {
  manDay: number;
}

// 서브그룹별로 그룹화된 보고서 아이템
export interface GroupedReportItem {
  subGroup: string;
  items: DailyReport[];
}

// 그룹별로 포맷된 일일 보고서
export interface FormattedDailyReport {
  group: string;
  subGroups: GroupedReportItem[];
}

// Notion API 응답 타입 (필요한 부분만 정의)
export interface NotionResponse {
  results: NotionPage[];
}

// Notion 페이지 타입
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

// 일일 보고서 그룹 (진행업무/예정업무)
export interface DailyReportGroup {
  type: '진행업무' | '예정업무' | '완료업무';
  groups: FormattedDailyReport[];
}

// 보고서 형식 (제목과 내용)
export interface ReportForm {
  title: string;
  text: string;
}

// 월간 보고서 형식 (제목과 내용)
export interface MonthlyReportForm extends ReportForm {
  texts: string[];
}

// 일일 보고서 데이터
export interface ReportDailyData extends ReportForm {
  reportType: 'daily';
  manDayText: string;
  manDayByGroupText?: string;
  manDayByPersonText?: string;
}

// 주간 보고서 데이터
export interface ReportWeeklyData extends ReportDailyData {
  reportType: 'weekly';
  manDayByGroupText: string;
  manDayByPersonText: string;
}

// 월간 보고서 데이터
export interface ReportMonthlyData extends ReportWeeklyData {
  reportType: 'monthly';
  isMonthlyReport: boolean;
  texts: string[];
  text?: string;
  manDayByPersonText?: string;
  manDayByPersonTexts: string[]; // 인원별 공수 정보 문자열 배열
}

// 전체 보고서 데이터
export interface ReportData {
  dailyData?: ReportDailyData;
  weeklyData?: ReportWeeklyData;
  monthlyData?: ReportMonthlyData;
}

// Notion 페이지 생성에 사용되는 보고서 데이터 타입
export type ReportDataForCreatePage =
  | ReportDailyData
  | ReportWeeklyData
  | ReportMonthlyData;

// 인원별 공수 정보
export interface ManDayByPerson {
  [key: string]: number;
}

// 인원별 공수 및 보고서 정보
export interface ManDayByPersonWithReports {
  name: string;
  totalManDay: number;
  reports: DailyReport[];
}
