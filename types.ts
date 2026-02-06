
export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Tenant {
  id: string;
  name: string;
  idNumber: string;
  phone: string;
  workDetails: {
    job: string;
    company: string;
    position: string;
  };
  emergencyContact: EmergencyContact;
}

export interface PropertyRepairRecord {
  id: string;
  requestDate: string;
  itemDescription: string;
  vendorStaff: string;
  cost: number;
  completionDate: string;
  notes?: string;
}

export interface Property {
  id: string;
  propertyInternalId: string; // 2-1 物件編號
  address: string;
  sizeInPings: number;
  assetInventory: string[]; // 2-4 物件資產明細 (list of items)
  features: string; // 2-5 物件特色
  repairHistory: PropertyRepairRecord[]; // 2-6 物件維修紀錄
}

export enum PaymentCycle {
  ANNUALLY = '年繳',
  MONTHLY = '月繳',
  QUARTERLY = '季繳',
  SEMIANNUALLY = '半年繳',
}

export interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
  method: string; // e.g., 現金, 轉帳
  isConfirmed: boolean;
}

export interface AnnualPaymentSchedule {
  date: string; // Payment due date (YYYY-MM-DD)
  amount: number; // Payment amount for this date
}

export interface Contract {
  id: string;
  contractInternalId: string; // 3-1 合約編號
  propertyId: string; // Links to Property.id
  tenantId: string; // Links to Tenant.id
  startDate: string;
  endDate: string;
  rentAmount: number;
  paymentCycle: PaymentCycle;
  paymentRecords: PaymentRecord[];
  manualStatus?: string; // Manual status override (optional)
  annualDiscount?: boolean; // Annual payment discount (half month free)
  paymentDueDay?: number; // Payment due day (1-31) for monthly/quarterly/semi-annual cycles
  annualPaymentDates?: AnnualPaymentSchedule[]; // Payment schedule array for annual cycle (date + amount)
}

export enum RepairRequestStatus {
  PENDING = '待處理',
  IN_PROGRESS = '處理中',
  COMPLETED = '已結案',
}

export interface TenantRepairRequest {
  id: string;
  propertyId: string; // Links to Property.id
  tenantId: string; // Links to Tenant.id
  requestDate: string; // 4-1 報修日期
  description: string; // 4-2 報修內容
  status: RepairRequestStatus;
  resolutionDetails?: { // 4-3 結案方式
    method: string; // 修繕方式
    vendor?: string; // 修繕廠商/人員
    cost?: number; // 費用明細
    completionDate?: string; // 4-4 結案日期
    notes?: string;
  };
}

export interface IndividualAsset {
  id: string;
  propertyId: string; // Links to Property.id, for association
  purchaseDate: string; // 5-1 資產購買日期
  nameBrandModel: string; // 5-2 資產名稱/品牌/型號
  purchasePrice: number; // 5-3 資產購買價格
  vendorNamePhone: string; // 5-4 購買廠商/電話
  warrantyPeriod: string; // 5-5 資產保固期間 (e.g., "1年", "3個月")
}

export interface PotentialTenant {
  id: string;
  name: string; // 6-1 客戶姓名
  phone: string; // 6-2 客戶聯絡電話
  requirements: string; // 6-3 客戶需求
  workInfo: string; // 6-4 客戶工作內容
  expectedMoveInDate?: string;
  viewingNotes?: string;
  trackingStatus?: string; // e.g., '已聯繫', '已看房'
}

export type ManagedDataType = Tenant | Property | Contract | TenantRepairRequest | IndividualAsset | PotentialTenant;

// Re-export Page enum from constants.tsx for use in other type definitions if needed, or ensure Page is correctly imported where used.
// For HomePageProps, it will import Page from constants.tsx directly.
// However, to make `Page` available as a type for props in other files if defined in `types.ts`:
export enum Page {
  HOME = '首頁',
  TENANTS = '承租人管理',
  PROPERTIES = '物件管理',
  CONTRACTS = '合約管理',
  REPAIR_REQUESTS = '承租人報修管理',
  PROPERTY_ASSETS = '物件資產管理',
  POTENTIAL_TENANTS = '潛在客戶管理',
}