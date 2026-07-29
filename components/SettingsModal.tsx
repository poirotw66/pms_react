import React, { useRef, useState } from 'react';
import { Modal } from './common/Modal.tsx';
import { Input, Button, FormGroup } from './common/FormControls.tsx';
import { useData } from '../contexts/DataContext.tsx';
import { getGoogleSheetsApiUrl } from '../services/googleSheets.ts';
import { DATA_KEYS, DATA_LABELS, countRecords, readBackupFile } from '../services/backup.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    data,
    storageMode,
    isGoogleSheetsConfigured,
    configureGoogleSheets,
    disconnectGoogleSheets,
    importToGoogleSheets,
    isLoading,
    error,
    pendingSyncKeys,
    retrySync,
    exportBackup,
    restoreBackup,
  } = useData();

  const [apiUrl, setApiUrl] = useState(getGoogleSheetsApiUrl());
  const [localError, setLocalError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportBackup = () => {
    setBackupError(null);
    setBackupMessage(null);
    try {
      exportBackup();
      setBackupMessage(`已匯出備份檔，共 ${countRecords(data)} 筆資料`);
    } catch (err: any) {
      setBackupError(`匯出失敗：${err?.message || '未知錯誤'}`);
    }
  };

  const handleRestoreFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 先清空 input，讓使用者可以連續選擇同一個檔案重試
    event.target.value = '';
    if (!file) return;

    setBackupError(null);
    setBackupMessage(null);

    let backup;
    try {
      backup = await readBackupFile(file);
    } catch (err: any) {
      setBackupError(`備份檔讀取失敗：${err?.message || '未知錯誤'}`);
      return;
    }

    const summary = DATA_KEYS
      .map(key => `${DATA_LABELS[key]} ${backup[key].length} 筆`)
      .join('、');

    const confirmed = window.confirm(
      `即將還原以下資料：\n${summary}\n\n` +
      '這會「完全覆蓋」目前系統中的所有資料，且無法復原。\n' +
      '建議先匯出目前資料作為備份。確定要繼續嗎？'
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      await restoreBackup(backup);
      setBackupMessage(`已還原備份，共 ${countRecords(backup)} 筆資料`);
    } catch (err: any) {
      setBackupError(err?.message || '還原失敗');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRetrySync = async () => {
    setBackupError(null);
    setBackupMessage(null);
    await retrySync();
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

        {/* 待同步提示 */}
        {pendingSyncKeys.length > 0 && (
          <div className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20">
            <h4 className="text-sm font-medium text-warning-400 mb-2">尚未同步到雲端</h4>
            <p className="text-xs text-surface-300 mb-3">
              以下資料的變更已儲存在本機瀏覽器，但還沒成功寫入 Google Sheets：
              <span className="text-warning-400">
                {' '}{pendingSyncKeys.map(key => DATA_LABELS[key]).join('、')}
              </span>
            </p>
            <Button onClick={handleRetrySync} variant="secondary" size="sm" disabled={isLoading} loading={isLoading}>
              重試同步
            </Button>
          </div>
        )}

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

        {/* 資料備份與還原 */}
        <FormGroup title="資料備份與還原">
          <div className="p-4 rounded-xl bg-surface-800/50 border border-white/5">
            <p className="text-sm text-white mb-1">目前資料量</p>
            <p className="text-xs text-surface-400">
              共 {countRecords(data)} 筆（
              {DATA_KEYS.map(key => `${DATA_LABELS[key]} ${data[key].length}`).join('、')}）
            </p>
          </div>

          {backupError && (
            <div className="p-3 rounded-lg bg-danger-500/10 border border-danger-500/20 text-sm text-danger-400">
              {backupError}
            </div>
          )}

          {backupMessage && (
            <div className="p-3 rounded-lg bg-primary-500/10 border border-primary-500/20 text-sm text-primary-400">
              ✓ {backupMessage}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleExportBackup} variant="primary" disabled={isRestoring}>
              匯出備份 (JSON)
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              disabled={isRestoring || isLoading}
              loading={isRestoring}
            >
              從備份還原
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </div>
          <p className="text-xs text-surface-500">
            備份檔為 JSON 格式，包含所有模組的資料，可用於換裝置或定期存檔。還原會覆蓋目前全部資料。
          </p>
        </FormGroup>

        {/* 資料備份提示 */}
        <div className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20">
          <h4 className="text-sm font-medium text-warning-400 mb-2">⚠️ 重要提醒</h4>
          <ul className="text-xs text-surface-300 space-y-1">
            <li>• 切換儲存模式時，請確保資料已正確同步</li>
            <li>• 建議定期使用上方「匯出備份」保存一份離線副本</li>
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

