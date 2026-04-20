/**
 * Layer5_MasterConfig.gs - 5_Master_Config シート管理
 *
 * プロバイダ単価・前払い率等の定数を一元管理。
 * ProviderMaster シートはここから生成するビュー。
 * onEdit で自動バックアップ → setup 再実行時も手入力データを保持。
 */

var MASTER_CONFIG_DATA_KEY = 'master_config_data_v1';

// ════════════════════════════════════════════════════════
// セットアップ
// ════════════════════════════════════════════════════════

function setupMasterConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_MASTER_CONFIG);

  // 既存データを退避
  if (sheet) {
    _masterConfigSave(sheet);
    sheet.clearContents();
    sheet.clearFormats();
  } else {
    sheet = ss.insertSheet(SHEET_MASTER_CONFIG);
  }

  sheet.setTabColor('#4a90d9');

  // ヘッダー
  var headers = ['キー', '値', '説明'];
  sheet.getRange(1, 1, 1, 3).setValues([headers])
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');

  // デフォルトデータ
  var defaults = [
    // 三多摩
    ['PROVIDER_SANTAMA_ADVANCE_RATE',       0.5,   '三多摩 前払い率'],
    ['PROVIDER_SANTAMA_CARRYOVER_MONTHS',   2,     '三多摩 残額振込月数'],
    ['PROVIDER_SANTAMA_PRICE_MIN',          20000, '三多摩 想定単価下限'],
    ['PROVIDER_SANTAMA_PRICE_MAX',          25000, '三多摩 想定単価上限'],
    // PickGo
    ['PROVIDER_PICKGO_ADVANCE_RATE',        '',    'PickGo 前払い率（要確認）'],
    ['PROVIDER_PICKGO_CARRYOVER_MONTHS',    '',    'PickGo 残額振込月数（要確認）'],
    ['PROVIDER_PICKGO_PRICE_MIN',           '',    'PickGo 想定単価下限（要確認）'],
    ['PROVIDER_PICKGO_PRICE_MAX',           '',    'PickGo 想定単価上限（要確認）'],
    // Amazon Flex
    ['PROVIDER_AMAZONFLEX_ADVANCE_RATE',    '',    'AmazonFlex 前払い率（要確認）'],
    ['PROVIDER_AMAZONFLEX_CARRYOVER_MONTHS','',    'AmazonFlex 残額振込月数（要確認）'],
    ['PROVIDER_AMAZONFLEX_HOURLY',          '',    'AmazonFlex 時給（要確認）'],
    // ハコベル
    ['PROVIDER_HACOBELL_ADVANCE_RATE',      '',    'ハコベル 前払い率（要確認）'],
    ['PROVIDER_HACOBELL_CARRYOVER_MONTHS',  '',    'ハコベル 残額振込月数（要確認）'],
    ['PROVIDER_HACOBELL_UNIT_PRICE',        '',    'ハコベル 配送単価（要確認）'],
    // 汎用
    ['DELIVERY_UNIT_PRICE',                 150,   '配送単価（汎用）'],
  ];

  sheet.getRange(2, 1, defaults.length, 3).setValues(defaults);

  // 書式
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 250);
  sheet.setFrozenRows(1);

  // 退避データを復元
  _masterConfigRestore(sheet);

  Logger.log('5_Master_Config セットアップ完了');
}

// ════════════════════════════════════════════════════════
// データ退避 / 復元
// ════════════════════════════════════════════════════════

function _masterConfigSave(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var data = {};
  values.forEach(function(row) {
    var key = String(row[0]).trim();
    if (key) data[key] = row[1];
  });

  try {
    PropertiesService.getScriptProperties().setProperty(
      MASTER_CONFIG_DATA_KEY, JSON.stringify(data)
    );
    Logger.log('5_Master_Config 退避: ' + Object.keys(data).length + '件');
  } catch (e) {
    Logger.log('masterConfig save error: ' + e.message);
  }
}

function _masterConfigRestore(sheet) {
  var raw = PropertiesService.getScriptProperties().getProperty(MASTER_CONFIG_DATA_KEY);
  if (!raw) return;

  var data;
  try { data = JSON.parse(raw); } catch (e) { return; }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  keys.forEach(function(row, i) {
    var key = String(row[0]).trim();
    if (key && data.hasOwnProperty(key)) {
      sheet.getRange(i + 2, 2).setValue(data[key]);
    }
  });

  Logger.log('5_Master_Config 復元完了');
}

// ════════════════════════════════════════════════════════
// onEdit ハンドラ
// ════════════════════════════════════════════════════════

function masterConfigOnEdit(e) {
  var col = e.range.getColumn();
  var row = e.range.getRow();

  if (row < 2 || col < 1 || col > 3) return;

  var sheet = e.range.getSheet();

  if (col !== 2) {
    // キー or 説明が変わった → 全保存
    _masterConfigSave(sheet);
    return;
  }

  // 値セル（Col B）差分保存
  var key = String(sheet.getRange(row, 1).getValue()).trim();
  if (!key) return;

  var raw = PropertiesService.getScriptProperties().getProperty(MASTER_CONFIG_DATA_KEY);
  var data;
  try { data = raw ? JSON.parse(raw) : {}; } catch (err) { data = {}; }

  data[key] = e.range.getValue();

  try {
    PropertiesService.getScriptProperties().setProperty(
      MASTER_CONFIG_DATA_KEY, JSON.stringify(data)
    );
  } catch (err) {
    Logger.log('masterConfig onEdit error: ' + err.message);
  }
}
