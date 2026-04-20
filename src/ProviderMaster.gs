/**
 * ProviderMaster.gs - プロバイダマスタシート構築
 *
 * setupProviderMaster() は何度実行しても安全。
 * 手入力データ（前払い率・単価等）は Script Properties に自動バックアップ。
 */

var PROVIDER_SHEET_NAME = 'プロバイダマスタ';
var PROVIDER_DATA_KEY   = 'provider_data_v1';

function setupProviderMaster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(PROVIDER_SHEET_NAME);

  // 既存データを退避
  if (sheet) {
    _providerSave(sheet);
    sheet.clearContents();
  } else {
    sheet = ss.insertSheet(PROVIDER_SHEET_NAME);
  }

  // ヘッダー
  var headers = ['プロバイダ', '前払い率', '残額振込月数', '想定単価下限', '想定単価上限', '備考'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');

  // デフォルトデータ（初回のみ反映 / 以降は退避データで上書き）
  var defaults = [
    ['三多摩',      0.5,  2, 20000, 25000, '売上半額当日振込'],
    ['PickGo',      '',   '', '',    '',    '要確認'],
    ['Amazon Flex', '',   '', '',    '',    '要確認'],
    ['ハコベル',    '',   '', '',    '',    '要確認'],
    ['その他',      1.0,  0,  0,     0,    '全額当日'],
    ['休み',        0,    0,  0,     0,    '稼働なし'],
    ['web収益',     1.0,  0,  0,     0,    '各サービス別途管理'],
  ];
  sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);

  // 書式
  sheet.getRange(2, 2, defaults.length, 1).setNumberFormat('0%');
  sheet.getRange(2, 4, defaults.length, 2).setNumberFormat('¥#,##0');

  // 列幅
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 200);
  sheet.setFrozenRows(1);

  // 退避データを復元（デフォルト値を上書き）
  _providerRestore(sheet);

  Logger.log('プロバイダマスタ セットアップ完了');
}

// ════════════════════════════════════════════════════════
// データ退避 / 復元
// ════════════════════════════════════════════════════════

/**
 * プロバイダ名をキーに B〜F 列の値を Script Properties に保存
 */
function _providerSave(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var data = {};

  values.forEach(function(row) {
    var name = String(row[0]).trim();
    if (!name) return;
    data[name] = {
      rate:     row[1],
      months:   row[2],
      priceMin: row[3],
      priceMax: row[4],
      memo:     row[5],
    };
  });

  try {
    PropertiesService.getScriptProperties().setProperty(
      PROVIDER_DATA_KEY, JSON.stringify(data)
    );
    Logger.log('プロバイダマスタ退避: ' + Object.keys(data).length + '件');
  } catch (e) {
    Logger.log('provider save error: ' + e.message);
  }
}

/**
 * Script Properties から復元。プロバイダ名で行を検索して上書き。
 */
function _providerRestore(sheet) {
  var raw = PropertiesService.getScriptProperties().getProperty(PROVIDER_DATA_KEY);
  if (!raw) return;

  var data;
  try { data = JSON.parse(raw); } catch (e) { return; }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var names = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  names.forEach(function(row, i) {
    var name = String(row[0]).trim();
    if (!name || !data[name]) return;
    var d = data[name];
    var sheetRow = i + 2;
    sheet.getRange(sheetRow, 2).setValue(d.rate);
    sheet.getRange(sheetRow, 3).setValue(d.months);
    sheet.getRange(sheetRow, 4).setValue(d.priceMin);
    sheet.getRange(sheetRow, 5).setValue(d.priceMax);
    sheet.getRange(sheetRow, 6).setValue(d.memo);
  });

  Logger.log('プロバイダマスタ復元完了');
}

// ════════════════════════════════════════════════════════
// onEdit ハンドラ（Main.gs の onEdit から呼ばれる）
// ════════════════════════════════════════════════════════

/**
 * プロバイダマスタが編集されるたびに差分保存
 */
function providerOnEdit(e) {
  var sheet = e.range.getSheet();
  var col   = e.range.getColumn();
  var row   = e.range.getRow();

  if (row < 2 || col < 1 || col > 6) return;

  if (col === 1) {
    // プロバイダ名変更 → 全保存
    _providerSave(sheet);
    return;
  }

  // 差分保存
  var name = String(sheet.getRange(row, 1).getValue()).trim();
  if (!name) return;

  var raw = PropertiesService.getScriptProperties().getProperty(PROVIDER_DATA_KEY);
  var data;
  try { data = raw ? JSON.parse(raw) : {}; } catch (err) { data = {}; }

  if (!data[name]) data[name] = {rate: '', months: '', priceMin: '', priceMax: '', memo: ''};

  var colMap = {2: 'rate', 3: 'months', 4: 'priceMin', 5: 'priceMax', 6: 'memo'};
  data[name][colMap[col]] = e.range.getValue();

  try {
    PropertiesService.getScriptProperties().setProperty(
      PROVIDER_DATA_KEY, JSON.stringify(data)
    );
  } catch (err) {
    Logger.log('provider onEdit save error: ' + err.message);
  }
}
