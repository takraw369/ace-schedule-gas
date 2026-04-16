/**
 * Layer3_Dashboard.gs - ダッシュボード構築
 * シート名: ダッシュボード
 */

function setupDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = 'ダッシュボード';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log('ダッシュボードシート作成');
  } else {
    sheet.clearContents();
    sheet.clearFormats();
    Logger.log('ダッシュボードシートをリセット');
  }

  // 全体スタイル
  sheet.setTabColor('#d4af37');

  var row = 1;

  // タイトル
  sheet.getRange(row, 1, 1, 4).merge()
    .setValue('ACE Schedule ダッシュボード')
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setFontSize(16)
    .setHorizontalAlignment('center');
  row += 2;

  // ---- 今週予定収入 ----
  row = addSection(sheet, row, '今週 予定収入');

  sheet.getRange(row, 1).setValue('前払い合計').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((WEEKNUM(計算!A2:A501,2)=WEEKNUM(TODAY(),2))*(YEAR(計算!A2:A501)=YEAR(TODAY()))*計算!E2:E501),0)'
  ).setNumberFormat('¥#,##0');
  row++;

  sheet.getRange(row, 1).setValue('繰越入金合計（今週着金予定）').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((WEEKNUM(計算!G2:G501,2)=WEEKNUM(TODAY(),2))*(YEAR(計算!G2:G501)=YEAR(TODAY()))*計算!F2:F501),0)'
  ).setNumberFormat('¥#,##0');
  row += 2;

  // ---- 今週実績収入 ----
  row = addSection(sheet, row, '今週 実績収入');

  sheet.getRange(row, 1).setValue('売上合計').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((WEEKNUM(入力!A2:A1001,2)=WEEKNUM(TODAY(),2))*(YEAR(入力!A2:A1001)=YEAR(TODAY()))*(入力!B2:B1001<>"休み")*(入力!C2:C1001<>""),入力!C2:C1001),0)'
  ).setNumberFormat('¥#,##0');
  row += 2;

  // ---- 今月実績 ----
  row = addSection(sheet, row, '今月 実績');

  sheet.getRange(row, 1).setValue('売上合計').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(入力!A2:A1001)=MONTH(TODAY()))*(YEAR(入力!A2:A1001)=YEAR(TODAY()))*(入力!B2:B1001<>"休み")*(入力!C2:C1001<>""),入力!C2:C1001),0)'
  ).setNumberFormat('¥#,##0');
  row++;

  sheet.getRange(row, 1).setValue('稼働日数').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(入力!A2:A1001)=MONTH(TODAY()))*(YEAR(入力!A2:A1001)=YEAR(TODAY()))*(入力!B2:B1001<>"休み")*(入力!B2:B1001<>"")),0)'
  );
  row += 2;

  // ---- 次回繰越入金額 ----
  row = addSection(sheet, row, '繰越入金予定');

  sheet.getRange(row, 1).setValue('翌月10日 着金予定').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(計算!G2:G501)=MONTH(EDATE(TODAY(),1)))*(YEAR(計算!G2:G501)=YEAR(EDATE(TODAY(),1)))*(DAY(計算!G2:G501)=10)*計算!F2:F501),0)'
  ).setNumberFormat('¥#,##0');
  row++;

  sheet.getRange(row, 1).setValue('翌々月10日 着金予定').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(計算!G2:G501)=MONTH(EDATE(TODAY(),2)))*(YEAR(計算!G2:G501)=YEAR(EDATE(TODAY(),2)))*(DAY(計算!G2:G501)=10)*計算!F2:F501),0)'
  ).setNumberFormat('¥#,##0');
  row += 2;

  // ---- プロバイダ別売上構成比 ----
  row = addSection(sheet, row, 'プロバイダ別 今月売上');

  var providers = ['三多摩', 'PickGo', 'Amazon Flex', 'ハコベル', 'その他', 'web収益'];
  providers.forEach(function(p) {
    sheet.getRange(row, 1).setValue(p).setFontWeight('bold');
    sheet.getRange(row, 2).setFormula(
      '=IFERROR(SUMPRODUCT((MONTH(入力!A2:A1001)=MONTH(TODAY()))*(YEAR(入力!A2:A1001)=YEAR(TODAY()))*(入力!B2:B1001="' + p + '"),入力!C2:C1001),0)'
    ).setNumberFormat('¥#,##0');
    row++;
  });

  // 列幅
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 130);

  Logger.log('ダッシュボード セットアップ完了');
}

/**
 * セクションヘッダーを追加するヘルパー
 */
function addSection(sheet, row, title) {
  sheet.getRange(row, 1, 1, 4).merge()
    .setValue(title)
    .setBackground('#16213e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setFontSize(12);
  return row + 1;
}
