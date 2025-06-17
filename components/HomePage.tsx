import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Contract, Tenant, Property, TenantRepairRequest, RepairRequestStatus, Page, PaymentCycle } from '../types.ts';
import { NAV_ITEMS, CalendarDaysIcon, BuildingOfficeIcon, UsersIcon, WrenchScrewdriverIcon, DocumentTextIcon, PlusIcon, ExclamationTriangleIcon } from '../constants.tsx'; 

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [contracts] = useLocalStorage<Contract[]>('contracts', []);
  const [tenants] = useLocalStorage<Tenant[]>('tenants', []);
  const [properties] = useLocalStorage<Property[]>('properties', []);
  const [repairRequests] = useLocalStorage<TenantRepairRequest[]>('repairRequests', []);
  
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
  const [overduePayments, setOverduePayments] = useState<Contract[]>([]);

  const getTenantName = (tenantId: string) => tenants.find(t => t.id === tenantId)?.name || 'N/A';
  const getPropertyAddress = (propertyId: string) => properties.find(p => p.id === propertyId)?.address || 'N/A';

  const EXPIRY_THRESHOLD_DAYS = 60; 

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate Expiring Contracts
    const upcomingExpiry: Contract[] = contracts.filter(contract => {
      if (!contract.endDate) return false;
      const endDate = new Date(contract.endDate);
      endDate.setHours(0,0,0,0);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= EXPIRY_THRESHOLD_DAYS;
    }).sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    setExpiringContracts(upcomingExpiry);

    // Calculate Overdue Payments (currently for monthly cycle)
    const overdue: Contract[] = contracts.filter(contract => {
      const contractStartDate = new Date(contract.startDate);
      const contractEndDate = new Date(contract.endDate);
      contractStartDate.setHours(0,0,0,0);
      contractEndDate.setHours(0,0,0,0);

      // Contract must be active
      if (today < contractStartDate || today > contractEndDate) return false;
      
      // Only handle monthly payments for now
      if (contract.paymentCycle !== PaymentCycle.MONTHLY) return false;

      const paymentDayOfMonth = contractStartDate.getDate();

      // Check if current month's rent is confirmed paid
      const paidThisMonth = contract.paymentRecords.some(p => {
        if (!p.paymentDate) return false;
        const paymentDate = new Date(p.paymentDate);
        return p.isConfirmed && 
               paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      });

      if (paidThisMonth) return false; // Already paid for this month

      // Determine if payment day for current month has passed
      const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const actualPaymentDayThisMonth = Math.min(paymentDayOfMonth, daysInCurrentMonth);
      
      // Overdue if today is past the payment day and not paid
      return today.getDate() > actualPaymentDayThisMonth; 
    }).sort((a, b) => { // Sort by payment day, then tenant name
        const paymentDayA = new Date(a.startDate).getDate();
        const paymentDayB = new Date(b.startDate).getDate();
        if (paymentDayA !== paymentDayB) {
            return paymentDayA - paymentDayB;
        }
        const tenantA = getTenantName(a.tenantId);
        const tenantB = getTenantName(b.tenantId);
        return tenantA.localeCompare(tenantB);
    });
    setOverduePayments(overdue);

  }, [contracts, tenants, properties]); 

  const activeContractsCount = contracts.filter(c => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const endDate = new Date(c.endDate);
    endDate.setHours(0,0,0,0);
    return endDate >= today;
  }).length;

  const pendingRepairRequestsCount = repairRequests.filter(
    req => req.status === RepairRequestStatus.PENDING || req.status === RepairRequestStatus.IN_PROGRESS
  ).length;

  const StatCard: React.FC<{title: string, value: string | number, icon: React.FC<React.SVGProps<SVGSVGElement>>, colorClass: string}> = ({title, value, icon: Icon, colorClass}) => (
    <div className="bg-surface shadow-lg rounded-xl p-6 flex items-center space-x-4">
        <div className={`p-3 rounded-full ${colorClass} text-white`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-sm text-textSecondary">{title}</p>
            <p className="text-2xl font-semibold text-textPrimary">{value}</p>
        </div>
    </div>
  );
  
  interface QuickActionItemProps {
    pageId: Page;
    label: string;
  }

  const QuickActionItem: React.FC<QuickActionItemProps> = ({ pageId, label }) => {
    const targetNavItem = NAV_ITEMS.find(item => item.id === pageId);
    if (!targetNavItem || !targetNavItem.path) return null;

    return (
        <button
            onClick={() => navigate(`${targetNavItem.path}?action=add`)}
            className="w-full flex items-center text-left px-4 py-3 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors duration-150"
            aria-label={`新增${label.replace('新增','')}`}
        >
            <PlusIcon className="w-4 h-4 mr-2 flex-shrink-0" />
            {label}
        </button>
    );
  };

  const currentMonthDisplay = new Date().toLocaleString('zh-TW', { month: 'long' });


  return (
    <div className="p-6 bg-transparent">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        <StatCard title="有效合約總數" value={activeContractsCount} icon={DocumentTextIcon} colorClass="bg-primary" />
        <StatCard title="管理中物件" value={properties.length} icon={BuildingOfficeIcon} colorClass="bg-secondary" />
        <StatCard title="登記承租人" value={tenants.length} icon={UsersIcon} colorClass="bg-amber-500" />
        <StatCard title="待處理維修" value={pendingRepairRequestsCount} icon={WrenchScrewdriverIcon} colorClass="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring Contracts Card */}
        <div className="bg-surface shadow-lg rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center mb-4">
            <CalendarDaysIcon className="w-7 h-7 mr-3 text-yellow-500" />
            <h2 className="text-xl font-semibold text-textPrimary">租約即將到期提醒 (未來 {EXPIRY_THRESHOLD_DAYS} 天)</h2>
          </div>
          {expiringContracts.length > 0 ? (
            <ul className="space-y-3 max-h-72 overflow-y-auto">
              {expiringContracts.map(contract => (
                <li key={contract.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium text-textPrimary">
                    <strong>合約編號:</strong> {contract.contractInternalId}
                  </p>
                  <p className="text-xs text-textSecondary">
                    <strong>物件:</strong> {getPropertyAddress(contract.propertyId)}
                  </p>
                  <p className="text-xs text-textSecondary">
                    <strong>承租人:</strong> {getTenantName(contract.tenantId)}
                  </p>
                  <p className="text-sm text-yellow-700 font-semibold mt-1">
                    <strong>到期日:</strong> {contract.endDate}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-textSecondary italic">目前沒有在未來 {EXPIRY_THRESHOLD_DAYS} 天內即將到期的合約。</p>
          )}
        </div>
        
        {/* Quick Actions Card */}
        <div className="bg-surface shadow-lg rounded-xl p-6 lg:row-span-2"> {/* Adjusted to span 2 rows to balance */}
          <h2 className="text-xl font-semibold text-textPrimary mb-4">快速操作</h2>
          <div className="space-y-2">
            <QuickActionItem pageId={Page.TENANTS} label="新增承租人" />
            <QuickActionItem pageId={Page.PROPERTIES} label="新增物件" />
            <QuickActionItem pageId={Page.CONTRACTS} label="新增合約" />
            <QuickActionItem pageId={Page.REPAIR_REQUESTS} label="新增報修請求" />
            <QuickActionItem pageId={Page.POTENTIAL_TENANTS} label="新增潛在客戶" />
          </div>
          <h2 className="text-xl font-semibold text-textPrimary mb-4 mt-6">系統公告 (範例)</h2>
          <p className="text-textSecondary text-sm">歡迎使用新版物業管理系統！若有任何問題請隨時回報。</p>
        </div>

        {/* Overdue Payments Card */}
        <div className="bg-surface shadow-lg rounded-xl p-6 lg:col-span-2 mt-6 lg:mt-0"> 
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-7 h-7 mr-3 text-danger" />
            <h2 className="text-xl font-semibold text-textPrimary">租金尚未繳交提醒 (本月)</h2>
          </div>
          {overduePayments.length > 0 ? (
            <ul className="space-y-3 max-h-72 overflow-y-auto">
              {overduePayments.map(contract => (
                <li key={contract.id} className="p-4 bg-red-50 border border-red-200 rounded-lg hover:shadow-md transition-shadow">
                  <p className="text-sm font-medium text-textPrimary">
                    <strong>合約編號:</strong> {contract.contractInternalId}
                  </p>
                  <p className="text-xs text-textSecondary">
                    <strong>物件:</strong> {getPropertyAddress(contract.propertyId)}
                  </p>
                  <p className="text-xs text-textSecondary">
                    <strong>承租人:</strong> {getTenantName(contract.tenantId)}
                  </p>
                  <p className="text-sm text-danger font-semibold mt-1">
                    <strong>金額:</strong> ${contract.rentAmount} ({currentMonthDisplay}租金)
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-textSecondary italic">目前沒有逾期未繳的月租金。</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default HomePage;