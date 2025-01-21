import memberMap from '../config/members';

export class MemberService {
  /**
   * 특정 이메일에 해당하는 멤버 이름을 반환한다
   * @param email - 이메일 주소
   * @returns 멤버 이름
   */
  getMemberName(email: string | undefined): string {
    if (!email) return '-';
    return memberMap[email]?.name || email;
  }

  /**
   * 멤버의 우선순위를 반환한다
   * @param email - 이메일 주소
   * @returns 멤버 우선순위 (기본값: 999)
   */
  getMemberPriority(email: string | undefined): number {
    if (!email) return 999;
    return memberMap[email]?.priority || 999;
  }

  /**
   * 이름으로 해당 멤버의 이메일을 찾는다
   * @param name - 멤버 이름
   * @returns 멤버 이메일
   */
  getEmailByName(name: string): string {
    const entry = Object.entries(memberMap).find(([_, value]) => value.name === name);
    return entry ? entry[0] : '';
  }
} 