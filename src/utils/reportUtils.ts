import { DailyReport, DailyReportGroup, DailyReportItem } from '../types/report.d';
import { ReportAggregationService } from '../services/reportAggregationService';
import { NotionStringifyService } from '../services/notionStringifyService';

/**
 * 보고서 관련 유틸리티 함수들
 */

/**
 * 보고서 배열에서 그룹별 공수를 계산한다
 * @param reports - 일일 보고서 데이터 배열
 * @returns 그룹별 공수 합계 객체
 */
export function calculateManDayByGroup(reports: DailyReport[]): Record<string, number> {
  return reports.reduce((acc, report) => {
    acc[report.group] = (acc[report.group] ?? 0) + report.manDay;
    return acc;
  }, {} as Record<string, number>);
}



/**
 * 보고서 아이템의 제목을 포맷한다
 * @param item - 보고서 아이템
 * @returns 포맷된 제목 (customer가 있으면 [customer] title 형태)
 */
function formatReportTitle(item: DailyReportItem): string {
  return item.customer ? `[${item.customer}] ${item.title}` : item.title;
}

/**
 * 진행률 텍스트를 생성한다
 * @param progressRate - 진행률 (0-100)
 * @param includeProgress - 진행률 포함 여부
 * @returns 진행률 텍스트 (포함하지 않으면 빈 문자열)
 */
function formatProgressText(progressRate: number, includeProgress: boolean = true): string {
  return includeProgress ? `, ${progressRate}%` : '';
}

/**
 * 보고서 아이템을 문자열로 포맷한다
 * @param item - 보고서 아이템
 * @param includeProgress - 진행률 포함 여부
 * @returns 포맷된 문자열 (예: "- [customer] title(person, 80%)")
 */
export function formatReportItemText(item: DailyReportItem, includeProgress: boolean = true): string {
  const title = formatReportTitle(item);
  const progress = formatProgressText(item.progressRate, includeProgress);
  return `- ${title}(${item.person}${progress})`;
}

/**
 * 보고서 그룹의 제목을 생성한다
 * @param reportType - 보고서 타입 ('진행업무', '예정업무', '완료업무')
 * @param isWeekly - 주간 보고서 여부
 * @returns 포맷된 그룹 제목
 */
export function formatReportGroupTitle(reportType: string, isWeekly: boolean = false): string {
  if (isWeekly) {
    return reportType === '진행업무' ? '금주 진행 사항' : '차주 계획 사항';
  }
  
  const titleMap: Record<string, string> = {
    '진행업무': '업무 진행 사항',
    '예정업무': '업무 계획 사항',
    '완료업무': '완료된 업무',
  };
  
  return titleMap[reportType] || `${reportType}`;
}

/**
 * 공수 데이터를 처리하여 텍스트로 변환하는 공통 함수
 * ReportService의 중복 패턴을 제거하기 위한 유틸리티
 * @param reports - 일일 보고서 데이터 배열
 * @param aggregationService - 공수 집계 서비스
 * @param stringifyService - 문자열 변환 서비스
 * @param includeGroupData - 그룹별 공수 데이터 포함 여부 (기본값: true)
 * @returns 공수 데이터 처리 결과
 */
export function processManDayData(
  reports: DailyReport[], 
  aggregationService: ReportAggregationService,
  stringifyService: NotionStringifyService,
  includeGroupData: boolean = true
) {
  const manDaySummary = aggregationService.getManDaySummary(reports);
  const manDayText = stringifyService.stringifyManDayMap(manDaySummary);
  
  let manDayByGroup;
  let manDayByGroupText;
  
  if (includeGroupData) {
    manDayByGroup = aggregationService.getManDayByGroup(reports);
    manDayByGroupText = stringifyService.stringifyManDayMap(manDayByGroup, true);
  }
  
  return { 
    manDayText, 
    manDayByGroupText, 
    manDaySummary, 
    manDayByGroup 
  };
}