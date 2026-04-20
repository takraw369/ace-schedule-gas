/**
 * Utils.gs - ユーティリティ関数
 */

// ════════════════════════════════════════════════════════
// 設定値取得（5_Master_Config シートから）
// ════════════════════════════════════════════════════════

/**
 * 5_Master_Config からキーに対応する値を返す。
 * シートが存在しない or キーが見つからない場合は null。
 */
function getConfig(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_MASTER_CONFIG);
  if (!sheet || sheet.getLastRow() < 2) return null;

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      var v = data[i][1];
      return (v === '' || v === null || v === undefined) ? null : v;
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════
// バックアップ
// ════════════════════════════════════════════════════════

/**
 * 入力シート（4_Income_Log）をバックアップ
 * - シート名: 4_Income_Log_backup_YYYY-MM-DD
 * - 7日以上古いバックアップは自動削除
 */
function backupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inputSheet = ss.getSheetByName(SHEET_INPUT);

  if (!inputSheet) {
    Logger.log(SHEET_INPUT + ' シートなし — バックアップスキップ');
    return;
  }

  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var backupName = SHEET_INPUT + '_backup_' + today;

  if (ss.getSheetByName(backupName)) {
    Logger.log('本日分バックアップ既存 — スキップ: ' + backupName);
    return;
  }

  var backup = inputSheet.copyTo(ss);
  backup.setName(backupName);
  backup.setTabColor('#666666');
  Logger.log('バックアップ作成: ' + backupName);

  // 7日以上古いバックアップを削除
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  ss.getSheets().forEach(function(sheet) {
    var name = sheet.getName();
    if (name.indexOf(SHEET_INPUT + '_backup_') === 0) {
      var dateStr = name.replace(SHEET_INPUT + '_backup_', '');
      var sheetDate = new Date(dateStr);
      if (!isNaN(sheetDate.getTime()) && sheetDate < cutoff) {
        Logger.log('古いバックアップ削除: ' + name);
        ss.deleteSheet(sheet);
      }
    }
  });
}

// ════════════════════════════════════════════════════════
// サンプルデータ削除
// ════════════════════════════════════════════════════════

function clearSampleData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  var confirm = ui.alert(
    'サンプルデータ削除',
    SHEET_INPUT + ' シートの2行目以降をすべて削除します。\n本当によろしいですか？',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    Logger.log('サンプルデータ削除キャンセル');
    return;
  }

  backupSheet();

  var inputSheet = ss.getSheetByName(SHEET_INPUT);
  if (inputSheet && inputSheet.getLastRow() > 1) {
    inputSheet.getRange(2, 1, inputSheet.getLastRow() - 1, 4).clearContent();
    Logger.log('サンプルデータ削除完了');
    ui.alert('サンプルデータを削除しました。');
  } else {
    Logger.log('削除対象データなし');
    ui.alert('削除対象のデータがありませんでした。');
  }
}
