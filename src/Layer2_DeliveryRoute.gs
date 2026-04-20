/**
 * Layer2_DeliveryRoute.gs - 2_Delivery_Route シート構築
 *
 * 配送ルート・エリアマスタ。番地データはMASA聖域（2行目以降）。
 * Phase 2 でD1連携予定。
 */

function setup2DeliveryRoute() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_DELIVERY_ROUTE);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DELIVERY_ROUTE);
    Logger.log('2_Delivery_Route シート作成');
  } else {
    Logger.log('2_Delivery_Route シート更新（ヘッダーのみ）');
  }

  sheet.setTabColor('#4a90d9');

  // ヘッダー
  var headers = [
    'エリア名', 'プロバイダ', '拠点/集積所', '難易度(1-5)',
    '目安個数/日', '特記事項', 'メモ'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');

  // プロバイダのプルダウン（B列）
  var providers = ['三多摩', 'PickGo', 'Amazon Flex', 'ハコベル', 'その他'];
  var pRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(providers, true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 2, 200, 1).setDataValidation(pRule);

  // 難易度プルダウン（D列）
  var diffRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['1', '2', '3', '4', '5'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 4, 200, 1).setDataValidation(diffRule);

  // 列幅
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 90);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 200);
  sheet.setColumnWidth(7, 200);

  sheet.setFrozenRows(1);
  Logger.log('2_Delivery_Route セットアップ完了');
}
