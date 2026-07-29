import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Tenant, Property, Contract, TenantRepairRequest, IndividualAsset, PotentialTenant } from '../types.ts';
import * as googleSheets from '../services/googleSheets.ts';
import {
  BackupData,
  DataKey,
  DATA_KEYS,
  DATA_LABELS,
  STORAGE_KEYS,
  downloadBackup,
  emptyBackupData,
} from '../services/backup.ts';
import { convertAssetInventory } from '../constants.tsx';

// 資料狀態類型
type DataState = BackupData;

// Context 類型
interface DataContextType {
  // 資料
  data: DataState;

  // 載入狀態
  isLoading: boolean;
  error: string | null;

  // 儲存模式
  storageMode: 'localStorage' | 'googleSheets';
  isGoogleSheetsConfigured: boolean;

  // 尚未成功同步到 Google Sheets 的資料表（僅雲端模式會有值）
  pendingSyncKeys: DataKey[];

  // 操作函數
  setTenants: (tenants: Tenant[] | ((prev: Tenant[]) => Tenant[])) => Promise<void>;
  setProperties: (properties: Property[] | ((prev: Property[]) => Property[])) => Promise<void>;
  setContracts: (contracts: Contract[] | ((prev: Contract[]) => Contract[])) => Promise<void>;
  setRepairRequests: (requests: TenantRepairRequest[] | ((prev: TenantRepairRequest[]) => TenantRepairRequest[])) => Promise<void>;
  setIndividualAssets: (assets: IndividualAsset[] | ((prev: IndividualAsset[]) => IndividualAsset[])) => Promise<void>;
  setPotentialTenants: (tenants: PotentialTenant[] | ((prev: PotentialTenant[]) => PotentialTenant[])) => Promise<void>;

  // 配置函數
  configureGoogleSheets: (apiUrl: string) => void;
  disconnectGoogleSheets: () => void;
  importToGoogleSheets: () => Promise<void>;
  refreshData: () => Promise<void>;
  retrySync: () => Promise<void>;

  // 備份 / 還原
  exportBackup: () => void;
  restoreBackup: (backup: BackupData) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// localStorage key 沿用 services/backup.ts 的定義，確保與舊版資料相容
const localStorageKeys = STORAGE_KEYS;

/**
 * 將舊格式的 assetInventory（以 "."、","、"、" 分隔的字串）轉成新的陣列格式。
 * 舊資料一律走這個函式，確保升級後仍讀得到。
 */
function normalizeProperties(properties: Property[]): Property[] {
  return (properties || []).map(property => {
    if (property.assetInventory && property.assetInventory.length > 0) {
      // Check if conversion is needed (contains items with separators like ".")
      const needsConversion = property.assetInventory.some((item: string) =>
        typeof item === 'string' && (item.includes('.') || item.includes(',') || item.includes('、'))
      );

      if (needsConversion) {
        const converted = convertAssetInventory(property.assetInventory);
        return { ...property, assetInventory: converted };
      }
    }
    return property;
  });
}

/**
 * 寫入 localStorage，回傳錯誤訊息（成功時為 null）。
 * 儲存空間滿了或瀏覽器停用儲存時不能讓例外往上炸掉整個畫面。
 */
function writeLocal(key: DataKey, value: unknown[]): string | null {
  try {
    localStorage.setItem(localStorageKeys[key], JSON.stringify(value));
    return null;
  } catch (err: any) {
    console.error(`寫入本機儲存失敗 (${key}):`, err);
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22;

    return isQuotaError
      ? `本機儲存空間已滿，「${DATA_LABELS[key]}」的變更未能存檔。請先到「系統設定」匯出備份，再清理不需要的資料。`
      : `本機儲存寫入失敗（${DATA_LABELS[key]}）：${err?.message || '未知錯誤'}`;
  }
}

function loadFromLocalStorage(): DataState {
  const loadItem = <T,>(key: DataKey): T[] => {
    try {
      const item = localStorage.getItem(localStorageKeys[key]);
      if (!item) return [];
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const properties = loadItem<Property>('properties');
  const convertedProperties = normalizeProperties(properties);

  // Save converted properties back if conversion happened
  if (convertedProperties.length > 0 && JSON.stringify(properties) !== JSON.stringify(convertedProperties)) {
    writeLocal('properties', convertedProperties);
  }

  return {
    tenants: loadItem<Tenant>('tenants'),
    properties: convertedProperties,
    contracts: loadItem<Contract>('contracts'),
    repairRequests: loadItem<TenantRepairRequest>('repairRequests'),
    individualAssets: loadItem<IndividualAsset>('individualAssets'),
    potentialTenants: loadItem<PotentialTenant>('potentialTenants'),
  };
}

// Provider 元件
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DataState>(() => loadFromLocalStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSyncKeys, setPendingSyncKeys] = useState<DataKey[]>([]);
  const [storageMode] = useState<'localStorage' | 'googleSheets'>(
    googleSheets.isGoogleSheetsConfigured() ? 'googleSheets' : 'localStorage'
  );

  // dataRef 與 state 同步更新，讓 updateData 能在同一個 tick 內連續呼叫時
  // 仍讀得到最新資料，同時避免把副作用寫在 setState 的 updater 裡。
  const dataRef = useRef<DataState>(data);
  const pendingRef = useRef<Set<DataKey>>(new Set());

  const applyData = useCallback((next: DataState) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const commitPending = useCallback(() => {
    setPendingSyncKeys(Array.from(pendingRef.current));
  }, []);

  // 從 Google Sheets 載入資料
  const loadFromGoogleSheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sheetsData = await googleSheets.getAllData<any>();

      const nextState: DataState = {
        tenants: sheetsData.tenants || [],
        properties: normalizeProperties(sheetsData.properties || []),
        contracts: sheetsData.contracts || [],
        repairRequests: sheetsData.repairRequests || [],
        individualAssets: sheetsData.individualAssets || [],
        potentialTenants: sheetsData.potentialTenants || [],
      };

      applyData(nextState);

      // 更新本機快取：雲端載入失敗或離線時，這份副本就是後備資料
      DATA_KEYS.forEach(key => writeLocal(key, nextState[key]));

      // 雲端資料已成為最新狀態，先前未同步的標記不再適用
      pendingRef.current.clear();
      commitPending();
    } catch (err: any) {
      setError(err.message || '載入資料失敗');
      console.error('載入 Google Sheets 資料失敗:', err);
      // 如果失敗，回退到 localStorage 的離線副本
      applyData(loadFromLocalStorage());
    } finally {
      setIsLoading(false);
    }
  }, [applyData, commitPending]);

