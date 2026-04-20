/**
 * Layer1_ACESchedule.gs - 1_ACE_Schedule シート構築
 *
 * ACEクライアント（リアン）管理シート。
 * GASはヘッダーのみ管理。2行目以降はMASA聖域。
 */

function setup1ACESchedule() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ACE_SCHEDULE);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ACE_SCHEDULE);
    Logger.log('1_ACE_Schedule シート作成');
  } else {
    Logger.log('1_ACE_Schedule シート更新（ヘッダーのみ）');
  }

  sheet.setTabColor('#1a6b2e');

  // ヘッダー
  var headers = [
    'クライアント名', 'フェーズ', '契約開始日', '次のアクション期日',
    'ACE進捗(%)', '支払い形態', '契約金額', 'メモ'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');

  // フェーズのプルダウン（B列）
  var phases = ['商談中', '契約前', 'Phase1', 'Phase2', 'Phase3', '完了', '停止'];
  var phaseRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(phases, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 2, 200, 1).setDataValidation(phaseRule);

  // 支払い形態のプルダウン（F列）
  var payTypes = ['一括', '3分割', '月額', 'その他'];
  var payRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(payTypes, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, 200, 1).setDataValidation(payRule);

  // 書式
  sheet.getRange(2, 3, 200, 2).setNumberFormat('yyyy/mm/dd'); // 日付列
  sheet.getRange(2, 5, 200, 1).setNumberFormat('0"%"');       // 進捗
  sheet.getRange(2, 7, 200, 1).setNumberFormat('¥#,##0');     // 契約金額

  // 列幅
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 90);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 250);

  sheet.setFrozenRows(1);
  Logger.log('1_ACE_Schedule セットアップ完了');
}
