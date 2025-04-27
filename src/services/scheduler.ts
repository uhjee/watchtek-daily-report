import cron from 'node-cron';
import { config } from '../config/config';
import * as holiday from 'holiday-kr';

export class SchedulerService {
  private scheduledTask: cron.ScheduledTask | null = null;
  private executeOnHoliday: boolean;

  /**
   * 스케줄러 서비스 생성자
   * @param executeOnHoliday - 휴일에도 작업을 실행할지 여부
   */
  constructor(executeOnHoliday: boolean = false) {
    this.executeOnHoliday = executeOnHoliday;
  }

  /**
   * 일일 작업을 스케줄링하고 실행
   * @param jobFunction - 실행할 작업 함수
   */
  scheduleDaily(jobFunction: () => Promise<void>): void {
    console.log('스케줄러가 시작되었습니다.');
    console.log(
      `다음 스케줄로 작업이 실행됩니다: ${config.scheduler.cronSchedule}`,
    );

    // 스케줄러 설정
    this.scheduledTask = cron.schedule(
      config.scheduler.cronSchedule,
      async () => {
        await this.executeScheduledJob(jobFunction);
      },
      {
        timezone: config.scheduler.timezone,
        scheduled: true,
      },
    );

    // 프로세스 종료 시그널 처리
    this.setupShutdownHandlers();

    // 초기 실행 여부 확인을 위한 로그
    console.log('스케줄러가 정상적으로 실행 중입니다.');
  }

  /**
   * 스케줄링된 작업을 실행
   * @param jobFunction - 실행할 작업 함수
   */
  private async executeScheduledJob(jobFunction: () => Promise<void>): Promise<void> {
    // 현재 날짜가 휴일인지 체크
    const now = new Date();
    if (!this.executeOnHoliday && this.isHoliday(now)) {
      console.log('오늘은 휴일이므로 작업을 실행하지 않습니다.');
      return;
    }

    console.log('스케줄된 작업을 시작합니다...');
    try {
      await jobFunction();
      console.log('작업이 성공적으로 완료되었습니다.');
    } catch (error) {
      console.error('작업 실행 중 오류가 발생했습니다:', error);
    }
  }

  /**
   * 프로세스 종료 시그널 핸들러 설정
   */
  private setupShutdownHandlers(): void {
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  /**
   * 스케줄러를 정상적으로 종료하고 프로세스를 종료
   */
  private gracefulShutdown(): void {
    console.log('\n프로그램을 종료합니다...');
    if (this.scheduledTask) {
      this.scheduledTask.stop();
    }
    process.exit(0);
  }

  /**
   * 특정 날짜가 휴일(주말 또는 공휴일)인지 확인
   * @param date - 확인할 날짜
   * @returns 휴일 여부
   */
  private isHoliday(date: Date): boolean {
    // 주말 체크
    const isWeekend = this.isWeekend(date);

    // 공휴일 체크 (양력 기준)
    const isPublicHoliday = this.isPublicHoliday(date);

    return isWeekend || isPublicHoliday;
  }

  /**
   * 주말 여부 확인
   * @param date - 확인할 날짜
   * @returns 주말 여부
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0: 일요일, 6: 토요일
  }

  /**
   * 공휴일 여부 확인
   * @param date - 확인할 날짜
   * @returns 공휴일 여부
   */
  private isPublicHoliday(date: Date): boolean {
    return holiday.isHoliday(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      false, // isLunar
      false, // isLeapMonth
    );
  }
}
