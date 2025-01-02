declare module 'holiday-kr' {
  export function isLunarHoliday(year: number, month: number, day: number, isLeapMonth: boolean): boolean;
  export function isSolarHoliday(year: number, month: number, day: number): boolean;
  export function isHoliday(year: number, month: number, day: number, isLunar: boolean, isLeapMonth: boolean): boolean;
  export function getLunar(year: number, month: number, day: number): any;
  export function getSolar(year: number, month: number, day: number, isLeapMonth: boolean): any;
} 