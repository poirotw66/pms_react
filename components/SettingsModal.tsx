import React, { useState } from 'react';
import { Modal } from './common/Modal.tsx';
import { Input, Button, FormGroup } from './common/FormControls.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { getGoogleSheetsApiUrl } from '../services/googleSheets.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    storageMode, 
    isGoogleSheetsConfigured, 
    configureGoogleSheets, 
    disconnectGoogleSheets,
    importToGoogleSheets,
    isLoading,
    error
  } = useData();
  
  const [apiUrl, setApiUrl] = useState(getGoogleSheetsApiUrl());
  const [localError, setLocalError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const handleConnect = () => {
    if (!apiUrl.trim()) {
      setLocalError('請輸入 Google Apps Script Web App URL');
      return;
    }
    
    if (!apiUrl.startsWith('https://script.google.com/')) {
      setLocalError('URL 格式不正確，應該以 https://script.google.com/ 開頭');
      return;
    }
    
    setLocalError(null);
    configureGoogleSheets(apiUrl.trim());
  };

  const handleDisconnect = () => {
    if (window.confirm('確定要斷開 Google Sheets 連線嗎？系統將改為使用本機儲存。')) {
      disconnectGoogleSheets();
    }
  };

  const handleImport = async () => {
    if (!window.confirm('確定要將本機資料匯入到 Google Sheets 嗎？這將覆蓋 Google Sheets 上的現有資料。')) {
      return;
    }
    
    setIsImporting(true);
    setLocalError(null);
    setImportSuccess(false);
    
    try {
      await importToGoogleSheets();
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err: any) {
      setLocalError(err.message || '匯入失敗');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="系統設定" size="lg">
      <div className="space-y-6">
        {/* 儲存模式狀態 */}
        <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">目前儲存模式</h3>
              <p className="text-xs text-surface-400 mt-1">
                {storageMode === 'googleSheets' ? '使用 Google Sheets 雲端儲存' : '使用本機瀏覽器儲存'}
              </p>
            </div>
            <span className={`badge ${storageMode === 'googleSheets' ? 'badge-success' : 'badge-info'}`}>
              {storageMode === 'googleSheets' ? '雲端' : '本機'}
            </span>
          </div>
        </div>

        {/* Google Sheets 設定 */}
        <FormGroup title="Google Sheets 連線設定">
          {!isGoogleSheetsConfigured ? (
            <>
              <div className="p-4 rounded-xl bg-info-500/10 border border-info-500/20 mb-4">
                <h4 className="text-sm font-medium text-info-400 mb-2">📋 設定步驟</h4>
                <ol className="text-xs text-surface-300 space-y-1 list-decimal list-inside">
                  <li>建立新的 Google Sheets 試算表</li>
                  <li>開啟 Extensions → Apps Script</li>
                  <li>複製 <code className="text-primary-400">google-apps-script/Code.gs</code> 的內容</li>
                  <li>部署為 Web App (Execute as: Me, Access: Anyone)</li>
                  <li>將 Web App URL 貼到下方</li>
                </ol>
              </div>
              
              <Input
                label="Google Apps Script Web App URL"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/xxx/exec"
                hint="從 Google Apps Script 部署後取得的 URL"
              />
              
              {localError && (
                <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                  {localError}
                </div>
              )}
              
              <div className="flex gap-3">
                <Button onClick={handleConnect} variant="primary" disabled={isLoading}>
                  連接 Google Sheets
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                  <span className="text-sm font-medium text-primary-400">已連接 Google Sheets</span>
                </div>
                <p className="text-xs text-surface-400 break-all">
                  {getGoogleSheetsApiUrl()}
                </p>
              </div>
              
              {(localError || error) && (
                <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
                  {localError || error}
                </div>
              )}
              
              {importSuccess && (
                <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-sm text-primary-400">
                  ✓ 資料已成功匯入到 Google Sheets
                </div>
              )}
              
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleImport} 
                  variant="secondary" 
                  disabled={isImporting || isLoading}
                  loading={isImporting}
                >
                  匯入本機資料到雲端
                </Button>
                <Button onClick={handleDisconnect} variant="danger" disabled={isLoading}>
                  斷開連線
                </Button>
              </div>
            </>
          )}
        </FormGroup>

        {/* 資料備份提示 */}
        <div className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20">
          <h4 className="text-sm font-medium text-warning-400 mb-2">⚠️ 重要提醒</h4>
          <ul className="text-xs text-surface-300 space-y-1">
            <li>• 切換儲存模式時，請確保資料已正確同步</li>
            <li>• 建議定期備份 Google Sheets 試算表</li>
            <li>• 本機儲存的資料會保留在瀏覽器中，清除快取將遺失資料</li>
          </ul>
        </div>

        <div className="flex justify-end pt-4 border-t border-white/5">
          <Button variant="ghost" onClick={onClose}>關閉</Button>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;

