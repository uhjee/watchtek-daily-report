/**
 * 보고서 관련 상수 정의
 */

// 텍스트 처리 관련 상수
export const TEXT_LIMITS = {
  NOTION_BLOCK_MAX_LENGTH: 2000, // Notion 블록의 최대 텍스트 길이
  MONTHLY_REPORT_MAX_LENGTH: 2000, // 월간 보고서 텍스트 조각 최대 길이
} as const;

// 멤버 우선순위 관련 상수
export const MEMBER_PRIORITY = {
  DEFAULT: 999, // 기본 우선순위 (가장 낮음)
} as const;

// 그룹 정렬 관련 상수
export const GROUP_PRIORITIES = {
  DCIM_PROJECT: 'DCIM프로젝트',
  SPECIAL_GROUPS: ['사이트 지원', '결함처리', 'OJT', '기타'],
} as const;

// 서브그룹 정렬 순서
export const SUBGROUP_ORDER = ['분석', '구현', '기타'] as const;

// 보고서 타입별 아이콘
export const REPORT_ICONS = {
  daily: '📝',
  weekly: '🔶',
  monthly: '📊',
} as const;

// 보고서 타입별 제목 매핑
export const REPORT_TITLES = {
  daily: {
    '진행업무': '****업무 진행 사항****',
    '예정업무': '****업무 계획 사항****',
  },
  weekly: {
    '진행업무': '****금주 진행 사항****',
    '예정업무': '****차주 계획 사항****',
  },
  monthly: {
    '진행업무': '****진행 중인 업무****',
    '완료업무': '****완료된 업무****',
  },
} as const;

// 진행률 관련 상수
export const PROGRESS_RATES = {
  MIN: 0,
  MAX: 100,
  COMPLETE: 100,
  IN_PROGRESS_MIN: 1,
} as const;

// 요일 관련 상수
export const WEEKDAYS = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;