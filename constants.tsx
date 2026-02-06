import React from 'react';
import { Tenant, Property, Contract, TenantRepairRequest, IndividualAsset, PotentialTenant, PaymentCycle, RepairRequestStatus, EmergencyContact } from './types.ts';

// Export enums that might be needed by other components if not already.
export { PaymentCycle, RepairRequestStatus };


export enum Page {
  HOME = '首頁', // Added Home page
  TENANTS = '承租人管理',
  PROPERTIES = '物件管理',
  CONTRACTS = '合約管理',
  REPAIR_REQUESTS = '承租人報修管理',
  PROPERTY_ASSETS = '物件資產管理',
  POTENTIAL_TENANTS = '潛在客戶管理',
}

// SVG Icons - Ensure all icons are functional React components
export const HomeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24",
    strokeWidth: 1.5,
    stroke: "currentColor",
    ...props
  },
  React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    d: "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5"
  })
  )
);

export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // For Tenants
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" })
  )
);

export const BuildingOfficeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // For Properties
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6.75h1.5m-1.5 3h1.5m-1.5 3h1.5M6.75 21v-2.25a2.25 2.25 0 0 1 2.25-2.25h3a2.25 2.25 0 0 1 2.25 2.25V21m-8.25 0H18M6.75 3.75h10.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5h-10.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z" })
  )
);

export const DocumentTextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // For Contracts
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" })
  )
);

export const WrenchScrewdriverIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // For Repair Requests
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.83-5.83M11.42 15.17A3 3 0 0 1 6.344 12.74l-2.519-2.52a2.25 2.25 0 0 1 0-3.182L6.344 4.5a2.25 2.25 0 0 1 3.182 0l2.52 2.519a3 3 0 0 1 2.74 5.078M11.42 15.17L14.25 18M3.375 12h.008v.008H3.375V12Zm2.625 2.625h.008v.008H6V14.625Z" })
  )
);

export const ArchiveBoxIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // For Property Assets
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10.5 11.25h3M12 15V7.5M3 7.5h18M3.75 7.5A2.25 2.25 0 0 0 6 5.25h12A2.25 2.25 0 0 0 20.25 7.5" })
  )
);

export const UserGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => ( // For Potential Tenants
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-3.741-5.601M18 18.72v-2.28a3.001 3.001 0 0 0-.701-1.932m-1.904-1.238a3 3 0 1 0-2.288 4.177M19.5 12.572a3.004 3.004 0 0 0-2.087-2.573M17.5 6.75a3 3 0 0 0-3-3h-1.5a3 3 0 0 0-3 3M13.5 6.75v1.5c0 .621.504 1.125 1.125 1.125h1.5m-6.75 0h1.5A1.125 1.125 0 0 1 12 9.375v1.5m-6.75 0h1.5A1.125 1.125 0 0 1 8.25 9.375v1.5M3 13.875M3 13.875v-1.5a3.375 3.375 0 0 1 3.375-3.375h1.5a3.375 3.375 0 0 1 3.375 3.375v1.5M3 13.875c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-1.5A1.125 1.125 0 0 0 3 12.375v1.5Z" })
  )
);

export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props }, 
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4.5v15m7.5-7.5h-15" })
  )
);

export const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" }),
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" })
  )
);

export const DeleteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c1.153 0 2.242.078 3.223.224M15 5.25V3.75a2.25 2.25 0 0 0-2.25-2.25h-1.5A2.25 2.25 0 0 0 9 3.75v1.5M12 10.5v6.75" })
  )
);

export const ViewIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" }),
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" })
  )
);

export const MoneyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" })
  )
);

export const CalendarDaysIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" })
  )
);

export const BellAlertIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M12.75 4.637A4.5 4.5 0 0 1 12 4.5a4.5 4.5 0 0 1-4.012 6.208" })
  )
);

export const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", strokeWidth: 1.5, stroke: "currentColor", ...props },
    React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" })
  )
);


