/**
 * 資料備份 / 還原
 *
 * 這個模組刻意不依賴 React，ErrorBoundary 在應用崩潰時也能直接呼叫，
 * 把使用者存在瀏覽器裡的資料救出來。
 */

import { Tenant, Property, Contract, TenantRepairRequest, IndividualAsset, PotentialTenant } from '../types.ts';

export type DataKey =
  | 'tenants'
  | 'properties'
  | 'contracts'
  | 'repairRequests'
  | 'individualAssets'
  | 'potentialTenants';

export const DATA_KEYS: DataKey[] = [
  'tenants',
  'properties',
  'contracts',
  'repairRequests',
  'individualAssets',
  'potentialTenants',
];

/**
 * localStorage 的 key 名稱。
 * 這組值必須與舊版一致，任何更動都會讓使用者既有的資料讀不到。
 */
export const STORAGE_KEYS: Record<DataKey, string> = {
  tenants: 'tenants',
  properties: 'properties',
  contracts: 'contracts',
  repairRequests: 'repairRequests',
  individualAssets: 'individualAssets',
  potentialTenants: 'potentialTenants',
};

export const DATA_LABELS: Record<DataKey, string> = {
  tenants: '承租人',
  properties: '物件',
  contracts: '合約',
  repairRequests: '報修紀錄',
  individualAssets: '物件資產',
  potentialTenants: '潛在客戶',
};

export interface BackupData {
  tenants: Tenant[];
  properties: Property[];
  contracts: Contract[];
  repairRequests: TenantRepairRequest[];
  individualAssets: IndividualAsset[];
  potentialTenants: PotentialTenant[];
}

export const BACKUP_FORMAT = 'pms-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: string;
  data: BackupData;
}

export function emptyBackupData(): BackupData {
  return {
    tenants: [],
    properties: [],
    contracts: [],
    repairRequests: [],
    individualAssets: [],
    potentialTenants: [],
  };
}

function parseArray(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 直接從 localStorage 讀出所有資料（不做任何格式轉換），
 * 供備份匯出與崩潰救援使用。
 */
export function readAllFromLocalStorage(): BackupData {
  const result = emptyBackupData();
  DATA_KEYS.forEach(key => {
    try {
      (result as any)[key] = parseArray(localStorage.getItem(STORAGE_KEYS[key]));
    } catch (err) {
      console.error(`讀取本機資料失敗 (${key}):`, err);
    }
  });
  return result;
}

export function createBackupFile(data: BackupData): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function countRecords(data: BackupData): number {
  return DATA_KEYS.reduce((total, key) => total + (data[key]?.length || 0), 0);
}

function timestampForFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

/**
 * 觸發瀏覽器下載備份檔
 */
export function downloadBackup(data: BackupData, filenamePrefix: string = 'pms-backup'): void {
  const content = JSON.stringify(createBackupFile(data), null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}-${timestampForFilename()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 解析備份檔內容。
 *
 * 同時接受兩種格式，避免使用者手上的舊檔案無法還原：
 *   1. 本系統匯出的 { format, version, exportedAt, data: {...} }
 *   2. 直接是 { tenants: [], properties: [], ... } 的扁平物件
 *
 * 只挑出認得的欄位，缺少的資料表視為空陣列，不會因為多了未知欄位就整份拒絕。
 */
export function parseBackup(text: string): BackupData {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('檔案不是有效的 JSON 格式');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('備份檔內容格式不正確');
  }

  const source =
    parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
      ? parsed.data
      : parsed;

  const recognised = DATA_KEYS.filter(key => Array.isArray(source[key]));
  if (recognised.length === 0) {
    throw new Error('備份檔中找不到任何可辨識的資料表（tenants / properties / contracts ...）');
  }

  const result = emptyBackupData();
  recognised.forEach(key => {
    (result as any)[key] = source[key];
  });
  return result;
}

/**
 * 讀取使用者選擇的備份檔
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseBackup(String(reader.result ?? '')));
      } catch (err: any) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
}
