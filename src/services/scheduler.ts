import cron from 'node-cron';
import { config } from '../config/config';
import * as holiday from 'holiday-kr';

export class SchedulerService {
  private task: cron.ScheduledTask | null = null;
  private includeHoliday: boolean;

  constructor(includeHoliday: boolean = false) {
    this.includeHoliday = includeHoliday;
  }

  /**
   * 특정 날짜가 휴일인지 확인합니다
   * @param date - 확인할 날짜
   * @returns 휴일 여부
   */
  private isHoliday(date: Date): boolean {
    // 주말 체크
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // 공휴일 체크 (양력 기준)
    const isPublicHoliday = holiday.isHoliday(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      false, // isLunar
      false, // isLeapMonth
    );

    return isWeekend || isPublicHoliday;
  }

  /**
   * 일일 작업을 스케줄링합니다
   * @param job - 실행할 작업 함수
   */
  scheduleDaily(job: () => Promise<void>) {
    console.log('스케줄러가 시작되었습니다.');
    console.log(
      `다음 스케줄로 작업이 실행됩니다: ${config.scheduler.cronSchedule}`,
    );

    // 스케줄러 설정
    this.task = cron.schedule(
      config.scheduler.cronSchedule,
      async () => {
        // 현재 날짜가 휴일인지 체크
        const now = new Date();
        if (!this.includeHoliday && this.isHoliday(now)) {
          console.log('오늘은 휴일이므로 작업을 실행하지 않습니다.');
          return;
        }

        console.log('스케줄된 작업을 시작합니다...');
        try {
          await job();
          console.log('작업이 성공적으로 완료되었습니다.');
        } catch (error) {
          console.error('작업 실행 중 오류가 발생했습니다:', error);
        }
      },
      {
        timezone: config.scheduler.timezone,
        scheduled: true,
      },
    );

    // 프로세스 종료 시그널 처리
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());

    // 초기 실행 여부 확인을 위한 로그
    console.log('스케줄러가 정상적으로 실행 중입니다.');
  }

  /**
   * 스케줄러를 정상적으로 종료합니다
   */
  private gracefulShutdown() {
    console.log('\n프로그램을 종료합니다...');
    if (this.task) {
      this.task.stop();
    }
    process.exit(0);
  }
}
