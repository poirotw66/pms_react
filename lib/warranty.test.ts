import { describe, it, expect } from 'vitest';
import {
  isDateString,
  parseWarrantyDurationMonths,
  addMonths,
  resolveWarrantyEndDate,
  normalizeWarrantyPeriod,
  getWarrantyStatus,
} from './warranty.ts';

const d = (iso: string) => new Date(iso);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe('isDateString', () => {
  it('辨識 YYYY-MM-DD', () => {
    expect(isDateString('2025-12-31')).toBe(true);
    expect(isDateString(' 2025-1-5 ')).toBe(true);
  });

  it('期間描述與空值不算日期', () => {
    expect(isDateString('3年')).toBe(false);
    expect(isDateString('')).toBe(false);
    expect(isDateString('2025/12/31')).toBe(false);
    expect(isDateString('2025-13-45')).toBe(false);
  });
});

describe('parseWarrantyDurationMonths', () => {
  it('換算年', () => {
    expect(parseWarrantyDurationMonths('3年')).toBe(36);
    expect(parseWarrantyDurationMonths('1 年')).toBe(12);
  });

  it('換算月', () => {
    expect(parseWarrantyDurationMonths('6個月')).toBe(6);
    expect(parseWarrantyDurationMonths('18 個月')).toBe(18);
    expect(parseWarrantyDurationMonths('3月')).toBe(3);
  });

  it('換算混合寫法', () => {
    expect(parseWarrantyDurationMonths('半年')).toBe(6);
    expect(parseWarrantyDurationMonths('1年半')).toBe(18);
    expect(parseWarrantyDurationMonths('2年6個月')).toBe(30);
  });

  it('無法辨識時回傳 null', () => {
    expect(parseWarrantyDurationMonths('終身保固')).toBeNull();
    expect(parseWarrantyDurationMonths('')).toBeNull();
    expect(parseWarrantyDurationMonths('2025-12-31')).toBeNull();
  });
});

describe('addMonths', () => {
  it('一般情況', () => {
    expect(iso(addMonths(d('2024-05-01'), 36))).toBe('2027-05-01');
  });

  it('月底不會溢位到下個月', () => {
    expect(iso(addMonths(d('2024-01-31'), 1))).toBe('2024-02-29'); // 閏年
    expect(iso(addMonths(d('2025-01-31'), 1))).toBe('2025-02-28');
    expect(iso(addMonths(d('2025-03-31'), 1))).toBe('2025-04-30');
  });
});

describe('resolveWarrantyEndDate', () => {
  it('欄位本身是日期時直接採用', () => {
    const end = resolveWarrantyEndDate({ purchaseDate: '2024-05-01', warrantyPeriod: '2026-01-15' });
    expect(iso(end!)).toBe('2026-01-15');
  });

  it('期間描述搭配購買日換算', () => {
    const end = resolveWarrantyEndDate({ purchaseDate: '2024-05-01', warrantyPeriod: '3年' });
    expect(iso(end!)).toBe('2027-05-01');
  });

  it('缺少購買日時無法換算', () => {
    expect(resolveWarrantyEndDate({ warrantyPeriod: '3年' })).toBeNull();
    expect(resolveWarrantyEndDate({ purchaseDate: '', warrantyPeriod: '3年' })).toBeNull();
  });

  it('無法辨識的內容回傳 null', () => {
    expect(resolveWarrantyEndDate({ purchaseDate: '2024-05-01', warrantyPeriod: '終身保固' })).toBeNull();
  });

  it('未填保固回傳 null', () => {
    expect(resolveWarrantyEndDate({ purchaseDate: '2024-05-01', warrantyPeriod: '' })).toBeNull();
  });
});

describe('normalizeWarrantyPeriod（舊資料遷移）', () => {
  it('期間描述換算成到期日', () => {
    expect(normalizeWarrantyPeriod({ purchaseDate: '2024-05-01', warrantyPeriod: '3年' })).toBe('2027-05-01');
    expect(normalizeWarrantyPeriod({ purchaseDate: '2024-05-01', warrantyPeriod: '6個月' })).toBe('2024-11-01');
  });

  it('已是日期時保持不變', () => {
    expect(normalizeWarrantyPeriod({ purchaseDate: '2024-05-01', warrantyPeriod: '2026-01-15' })).toBe('2026-01-15');
  });

  it('無法換算時原樣保留，不丟棄使用者填過的內容', () => {
    expect(normalizeWarrantyPeriod({ purchaseDate: '2024-05-01', warrantyPeriod: '終身保固' })).toBe('終身保固');
    expect(normalizeWarrantyPeriod({ warrantyPeriod: '3年' })).toBe('3年');
  });

  it('空值維持空值', () => {
    expect(normalizeWarrantyPeriod({ purchaseDate: '2024-05-01', warrantyPeriod: '' })).toBe('');
    expect(normalizeWarrantyPeriod({})).toBe('');
  });
});

describe('getWarrantyStatus', () => {
  it('未填保固為 none', () => {
    expect(getWarrantyStatus({ purchaseDate: '2024-05-01' }, d('2026-01-01'))).toBe('none');
  });

  it('到期日在未來為 active', () => {
    expect(getWarrantyStatus({ warrantyPeriod: '2026-12-31' }, d('2026-01-01'))).toBe('active');
  });

  it('30 天內到期為 expiring', () => {
    expect(getWarrantyStatus({ warrantyPeriod: '2026-01-20' }, d('2026-01-01'))).toBe('expiring');
  });

  it('已過期為 expired', () => {
    expect(getWarrantyStatus({ warrantyPeriod: '2025-12-31' }, d('2026-01-01'))).toBe('expired');
  });

  it('期間描述會搭配購買日正確判斷過期（修正前一律顯示保固中）', () => {
    const asset = { purchaseDate: '2020-05-01', warrantyPeriod: '3年' };
    expect(getWarrantyStatus(asset, d('2026-01-01'))).toBe('expired');
  });

  it('期間描述仍在保固內時為 active', () => {
    const asset = { purchaseDate: '2024-05-01', warrantyPeriod: '3年' };
    expect(getWarrantyStatus(asset, d('2026-01-01'))).toBe('active');
  });

  it('無法判讀時為 unknown，不再誤報為保固中', () => {
    expect(getWarrantyStatus({ purchaseDate: '2020-05-01', warrantyPeriod: '終身保固' }, d('2026-01-01'))).toBe('unknown');
    expect(getWarrantyStatus({ warrantyPeriod: '3年' }, d('2026-01-01'))).toBe('unknown');
  });
});
