import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { DataProvider } from './contexts/DataContext.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 由 Vite 的 base 推導 router basename：
// production 為 '/pms_react/'、development 為 '/'，去掉結尾斜線即為 basename。
// 這樣就只需要在 vite.config.ts 設定一次 base。
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <DataProvider>
          <App />
        </DataProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