  // 初始載入
  useEffect(() => {
    if (storageMode === 'googleSheets') {
      loadFromGoogleSheets();
    }
  }, [storageMode, loadFromGoogleSheets]);

  /**
   * 同步單一資料表到 Google Sheets。
   * 這個函式不會 reject —— 失敗時改為標記待同步並顯示訊息，
   * 因為資料在此之前已經寫進 localStorage，不會遺失。
   */
  const syncKeyToSheets = useCallback(async (key: DataKey, records: any[]) => {
    try {
      await googleSheets.syncSheet(key as googleSheets.SheetName, records);
      pendingRef.current.delete(key);
      commitPending();
      if (pendingRef.current.size === 0) {
        setError(null);
      }
    } catch (err: any) {
      console.error(`同步 ${key} 到 Google Sheets 失敗:`, err);
      pendingRef.current.add(key);
      commitPending();
      setError(
        `「${DATA_LABELS[key]}」尚未同步到 Google Sheets，變更已暫存在本機瀏覽器。` +
        `請檢查網路或設定後按「重試同步」。原因：${err?.message || '未知錯誤'}`
      );
    }
  }, [commitPending]);

  // 通用的資料更新函數
  const updateData = useCallback(async <K extends DataKey>(
    key: K,
    updater: DataState[K] | ((prev: DataState[K]) => DataState[K])
  ) => {
    const prevValue = dataRef.current[key];
    const newValue = typeof updater === 'function'
      ? (updater as (prev: DataState[K]) => DataState[K])(prevValue)
      : updater;

    applyData({ ...dataRef.current, [key]: newValue });

    // 兩種模式都先寫本機：雲端模式下這份就是同步失敗時的救援副本
    const localError = writeLocal(key, newValue as unknown[]);
    if (localError) {
      setError(localError);
    }

    if (storageMode === 'googleSheets') {
      // 不阻塞 UI，同步結果透過 pendingSyncKeys / error 呈現
      void syncKeyToSheets(key, newValue as any[]);
    }
  }, [storageMode, applyData, syncKeyToSheets]);

  // 各資料類型的 setter
  const setTenants = useCallback(
    (tenants: Tenant[] | ((prev: Tenant[]) => Tenant[])) => updateData('tenants', tenants),
    [updateData]
  );

  const setProperties = useCallback(
    (properties: Property[] | ((prev: Property[]) => Property[])) => updateData('properties', properties),
    [updateData]
  );

  const setContracts = useCallback(
    (contracts: Contract[] | ((prev: Contract[]) => Contract[])) => updateData('contracts', contracts),
    [updateData]
  );

  const setRepairRequests = useCallback(
    (requests: TenantRepairRequest[] | ((prev: TenantRepairRequest[]) => TenantRepairRequest[])) =>
      updateData('repairRequests', requests),
    [updateData]
  );

  const setIndividualAssets = useCallback(
    (assets: IndividualAsset[] | ((prev: IndividualAsset[]) => IndividualAsset[])) =>
      updateData('individualAssets', assets),
    [updateData]
  );

  const setPotentialTenants = useCallback(
    (tenants: PotentialTenant[] | ((prev: PotentialTenant[]) => PotentialTenant[])) =>
      updateData('potentialTenants', tenants),
    [updateData]
  );

  // 配置 Google Sheets
  const configureGoogleSheets = useCallback((apiUrl: string) => {
    googleSheets.setGoogleSheetsApiUrl(apiUrl);
  }, []);

