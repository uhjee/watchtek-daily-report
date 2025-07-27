import { MemberService } from '../services/memberService';
import memberMap from '../config/members';

/**
 * 두 멤버의 우선순위를 비교하는 함수 (이름 기준)
 * @param nameA - 첫 번째 멤버 이름
 * @param nameB - 두 번째 멤버 이름
 * @param memberService - MemberService 인스턴스
 * @returns 비교 결과 (-1, 0, 1)
 */
export function compareMemberPriorityByName(
  nameA: string, 
  nameB: string, 
  memberService: MemberService
): number {
  const emailA = memberService.getEmailByName(nameA);
  const emailB = memberService.getEmailByName(nameB);
  const priorityA = memberService.getMemberPriority(emailA);
  const priorityB = memberService.getMemberPriority(emailB);
  
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return nameA.localeCompare(nameB);
}

/**
 * 두 멤버의 우선순위를 비교하는 함수 (이메일 기준)
 * @param emailA - 첫 번째 멤버 이메일
 * @param emailB - 두 번째 멤버 이메일
 * @returns 비교 결과 (-1, 0, 1)
 */
export function compareMemberPriorityByEmail(
  emailA: string,
  emailB: string
): number {
  const priorityA = memberMap[emailA]?.priority ?? 999;
  const priorityB = memberMap[emailB]?.priority ?? 999;

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return emailA.localeCompare(emailB);
}

/**
 * 두 멤버의 우선순위를 비교하는 함수 (MemberService 의존성 주입 버전)
 * @param emailA - 첫 번째 멤버 이메일
 * @param emailB - 두 번째 멤버 이메일
 * @param memberService - MemberService 인스턴스
 * @returns 비교 결과 (-1, 0, 1)
 */
export function compareMemberPriorityByEmailWithService(
  emailA: string,
  emailB: string,
  memberService: MemberService
): number {
  const priorityA = memberService.getMemberPriority(emailA);
  const priorityB = memberService.getMemberPriority(emailB);
  
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  return emailA.localeCompare(emailB);
}