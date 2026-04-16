/**
 * Layer2_Calc.gs - 計算シート構築
 * シート名: 計算
 * GAS実行のたびに再生成OK。データはここに残さない。
 */

function setupCalcSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inputSheet = ss.getSheetByName('入力');

  if (!inputSheet) {
    Logger.log('ERROR: 入力シートが見つかりません。先にsetupInputSheet()を実行してください。');
    throw new Error('入力シートが見つかりません');
  }

  var sheetName = '計算';
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log('計算シート作成: ' + sheetName);
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

  // ヘッダースタイル
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e')
    .setFontColor('#d4af37')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // 入力シートのデータ行数を確認（ヘッダー除く）
  var maxRows = 500; // 最大500行分の数式を設定

  // 各列に数式を設定（2行目から）
  for (var i = 2; i <= maxRows + 1; i++) {
    var inputRow = i;

    // A列: 日付
    sheet.getRange(i, 1).setFormula('=IFERROR(IF(入力!A' + inputRow + '="","",入力!A' + inputRow + '),"")');

    // B列: プロバイダ
    sheet.getRange(i, 2).setFormula('=IFERROR(IF(入力!B' + inputRow + '="","",入力!B' + inputRow + '),"")');

    // C列: 売上
    sheet.getRange(i, 3).setFormula('=IFERROR(IF(入力!C' + inputRow + '="","",入力!C' + inputRow + '),"")');

    // D列: 前払い率
    sheet.getRange(i, 4).setFormula('=IFERROR(IF(B' + i + '="","",VLOOKUP(B' + i + ',プロバイダマスタ!A:B,2,FALSE)),0)');

    // E列: 前払い額
    sheet.getRange(i, 5).setFormula('=IFERROR(IF(C' + i + '="","",C' + i + '*D' + i + '),"")');

    // F列: 繰越額
    sheet.getRange(i, 6).setFormula('=IFERROR(IF(C' + i + '="","",C' + i + '-E' + i + '),"")');

    // G列: 繰越入金予定日
    sheet.getRange(i, 7).setFormula(
      '=IFERROR(IF(A' + i + '="","",IF(VLOOKUP(B' + i + ',プロバイダマスタ!A:C,3,FALSE)=0,A' + i + ',' +
      'EDATE(A' + i + ',VLOOKUP(B' + i + ',プロバイダマスタ!A:C,3,FALSE))+10-DAY(EDATE(A' + i + ',VLOOKUP(B' + i + ',プロバイダマスタ!A:C,3,FALSE))))),"")');

    // H列: 実入金日(当日分)
    sheet.getRange(i, 8).setFormula('=IFERROR(IF(A' + i + '="","",A' + i + '),"")');
  }

  // 書式設定
  sheet.getRange(2, 1, maxRows, 1).setNumberFormat('yyyy/mm/dd'); // 日付
  sheet.getRange(2, 3, maxRows, 1).setNumberFormat('¥#,##0');     // 売上
  sheet.getRange(2, 4, maxRows, 1).setNumberFormat('0%');         // 前払い率
  sheet.getRange(2, 5, maxRows, 1).setNumberFormat('¥#,##0');     // 前払い額
  sheet.getRange(2, 6, maxRows, 1).setNumberFormat('¥#,##0');     // 繰越額
  sheet.getRange(2, 7, maxRows, 1).setNumberFormat('yyyy/mm/dd'); // 繰越入金予定日
  sheet.getRange(2, 8, maxRows, 1).setNumberFormat('yyyy/mm/dd'); // 実入金日

  // 列幅
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