  // 斷開 Google Sheets
  const disconnectGoogleSheets = useCallback(() => {
    googleSheets.clearGoogleSheetsApiUrl();
  }, []);

  // 匯入到 Google Sheets
  const importToGoogleSheets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await googleSheets.importFromLocalStorage();
      await loadFromGoogleSheets();
    } catch (err: any) {
      setError(err.message || '匯入失敗');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadFromGoogleSheets]);

  // 重新載入資料
  const refreshData = useCallback(async () => {
    if (storageMode === 'googleSheets') {
      if (pendingRef.current.size > 0) {
        const names = Array.from(pendingRef.current).map(key => DATA_LABELS[key]).join('、');
        const confirmed = window.confirm(
          `以下資料尚未同步到 Google Sheets：${names}。\n\n` +
          '重新載入會以雲端資料覆蓋這些本機變更，確定要繼續嗎？\n' +
          '（若要保留本機變更，請先取消並按「重試同步」）'
        );
        if (!confirmed) return;
      }
      await loadFromGoogleSheets();
    } else {
      applyData(loadFromLocalStorage());
    }
  }, [storageMode, loadFromGoogleSheets, applyData]);

  // 重試尚未同步成功的資料表
  const retrySync = useCallback(async () => {
    if (storageMode !== 'googleSheets') return;

    const keys = Array.from(pendingRef.current);
    if (keys.length === 0) return;

    setIsLoading(true);
    try {
      for (const key of keys) {
        await syncKeyToSheets(key, dataRef.current[key] as any[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, syncKeyToSheets]);

  // 匯出備份檔
  const exportBackup = useCallback(() => {
    downloadBackup(dataRef.current);
  }, []);

  // 還原備份檔（覆蓋目前所有資料）
  const restoreBackup = useCallback(async (backup: BackupData) => {
    const nextState: DataState = {
      ...emptyBackupData(),
      ...backup,
      properties: normalizeProperties(backup.properties || []),
    };

    applyData(nextState);

    const writeErrors = DATA_KEYS
      .map(key => writeLocal(key, nextState[key]))
      .filter((msg): msg is string => msg !== null);

    if (writeErrors.length > 0) {
      setError(writeErrors[0]);
      throw new Error(writeErrors[0]);
    }

    setError(null);

    if (storageMode === 'googleSheets') {
      setIsLoading(true);
      try {
        await googleSheets.bulkSync(nextState as unknown as Record<googleSheets.SheetName, any[]>);
        pendingRef.current.clear();
        commitPending();
      } catch (err: any) {
        DATA_KEYS.forEach(key => pendingRef.current.add(key));
        commitPending();
        const message =
          `備份已還原到本機，但同步到 Google Sheets 失敗，請按「重試同步」。原因：${err?.message || '未知錯誤'}`;
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [storageMode, applyData, commitPending]);

  const contextValue: DataContextType = {
    data,
    isLoading,
    error,
    storageMode,
    isGoogleSheetsConfigured: googleSheets.isGoogleSheetsConfigured(),
    pendingSyncKeys,
    setTenants,
    setProperties,
    setContracts,
    setRepairRequests,
    setIndividualAssets,
    setPotentialTenants,
    configureGoogleSheets,
    disconnectGoogleSheets,
    importToGoogleSheets,
    refreshData,
    retrySync,
    exportBackup,
    restoreBackup,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Hook for using data context
export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// 便利 hooks for specific data types
export function useTenants(): [Tenant[], (tenants: Tenant[] | ((prev: Tenant[]) => Tenant[])) => Promise<void>] {
  const { data, setTenants } = useData();
  return [data.tenants, setTenants];
}

export function useProperties(): [Property[], (properties: Property[] | ((prev: Property[]) => Property[])) => Promise<void>] {
  const { data, setProperties } = useData();
  return [data.properties, setProperties];
}

export function useContracts(): [Contract[], (contracts: Contract[] | ((prev: Contract[]) => Contract[])) => Promise<void>] {
  const { data, setContracts } = useData();
  return [data.contracts, setContracts];
}

export function useRepairRequests(): [TenantRepairRequest[], (requests: TenantRepairRequest[] | ((prev: TenantRepairRequest[]) => TenantRepairRequest[])) => Promise<void>] {
  const { data, setRepairRequests } = useData();
  return [data.repairRequests, setRepairRequests];
}

export function useIndividualAssets(): [IndividualAsset[], (assets: IndividualAsset[] | ((prev: IndividualAsset[]) => IndividualAsset[])) => Promise<void>] {
  const { data, setIndividualAssets } = useData();
  return [data.individualAssets, setIndividualAssets];
}

export function usePotentialTenants(): [PotentialTenant[], (tenants: PotentialTenant[] | ((prev: PotentialTenant[]) => PotentialTenant[])) => Promise<void>] {
  const { data, setPotentialTenants } = useData();
  return [data.potentialTenants, setPotentialTenants];
}
