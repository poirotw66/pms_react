import React from 'react';
import { downloadBackup, readAllFromLocalStorage, countRecords } from '../../services/backup.ts';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 攔截 render 期間的例外，避免整個畫面變成空白。
 *
 * 這裡刻意只依賴 localStorage 與原生 DOM API，因為錯誤發生時
 * DataProvider 可能本身就是壞掉的那一個，不能再透過 context 取資料。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('應用程式發生未預期的錯誤:', error, info.componentStack);
  }

  private handleDownloadBackup = () => {
    try {
      downloadBackup(readAllFromLocalStorage(), 'pms-rescue');
    } catch (err: any) {
      window.alert(`備份下載失敗：${err?.message || '未知錯誤'}`);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    let recordCount = 0;
    try {
      recordCount = countRecords(readAllFromLocalStorage());
    } catch {
      recordCount = 0;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-surface-900 border border-white/5 shadow-2xl p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger-500/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-danger-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">系統發生錯誤</h1>
              <p className="text-sm text-surface-400 mt-1">
                畫面無法正常顯示，但您的資料仍保留在瀏覽器中。
                建議先下載備份，再重新載入頁面。
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-800/60 border border-white/5">
            <p className="text-xs text-surface-400 mb-1">錯誤訊息</p>
            <p className="text-sm text-danger-400 break-words">{error.message || String(error)}</p>
          </div>

          <div className="p-3 rounded-xl bg-info-500/10 border border-info-500/20">
            <p className="text-sm text-info-400">
              目前本機儲存共有 <span className="font-semibold">{recordCount}</span> 筆資料可供備份。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={this.handleDownloadBackup}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-colors"
            >
              下載資料備份
            </button>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl bg-surface-700 hover:bg-surface-600 text-surface-100 transition-colors"
            >
              重新載入頁面
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
