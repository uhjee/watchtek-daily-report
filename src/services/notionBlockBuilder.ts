import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { 
  createCodeBlocks, 
  createParagraphBlock, 
  createMultipleCodeBlocks,
  createPageProperties 
} from '../utils/notionBlockUtils';
import { ReportType } from '../types/reportTypes';
import { REPORT_ICONS } from '../constants/reportConstants';

/**
 * Notion 블록 생성을 전담하는 서비스
 */
export class NotionBlockBuilder {
  /**
   * 일일 보고서 페이지의 블록들을 생성합니다
   * @param text - 메인 보고서 텍스트
   * @param manDayText - 인원별 공수 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트 (선택사항)
   * @param manDayByPersonText - 담당자별 공수 텍스트 (선택사항)
   * @returns 생성된 블록 배열
   */
  buildDailyReportBlocks(
    text: string,
    manDayText: string,
    manDayByGroupText?: string,
    manDayByPersonText?: string,
  ): BlockObjectRequest[] {
    const children: BlockObjectRequest[] = [
      ...createCodeBlocks(text),
      createParagraphBlock(manDayText),
    ];

    if (manDayByGroupText) {
      children.push(createParagraphBlock(manDayByGroupText));
    }

    if (manDayByPersonText) {
      children.push(...createCodeBlocks(manDayByPersonText));
    }

    return children;
  }

  /**
   * 주간 보고서 페이지의 블록들을 생성합니다
   * @param text - 메인 보고서 텍스트
   * @param manDayText - 인원별 공수 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPersonText - 담당자별 공수 텍스트
   * @returns 생성된 블록 배열
   */
  buildWeeklyReportBlocks(
    text: string,
    manDayText: string,
    manDayByGroupText: string,
    manDayByPersonText: string,
  ): BlockObjectRequest[] {
    return [
      ...createCodeBlocks(text),
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText),
      ...createCodeBlocks(manDayByPersonText),
    ];
  }

  /**
   * 월간 보고서 페이지의 블록들을 생성합니다
   * @param texts - 메인 보고서 텍스트 배열
   * @param manDayText - 인원별 공수 텍스트
   * @param manDayByGroupText - 그룹별 공수 텍스트
   * @param manDayByPersonTexts - 담당자별 공수 텍스트 배열
   * @returns 생성된 블록 배열
   */
  buildMonthlyReportBlocks(
    texts: string[],
    manDayText: string,
    manDayByGroupText: string,
    manDayByPersonTexts: string[],
  ): BlockObjectRequest[] {
    return [
      ...createMultipleCodeBlocks(texts),
      createParagraphBlock(manDayText),
      createParagraphBlock(manDayByGroupText),
      ...createMultipleCodeBlocks(manDayByPersonTexts),
    ];
  }

  /**
   * 페이지 기본 속성을 생성합니다
   * @param title - 페이지 제목
   * @param date - 보고서 날짜
   * @returns 페이지 속성 객체
   */
  buildPageProperties(title: string, date: string) {
    return createPageProperties(title, date);
  }

  /**
   * 보고서 타입에 따른 아이콘을 반환합니다
   * @param reportType - 보고서 타입
   * @returns 아이콘 이모지
   */
  getReportIcon(reportType: ReportType): string {
    return REPORT_ICONS[reportType];
  }
}