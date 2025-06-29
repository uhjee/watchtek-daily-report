import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { splitTextIntoChunks } from './stringUtils';
import { NotionCodeLanguage } from '../types/reportTypes';

/**
 * Notion 블록 생성 관련 유틸리티 함수들
 */

/**
 * 코드 블록을 생성한다 (2000자 제한 적용)
 * @param text - 코드 블록에 들어갈 텍스트
 * @param language - 코드 언어 (기본값: javascript)
 * @returns 코드 블록 배열
 */
export function createCodeBlocks(text: string, language: NotionCodeLanguage = 'javascript'): BlockObjectRequest[] {
  const chunks = splitTextIntoChunks(text);
  return chunks.map(chunk => ({
    object: 'block' as const,
    type: 'code' as const,
    code: {
      rich_text: [
        {
          type: 'text' as const,
          text: {
            content: chunk,
          },
        },
      ],
      language,
    },
  }));
}

/**
 * 단락(paragraph) 블록을 생성한다
 * @param text - 단락에 들어갈 텍스트
 * @returns 단락 블록
 */
export function createParagraphBlock(text: string): BlockObjectRequest {
  return {
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [
        {
          type: 'text' as const,
          text: {
            content: text,
          },
        },
      ],
    },
  };
}

/**
 * 여러 텍스트로부터 코드 블록들을 생성한다
 * @param texts - 텍스트 배열
 * @param language - 코드 언어 (기본값: javascript)
 * @returns 모든 코드 블록 배열
 */
export function createMultipleCodeBlocks(texts: string[], language: NotionCodeLanguage = 'javascript'): BlockObjectRequest[] {
  const allBlocks: BlockObjectRequest[] = [];
  texts.forEach(text => {
    const blocks = createCodeBlocks(text, language);
    allBlocks.push(...blocks);
  });
  return allBlocks;
}

/**
 * 보고서 페이지의 기본 속성을 생성한다
 * @param title - 페이지 제목
 * @param date - 보고서 날짜
 * @returns 페이지 속성 객체
 */
export function createPageProperties(title: string, date: string) {
  return {
    title: {
      title: [
        {
          text: {
            content: title,
          },
        },
      ],
    },
    Date: {
      date: {
        start: date,
      },
    },
  };
}