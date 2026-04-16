/**
 * ProviderMaster.gs - プロバイダマスタシート構築
 * シート名: プロバイダマスタ
 */

function setupProviderMaster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'プロバイダマスタ';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log('プロバイダマスタシート作成');
  } else {
    sheet.clearContents();
    Logger.log('プロバイダマスタシートをリセット');
  }

  // ヘッダー
  var headers = ['プロバイダ', '前払い率', '残額振込月数', '想定単価下限', '想定単価上限', '備考'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // データ
  var data = [
    ['三多摩',       0.5,  2, 20000, 25000, '売上半額当日振込'],
    ['PickGo',       '',   '', '',    '',    '要確認'],
    ['Amazon Flex',  '',   '', '',    '',    '要確認'],
    ['ハコベル',     '',   '', '',    '',    '要確認'],
    ['その他',       1.0,  0, 0,     0,     '全額当日'],
    ['休み',         0,    0, 0,     0,     '稼働なし'],
    ['web収益',      1.0,  0, 0,     0,     '各サービス別途管理'],
  ];

  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);

  // 書式
  sheet.getRange(2, 2, data.length, 1).setNumberFormat('0%');        // 前払い率
  sheet.getRange(2, 4, data.length, 2).setNumberFormat('¥#,##0');    // 単価

  // 列幅
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 200);

  sheet.setFrozenRows(1);

  Logger.log('プロバイダマスタ セットアップ完了');
}
