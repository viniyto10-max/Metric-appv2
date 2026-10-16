/**
 * Utility for exact date range comparisons.
 * Ensures the comparison period is always the interval immediately prior to the selected period,
 * with the exact same number of consecutive calendar days, zero gap and zero overlap.
 */

export interface DateRange {
  start: Date;
  end: Date;
  days: number;
}

export interface ComparisonDateRanges {
  current: DateRange | null;
  previous: DateRange | null;
}

/**
 * Calculates exact current and comparison (immediately prior) date ranges.
 */
export function calculateComparisonDateRanges(
  period: '7' | '30' | '90' | 'ano' | 'tudo' | 'custom',
  customStart?: string,
  customEnd?: string
): ComparisonDateRanges {
  if (period === 'tudo') {
    return { current: null, previous: null };
  }

  const now = new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth();
  const todayDate = now.getDate();

  // Helper to build midnight / end of day
  const createStartOfDay = (year: number, month: number, date: number) =>
    new Date(year, month, date, 0, 0, 0, 0);

  const createEndOfDay = (year: number, month: number, date: number) =>
    new Date(year, month, date, 23, 59, 59, 999);

  if (period === 'custom') {
    if (!customStart || !customEnd) {
      return { current: null, previous: null };
    }

    const [sY, sM, sD] = customStart.split('-').map(Number);
    const [eY, eM, eD] = customEnd.split('-').map(Number);

    if (!sY || !sM || !sD || !eY || !eM || !eD) {
      return { current: null, previous: null };
    }

    // Ensure valid order
    let startY = sY, startM = sM, startD = sD;
    let endY = eY, endM = eM, endD = eD;
    const startUtc = Date.UTC(sY, sM - 1, sD);
    const endUtc = Date.UTC(eY, eM - 1, eD);

    if (startUtc > endUtc) {
      startY = eY; startM = eM; startD = eD;
      endY = sY; endM = sM; endD = sD;
    }

    const currentStart = createStartOfDay(startY, startM - 1, startD);
    const currentEnd = createEndOfDay(endY, endM - 1, endD);

    // Number of days in the selected range (inclusive)
    const days = Math.round((Math.max(startUtc, endUtc) - Math.min(startUtc, endUtc)) / 86400000) + 1;

    // Previous period: immediately anterior (day before currentStart), same duration
    const previousEnd = createEndOfDay(startY, startM - 1, startD - 1);
    const previousStart = createStartOfDay(
      previousEnd.getFullYear(),
      previousEnd.getMonth(),
      previousEnd.getDate() - (days - 1)
    );

    return {
      current: { start: currentStart, end: currentEnd, days },
      previous: { start: previousStart, end: previousEnd, days }
    };
  }

  if (period === 'ano') {
    // Current year from Jan 1 00:00:00 up to today 23:59:59.999
    const currentStart = createStartOfDay(todayYear, 0, 1);
    const currentEnd = createEndOfDay(todayYear, todayMonth, todayDate);

    const startUtc = Date.UTC(todayYear, 0, 1);
    const endUtc = Date.UTC(todayYear, todayMonth, todayDate);
    const days = Math.round((endUtc - startUtc) / 86400000) + 1;

    // Previous period: immediately prior ending on Dec 31 of previous year
    const previousEnd = createEndOfDay(todayYear - 1, 11, 31);
    const previousStart = createStartOfDay(
      previousEnd.getFullYear(),
      previousEnd.getMonth(),
      previousEnd.getDate() - (days - 1)
    );

    return {
      current: { start: currentStart, end: currentEnd, days },
      previous: { start: previousStart, end: previousEnd, days }
    };
  }

  // Preset days: 7, 30, 90
  const days = period === '7' ? 7 : period === '30' ? 30 : 90;

  // Current period: [today - (days - 1), today] -> exactly `days` calendar days
  const currentEnd = createEndOfDay(todayYear, todayMonth, todayDate);
  const currentStart = createStartOfDay(todayYear, todayMonth, todayDate - (days - 1));

  // Previous period: immediately prior [currentStart - days, currentStart - 1 day]
  const previousEnd = createEndOfDay(todayYear, todayMonth, todayDate - days);
  const previousStart = createStartOfDay(todayYear, todayMonth, todayDate - days - (days - 1));

  return {
    current: { start: currentStart, end: currentEnd, days },
    previous: { start: previousStart, end: previousEnd, days }
  };
}

/**
 * Checks whether a given post date falls strictly within a DateRange.
 */
export function isDateInRange(date: Date, range: DateRange | null): boolean {
  if (!range) return true;
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

/**
 * Formats a DateRange as "DD/MM/YYYY a DD/MM/YYYY (N dias)"
 */
export function formatDateRange(range: DateRange | null): string {
  if (!range) return 'Histórico Completo';
  const s = range.start.toLocaleDateString('pt-BR');
  const e = range.end.toLocaleDateString('pt-BR');
  const d = range.days;
  return `${s} a ${e} (${d} dia${d > 1 ? 's' : ''})`;
}

/**
 * Formats start and end dates only: "DD/MM/YYYY a DD/MM/YYYY"
 */
export function formatDateRangeSimple(range: DateRange | null): string {
  if (!range) return 'Histórico Completo';
  const s = range.start.toLocaleDateString('pt-BR');
  const e = range.end.toLocaleDateString('pt-BR');
  return `${s} a ${e}`;
}
