/**
 * 한국 시간(KST) 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환합니다
 */
export function getToday(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const [year, month, day] = formatter
    .format(now)
    .split('.')
    .map((part) => part.trim().padStart(2, '0'));

  return `${year}-${month}-${day}`;
  // return '2025-01-09';
}

/**
 * 주어진 날짜의 다음 날을 YYYY-MM-DD 형식으로 반환합니다
 */
export function getNextDay(date: string): string {
  const currentDate = new Date(date);
  currentDate.setDate(currentDate.getDate() + 1);

  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const [nextYear, nextMonth, nextDay] = formatter
    .format(currentDate)
    .split('.')
    .map((part) => part.trim().padStart(2, '0'));

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

/**
 * 특정 날짜의 월과 주차 정보를 반환합니다
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns 'M월 N주차' 형식의 문자열
 */
export function getWeekOfMonth(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1; // getMonth()는 0부터 시작하므로 1을 더함

  // 해당 월의 1일
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

  // 1일의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
  const firstDayWeekday = firstDayOfMonth.getDay();

  // 입력된 날짜의 일자
  const currentDate = date.getDate();

  // 주차 계산
  // (해당 일자 + 해당 월의 1일의 요일 - 1) / 7을 올림하여 주차를 구함
  const weekNumber = Math.ceil((currentDate + firstDayWeekday) / 7);

  return `${month}월 ${weekNumber}주차`;
}

/**
 * 현재 달의 첫날과 마지막 날을 YYYY-MM-DD 형식으로 반환한다
 * @returns {Object} 이번 달의 첫날과 마지막 날
 */
export function getCurrentMonthRange(): { firstDay: string; lastDay: string } {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // YYYY-MM-DD 형식으로 변환
  const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];
  const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];

  return {
    firstDay: firstDayStr,
    lastDay: lastDayStr,
  };
}
