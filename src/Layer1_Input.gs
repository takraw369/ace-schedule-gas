/**
 * Layer1_Input.gs - 入力シート構築
 * シート名: 入力
 * GASはヘッダー行（1行目）のみ管理。2行目以降はMASA聖域。
 */

function setupInputSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = '入力';
  var sheet = ss.getSheetByName(sheetName);

  // シートがなければ作成、あればヘッダーだけ更新
  if (!sheet) {
    sheet = ss.insertSheet(sheetName, 0);
    Logger.log('入力シート作成: ' + sheetName);
  } else {
    Logger.log('入力シート更新（ヘッダーのみ）: ' + sheetName);
  }

  // ヘッダー設定（1行目のみ）
  var headers = ['日付', 'プロバイダ', '売上', 'メモ'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダースタイル
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // 列幅
  sheet.setColumnWidth(1, 110); // 日付
  sheet.setColumnWidth(2, 150); // プロバイダ
  sheet.setColumnWidth(3, 100); // 売上
  sheet.setColumnWidth(4, 250); // メモ

  // B列（プロバイダ）のプルダウン（2行目以降）
  var providerList = ['三多摩', 'PickGo', 'Amazon Flex', 'ハコベル', 'その他', '休み', 'web収益'];
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(providerList, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 2, 1000, 1).setDataValidation(rule);

  // A列（日付）の書式
  sheet.getRange(2, 1, 1000, 1).setNumberFormat('yyyy/mm/dd');

  // C列（売上）の書式
  sheet.getRange(2, 3, 1000, 1).setNumberFormat('¥#,##0');

  // 行を1行目でフリーズ
  sheet.setFrozenRows(1);

  Logger.log('入力シート セットアップ完了');
}
