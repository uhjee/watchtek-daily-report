/**
 * 보고서 관련 타입 정의 강화
 */

// 보고서 타입 리터럴
export type ReportType = 'daily' | 'weekly' | 'monthly';

// 보고서 그룹 타입 리터럴
export type ReportGroupType = '진행업무' | '예정업무' | '완료업무';

// 서브그룹 타입 리터럴
export type SubGroupType = '분석' | '구현' | '기타';

// 특수 그룹 타입 리터럴
export type SpecialGroupType = '사이트 지원' | '결함처리' | 'OJT' | '기타';

// 우선 그룹 타입 리터럴
export type PriorityGroupType = 'DCIM프로젝트';

// 날짜 범위 인터페이스
export interface DateRange {
  start: string;
  end: string | null;
}

// 멤버 정보 인터페이스
export interface MemberInfo {
  name: string;
  priority: number;
}

// 멤버 맵 타입
export type MemberMap = Record<string, MemberInfo>;

// 진행률 타입 (0-100)
export type ProgressRate = number;

// 공수 타입
export type ManDay = number;

// 정렬 방향 타입
export type SortDirection = 'asc' | 'desc';

// Notion 블록 언어 타입
export type NotionCodeLanguage = 'javascript' | 'typescript' | 'json' | 'markdown';

// 보고서 상태 타입
export type ReportStatus = 'pending' | 'in_progress' | 'completed';

// 요일 타입
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// 텍스트 청크 옵션
export interface TextChunkOptions {
  maxLength: number;
  preserveWords?: boolean;
}