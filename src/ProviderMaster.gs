/**
 * ProviderMaster.gs - プロバイダマスタシート（ビュー）
 *
 * データの源泉は 5_Master_Config。
 * このシートは getConfig() で値を読み取り、VLOOKUP用の表形式に変換するビュー。
 * ユーザーが直接編集する対象は 5_Master_Config シート。
 */

function setupProviderMaster() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PROVIDER);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PROVIDER);
    Logger.log('プロバイダマスタシート作成');
  } else {
    sheet.clearContents();
    Logger.log('プロバイダマスタシートを再生成');
  }

  // ヘッダー
  var headers = ['プロバイダ', '前払い率', '残額振込月数', '想定単価下限', '想定単価上限', '備考'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');

  // 5_Master_Config から値を取得してビュー生成
  // getConfig() が null の場合はデフォルト値を使用
  function gc(key, def) {
    var v = getConfig(key);
    return (v !== null) ? v : def;
  }

  var data = [
    ['三多摩',
      gc('PROVIDER_SANTAMA_ADVANCE_RATE',       0.5),
      gc('PROVIDER_SANTAMA_CARRYOVER_MONTHS',   2),
      gc('PROVIDER_SANTAMA_PRICE_MIN',          20000),
      gc('PROVIDER_SANTAMA_PRICE_MAX',          25000),
      '売上半額当日振込'],
    ['PickGo',
      gc('PROVIDER_PICKGO_ADVANCE_RATE',        ''),
      gc('PROVIDER_PICKGO_CARRYOVER_MONTHS',    ''),
      gc('PROVIDER_PICKGO_PRICE_MIN',           ''),
      gc('PROVIDER_PICKGO_PRICE_MAX',           ''),
      '要確認'],
    ['Amazon Flex',
      gc('PROVIDER_AMAZONFLEX_ADVANCE_RATE',    ''),
      gc('PROVIDER_AMAZONFLEX_CARRYOVER_MONTHS',''),
      '', '',
      '要確認'],
    ['ハコベル',
      gc('PROVIDER_HACOBELL_ADVANCE_RATE',      ''),
      gc('PROVIDER_HACOBELL_CARRYOVER_MONTHS',  ''),
      gc('PROVIDER_HACOBELL_UNIT_PRICE',        ''),
      '',
      '要確認'],
    ['その他',     1.0, 0, 0, 0, '全額当日'],
    ['休み',       0,   0, 0, 0, '稼働なし'],
    ['web収益',    1.0, 0, 0, 0, '各サービス別途管理'],
  ];

  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);

  // 書式
  sheet.getRange(2, 2, data.length, 1).setNumberFormat('0%');
  sheet.getRange(2, 4, data.length, 2).setNumberFormat('¥#,##0');

  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(3, 110);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 200);
  sheet.setFrozenRows(1);

  Logger.log('プロバイダマスタ ビュー生成完了（ソース: ' + SHEET_MASTER_CONFIG + '）');
}
