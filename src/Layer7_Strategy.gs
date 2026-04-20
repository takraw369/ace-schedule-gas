/**
 * Layer7_Strategy.gs - 7_Strategy シート構築
 *
 * 年間カレンダー + 重要イベント + want to do 管理。
 * GASはヘッダー・書式のみ。2行目以降はMASA聖域。
 */

function setup7Strategy() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_STRATEGY);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_STRATEGY);
    Logger.log('7_Strategy シート作成');
  } else {
    Logger.log('7_Strategy シート更新（ヘッダーのみ）');
  }

  sheet.setTabColor('#6a0dad');

  // ヘッダー
  var headers = [
    '日付', '曜', '残日数', 'イベント・メモ',
    '重要度(S/A/B)', 'カテゴリ', 'want to do', '達成'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');

  // 重要度プルダウン（E列）
  var priorityRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['S', 'A', 'B', '-'], true)
    .setAllowInvalid(false).build();
  sheet.getRange(2, 5, 400, 1).setDataValidation(priorityRule);

  // カテゴリプルダウン（F列）
  var catRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['家賃', '記念日', 'イベント', 'want to do', '仕事', '配送', 'ACE', 'その他'], true)
    .setAllowInvalid(true).build();
  sheet.getRange(2, 6, 400, 1).setDataValidation(catRule);

  // 達成チェックボックス（H列）
  sheet.getRange(2, 8, 400, 1).insertCheckboxes();

  // 書式
  sheet.getRange(2, 1, 400, 1).setNumberFormat('yyyy/mm/dd');

  // 列幅
  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 45);
  sheet.setColumnWidth(3, 65);
  sheet.setColumnWidth(4, 250);
  sheet.setColumnWidth(5, 80);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 200);
  sheet.setColumnWidth(8, 50);

  sheet.setFrozenRows(1);
  Logger.log('7_Strategy セットアップ完了');
}
