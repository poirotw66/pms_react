
import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Page, NAV_ITEMS } from './constants.tsx';
import HomePage from './components/HomePage.tsx';
import TenantManagement from './components/TenantManagement.tsx';
import PropertyManagement from './components/PropertyManagement.tsx';
import ContractManagement from './components/ContractManagement.tsx';
import RepairRequestManagement from './components/RepairRequestManagement.tsx';
import PropertyAssetManagement from './components/PropertyAssetManagement.tsx';
import PotentialTenantManagement from './components/PotentialTenantManagement.tsx';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPageMeta = NAV_ITEMS.find(item => {
    // For home page, exact match. For others, check if path starts with item.path
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  }) || NAV_ITEMS.find(item => item.id === Page.HOME)!;


  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar for md and larger screens */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-slate-200 fixed h-full shadow-lg">
        <div className="text-2xl font-bold text-white p-5 text-center border-b border-sidebar-accent">
          綜合物業管理
        </div>
        <nav className="flex-grow mt-5">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.id} className="px-3">
                <Link
                  to={item.path}
                  className={`w-full flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-150 ease-in-out
                    ${(location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)))
                      ? 'bg-primary text-white shadow-md' 
                      : 'hover:bg-sidebar-accent hover:text-white'
                    }`}
                  aria-current={(location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))) ? 'page' : undefined}
                >
                  {item.icon && <item.icon className="w-5 h-5 mr-3" />}
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-64"> {/* Adjust margin for sidebar width */}
        {/* Top navigation for small screens */}
        <nav className="md:hidden bg-sidebar text-white p-4 shadow-md flex justify-between items-center">
          <span className="font-semibold text-xl">綜合物業管理</span>
          <select 
            onChange={(e) => navigate(e.target.value)} 
            value={currentPageMeta.path} // Use path for value, find matching path for select
            className="bg-primary-dark text-white px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="主要導覽"
          >
            {NAV_ITEMS.map(item => (
              <option key={item.id} value={item.path}>{item.label}</option>
            ))}
          </select>
        </nav>

        {/* Content Header */}
        <header className="bg-surface shadow-sm p-4">
          <h1 className="text-2xl font-semibold text-textPrimary">{currentPageMeta.label}</h1>
        </header>
        
        <main className="flex-grow"> 
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tenants" element={<TenantManagement />} />
            <Route path="/properties" element={<PropertyManagement />} />
            <Route path="/contracts" element={<ContractManagement />} />
            <Route path="/repair-requests" element={<RepairRequestManagement />} />
            <Route path="/property-assets" element={<PropertyAssetManagement />} />
            <Route path="/potential-tenants" element={<PotentialTenantManagement />} />
            {/* Fallback route can be added here if needed */}
            <Route path="*" element={<HomePage />} /> 
          </Routes>
          <Outlet />
        </main>

        <footer className="bg-sidebar text-slate-300 text-center p-4 text-xs">
          © {new Date().getFullYear()} 綜合物業管理系統. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default App;