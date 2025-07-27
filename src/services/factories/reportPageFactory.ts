import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { NotionApiService } from '../notionApiService';
import {
  ReportDataForCreatePage,
  ReportWeeklyData,
  ReportMonthlyData,
  ReportDailyData,
  ManDayByPersonWithReports,
  DailyReportGroup,
} from '../../types/report.d';
import { splitTextIntoChunks } from '../../utils/stringUtils';
import {
  createCodeBlocks,
  createParagraphBlock,
  createPageProperties,
  createPageIcon,
  createHeading2Block,
  createManDayByPersonBlocks,
  createWeeklyReportBlocksFromData,
  createMonthlyReportBlocksFromData,
} from '../../utils/notionBlockUtils';

/**
 * 보고서 페이지 생성을 위한 추상 인터페이스
 */
export interface ReportPageCreator {
  createPage(reportData: ReportDataForCreatePage, date: string): Promise<any>;
}

/**
 * 보고서 페이지 생성을 위한 추상 템플릿 클래스
 * Template Method Pattern 적용
 */
export abstract class AbstractReportPageCreator implements ReportPageCreator {
  constructor(protected notionApiService: NotionApiService) {}

  /**
   * 템플릿 메서드: 페이지 생성의 공통 플로우를 정의
   */
  async createPage(reportData: ReportDataForCreatePage, date: string): Promise<any> {
    const blocks = this.createInitialBlocks(reportData);
    const contentBlocks = this.createContentBlocks(reportData, date);
    const allBlocks = [...blocks, ...contentBlocks];

    const properties = createPageProperties(reportData.title, date, reportData.reportType);
    const icon = createPageIcon(reportData.reportType);
    
    // 100개 블록 제한을 고려하여 첫 번째 청크로만 페이지 생성
    const BLOCK_LIMIT = 100;
    const initialBlocks = allBlocks.slice(0, BLOCK_LIMIT);
    const remainingBlocks = allBlocks.slice(BLOCK_LIMIT);

    const response = await this.notionApiService.createPage(properties, initialBlocks, icon);

    // 나머지 블록들을 순차적으로 추가
    if (remainingBlocks.length > 0) {
      for (let i = 0; i < remainingBlocks.length; i += BLOCK_LIMIT) {
        const chunk = remainingBlocks.slice(i, i + BLOCK_LIMIT);
        await this.notionApiService.appendBlocks(response.id, chunk);
      }
    }

    // manDayByPerson 섹션 추가
    await this.appendManDaySection(response.id, reportData);

    return response;
  }

  /**
   * 초기 블록 생성 (공수 현황 헤더와 텍스트)
   */
  protected createInitialBlocks(reportData: ReportDataForCreatePage): BlockObjectRequest[] {
    const headerText = this.getHeaderText();
    return [
      createHeading2Block(headerText),
      createParagraphBlock(reportData.manDayText),
    ];
  }



  /**
   * 개인별 공수 섹션 추가
   */
  protected async appendManDaySection(pageId: string, reportData: ReportDataForCreatePage): Promise<void> {
    const typedData = reportData as ReportWeeklyData | ReportMonthlyData | ReportDailyData;
    if ('manDayByPerson' in typedData && typedData.manDayByPerson && typedData.manDayByPerson.length > 0) {
      const manDayBlocks = [
        createHeading2Block('개인별 공수 및 진행 상황'),
        ...createManDayByPersonBlocks(typedData.manDayByPerson),
      ];

      // 100개씩 청크로 나누어 추가
      const BLOCK_LIMIT = 100;
      for (let i = 0; i < manDayBlocks.length; i += BLOCK_LIMIT) {
        const chunk = manDayBlocks.slice(i, i + BLOCK_LIMIT);
        await this.notionApiService.appendBlocks(pageId, chunk);
      }
    }
  }

  // 추상 메서드들 - 하위 클래스에서 구현
  protected abstract getHeaderText(): string;
  protected abstract createContentBlocks(reportData: ReportDataForCreatePage, date: string): BlockObjectRequest[];
}

/**
 * 일일 보고서 페이지 생성기
 */
export class DailyReportPageCreator extends AbstractReportPageCreator {
  protected getHeaderText(): string {
    return '일일 공수 현황';
  }

  protected createContentBlocks(reportData: ReportDataForCreatePage, date: string): BlockObjectRequest[] {
    const dailyData = reportData as ReportDailyData;
    const { text, manDayByGroupText } = dailyData;
    const blocks: BlockObjectRequest[] = [];

    if (manDayByGroupText) {
      blocks.push(createParagraphBlock(manDayByGroupText));
    }

    // 텍스트를 청크로 분할하여 코드 블록 생성
    const textChunks = splitTextIntoChunks(text, 2000);
    textChunks.forEach(chunk => {
      blocks.push(...createCodeBlocks(chunk));
    });

    return blocks;
  }
}

/**
 * 주간 보고서 페이지 생성기
 */
export class WeeklyReportPageCreator extends AbstractReportPageCreator {
  protected getHeaderText(): string {
    return '주간 공수 현황';
  }

  protected createContentBlocks(reportData: ReportDataForCreatePage, date: string): BlockObjectRequest[] {
    const weeklyData = reportData as ReportWeeklyData;
    const { manDayByGroupText, groupedReports } = weeklyData;
    const blocks: BlockObjectRequest[] = [];

    blocks.push(createParagraphBlock(manDayByGroupText));

    if (groupedReports && groupedReports.length > 0) {
      blocks.push(...createWeeklyReportBlocksFromData(groupedReports, date));
    }

    return blocks;
  }
}

/**
 * 월간 보고서 페이지 생성기
 */
export class MonthlyReportPageCreator extends AbstractReportPageCreator {
  protected getHeaderText(): string {
    return '월간 공수 현황';
  }

  protected createContentBlocks(reportData: ReportDataForCreatePage, date: string): BlockObjectRequest[] {
    const monthlyData = reportData as ReportMonthlyData;
    const { manDayByGroupText, groupedReports } = monthlyData;
    const blocks: BlockObjectRequest[] = [];

    blocks.push(createParagraphBlock(manDayByGroupText));

    if (groupedReports && groupedReports.length > 0) {
      blocks.push(...createMonthlyReportBlocksFromData(groupedReports, date));
    }

    return blocks;
  }
}

/**
 * 보고서 페이지 생성기 팩토리
 */
export class ReportPageFactory {
  private creators = new Map<string, ReportPageCreator>();

  constructor(notionApiService: NotionApiService) {
    this.creators.set('daily', new DailyReportPageCreator(notionApiService));
    this.creators.set('weekly', new WeeklyReportPageCreator(notionApiService));
    this.creators.set('monthly', new MonthlyReportPageCreator(notionApiService));
  }

  /**
   * 보고서 타입에 따른 페이지 생성기를 반환한다
   * @param reportType - 보고서 타입
   * @returns 해당 타입의 페이지 생성기
   */
  getCreator(reportType: string): ReportPageCreator {
    const creator = this.creators.get(reportType);
    if (!creator) {
      throw new Error(`Unsupported report type: ${reportType}`);
    }
    return creator;
  }

  /**
   * 보고서 페이지를 생성한다
   * @param reportData - 보고서 데이터
   * @param date - 보고서 날짜
   * @returns 생성된 페이지
   */
  async createReportPage(reportData: ReportDataForCreatePage, date: string): Promise<any> {
    const creator = this.getCreator(reportData.reportType);
    return creator.createPage(reportData, date);
  }
}