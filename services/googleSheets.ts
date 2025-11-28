/**
 * Google Sheets API 服務
 * 
 * 使用方式：
 * 1. 部署 Google Apps Script 為 Web App
 * 2. 將 Web App URL 設定到 GOOGLE_SHEETS_API_URL
 */

// Google Apps Script Web App URL
// 請將此 URL 替換為您部署的 Web App URL
const GOOGLE_SHEETS_API_URL = localStorage.getItem('GOOGLE_SHEETS_API_URL') || '';

export type SheetName = 'tenants' | 'properties' | 'contracts' | 'repairRequests' | 'individualAssets' | 'potentialTenants';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  id?: string;
}

/**
 * 檢查是否已設定 Google Sheets API URL
 */
export function isGoogleSheetsConfigured(): boolean {
  return !!GOOGLE_SHEETS_API_URL;
}

/**
 * 設定 Google Sheets API URL
 */
export function setGoogleSheetsApiUrl(url: string): void {
  localStorage.setItem('GOOGLE_SHEETS_API_URL', url);
  window.location.reload();
}

/**
 * 取得 Google Sheets API URL
 */
export function getGoogleSheetsApiUrl(): string {
  return GOOGLE_SHEETS_API_URL;
}

/**
 * 清除 Google Sheets API URL (回到 localStorage 模式)
 */
export function clearGoogleSheetsApiUrl(): void {
  localStorage.removeItem('GOOGLE_SHEETS_API_URL');
  window.location.reload();
}

/**
 * 發送 GET 請求
 */
async function fetchGet<T>(params: Record<string, string>): Promise<ApiResponse<T>> {
  if (!GOOGLE_SHEETS_API_URL) {
    throw new Error('Google Sheets API URL 未設定');
  }
  
  const url = new URL(GOOGLE_SHEETS_API_URL);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    mode: 'cors',
  });
  
  return response.json();
}

/**
 * 發送 POST 請求
 */
async function fetchPost<T>(body: Record<string, any>): Promise<ApiResponse<T>> {
  if (!GOOGLE_SHEETS_API_URL) {
    throw new Error('Google Sheets API URL 未設定');
  }
  
  const response = await fetch(GOOGLE_SHEETS_API_URL, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain', // Google Apps Script 需要這個
    },
    body: JSON.stringify(body),
  });
  
  return response.json();
}

/**
 * 取得所有資料
 */
export async function getAllData<T>(): Promise<Record<SheetName, T[]>> {
  const response = await fetchGet<Record<SheetName, T[]>>({ action: 'getAll' });
  
  if (!response.success) {
    throw new Error(response.error || '取得資料失敗');
  }
  
  return response.data as Record<SheetName, T[]>;
}

/**
 * 取得特定工作表的所有資料
 */
export async function getSheetData<T>(sheetName: SheetName): Promise<T[]> {
  const response = await fetchGet<T[]>({ action: 'getAll', sheet: sheetName });
  
  if (!response.success) {
    throw new Error(response.error || '取得資料失敗');
  }
  
  return response.data || [];
}

/**
 * 建立新記錄
 */
export async function createRecord<T extends { id?: string }>(
  sheetName: SheetName, 
  record: T
): Promise<string> {
  const response = await fetchPost({
    action: 'create',
    sheet: sheetName,
    record: record,
  });
  
  if (!response.success) {
    throw new Error(response.error || '建立記錄失敗');
  }
  
  return response.id || '';
}

/**
 * 更新記錄
 */
export async function updateRecord<T extends { id: string }>(
  sheetName: SheetName, 
  record: T
): Promise<void> {
  const response = await fetchPost({
    action: 'update',
    sheet: sheetName,
    record: record,
  });
  
  if (!response.success) {
    throw new Error(response.error || '更新記錄失敗');
  }
}

/**
 * 刪除記錄
 */
export async function deleteRecord(sheetName: SheetName, id: string): Promise<void> {
  const response = await fetchPost({
    action: 'delete',
    sheet: sheetName,
    id: id,
  });
  
  if (!response.success) {
    throw new Error(response.error || '刪除記錄失敗');
  }
}

/**
 * 同步整個工作表的資料
 */
export async function syncSheet<T>(sheetName: SheetName, records: T[]): Promise<void> {
  const response = await fetchPost({
    action: 'sync',
    sheet: sheetName,
    records: records,
  });
  
  if (!response.success) {
    throw new Error(response.error || '同步資料失敗');
  }
}

/**
 * 批次同步所有工作表的資料
 */
export async function bulkSync(allData: Record<SheetName, any[]>): Promise<void> {
  const response = await fetchPost({
    action: 'bulkSync',
    allData: allData,
  });
  
  if (!response.success) {
    throw new Error(response.error || '批次同步失敗');
  }
}

/**
 * 從 localStorage 匯入資料到 Google Sheets
 */
export async function importFromLocalStorage(): Promise<void> {
  const localStorageKeys: Record<SheetName, string> = {
    tenants: 'tenants',
    properties: 'properties',
    contracts: 'contracts',
    repairRequests: 'repairRequests',
    individualAssets: 'individualAssets',
    potentialTenants: 'potentialTenants',
  };
  
  const allData: Record<string, any[]> = {};
  
  for (const [sheetName, localKey] of Object.entries(localStorageKeys)) {
    const localData = localStorage.getItem(localKey);
    if (localData) {
      try {
        allData[sheetName] = JSON.parse(localData);
      } catch {
        allData[sheetName] = [];
      }
    } else {
      allData[sheetName] = [];
    }
  }
  
  await bulkSync(allData as Record<SheetName, any[]>);
}

