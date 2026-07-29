/**
 * 資料關聯查詢
 *
 * 承租人與物件會被合約、報修紀錄、物件資產參照。
 * 刪除前必須先查出這些關聯，否則留下的紀錄會指向不存在的 ID，
 * 畫面上只會顯示 N/A，且無法還原是哪一位承租人或哪一個物件。
 */

import { Contract, TenantRepairRequest, IndividualAsset } from '../types.ts';

export interface ReferenceGroup {
  label: string;
  count: number;
  /** 供確認訊息列出的識別碼，最多取前幾筆 */
  samples: string[];
}

const SAMPLE_LIMIT = 3;

function toGroup(label: string, items: string[]): ReferenceGroup {
  return {
    label,
    count: items.length,
    samples: items.slice(0, SAMPLE_LIMIT),
  };
}

export interface TenantRelations {
  contracts: Contract[];
  repairRequests: TenantRepairRequest[];
}

/** 查出參照到此承租人的紀錄 */
export function findTenantReferences(tenantId: string, data: TenantRelations): ReferenceGroup[] {
  const groups: ReferenceGroup[] = [];

  const contracts = (data.contracts || []).filter(c => c.tenantId === tenantId);
  if (contracts.length > 0) {
    groups.push(toGroup('合約', contracts.map(c => c.contractInternalId || c.id)));
  }

  const repairs = (data.repairRequests || []).filter(r => r.tenantId === tenantId);
  if (repairs.length > 0) {
    groups.push(toGroup('報修紀錄', repairs.map(r => r.description || r.requestDate || r.id)));
  }

  return groups;
}

export interface PropertyRelations {
  contracts: Contract[];
  repairRequests: TenantRepairRequest[];
  individualAssets: IndividualAsset[];
}

/** 查出參照到此物件的紀錄 */
export function findPropertyReferences(propertyId: string, data: PropertyRelations): ReferenceGroup[] {
  const groups: ReferenceGroup[] = [];

  const contracts = (data.contracts || []).filter(c => c.propertyId === propertyId);
  if (contracts.length > 0) {
    groups.push(toGroup('合約', contracts.map(c => c.contractInternalId || c.id)));
  }

  const repairs = (data.repairRequests || []).filter(r => r.propertyId === propertyId);
  if (repairs.length > 0) {
    groups.push(toGroup('報修紀錄', repairs.map(r => r.description || r.requestDate || r.id)));
  }

  const assets = (data.individualAssets || []).filter(a => a.propertyId === propertyId);
  if (assets.length > 0) {
    groups.push(toGroup('物件資產', assets.map(a => a.nameBrandModel || a.id)));
  }

  return groups;
}

export function totalReferences(groups: ReferenceGroup[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0);
}

/**
 * 組出刪除確認訊息。
 * 沒有關聯時回傳單純的確認句，有關聯時列出會受影響的紀錄。
 */
export function buildDeleteConfirmMessage(
  subject: string,
  name: string,
  groups: ReferenceGroup[]
): string {
  if (groups.length === 0) {
    return `確定要刪除${subject}「${name}」嗎？`;
  }

  const details = groups
    .map(group => {
      const samples = group.samples.join('、');
      const suffix = group.count > group.samples.length ? ` 等 ${group.count} 筆` : '';
      return `• ${group.label} ${group.count} 筆：${samples}${suffix}`;
    })
    .join('\n');

  return (
    `「${name}」目前仍被以下紀錄參照：\n\n${details}\n\n` +
    `刪除後這些紀錄會找不到對應的${subject}，畫面上將顯示為 N/A，且無法自動還原。\n` +
    '建議先處理或刪除上列紀錄，再刪除此筆資料。\n\n' +
    '仍要繼續刪除嗎？'
  );
}
