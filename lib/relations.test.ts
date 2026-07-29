import { describe, it, expect } from 'vitest';
import { Contract, PaymentCycle, TenantRepairRequest, IndividualAsset, RepairRequestStatus } from '../types.ts';
import {
  findTenantReferences,
  findPropertyReferences,
  totalReferences,
  buildDeleteConfirmMessage,
} from './relations.ts';

const contract = (id: string, tenantId: string, propertyId: string): Contract => ({
  id,
  contractInternalId: `C-${id}`,
  propertyId,
  tenantId,
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  rentAmount: 10000,
  paymentCycle: PaymentCycle.MONTHLY,
  paymentRecords: [],
});

const repair = (id: string, tenantId: string, propertyId: string): TenantRepairRequest => ({
  id,
  propertyId,
  tenantId,
  requestDate: '2025-02-01',
  description: `修繕-${id}`,
  status: RepairRequestStatus.PENDING,
});

const asset = (id: string, propertyId: string): IndividualAsset => ({
  id,
  propertyId,
  purchaseDate: '2024-01-01',
  nameBrandModel: `資產-${id}`,
  purchasePrice: 1000,
  vendorNamePhone: '',
  warrantyPeriod: '',
});

describe('findTenantReferences', () => {
  it('沒有任何關聯時回傳空陣列', () => {
    const groups = findTenantReferences('t1', { contracts: [], repairRequests: [] });
    expect(groups).toEqual([]);
    expect(totalReferences(groups)).toBe(0);
  });

  it('列出參照到該承租人的合約與報修紀錄', () => {
    const groups = findTenantReferences('t1', {
      contracts: [contract('a', 't1', 'p1'), contract('b', 't2', 'p1')],
      repairRequests: [repair('r1', 't1', 'p1')],
    });

    expect(groups.map(g => [g.label, g.count])).toEqual([['合約', 1], ['報修紀錄', 1]]);
    expect(totalReferences(groups)).toBe(2);
  });

  it('不會把其他承租人的紀錄算進來', () => {
    const groups = findTenantReferences('t9', {
      contracts: [contract('a', 't1', 'p1')],
      repairRequests: [repair('r1', 't2', 'p1')],
    });
    expect(groups).toEqual([]);
  });

  it('樣本最多列出 3 筆', () => {
    const contracts = ['a', 'b', 'c', 'd', 'e'].map(id => contract(id, 't1', 'p1'));
    const groups = findTenantReferences('t1', { contracts, repairRequests: [] });

    expect(groups[0].count).toBe(5);
    expect(groups[0].samples).toHaveLength(3);
  });
});

describe('findPropertyReferences', () => {
  it('列出合約、報修紀錄與物件資產', () => {
    const groups = findPropertyReferences('p1', {
      contracts: [contract('a', 't1', 'p1')],
      repairRequests: [repair('r1', 't1', 'p1'), repair('r2', 't1', 'p1')],
      individualAssets: [asset('s1', 'p1'), asset('s2', 'p2')],
    });

    expect(groups.map(g => [g.label, g.count])).toEqual([
      ['合約', 1],
      ['報修紀錄', 2],
      ['物件資產', 1],
    ]);
    expect(totalReferences(groups)).toBe(4);
  });

  it('資料缺漏時不拋錯', () => {
    const groups = findPropertyReferences('p1', {
      contracts: undefined as any,
      repairRequests: undefined as any,
      individualAssets: undefined as any,
    });
    expect(groups).toEqual([]);
  });
});

describe('buildDeleteConfirmMessage', () => {
  it('沒有關聯時只顯示單純的確認句', () => {
    const message = buildDeleteConfirmMessage('承租人', '王大明', []);
    expect(message).toBe('確定要刪除承租人「王大明」嗎？');
  });

  it('有關聯時列出受影響的紀錄與後果', () => {
    const groups = findTenantReferences('t1', {
      contracts: [contract('a', 't1', 'p1')],
      repairRequests: [repair('r1', 't1', 'p1')],
    });
    const message = buildDeleteConfirmMessage('承租人', '王大明', groups);

    expect(message).toContain('王大明');
    expect(message).toContain('合約 1 筆');
    expect(message).toContain('報修紀錄 1 筆');
    expect(message).toContain('N/A');
    expect(message).toContain('仍要繼續刪除嗎？');
  });

  it('筆數多於樣本時標示「等 N 筆」', () => {
    const contracts = ['a', 'b', 'c', 'd', 'e'].map(id => contract(id, 't1', 'p1'));
    const groups = findTenantReferences('t1', { contracts, repairRequests: [] });
    const message = buildDeleteConfirmMessage('承租人', '王大明', groups);

    expect(message).toContain('等 5 筆');
  });
});
