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
