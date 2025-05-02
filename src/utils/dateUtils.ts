/**
 * 날짜 관련 유틸리티 함수 모음
 */

// 날짜 포맷터 상수
const KST_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 * @param date - 변환할 날짜 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const [year, month, day] = KST_DATE_FORMATTER.format(date)
    .split('.')
    .map((part) => part.trim().padStart(2, '0'));

  return `${year}-${month}-${day}`;
}

/**
 * 한국 시간(KST) 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export function getToday(): string {
  const now = new Date();
  return formatDateToYYYYMMDD(now);
  // 테스트용 고정 날짜는 주석 처리
  // return '2025-04-25';
}

/**
 * 주어진 날짜의 다음 날을 YYYY-MM-DD 형식으로 반환
 * @param dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns YYYY-MM-DD 형식의 날짜 문자열
 */
export function getNextDay(dateString: string): string {
  const currentDate = new Date(dateString);
  currentDate.setDate(currentDate.getDate() + 1);
  return formatDateToYYYYMMDD(currentDate);
}

/**
 * 특정 날짜의 월과 주차 정보를 반환
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
 * 현재 달의 첫날과 마지막 날을 YYYY-MM-DD 형식으로 반환
 * @returns 이번 달의 첫날과 마지막 날
 */
export function getCurrentMonthRange(): { firstDay: string; lastDay: string } {
  const now = new Date();
  return getMonthRange(now);
}

/**
 * 특정 달의 첫날과 마지막 날을 YYYY-MM-DD 형식으로 반환
 * @param date - 기준 날짜
 * @returns 해당 달의 첫날과 마지막 날
 */
export function getMonthRange(date: Date): {
  firstDay: string;
  lastDay: string;
} {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    firstDay: formatDateToYYYYMMDD(firstDayOfMonth),
    lastDay: formatDateToYYYYMMDD(lastDayOfMonth),
  };
}

/**
 * 주어진 날짜가 해당 월의 마지막 주 금요일인지 확인
 * @param date - 확인할 날짜
 * @returns 마지막 주 금요일 여부
 */
export function isLastFridayOfMonth(date: Date): boolean {
  // 현재 날짜가 금요일인지 확인 (금요일 = 5)
  if (date.getDay() !== 5) {
    return false;
  }

  // 이번 주 수요일 계산 (현재 날짜 - 2일)
  const thisWednesday = new Date(date);
  thisWednesday.setDate(date.getDate() - 2);

  // 다음 주 수요일의 날짜 계산 (현재 날짜 + 5일)
  const nextWednesday = new Date(date);
  nextWednesday.setDate(date.getDate() + 5);

  // 이번 주 수요일과 다음 주 수요일의 월 비교
  const thisWednesdayMonth = thisWednesday.getMonth();
  const nextWednesdayMonth = nextWednesday.getMonth();

  // 이번 주 수요일과 다음 주 수요일이 다른 달에 속하는지 확인
  const result = thisWednesdayMonth !== nextWednesdayMonth;

  return result;
}
