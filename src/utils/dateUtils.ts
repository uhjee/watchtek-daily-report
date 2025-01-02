/**
 * 입력받은 날짜의 다음 날짜를 YYYY-MM-DD 형식의 문자열로 반환합니다
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 다음 날짜 (YYYY-MM-DD 형식)
 */
export const getNextDay = (dateString: string): string => {
  const nextDay = new Date(dateString);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString().split('T')[0];
}; 