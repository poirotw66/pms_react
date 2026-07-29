/**
 * 資產保固期限
 *
 * 保固欄位過去是自由文字，可能是日期（2025-12-31）也可能是期間描述（3年、6個月）。
 * 期間描述無法被 new Date() 解析，舊的判斷會一律當成「保固中」，
 * 即使是五年前買的資產也顯示保固有效。
 *
 * 現在欄位改為日期選擇器，並提供把舊的期間描述換算成到期日的能力，
 * 讓既有資料在升級後仍然可用，而不是被丟棄或誤判。
 */

/** 保固即將到期的判定天數 */
export const WARRANTY_EXPIRING_DAYS = 30;

export type WarrantyStatus =
  | 'active'    // 保固中
  | 'expiring'  // 即將到期
  | 'expired'   // 已過期
  | 'unknown'   // 有填內容但無法判讀
  | 'none';     // 未填

export interface WarrantySource {
  purchaseDate?: string;
  warrantyPeriod?: string;
}

function startOfDay(value: Date | string): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** 是否為 YYYY-MM-DD 形式的日期字串 */
export function isDateString(value: string): boolean {
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(value.trim())) return false;
  return !Number.isNaN(new Date(value.trim()).getTime());
}

/**
 * 把期間描述換算成月數，無法辨識時回傳 null。
 * 支援：3年 / 3 年 / 1年半 / 6個月 / 6 個月 / 6月 / 半年
 */
export function parseWarrantyDurationMonths(value: string): number | null {
  const text = value.trim();
  if (!text) return null;

  if (/^半年$/.test(text)) return 6;

  // N年半
  const yearHalf = text.match(/^(\d+)\s*年半$/);
  if (yearHalf) return Number(yearHalf[1]) * 12 + 6;

  // N年 M個月
  const yearMonth = text.match(/^(\d+)\s*年\s*(\d+)\s*(?:個)?月$/);
  if (yearMonth) return Number(yearMonth[1]) * 12 + Number(yearMonth[2]);

  const years = text.match(/^(\d+)\s*年$/);
  if (years) return Number(years[1]) * 12;

  const months = text.match(/^(\d+)\s*(?:個)?月$/);
  if (months) return Number(months[1]);

  return null;
}

/** 由購買日與月數推算到期日 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetDay = result.getDate();
  result.setMonth(result.getMonth() + months);
  // 例如 1/31 加一個月，JS 會溢位到 3/2 或 3/3，收斂回當月最後一天
  if (result.getDate() < targetDay) {
    result.setDate(0);
  }
  return result;
}

/**
 * 解析出保固到期日。
 * 欄位本身是日期就直接採用；是期間描述則需搭配購買日換算；都不成立時回傳 null。
 */
export function resolveWarrantyEndDate(asset: WarrantySource): Date | null {
  const raw = (asset.warrantyPeriod || '').trim();
  if (!raw) return null;

  if (isDateString(raw)) {
    return startOfDay(raw);
  }

  const months = parseWarrantyDurationMonths(raw);
  if (months === null) return null;

  const purchase = (asset.purchaseDate || '').trim();
  if (!purchase || Number.isNaN(new Date(purchase).getTime())) return null;

  return startOfDay(addMonths(startOfDay(purchase), months));
}

/**
 * 升級用：把保固欄位正規化為 YYYY-MM-DD。
 * 無法換算的內容原樣保留，不丟棄使用者填過的資料。
 */
export function normalizeWarrantyPeriod(asset: WarrantySource): string {
  const raw = (asset.warrantyPeriod || '').trim();
  if (!raw || isDateString(raw)) return raw;

  const endDate = resolveWarrantyEndDate(asset);
  if (!endDate) return raw;

  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const day = String(endDate.getDate()).padStart(2, '0');
  return `${endDate.getFullYear()}-${month}-${day}`;
}

/** 保固狀態 */
export function getWarrantyStatus(asset: WarrantySource, referenceDate: Date = new Date()): WarrantyStatus {
  const raw = (asset.warrantyPeriod || '').trim();
  if (!raw) return 'none';

  const endDate = resolveWarrantyEndDate(asset);
  if (!endDate) return 'unknown';

  const today = startOfDay(referenceDate);
  if (endDate < today) return 'expired';

  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return daysLeft <= WARRANTY_EXPIRING_DAYS ? 'expiring' : 'active';
}
