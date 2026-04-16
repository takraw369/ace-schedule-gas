/**
 * Utils.gs - バックアップ等ユーティリティ
 */

/**
 * 入力シートをバックアップ（GAS実行前に自動呼び出し）
 * - シート名: 入力_backup_YYYY-MM-DD
 * - 7日以上古いバックアップは自動削除
 */
function backupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inputSheet = ss.getSheetByName('入力');

  if (!inputSheet) {
    Logger.log('入力シートなし — バックアップスキップ');
    return;
  }

  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var backupName = '入力_backup_' + today;

  // 同日バックアップが既にあればスキップ
  if (ss.getSheetByName(backupName)) {
    Logger.log('本日分バックアップ既存 — スキップ: ' + backupName);
    return;
  }

  // バックアップ作成
  var backup = inputSheet.copyTo(ss);
  backup.setName(backupName);
  backup.setTabColor('#666666');
  Logger.log('バックアップ作成: ' + backupName);

  // 7日以上古いバックアップを削除
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  ss.getSheets().forEach(function(sheet) {
    var name = sheet.getName();
    if (name.indexOf('入力_backup_') === 0) {
      var dateStr = name.replace('入力_backup_', '');
      var sheetDate = new Date(dateStr);
      if (!isNaN(sheetDate.getTime()) && sheetDate < cutoff) {
        Logger.log('古いバックアップ削除: ' + name);
        ss.deleteSheet(sheet);
      }
    }
  });
}

/**
 * サンプルデータを削除（Phase 3 テスト完了後に使用）
 */
function clearSampleData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  var confirm = ui.alert(
    'サンプルデータ削除',
    '入力シートの2行目以降をすべて削除します。\n本当によろしいですか？',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) {
    Logger.log('サンプルデータ削除キャンセル');
    return;
  }

  backupSheet(); // 削除前にバックアップ

  var inputSheet = ss.getSheetByName('入力');
  if (inputSheet && inputSheet.getLastRow() > 1) {
    inputSheet.getRange(2, 1, inputSheet.getLastRow() - 1, 4).clearContent();
    Logger.log('サンプルデータ削除完了');
    ui.alert('サンプルデータを削除しました。');
  } else {
    Logger.log('削除対象データなし');
    ui.alert('削除対象のデータがありませんでした。');
  }
}