export const NAV_ITEMS = [
  { id: Page.HOME, label: '首頁', icon: HomeIcon, path: '/' },
  { id: Page.TENANTS, label: '承租人管理', icon: UsersIcon, path: '/tenants' },
  { id: Page.PROPERTIES, label: '物件管理', icon: BuildingOfficeIcon, path: '/properties' },
  { id: Page.CONTRACTS, label: '合約管理', icon: DocumentTextIcon, path: '/contracts' },
  { id: Page.REPAIR_REQUESTS, label: '承租人報修管理', icon: WrenchScrewdriverIcon, path: '/repair-requests' },
  { id: Page.PROPERTY_ASSETS, label: '物件資產管理', icon: ArchiveBoxIcon, path: '/property-assets' },
  { id: Page.POTENTIAL_TENANTS, label: '潛在客戶管理', icon: UserGroupIcon, path: '/potential-tenants' },
];

// Default data objects
export const DEFAULT_TENANT: Tenant = {
  id: '', name: '', idNumber: '', phone: '', 
  workDetails: { job: '', company: '', position: '' },
  emergencyContact: { name: '', phone: '', relationship: '' }
};

export const DEFAULT_PROPERTY: Property = {
  id: '', propertyInternalId: '', address: '', sizeInPings: 0,
  assetInventory: [], features: '', repairHistory: []
};

export const DEFAULT_CONTRACT: Contract = {
  id: '', contractInternalId: '', propertyId: '', tenantId: '',
  startDate: '', endDate: '', rentAmount: 0, paymentCycle: PaymentCycle.MONTHLY,
  paymentRecords: [], annualDiscount: false
};

export const DEFAULT_REPAIR_REQUEST: TenantRepairRequest = {
  id: '', propertyId: '', tenantId: '', requestDate: '', description: '',
  status: RepairRequestStatus.PENDING, resolutionDetails: undefined
};

export const DEFAULT_INDIVIDUAL_ASSET: IndividualAsset = {
  id: '', propertyId: '', purchaseDate: '', nameBrandModel: '',
  purchasePrice: 0, vendorNamePhone: '', warrantyPeriod: ''
};

export const DEFAULT_POTENTIAL_TENANT: PotentialTenant = {
  id: '', name: '', phone: '', requirements: '', workInfo: ''
};

// Property Asset Inventory Options
export const EQUIPMENT_OPTIONS = [
  '洗衣機',
  '冰箱',
  '電視',
  '冷氣',
  '熱水器',
  '網路',
  '第四台',
  '天然瓦斯'
];

export const FURNITURE_OPTIONS = [
  '床',
  '衣櫃',
  '沙發',
  '桌子',
  '椅子'
];

export const LIVING_FACILITIES_OPTIONS = [
  '近便利商店',
  '近傳統市場',
  '近百貨公司',
  '近公園綠地',
  '近學校',
  '近醫療機構',
  '近夜市'
];

// All available options for matching
export const ALL_ASSET_OPTIONS = [
  ...EQUIPMENT_OPTIONS,
  ...FURNITURE_OPTIONS,
  ...LIVING_FACILITIES_OPTIONS
];

/**
 * Convert old text format assetInventory to new checkbox format
 * Handles formats like: ["洗衣機.冰箱.沙發"], ["洗衣機", "冰箱"], etc.
 */
export function convertAssetInventory(oldInventory: string[]): string[] {
  if (!oldInventory || oldInventory.length === 0) {
    return [];
  }

  const convertedItems: string[] = [];
  const seenItems = new Set<string>();

  for (const item of oldInventory) {
    if (!item || typeof item !== 'string') {
      continue;
    }

    // Try different separators: ".", ",", "、", "\n", space
    const separators = ['.', ',', '、', '\n', ' '];
    let items: string[] = [item];

    for (const separator of separators) {
      if (item.includes(separator)) {
        items = item.split(separator).map(s => s.trim()).filter(s => s.length > 0);
        break;
      }
    }

    for (const singleItem of items) {
      const trimmed = singleItem.trim();
      if (!trimmed || seenItems.has(trimmed)) {
        continue;
      }

      // Check if it matches any predefined option
      if (ALL_ASSET_OPTIONS.includes(trimmed)) {
        convertedItems.push(trimmed);
        seenItems.add(trimmed);
      } else {
        // Keep items that don't match predefined options (like "電視櫃", "床組")
        // They might be custom items the user wants to keep
        convertedItems.push(trimmed);
        seenItems.add(trimmed);
      }
    }
  }

  return convertedItems;
}