/**
 * Layer3_Dashboard.gs - 0_DASHBOARD 生成
 *
 * 旧「ダッシュボード」シートを廃止し 0_DASHBOARD に統合。
 * 4_Income_Log / 計算 シートを SUMPRODUCT で集計して表示。
 */

function setupDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_DASHBOARD);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DASHBOARD);
  } else {
    sheet.clearContents();
    sheet.clearFormats();
  }

  sheet.setTabColor('#d4af37');

  var iRef = REF_INPUT; // '4_Income_Log'!
  var cRef = REF_CALC;  // 計算!
  var row  = 1;

  // タイトル
  sheet.getRange(row, 1, 1, 4).merge()
    .setValue('ACE Schedule ダッシュボード')
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center');
  row += 2;

  // ── 今週 予定収入 ────────────────────────────────
  _cSection(sheet, row, '今週 予定収入'); row++;

  sheet.getRange(row, 1).setValue('前払い合計').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((WEEKNUM(' + cRef + 'A2:A501,2)=WEEKNUM(TODAY(),2))' +
    '*(YEAR(' + cRef + 'A2:A501)=YEAR(TODAY()))*' + cRef + 'E2:E501),0)'
  ).setNumberFormat('¥#,##0');
  row++;

  sheet.getRange(row, 1).setValue('繰越入金合計（今週着金予定）').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((WEEKNUM(' + cRef + 'G2:G501,2)=WEEKNUM(TODAY(),2))' +
    '*(YEAR(' + cRef + 'G2:G501)=YEAR(TODAY()))*' + cRef + 'F2:F501),0)'
  ).setNumberFormat('¥#,##0');
  row += 2;

  // ── 今週 実績収入 ────────────────────────────────
  _cSection(sheet, row, '今週 実績収入'); row++;

  sheet.getRange(row, 1).setValue('売上合計').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((WEEKNUM(' + iRef + 'A2:A1001,2)=WEEKNUM(TODAY(),2))' +
    '*(YEAR(' + iRef + 'A2:A1001)=YEAR(TODAY()))' +
    '*(' + iRef + 'B2:B1001<>"休み")*(' + iRef + 'C2:C1001<>""),' +
    iRef + 'C2:C1001),0)'
  ).setNumberFormat('¥#,##0');
  row += 2;

  // ── 今月 実績 ────────────────────────────────────
  _cSection(sheet, row, '今月 実績'); row++;

  sheet.getRange(row, 1).setValue('売上合計').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(' + iRef + 'A2:A1001)=MONTH(TODAY()))' +
    '*(YEAR(' + iRef + 'A2:A1001)=YEAR(TODAY()))' +
    '*(' + iRef + 'B2:B1001<>"休み")*(' + iRef + 'C2:C1001<>""),' +
    iRef + 'C2:C1001),0)'
  ).setNumberFormat('¥#,##0');
  row++;

  sheet.getRange(row, 1).setValue('稼働日数').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(' + iRef + 'A2:A1001)=MONTH(TODAY()))' +
    '*(YEAR(' + iRef + 'A2:A1001)=YEAR(TODAY()))' +
    '*(' + iRef + 'B2:B1001<>"休み")*(' + iRef + 'B2:B1001<>"")),0)'
  );
  row += 2;

  // ── 繰越入金予定 ─────────────────────────────────
  _cSection(sheet, row, '繰越入金予定'); row++;

  sheet.getRange(row, 1).setValue('翌月10日 着金予定').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(' + cRef + 'G2:G501)=MONTH(EDATE(TODAY(),1)))' +
    '*(YEAR(' + cRef + 'G2:G501)=YEAR(EDATE(TODAY(),1)))' +
    '*(DAY(' + cRef + 'G2:G501)=10)*' + cRef + 'F2:F501),0)'
  ).setNumberFormat('¥#,##0');
  row++;

  sheet.getRange(row, 1).setValue('翌々月10日 着金予定').setFontWeight('bold');
  sheet.getRange(row, 2).setFormula(
    '=IFERROR(SUMPRODUCT((MONTH(' + cRef + 'G2:G501)=MONTH(EDATE(TODAY(),2)))' +
    '*(YEAR(' + cRef + 'G2:G501)=YEAR(EDATE(TODAY(),2)))' +
    '*(DAY(' + cRef + 'G2:G501)=10)*' + cRef + 'F2:F501),0)'
  ).setNumberFormat('¥#,##0');
  row += 2;

  // ── プロバイダ別 今月売上 ─────────────────────────
  _cSection(sheet, row, 'プロバイダ別 今月売上'); row++;

  var providers = ['三多摩', 'PickGo', 'Amazon Flex', 'ハコベル', 'その他', 'web収益'];
  providers.forEach(function(p) {
    sheet.getRange(row, 1).setValue(p).setFontWeight('bold');
    sheet.getRange(row, 2).setFormula(
      '=IFERROR(SUMPRODUCT((MONTH(' + iRef + 'A2:A1001)=MONTH(TODAY()))' +
      '*(YEAR(' + iRef + 'A2:A1001)=YEAR(TODAY()))' +
      '*(' + iRef + 'B2:B1001="' + p + '"),' +
      iRef + 'C2:C1001),0)'
    ).setNumberFormat('¥#,##0');
    row++;
  });

  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 130);
  sheet.setFrozenRows(1);

  Logger.log('0_DASHBOARD セットアップ完了');
}
