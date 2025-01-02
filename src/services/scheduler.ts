import cron from 'node-cron';
import * as holidayKr from 'holiday-kr';

export class SchedulerService {
  private cronSchedule: string;
  private timezone: string;

  constructor() {
    if (!process.env.CRON_SCHEDULE) {
      throw new Error('CRON_SCHEDULE is not defined in environment variables');
    }

    this.cronSchedule = process.env.CRON_SCHEDULE;
    this.timezone = process.env.CRON_TIMEZONE || 'Asia/Seoul';
  }

  /**
   * 오늘이 공휴일인지 확인합니다
   * @returns 공휴일 여부
   */
  private async isHoliday(): Promise<boolean> {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // getMonth()는 0-11 반환하므로 1을 더함
    const day = today.getDate();

    return holidayKr.isHoliday(year, month, day, false, false);
  }

  /**
   * 매일 정해진 시간에 실행될 작업을 스케줄링합니다 (공휴일 제외)
   * @param task - 실행할 작업 함수
   */
  public scheduleDaily(task: () => Promise<void>): void {
    cron.schedule(
      this.cronSchedule,
      async () => {
        console.log('작업 실행 검사 시작:', new Date().toISOString());

        try {
          // 공휴일 체크
          if (await this.isHoliday()) {
            console.log('오늘은 공휴일입니다. 작업을 건너뜁니다.');
            return;
          }

          // 주말 체크 (토요일: 6, 일요일: 0)
          const today = new Date();
          if (today.getDay() === 0 || today.getDay() === 6) {
            console.log('오늘은 주말입니다. 작업을 건너뜁니다.');
            return;
          }

          console.log('일일 작업 시작');
          await task();
          console.log('일일 작업 완료');
        } catch (error) {
          console.error('일일 작업 중 오류 발생:', error);
        }
      },
      {
        scheduled: true,
        timezone: this.timezone,
      },
    );

    console.log(
      `일일 스케줄러가 시작되었습니다. (Cron: ${this.cronSchedule}, Timezone: ${this.timezone})`,
    );
  }
}
