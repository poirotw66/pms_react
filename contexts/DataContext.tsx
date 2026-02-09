import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Tenant, Property, Contract, TenantRepairRequest, IndividualAsset, PotentialTenant } from '../types.ts';
import * as googleSheets from '../services/googleSheets.ts';
import { convertAssetInventory } from '../constants.tsx';

// 資料狀態類型
interface DataState {
  tenants: Tenant[];
  properties: Property[];
  contracts: Contract[];
  repairRequests: TenantRepairRequest[];
  individualAssets: IndividualAsset[];
  potentialTenants: PotentialTenant[];
}

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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// localStorage 操作
const localStorageKeys = {
  tenants: 'tenants',
  properties: 'properties',
  contracts: 'contracts',
  repairRequests: 'repairRequests',
  individualAssets: 'individualAssets',
  potentialTenants: 'potentialTenants',
};

function loadFromLocalStorage(): DataState {
  const loadItem = <T,>(key: string, defaultValue: T[]): T[] => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const properties = loadItem<Property>(localStorageKeys.properties, []);

  // Convert old format assetInventory to new format
  const convertedProperties = properties.map(property => {
    if (property.assetInventory && property.assetInventory.length > 0) {
      // Check if conversion is needed (contains items with separators like ".")
      const needsConversion = property.assetInventory.some(item =>
        typeof item === 'string' && (item.includes('.') || item.includes(',') || item.includes('、'))
      );

      if (needsConversion) {
        const converted = convertAssetInventory(property.assetInventory);
        return { ...property, assetInventory: converted };
      }
    }
    return property;
  });

  // Save converted properties back if conversion happened
  if (convertedProperties.length > 0 && JSON.stringify(properties) !== JSON.stringify(convertedProperties)) {
    try {
      localStorage.setItem(localStorageKeys.properties, JSON.stringify(convertedProperties));
    } catch (err) {
      console.warn('Failed to save converted properties:', err);
    }
  }

  return {
    tenants: loadItem<Tenant>(localStorageKeys.tenants, []),
    properties: convertedProperties,
    contracts: loadItem<Contract>(localStorageKeys.contracts, []),
    repairRequests: loadItem<TenantRepairRequest>(localStorageKeys.repairRequests, []),
    individualAssets: loadItem<IndividualAsset>(localStorageKeys.individualAssets, []),
    potentialTenants: loadItem<PotentialTenant>(localStorageKeys.potentialTenants, []),
  };
}

function saveToLocalStorage(key: string, data: any[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Provider 元件
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DataState>(() => loadFromLocalStorage());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageMode] = useState<'localStorage' | 'googleSheets'>(
    googleSheets.isGoogleSheetsConfigured() ? 'googleSheets' : 'localStorage'
  );

  // 初始載入
  useEffect(() => {
    if (storageMode === 'googleSheets') {
      loadFromGoogleSheets();
    }
  }, [storageMode]);

  // 從 Google Sheets 載入資料
  const loadFromGoogleSheets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sheetsData = await googleSheets.getAllData<any>();

      // Convert old format assetInventory to new format for properties
      const properties = (sheetsData.properties || []).map((property: Property) => {
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

      setData({
        tenants: sheetsData.tenants || [],
        properties: properties,
        contracts: sheetsData.contracts || [],
        repairRequests: sheetsData.repairRequests || [],
        individualAssets: sheetsData.individualAssets || [],
        potentialTenants: sheetsData.potentialTenants || [],
      });
    } catch (err: any) {
      setError(err.message || '載入資料失敗');
      console.error('載入 Google Sheets 資料失敗:', err);
      // 如果失敗，回退到 localStorage
      setData(loadFromLocalStorage());
    } finally {
      setIsLoading(false);
    }
  };

  // 通用的資料更新函數
  const updateData = useCallback(async <K extends keyof DataState>(
    key: K,
    updater: DataState[K] | ((prev: DataState[K]) => DataState[K])
  ) => {
    setData(prevData => {
      const newValue = typeof updater === 'function'
        ? (updater as (prev: DataState[K]) => DataState[K])(prevData[key])
        : updater;

      const newData = { ...prevData, [key]: newValue };

      // 同步儲存
      if (storageMode === 'localStorage') {
        saveToLocalStorage(localStorageKeys[key], newValue as any[]);
      } else {
        // Google Sheets 非同步儲存（使用 setTimeout 避免阻塞 UI）
        setTimeout(() => {
          googleSheets.syncSheet(key as googleSheets.SheetName, newValue as any[])
            .catch(err => {
              console.error(`同步 ${key} 到 Google Sheets 失敗:`, err);
              // 使用 setTimeout 避免在錯誤處理時阻塞 UI
              setTimeout(() => {
                const errorMessage = err.message || '未知錯誤';
                // 只在重要錯誤時顯示給用戶，避免過多錯誤訊息
                if (!errorMessage.includes('CORS') && !errorMessage.includes('Failed to fetch')) {
                  setError(`同步 ${key} 失敗: ${errorMessage}`);
                } else {
                  // CORS 錯誤通常只需要在控制台記錄，不需要一直顯示給用戶
                  console.warn('Google Sheets 連線問題，資料已儲存在本地，請檢查設定');
                }
              }, 0);
            });
        }, 0);
      }

      return newData;
    });
  }, [storageMode]);

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
  }, []);

  // 重新載入資料
  const refreshData = useCallback(async () => {
    if (storageMode === 'googleSheets') {
      await loadFromGoogleSheets();
    } else {
      setData(loadFromLocalStorage());
    }
  }, [storageMode]);

  const contextValue: DataContextType = {
    data,
    isLoading,
    error,
    storageMode,
    isGoogleSheetsConfigured: googleSheets.isGoogleSheetsConfigured(),
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

