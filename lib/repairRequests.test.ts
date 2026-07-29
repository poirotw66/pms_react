import { describe, it, expect } from 'vitest';
import { hasResolutionContent } from './repairRequests.ts';

describe('hasResolutionContent', () => {
  it('未填結案資料時為 false', () => {
    expect(hasResolutionContent(undefined)).toBe(false);
    expect(hasResolutionContent({ method: '' })).toBe(false);
    expect(hasResolutionContent({ method: '   ' })).toBe(false);
  });

  it('任一欄位有內容即為 true', () => {
    expect(hasResolutionContent({ method: '更換水龍頭' })).toBe(true);
    expect(hasResolutionContent({ method: '', vendor: 'XXX水電行' })).toBe(true);
    expect(hasResolutionContent({ method: '', completionDate: '2026-01-15' })).toBe(true);
    expect(hasResolutionContent({ method: '', notes: '已通知承租人' })).toBe(true);
  });

  it('費用為 0 也算有內容（0 是有效的免費維修紀錄）', () => {
    expect(hasResolutionContent({ method: '', cost: 0 })).toBe(true);
  });

  it('費用為 undefined 或 NaN 不算內容', () => {
    expect(hasResolutionContent({ method: '', cost: undefined })).toBe(false);
    expect(hasResolutionContent({ method: '', cost: NaN })).toBe(false);
  });
});
