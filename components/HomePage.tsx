import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData, useTenants, useProperties, useContracts, useRepairRequests } from '../contexts/DataContext.tsx';
import { Contract, RepairRequestStatus, Page, PaymentCycle } from '../types.ts';
import { NAV_ITEMS, CalendarDaysIcon, BuildingOfficeIcon, UsersIcon, WrenchScrewdriverIcon, DocumentTextIcon, PlusIcon, ExclamationTriangleIcon } from '../constants.tsx'; 

// Chevron Right Icon
const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

// Arrow Trending Up Icon
const TrendingUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
  </svg>
);

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { storageMode, isLoading } = useData();
  const [contracts] = useContracts();
  const [tenants] = useTenants();
  const [properties] = useProperties();
  const [repairRequests] = useRepairRequests();
  
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

      if (today < contractStartDate || today > contractEndDate) return false;
      if (contract.paymentCycle !== PaymentCycle.MONTHLY) return false;

      const paymentDayOfMonth = contractStartDate.getDate();
      const paidThisMonth = contract.paymentRecords.some(p => {
        if (!p.paymentDate) return false;
        const paymentDate = new Date(p.paymentDate);
        return p.isConfirmed && 
               paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      });

      if (paidThisMonth) return false;

      const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const actualPaymentDayThisMonth = Math.min(paymentDayOfMonth, daysInCurrentMonth);
      
      return today.getDate() > actualPaymentDayThisMonth; 
    }).sort((a, b) => {
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

  // Stat Card Component
  interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    accentColor: string;
    gradientFrom: string;
    gradientTo: string;
    delay: number;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, accentColor, gradientFrom, gradientTo, delay }) => (
    <div 
      className="stat-card glass-card rounded-2xl p-6 animate-slide-up"
      style={{ '--card-accent': accentColor, animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-surface-400 mb-1">{title}</p>
          <p className="text-4xl font-bold text-white tracking-tight">{value}</p>
        </div>
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-primary-400">
          <TrendingUpIcon className="w-3 h-3" />
          穩定
        </span>
        <span className="text-surface-500">相較上月</span>
      </div>
    </div>
  );
  
  // Quick Action Item Component
  interface QuickActionItemProps {
    pageId: Page;
    label: string;
    description: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
  }

  const QuickActionItem: React.FC<QuickActionItemProps> = ({ pageId, label, description, icon: Icon }) => {
    const targetNavItem = NAV_ITEMS.find(item => item.id === pageId);
    if (!targetNavItem || !targetNavItem.path) return null;

    return (
      <button
        onClick={() => navigate(`${targetNavItem.path}?action=add`)}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-white/5 hover:border-primary-500/30 transition-all duration-200 group"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
          <Icon className="w-5 h-5 text-primary-400" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-surface-500">{description}</p>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-surface-500 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
      </button>
    );
  };

  const currentMonthDisplay = new Date().toLocaleString('zh-TW', { month: 'long' });

  // Calculate days until expiry
  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const end = new Date(endDate);
    end.setHours(0,0,0,0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Welcome section */}
      <div className="mb-8 animate-slide-up">
        <h2 className="text-2xl font-bold text-white mb-2">歡迎回來 👋</h2>
        <p className="text-surface-400">
          這是您的物業管理概況
          {storageMode === 'googleSheets' && (
            <span className="ml-2 text-xs text-primary-400">• 雲端同步</span>
          )}
        </p>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-6 p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-primary-400">正在載入資料...</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <StatCard 
          title="有效合約總數" 
          value={activeContractsCount} 
          icon={DocumentTextIcon} 
          accentColor="#10b981"
          gradientFrom="from-primary-500"
          gradientTo="to-primary-700"
          delay={0}
        />
        <StatCard 
          title="管理中物件" 
          value={properties.length} 
          icon={BuildingOfficeIcon} 
          accentColor="#3b82f6"
          gradientFrom="from-blue-500"
          gradientTo="to-blue-700"
          delay={100}
        />
        <StatCard 
          title="登記承租人" 
          value={tenants.length} 
          icon={UsersIcon} 
          accentColor="#f59e0b"
          gradientFrom="from-accent-500"
          gradientTo="to-accent-700"
          delay={200}
        />
        <StatCard 
          title="待處理維修" 
          value={pendingRepairRequestsCount} 
          icon={WrenchScrewdriverIcon} 
          accentColor="#ef4444"
          gradientFrom="from-red-500"
          gradientTo="to-red-700"
          delay={300}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring Contracts Card */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning-500/10 flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-warning-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">租約即將到期</h2>
                <p className="text-xs text-surface-500">未來 {EXPIRY_THRESHOLD_DAYS} 天</p>
              </div>
            </div>
            {expiringContracts.length > 0 && (
              <span className="badge badge-warning">{expiringContracts.length} 筆</span>
            )}
          </div>
          
          <div className="p-4">
            {expiringContracts.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {expiringContracts.map((contract, index) => {
                  const daysLeft = getDaysUntilExpiry(contract.endDate);
                  return (
                    <div 
                      key={contract.id} 
                      className="alert-warning p-4 rounded-xl transition-all hover:translate-x-1"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white mb-1">
                            {contract.contractInternalId}
                          </p>
                          <p className="text-xs text-surface-400 mb-0.5">
                            <span className="text-surface-500">物件：</span>{getPropertyAddress(contract.propertyId)}
                          </p>
                          <p className="text-xs text-surface-400">
                            <span className="text-surface-500">承租人：</span>{getTenantName(contract.tenantId)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-bold ${daysLeft <= 14 ? 'text-danger-400' : 'text-warning-400'}`}>
                            {daysLeft}
                          </span>
                          <p className="text-xs text-surface-500">天後到期</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8">
                <CalendarDaysIcon className="empty-state-icon w-16 h-16" />
                <p className="text-surface-400">目前沒有即將到期的合約</p>
                <p className="text-xs text-surface-500 mt-1">所有合約狀態良好</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions Card */}
        <div className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <PlusIcon className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">快速操作</h2>
                <p className="text-xs text-surface-500">常用功能捷徑</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-2">
            <QuickActionItem pageId={Page.TENANTS} label="新增承租人" description="登記新的租客資料" icon={UsersIcon} />
            <QuickActionItem pageId={Page.PROPERTIES} label="新增物件" description="登記管理新物業" icon={BuildingOfficeIcon} />
            <QuickActionItem pageId={Page.CONTRACTS} label="新增合約" description="建立租賃合約" icon={DocumentTextIcon} />
            <QuickActionItem pageId={Page.REPAIR_REQUESTS} label="新增報修" description="登記維修請求" icon={WrenchScrewdriverIcon} />
          </div>
          
          {/* System Status */}
          <div className="p-4 border-t border-white/5 mt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
              <span className="text-surface-400">系統狀態：</span>
              <span className="text-primary-400">運作正常</span>
            </div>
          </div>
        </div>

        {/* Overdue Payments Card */}
        <div className="lg:col-span-2 glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-500/10 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-danger-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">租金尚未繳交</h2>
                <p className="text-xs text-surface-500">{currentMonthDisplay}租金提醒</p>
              </div>
            </div>
            {overduePayments.length > 0 && (
              <span className="badge badge-danger">{overduePayments.length} 筆</span>
            )}
          </div>
          
          <div className="p-4">
            {overduePayments.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {overduePayments.map((contract, index) => (
                  <div 
                    key={contract.id} 
                    className="alert-danger p-4 rounded-xl transition-all hover:translate-x-1"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white mb-1">
                          {contract.contractInternalId}
                        </p>
                        <p className="text-xs text-surface-400 mb-0.5">
                          <span className="text-surface-500">物件：</span>{getPropertyAddress(contract.propertyId)}
                        </p>
                        <p className="text-xs text-surface-400">
                          <span className="text-surface-500">承租人：</span>{getTenantName(contract.tenantId)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-danger-400">
                          ${contract.rentAmount.toLocaleString()}
                        </span>
                        <p className="text-xs text-surface-500">{currentMonthDisplay}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-surface-400">本月租金均已收齊</p>
                <p className="text-xs text-surface-500 mt-1">保持良好的收款記錄</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="glass-card rounded-2xl overflow-hidden animate-slide-up" style={{ animationDelay: '500ms' }}>
          <div className="p-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-info-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-info-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">系統資訊</h2>
                <p className="text-xs text-surface-500">版本與公告</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="p-3 rounded-lg bg-surface-800/50 border border-white/5">
              <p className="text-xs text-surface-500 mb-1">系統版本</p>
              <p className="text-sm font-medium text-white">v2.0.0</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-800/50 border border-white/5">
              <p className="text-xs text-surface-500 mb-1">儲存模式</p>
              <p className="text-sm font-medium text-white">
                {storageMode === 'googleSheets' ? 'Google Sheets 雲端' : '本機瀏覽器'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20">
              <p className="text-xs text-primary-400 mb-1">公告</p>
              <p className="text-sm text-surface-300">
                {storageMode === 'googleSheets' 
                  ? '已連接 Google Sheets，資料將自動同步。'
                  : '點擊設定可連接 Google Sheets 雲端儲存。'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
