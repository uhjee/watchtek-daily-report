export interface DailyReport {
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
  };
}
