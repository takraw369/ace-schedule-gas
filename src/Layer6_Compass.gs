/**
 * Layer6_Compass.gs - 💰財務コンパス
 *
 * 固定費・欲しいものリスト・収益見立て・フェードアウトラインを一枚に統合。
 * 初回のみGASが初期データを埋め込む。2回目以降は手動編集を保護してスキップ。
 */

function setupFinanceCompass() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = '💰財務コンパス';

  // 既存シートは再生成しない（手動編集保護）
  if (ss.getSheetByName(sheetName)) {
    SpreadsheetApp.getUi().alert(
      '💰財務コンパスは既に存在します。\n' +
      '手動編集を保護するため再生成はスキップしました。\n\n' +
      'リセットしたい場合はシートを手動で削除してから再実行してください。'
    );
    return;
  }

  var sheet = ss.insertSheet(sheetName);
  sheet.setTabColor('#d4af37');

  var r = 1;

  // ── タイトル ──────────────────────────────────────────
  sheet.getRange(r, 1, 1, 4).merge()
    .setValue('💰 MASA 財務コンパス')
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center');
  r += 2;

  // ════════════════════════════════════════════════════════
  // A: 月間固定費
  // ════════════════════════════════════════════════════════
  _cSection(sheet, r, '📋 月間固定費'); r++;

  sheet.getRange(r, 1, 1, 4).setValues([['項目', '月額', '支払日', 'メモ']]);
  _cSubHeader(sheet, r, 4); r++;

  var FIXED_DATA_START = r;
  var fixedRows = [
    ['家賃',              45000, 27,  ''],
    ['車リース',          45000, 27,  ''],
    ['駐車場・車諸経費',  30000, '',  ''],
    ['ガソリン',           8000, '',  '概算'],
    ['光熱費',            20000, 27,  ''],
    ['WiFi',               3800, 27,  ''],
    ['電話代（3名）',     10000, 27,  ''],
    ['AI/web諸経費',      15000,  1,  ''],
    ['食費補填',          10000, '',  ''],
  ];
  sheet.getRange(r, 1, fixedRows.length, 4).setValues(fixedRows);
  sheet.getRange(r, 2, fixedRows.length, 1).setNumberFormat('¥#,##0');
  sheet.getRange(r, 3, fixedRows.length, 1).setNumberFormat('0"日"');
  r += fixedRows.length;

  // 手入力用空行 x5
  sheet.getRange(r, 2, 5, 1).setNumberFormat('¥#,##0');
  r += 5;

  // 月最低必要額
  var FIXED_TOTAL_ROW = r;
  sheet.getRange(r, 1).setValue('月最低必要額').setFontWeight('bold');
  sheet.getRange(r, 2)
    .setFormula('=SUM(B' + FIXED_DATA_START + ':B' + (r - 1) + ')')
    .setFontWeight('bold').setFontSize(12).setNumberFormat('¥#,##0');
  r++;

  // 緊急ライン（×2ヶ月）
  var EMERGENCY_ROW = r;
  sheet.getRange(r, 1).setValue('緊急ライン（×2ヶ月）').setFontWeight('bold').setFontColor('#cc0000');
  sheet.getRange(r, 2)
    .setFormula('=B' + FIXED_TOTAL_ROW + '*2')
    .setFontWeight('bold').setFontColor('#cc0000').setNumberFormat('¥#,##0');
  sheet.getRange(r, 3).setValue('← 今月これを超えないと詰む').setFontColor('#cc0000').setItalic(true);
  r += 2;

  // ════════════════════════════════════════════════════════
  // B: 欲しいものリスト
  // ════════════════════════════════════════════════════════
  _cSection(sheet, r, '🛒 欲しいものリスト'); r++;

  // リアン単価（参照セル）
  sheet.getRange(r, 1).setValue('リアン単価').setFontWeight('bold');
  sheet.getRange(r, 2).setValue(300000).setNumberFormat('¥#,##0');
  sheet.getRange(r, 3).setValue('← 受注金額に合わせて更新').setFontColor('#999999').setItalic(true);
  var RIAN_CELL = 'B' + r;
  r++;

  sheet.getRange(r, 1, 1, 4).setValues([['品名', '金額', '配送で何日分', 'リアン何人分']]);
  _cSubHeader(sheet, r, 4); r++;

  var WISH_DATA_START = r;
  var wishItems = [
    ['冷蔵庫',               55000],
    ['運送ガジェット',       20000],
    ['仕事着・靴',           15000],
    ['ElevenLabs等（月）',    3000],
  ];
  wishItems.forEach(function(item) {
    sheet.getRange(r, 1).setValue(item[0]);
    sheet.getRange(r, 2).setValue(item[1]).setNumberFormat('¥#,##0');
    sheet.getRange(r, 3).setFormula(
      '=IFERROR(ROUND(B' + r + '/(B' + FIXED_TOTAL_ROW + '/26),1),"")'
    );
    sheet.getRange(r, 4).setFormula(
      '=IFERROR(ROUND(B' + r + '/' + RIAN_CELL + ',2),"")'
    );
    r++;
  });

  // 手入力枠 x3（数式のみ設定）
  for (var i = 0; i < 3; i++) {
    sheet.getRange(r, 2, 1, 1).setNumberFormat('¥#,##0');
    sheet.getRange(r, 3).setFormula(
      '=IFERROR(ROUND(B' + r + '/(B' + FIXED_TOTAL_ROW + '/26),1),"")'
    );
    sheet.getRange(r, 4).setFormula(
      '=IFERROR(ROUND(B' + r + '/' + RIAN_CELL + ',2),"")'
    );
    r++;
  }

  // 合計
  var WISH_TOTAL_ROW = r;
  sheet.getRange(r, 1).setValue('合計').setFontWeight('bold');
  sheet.getRange(r, 2)
    .setFormula('=SUM(B' + WISH_DATA_START + ':B' + (r - 1) + ')')
    .setFontWeight('bold').setNumberFormat('¥#,##0');
  r += 2;

  // ════════════════════════════════════════════════════════
  // C: 今月 収益見立て（入力シート連動）
  // ════════════════════════════════════════════════════════
  _cSection(sheet, r, '📊 今月 収益見立て（自動連動）'); r++;

  // 配送実績
  sheet.getRange(r, 1).setValue('▶ 配送 実績').setFontWeight('bold'); r++;

  var DELIVERY_TOTAL_ROW = r;
  sheet.getRange(r, 1).setValue('今月売上合計');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(入力!A2:A1001)=MONTH(TODAY()))*' +
      '(YEAR(入力!A2:A1001)=YEAR(TODAY()))*' +
      '(入力!B2:B1001<>"休み")*' +
      '(入力!C2:C1001<>""),' +
      '入力!C2:C1001),0)'
  ).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('今月稼働日数');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(入力!A2:A1001)=MONTH(TODAY()))*' +
      '(YEAR(入力!A2:A1001)=YEAR(TODAY()))*' +
      '(入力!B2:B1001<>"休み")*' +
      '(入力!B2:B1001<>"")),0)'
  ); r++;

  sheet.getRange(r, 1).setValue('三多摩 前払い着金済み');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(計算!A2:A501)=MONTH(TODAY()))*' +
      '(YEAR(計算!A2:A501)=YEAR(TODAY()))*' +
      '計算!E2:E501),0)'
  ).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('翌月着金予定（繰越分）');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(計算!G2:G501)=MONTH(EDATE(TODAY(),1)))*' +
      '(YEAR(計算!G2:G501)=YEAR(EDATE(TODAY(),1)))*' +
      '計算!F2:F501),0)'
  ).setNumberFormat('¥#,##0'); r += 2;

  // ACE / web（手入力）
  sheet.getRange(r, 1).setValue('▶ ACE / web（手入力）').setFontWeight('bold'); r++;

  var ACE_ROW = r;
  sheet.getRange(r, 1).setValue('ACE収益（今月）');
  sheet.getRange(r, 2).setValue(0).setNumberFormat('¥#,##0'); r++;

  var WEB_ROW = r;
  sheet.getRange(r, 1).setValue('その他web収益');
  sheet.getRange(r, 2).setValue(0).setNumberFormat('¥#,##0'); r += 2;

  // 合計 & 差分
  var INCOME_TOTAL_ROW = r;
  sheet.getRange(r, 1).setValue('今月収益合計').setFontWeight('bold');
  sheet.getRange(r, 2)
    .setFormula('=B' + DELIVERY_TOTAL_ROW + '+B' + ACE_ROW + '+B' + WEB_ROW)
    .setFontWeight('bold').setFontSize(12).setNumberFormat('¥#,##0');
  r++;

  sheet.getRange(r, 1).setValue('緊急ラインとの差').setFontWeight('bold').setFontColor('#cc0000');
  sheet.getRange(r, 2)
    .setFormula('=B' + INCOME_TOTAL_ROW + '-B' + EMERGENCY_ROW)
    .setFontWeight('bold').setFontColor('#cc0000').setNumberFormat('¥#,##0');
  sheet.getRange(r, 3).setValue('← マイナス = リアン獲得が急務').setFontColor('#cc0000').setItalic(true);
  r += 2;

  // ════════════════════════════════════════════════════════
  // D: 配送フェードアウトライン
  // ════════════════════════════════════════════════════════
  _cSection(sheet, r, '🚪 配送フェードアウトライン'); r++;

  sheet.getRange(r, 1).setValue('生活費月額（固定費合計）');
  sheet.getRange(r, 2).setFormula('=B' + FIXED_TOTAL_ROW).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('配送やめるに必要なACE月収');
  sheet.getRange(r, 2).setFormula('=B' + FIXED_TOTAL_ROW).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('必要リアン数（3ヶ月並行）').setFontWeight('bold');
  sheet.getRange(r, 2)
    .setFormula('=CEILING(B' + FIXED_TOTAL_ROW + '*3/' + RIAN_CELL + ',1)')
    .setFontWeight('bold').setFontSize(14);
  sheet.getRange(r, 3).setValue('← これが揃えば配送やめられる').setFontColor('#1a6b2e').setItalic(true);

  // ── 列幅 ────────────────────────────────────────────────
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 170);
  sheet.setColumnWidth(4, 130);

  sheet.setFrozenRows(1);

  Logger.log('💰財務コンパス セットアップ完了');
  SpreadsheetApp.getUi().alert(
    '💰財務コンパスを作成しました！\n\n' +
    '① リアン単価セルを実際の受注金額に更新\n' +
    '② ACE収益・web収益は月初にゼロリセット後、手入力'
  );
}

// ── ヘルパー ──────────────────────────────────────────────

function _cSection(sheet, row, title) {
  sheet.getRange(row, 1, 1, 4).merge()
    .setValue(title)
    .setBackground('#16213e').setFontColor('#d4af37')
    .setFontWeight('bold').setFontSize(12);
}

function _cSubHeader(sheet, row, cols) {
  sheet.getRange(row, 1, 1, cols)
    .setBackground('#2a2a4e').setFontColor('#ffffff')
    .setFontWeight('bold').setHorizontalAlignment('center');
}
