import { MemberService } from '../services/memberService';
import { DailyReport } from '../types/report.d';
import { compareMemberPriorityByName, compareMemberPriorityByEmail } from './memberUtils';

/**
 * 정렬 전략 인터페이스
 */
export interface SortStrategy<T> {
  sort(items: T[]): T[];
}

/**
 * 멤버 우선순위 기반 정렬 전략 (이름-숫자 쌍)
 */
export class MemberPriorityByNameNumberSortStrategy implements SortStrategy<[string, number]> {
  constructor(private memberService: MemberService) {}

  sort(items: [string, number][]): [string, number][] {
    return items.sort(([nameA], [nameB]) => 
      compareMemberPriorityByName(nameA, nameB, this.memberService)
    );
  }
}

/**
 * 멤버 우선순위 기반 정렬 전략 (이름-배열 쌍)
 */
export class MemberPriorityByNameArraySortStrategy implements SortStrategy<[string, any[]]> {
  constructor(private memberService: MemberService) {}

  sort(items: [string, any[]][]): [string, any[]][] {
    return items.sort(([nameA], [nameB]) => 
      compareMemberPriorityByName(nameA, nameB, this.memberService)
    );
  }
}

/**
 * 멤버 우선순위 기반 정렬 전략 (이메일 기준)
 */
export class MemberPriorityByEmailSortStrategy implements SortStrategy<[string, any[]]> {
  sort(items: [string, any[]][]): [string, any[]][] {
    return items.sort(([emailA], [emailB]) => 
      compareMemberPriorityByEmail(emailA, emailB)
    );
  }
}

/**
 * 보고서 우선순위 기반 정렬 전략
 */
export class ReportPrioritySortStrategy implements SortStrategy<DailyReport> {
  constructor(private memberService: MemberService) {}

  sort(items: DailyReport[]): DailyReport[] {
    return items.sort((a, b) => {
      // 1. 진행률 내림차순 (높은 진행률이 먼저)
      if (a.progressRate !== b.progressRate) {
        return b.progressRate - a.progressRate;
      }

      // 2. 멤버 우선순위 오름차순
      const emailA = this.memberService.getEmailByName(a.person);
      const emailB = this.memberService.getEmailByName(b.person);
      return compareMemberPriorityByEmail(emailA, emailB);
    });
  }
}

/**
 * 그룹 우선순위 기반 정렬 전략
 */
export class GroupPrioritySortStrategy implements SortStrategy<[string, DailyReport[]]> {
  sort(items: [string, DailyReport[]][]): [string, DailyReport[]][] {
    return items.sort(([groupA], [groupB]) => {
      // DCIM프로젝트 우선 처리
      if (groupA === 'DCIM프로젝트') return -1;
      if (groupB === 'DCIM프로젝트') return 1;

      const specialGroups = ['사이트 지원', '결함처리', 'OJT', '기타'];
      
      const isSpecialA = specialGroups.includes(groupA);
      const isSpecialB = specialGroups.includes(groupB);

      // 둘 다 특수 그룹이 아닌 경우: 일반 정렬
      if (!isSpecialA && !isSpecialB) {
        return groupA.localeCompare(groupB);
      }

      // 하나만 특수 그룹인 경우: 특수 그룹을 뒤로
      if (isSpecialA && !isSpecialB) return 1;
      if (!isSpecialA && isSpecialB) return -1;

      // 둘 다 특수 그룹인 경우: 특수 그룹 내에서 순서대로
      return specialGroups.indexOf(groupA) - specialGroups.indexOf(groupB);
    });
  }
}

/**
 * 정렬 컨텍스트 클래스
 */
export class SortContext<T> {
  constructor(private strategy: SortStrategy<T>) {}

  setStrategy(strategy: SortStrategy<T>): void {
    this.strategy = strategy;
  }

  executeSort(items: T[]): T[] {
    return this.strategy.sort([...items]); // 원본 배열 보호를 위한 복사
  }
}