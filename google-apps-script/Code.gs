/**
 * 物業管理系統 - Google Apps Script 後端
 * 
 * 設置步驟：
 * 1. 建立新的 Google Sheets 試算表
 * 2. 在試算表中建立以下工作表 (tabs)：
 *    - tenants
 *    - properties
 *    - contracts
 *    - repairRequests
 *    - individualAssets
 *    - potentialTenants
 * 3. 開啟 Extensions > Apps Script
 * 4. 將此檔案內容複製貼上
 * 5. 部署為 Web App：
 *    - Deploy > New deployment
 *    - Select type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. 複製 Web App URL 到前端應用程式
 */

// 設定你的試算表 ID (從 URL 取得)
// https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || SpreadsheetApp.getActiveSpreadsheet().getId();

// 工作表名稱對應
const SHEET_NAMES = {
  tenants: 'tenants',
  properties: 'properties',
  contracts: 'contracts',
  repairRequests: 'repairRequests',
  individualAssets: 'individualAssets',
  potentialTenants: 'potentialTenants'
};

/**
 * 處理 GET 請求
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet;
    
    if (action === 'getAll') {
      if (sheetName && SHEET_NAMES[sheetName]) {
        const data = getAllData(sheetName);
        return createResponse({ success: true, data: data });
      } else if (!sheetName) {
        // 取得所有工作表的資料
        const allData = {};
        for (const key in SHEET_NAMES) {
          allData[key] = getAllData(key);
        }
        return createResponse({ success: true, data: allData });
      }
    }
    
    if (action === 'get' && e.parameter.id) {
      const data = getById(sheetName, e.parameter.id);
      return createResponse({ success: true, data: data });
    }
    
    return createResponse({ success: false, error: 'Invalid action' });
  } catch (error) {
    return createResponse({ success: false, error: error.message });
  }
}

/**
 * 處理 POST 請求
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const sheetName = data.sheet;
    
    if (!SHEET_NAMES[sheetName]) {
      return createResponse({ success: false, error: 'Invalid sheet name' });
    }
    
    switch (action) {
      case 'create':
        const newId = createRecord(sheetName, data.record);
        return createResponse({ success: true, id: newId });
        
      case 'update':
        updateRecord(sheetName, data.record);
        return createResponse({ success: true });
        
      case 'delete':
        deleteRecord(sheetName, data.id);
        return createResponse({ success: true });
        
      case 'sync':
        // 完整同步 - 覆蓋整個工作表
        syncSheet(sheetName, data.records);
        return createResponse({ success: true });
        
      case 'bulkSync':
        // 批次同步所有工作表
        for (const key in data.allData) {
          if (SHEET_NAMES[key]) {
            syncSheet(key, data.allData[key]);
          }
        }
        return createResponse({ success: true });
        
      default:
        return createResponse({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    return createResponse({ success: false, error: error.message });
  }
}

/**
 * 建立回應
 */
function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 取得或建立工作表
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAMES[sheetName]);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES[sheetName]);
    // 設定標題行
    sheet.getRange(1, 1).setValue('data');
  }
  
  return sheet;
}

/**
 * 取得所有資料
 */
function getAllData(sheetName) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    return [];
  }
  
  const data = [];
  for (let i = 2; i <= lastRow; i++) {
    const jsonStr = sheet.getRange(i, 1).getValue();
    if (jsonStr) {
      try {
        data.push(JSON.parse(jsonStr));
      } catch (e) {
        // 跳過無效的 JSON
      }
    }
  }
  
  return data;
}

/**
 * 根據 ID 取得單筆資料
 */
function getById(sheetName, id) {
  const allData = getAllData(sheetName);
  return allData.find(item => item.id === id) || null;
}

/**
 * 建立新記錄
 */
function createRecord(sheetName, record) {
  const sheet = getSheet(sheetName);
  
  // 確保有 ID
  if (!record.id) {
    record.id = Utilities.getUuid();
  }
  
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1).setValue(JSON.stringify(record));
  
  return record.id;
}

/**
 * 更新記錄
 */
function updateRecord(sheetName, record) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  
  for (let i = 2; i <= lastRow; i++) {
    const jsonStr = sheet.getRange(i, 1).getValue();
    if (jsonStr) {
      try {
        const item = JSON.parse(jsonStr);
        if (item.id === record.id) {
          sheet.getRange(i, 1).setValue(JSON.stringify(record));
          return;
        }
      } catch (e) {
        // 跳過無效的 JSON
      }
    }
  }
  
  // 如果找不到，建立新記錄
  createRecord(sheetName, record);
}

/**
 * 刪除記錄
 */
function deleteRecord(sheetName, id) {
  const sheet = getSheet(sheetName);
  const lastRow = sheet.getLastRow();
  
  for (let i = 2; i <= lastRow; i++) {
    const jsonStr = sheet.getRange(i, 1).getValue();
    if (jsonStr) {
      try {
        const item = JSON.parse(jsonStr);
        if (item.id === id) {
          sheet.deleteRow(i);
          return;
        }
      } catch (e) {
        // 跳過無效的 JSON
      }
    }
  }
}

/**
 * 完整同步工作表
 */
function syncSheet(sheetName, records) {
  const sheet = getSheet(sheetName);
  
  // 清除所有資料（保留標題）
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  // 確保標題存在
  sheet.getRange(1, 1).setValue('data');
  
  // 寫入新資料
  if (records && records.length > 0) {
    const values = records.map(record => [JSON.stringify(record)]);
    sheet.getRange(2, 1, records.length, 1).setValues(values);
  }
}

/**
 * 初始化工作表（首次設定時使用）
 */
function initializeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  for (const key in SHEET_NAMES) {
    let sheet = ss.getSheetByName(SHEET_NAMES[key]);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAMES[key]);
      sheet.getRange(1, 1).setValue('data');
    }
  }
  
  Logger.log('所有工作表已初始化完成');
}

/**
 * 測試函數
 */
function testGetAllData() {
  const data = getAllData('tenants');
  Logger.log(data);
}

