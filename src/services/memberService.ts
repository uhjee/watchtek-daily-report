import memberMap from '../config/members';

export class MemberService {
  /**
   * 특정 이메일에 해당하는 멤버 이름을 반환
   * @param email - 이메일 주소
   * @returns 멤버 이름 또는 기본값
   */
  getMemberName(email: string | undefined): string {
    if (!email) return '-';
    return memberMap[email]?.name || email;
  }

  /**
   * 멤버의 우선순위를 반환
   * @param email - 이메일 주소
   * @returns 멤버 우선순위 (기본값: 999)
   */
  getMemberPriority(email: string | undefined): number {
    if (!email) return 999;
    return memberMap[email]?.priority || 999;
  }

  /**
   * 이름으로 해당 멤버의 이메일을 찾기
   * @param name - 멤버 이름
   * @returns 멤버 이메일 또는 빈 문자열
   */
  getEmailByName(name: string): string {
    const entry = Object.entries(memberMap).find(
      ([_, member]) => member.name === name
    );
    return entry ? entry[0] : '';
  }

  /**
   * 모든 멤버 목록 반환
   * @returns 이메일을 키로 하는 멤버 객체
   */
  getAllMembers(): typeof memberMap {
    return memberMap;
  }
} 