/**
 * Layer1_Input.gs - 入力シート構築
 * シート名: 4_Income_Log（旧: 入力）
 * GASはヘッダー行（1行目）のみ管理。2行目以降はMASA聖域。
 */

function setupInputSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_INPUT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_INPUT, 0);
    Logger.log('入力シート作成: ' + SHEET_INPUT);
  } else {
    Logger.log('入力シート更新（ヘッダーのみ）: ' + SHEET_INPUT);
  }

  // ヘッダー設定（1行目のみ）
  var headers = ['日付', 'プロバイダ', '売上', 'メモ'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 250);

  // B列プルダウン
  var providerList = ['三多摩', 'PickGo', 'Amazon Flex', 'ハコベル', 'その他', '休み', 'web収益'];
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(providerList, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 2, 1000, 1).setDataValidation(rule);

  sheet.getRange(2, 1, 1000, 1).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(2, 3, 1000, 1).setNumberFormat('¥#,##0');
  sheet.setFrozenRows(1);

  Logger.log('入力シート セットアップ完了');
}
