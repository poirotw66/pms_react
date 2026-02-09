
import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, Outlet } from 'react-router-dom';
import { Page, NAV_ITEMS } from './constants.tsx';
import { useData } from './contexts/DataContext.tsx';
import HomePage from './components/HomePage.tsx';
import TenantManagement from './components/TenantManagement.tsx';
import PropertyManagement from './components/PropertyManagement.tsx';
import ContractManagement from './components/ContractManagement.tsx';
import RepairRequestManagement from './components/RepairRequestManagement.tsx';
import PropertyAssetManagement from './components/PropertyAssetManagement.tsx';
import PotentialTenantManagement from './components/PotentialTenantManagement.tsx';
import SettingsModal from './components/SettingsModal.tsx';

// Menu icon component
const MenuIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const CloseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

const RefreshIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const CloudIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
  </svg>
);

const StorageIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const App: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { storageMode, isLoading, error, refreshData } = useData();

  const currentPageMeta = NAV_ITEMS.find(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  }) || NAV_ITEMS.find(item => item.id === Page.HOME)!;

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (err) {
      console.error('重新載入失敗:', err);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface-950">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="glow-orb glow-orb-primary w-96 h-96 -top-48 -left-48 opacity-20"></div>
        <div className="glow-orb glow-orb-accent w-64 h-64 top-1/3 right-0 opacity-10"></div>
        <div className="glow-orb glow-orb-primary w-80 h-80 bottom-0 left-1/3 opacity-10"></div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed h-full z-50 w-72 
        bg-gradient-to-b from-surface-900/95 to-surface-950/98
        backdrop-blur-xl border-r border-white/5
        shadow-2xl shadow-black/50
        transform transition-transform duration-300 ease-out
        md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo area */}
        <div className="relative px-6 py-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">物業管理系統</h1>
              <p className="text-xs text-surface-400">Property Management</p>
            </div>
          </div>

          {/* Mobile close button */}
          <button
            className="absolute top-6 right-4 p-2 text-surface-400 hover:text-white md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-grow px-4 py-6 overflow-y-auto">
          <p className="px-3 mb-3 text-xs font-medium text-surface-500 uppercase tracking-wider">導航選單</p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item, index) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <li key={item.id}>
                  <Link
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      sidebar-nav-item
                      flex items-center gap-3 px-4 py-3 rounded-xl
                      text-sm font-medium transition-all duration-200
                      ${isActive
                        ? 'active text-primary-400 bg-primary-500/10'
                        : 'text-surface-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon && <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-400' : ''}`} />}
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400"></span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar footer */}
        <div className="px-6 py-4 border-t border-white/5">
          {/* Storage mode indicator */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-800/50 hover:bg-surface-800 border border-white/5 transition-colors cursor-pointer"
          >
            {storageMode === 'googleSheets' ? (
              <CloudIcon className="w-5 h-5 text-primary-400" />
            ) : (
              <StorageIcon className="w-5 h-5 text-surface-400" />
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-white">
                {storageMode === 'googleSheets' ? 'Google Sheets' : '本機儲存'}
              </p>
              <p className="text-xs text-surface-500">
                {storageMode === 'googleSheets' ? '雲端同步' : '瀏覽器'}
              </p>
            </div>
            <SettingsIcon className="w-4 h-4 text-surface-500" />
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-72 relative z-10">
        {/* Top header */}
        <header className="sticky top-0 z-30 glass-card border-b border-white/5">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Mobile menu button */}
            <button
              className="p-2 -ml-2 text-surface-400 hover:text-white md:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <MenuIcon className="w-6 h-6" />
            </button>

            {/* Page title */}
            <div className="flex items-center gap-3">
              {currentPageMeta.icon && (
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary-500/10 items-center justify-center">
                  <currentPageMeta.icon className="w-5 h-5 text-primary-400" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-white">{currentPageMeta.label}</h1>
                <p className="text-xs text-surface-500 hidden sm:block">管理您的物業資料</p>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center gap-3">
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-surface-400">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">同步中...</span>
                </div>
              )}

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                className="icon-btn icon-btn-primary"
                title="重新載入資料"
                disabled={isLoading}
              >
                <RefreshIcon className={`w-5 h-5 text-surface-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Settings button */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="icon-btn icon-btn-primary"
                title="系統設定"
              >
                <SettingsIcon className="w-5 h-5 text-surface-400" />
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-6 py-2 bg-danger-500/10 border-t border-danger-500/20">
              <p className="text-sm text-danger-400">⚠️ {error}</p>
            </div>
          )}
        </header>

        {/* Main content */}
        <main className="flex-grow animate-fade-in">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tenants" element={<TenantManagement />} />
            <Route path="/properties" element={<PropertyManagement />} />
            <Route path="/contracts" element={<ContractManagement />} />
            <Route path="/repair-requests" element={<RepairRequestManagement />} />
            <Route path="/property-assets" element={<PropertyAssetManagement />} />
            <Route path="/potential-tenants" element={<PotentialTenantManagement />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-surface-500">
            <p>© {new Date().getFullYear()} 綜合物業管理系統</p>
            <p className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${storageMode === 'googleSheets' ? 'bg-primary-500' : 'bg-surface-500'} animate-pulse`}></span>
              {storageMode === 'googleSheets' ? 'Google Sheets 雲端儲存' : '本機瀏覽器儲存'}
            </p>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default App;
