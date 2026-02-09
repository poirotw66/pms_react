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
  if (!SPREADSHEET_ID) {
    throw new Error('試算表 ID 未設定。請在專案屬性中設定 SPREADSHEET_ID，或從試算表內開啟 Apps Script 再部署。');
  }
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

// Google Sheets 單一儲存格字元上限
var CELL_CHAR_LIMIT = 50000;

/**
 * 完整同步工作表
 */
function syncSheet(sheetName, records) {
  try {
    const sheet = getSheet(sheetName);
    const lastRow = sheet.getLastRow();
    
    // Clear existing data rows (keep header)
    // Only delete if there are data rows (lastRow > 1)
    if (lastRow > 1) {
      const rowsToDelete = lastRow - 1;
      // Clear content first to prevent data issues
      sheet.getRange(2, 1, rowsToDelete, 1).clearContent();
      // Delete rows from bottom to top to avoid index shifting issues
      sheet.deleteRows(2, rowsToDelete);
    }
    
    // Ensure header exists
    if (lastRow === 0) {
      sheet.getRange(1, 1).setValue('data');
    }
    
    // Write new data
    if (records && records.length > 0) {
      const values = [];
      for (var i = 0; i < records.length; i++) {
        var jsonStr = JSON.stringify(records[i]);
        if (jsonStr.length > CELL_CHAR_LIMIT) {
          throw new Error('工作表 ' + sheetName + ' 第 ' + (i + 1) + ' 筆資料過大（' + jsonStr.length + ' 字元，上限 ' + CELL_CHAR_LIMIT + ' 字元），無法寫入試算表。');
        }
        values.push([jsonStr]);
      }
      // Write all rows at once for better performance
      var numRows = values.length;
      sheet.getRange(2, 1, numRows, 1).setValues(values);
    }
  } catch (error) {
    // Re-throw with more context
    if (error.message.includes('超出邊界') || error.message.includes('out of bounds')) {
      throw new Error('試算表服務無法正常運作：可能需要重新整理試算表或檢查權限。原始錯誤：' + error.message);
    }
    throw error;
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

