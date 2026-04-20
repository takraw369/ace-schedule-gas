/**
 * Layer2_Calc.gs - 計算シート構築
 * シート名: 計算
 * GAS実行のたびに再生成OK。データはここに残さない。
 */

function setupCalcSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inputSheet = ss.getSheetByName(SHEET_INPUT);

  if (!inputSheet) {
    Logger.log('ERROR: ' + SHEET_INPUT + ' シートが見つかりません。先にsetupInputSheet()を実行してください。');
    throw new Error(SHEET_INPUT + ' シートが見つかりません');
  }

  var sheet = ss.getSheetByName(SHEET_CALC);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CALC);
    Logger.log('計算シート作成: ' + SHEET_CALC);
  } else {
    sheet.clearContents();
    Logger.log('計算シートをクリアして再生成');
  }

  // ヘッダー
  var headers = [
    '日付', 'プロバイダ', '売上',
    '前払い率', '前払い額', '繰越額',
    '繰越入金予定日', '実入金日(当日分)'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  var maxRows = 500;

  for (var i = 2; i <= maxRows + 1; i++) {
    var r = i; // 計算シート行
    var iRef = REF_INPUT;   // '4_Income_Log'!
    var pRef = REF_PROVIDER; // プロバイダマスタ!

    // A列: 日付
    sheet.getRange(i, 1).setFormula(
      '=IFERROR(IF(' + iRef + 'A' + r + '="","",' + iRef + 'A' + r + '),"")');

    // B列: プロバイダ
    sheet.getRange(i, 2).setFormula(
      '=IFERROR(IF(' + iRef + 'B' + r + '="","",' + iRef + 'B' + r + '),"")');

    // C列: 売上
    sheet.getRange(i, 3).setFormula(
      '=IFERROR(IF(' + iRef + 'C' + r + '="","",' + iRef + 'C' + r + '),"")');

    // D列: 前払い率
    sheet.getRange(i, 4).setFormula(
      '=IFERROR(IF(B' + i + '="","",VLOOKUP(B' + i + ',' + pRef + 'A:B,2,FALSE)),0)');

    // E列: 前払い額
    sheet.getRange(i, 5).setFormula(
      '=IFERROR(IF(C' + i + '="","",C' + i + '*D' + i + '),"")');

    // F列: 繰越額
    sheet.getRange(i, 6).setFormula(
      '=IFERROR(IF(C' + i + '="","",C' + i + '-E' + i + '),"")');

    // G列: 繰越入金予定日
    sheet.getRange(i, 7).setFormula(
      '=IFERROR(IF(A' + i + '="","",IF(VLOOKUP(B' + i + ',' + pRef + 'A:C,3,FALSE)=0,A' + i + ',' +
      'EDATE(A' + i + ',VLOOKUP(B' + i + ',' + pRef + 'A:C,3,FALSE))+10-DAY(EDATE(A' + i + ',VLOOKUP(B' + i + ',' + pRef + 'A:C,3,FALSE))))),"")');

    // H列: 実入金日(当日分)
    sheet.getRange(i, 8).setFormula(
      '=IFERROR(IF(A' + i + '="","",A' + i + '),"")');
  }

  // 書式
  sheet.getRange(2, 1, maxRows, 1).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(2, 3, maxRows, 1).setNumberFormat('¥#,##0');
  sheet.getRange(2, 4, maxRows, 1).setNumberFormat('0%');
  sheet.getRange(2, 5, maxRows, 1).setNumberFormat('¥#,##0');
  sheet.getRange(2, 6, maxRows, 1).setNumberFormat('¥#,##0');
  sheet.getRange(2, 7, maxRows, 1).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(2, 8, maxRows, 1).setNumberFormat('yyyy/mm/dd');

  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 90);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 130);
  sheet.setColumnWidth(8, 130);
  sheet.setFrozenRows(1);

  Logger.log('計算シート セットアップ完了');
}
