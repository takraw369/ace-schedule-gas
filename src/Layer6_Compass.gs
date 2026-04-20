/**
 * Layer6_Compass.gs - 💰財務コンパス
 *
 * 固定費・欲しいものリスト・収益見立て・フェードアウトラインを一枚に統合。
 * 初回のみGASが初期データを埋め込む。以降は手動編集を Script Properties で保持。
 * COMPASS_SHEET_NAME は Config.gs で定義。
 */

var COMPASS_DATA_KEY = 'compass_data_v1';

// ════════════════════════════════════════════════════════
// メイン
// ════════════════════════════════════════════════════════

function setupFinanceCompass() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(COMPASS_SHEET_NAME);

  if (sheet) {
    _compassSave(sheet);
    sheet.clearContents();
    sheet.clearFormats();
  } else {
    sheet = ss.insertSheet(COMPASS_SHEET_NAME);
    sheet.setTabColor('#d4af37');
  }

  var r = 1;

  // ── タイトル ────────────────────────────────────────
  sheet.getRange(r, 1, 1, 4).merge()
    .setValue('💰 MASA 財務コンパス')
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setFontSize(16)
    .setHorizontalAlignment('center');
  r += 2;

  // ════════════════════════════════════════════════════
  // A: 月間固定費
  // ════════════════════════════════════════════════════
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

  sheet.getRange(r, 2, 5, 1).setNumberFormat('¥#,##0');
  r += 5;

  var FIXED_TOTAL_ROW = r;
  sheet.getRange(r, 1).setValue('月最低必要額').setFontWeight('bold');
  sheet.getRange(r, 2)
    .setFormula('=SUM(B' + FIXED_DATA_START + ':B' + (r - 1) + ')')
    .setFontWeight('bold').setFontSize(12).setNumberFormat('¥#,##0');
  r++;

  var EMERGENCY_ROW = r;
  sheet.getRange(r, 1).setValue('緊急ライン（×2ヶ月）').setFontWeight('bold').setFontColor('#cc0000');
  sheet.getRange(r, 2)
    .setFormula('=B' + FIXED_TOTAL_ROW + '*2')
    .setFontWeight('bold').setFontColor('#cc0000').setNumberFormat('¥#,##0');
  sheet.getRange(r, 3).setValue('← 今月これを超えないと詰む').setFontColor('#cc0000').setFontStyle('italic');
  r += 2;

  // ════════════════════════════════════════════════════
  // B: 欲しいものリスト
  // ════════════════════════════════════════════════════
  _cSection(sheet, r, '🛒 欲しいものリスト'); r++;

  sheet.getRange(r, 1).setValue('リアン単価').setFontWeight('bold');
  sheet.getRange(r, 2).setValue(300000).setNumberFormat('¥#,##0');
  sheet.getRange(r, 3).setValue('← 受注金額に合わせて更新').setFontColor('#999999').setFontStyle('italic');
  var RIAN_CELL = 'B' + r;
  r++;

  sheet.getRange(r, 1, 1, 4).setValues([['品名', '金額', '配送で何日分', 'リアン何人分']]);
  _cSubHeader(sheet, r, 4); r++;

  var WISH_DATA_START = r;
  var wishItems = [
    ['冷蔵庫',              55000],
    ['運送ガジェット',      20000],
    ['仕事着・靴',          15000],
    ['ElevenLabs等（月）',   3000],
  ];
  wishItems.forEach(function(item) {
    sheet.getRange(r, 1).setValue(item[0]);
    sheet.getRange(r, 2).setValue(item[1]).setNumberFormat('¥#,##0');
    sheet.getRange(r, 3).setFormula('=IFERROR(ROUND(B' + r + '/(B' + FIXED_TOTAL_ROW + '/26),1),"")');
    sheet.getRange(r, 4).setFormula('=IFERROR(ROUND(B' + r + '/' + RIAN_CELL + ',2),"")');
    r++;
  });

  for (var i = 0; i < 3; i++) {
    sheet.getRange(r, 2).setNumberFormat('¥#,##0');
    sheet.getRange(r, 3).setFormula('=IFERROR(ROUND(B' + r + '/(B' + FIXED_TOTAL_ROW + '/26),1),"")');
    sheet.getRange(r, 4).setFormula('=IFERROR(ROUND(B' + r + '/' + RIAN_CELL + ',2),"")');
    r++;
  }

  sheet.getRange(r, 1).setValue('欲しいもの合計').setFontWeight('bold');
  sheet.getRange(r, 2)
    .setFormula('=SUM(B' + WISH_DATA_START + ':B' + (r - 1) + ')')
    .setFontWeight('bold').setNumberFormat('¥#,##0');
  r += 2;

  // ════════════════════════════════════════════════════
  // C: 今月 収益見立て
  // ════════════════════════════════════════════════════
  _cSection(sheet, r, '📊 今月 収益見立て（自動連動）'); r++;

  sheet.getRange(r, 1).setValue('▶ 配送 実績').setFontWeight('bold'); r++;

  var iRef = REF_INPUT;
  var cRef = REF_CALC;

  var DELIVERY_TOTAL_ROW = r;
  sheet.getRange(r, 1).setValue('今月売上合計');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(' + iRef + 'A2:A1001)=MONTH(TODAY()))*' +
      '(YEAR(' + iRef + 'A2:A1001)=YEAR(TODAY()))*' +
      '(' + iRef + 'B2:B1001<>"休み")*' +
      '(' + iRef + 'C2:C1001<>""),' +
      iRef + 'C2:C1001),0)'
  ).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('今月稼働日数');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(' + iRef + 'A2:A1001)=MONTH(TODAY()))*' +
      '(YEAR(' + iRef + 'A2:A1001)=YEAR(TODAY()))*' +
      '(' + iRef + 'B2:B1001<>"休み")*' +
      '(' + iRef + 'B2:B1001<>"")),0)'
  ); r++;

  sheet.getRange(r, 1).setValue('三多摩 前払い着金済み');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(' + cRef + 'A2:A501)=MONTH(TODAY()))*' +
      '(YEAR(' + cRef + 'A2:A501)=YEAR(TODAY()))*' +
      cRef + 'E2:E501),0)'
  ).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('翌月着金予定（繰越分）');
  sheet.getRange(r, 2).setFormula(
    '=IFERROR(SUMPRODUCT(' +
      '(MONTH(' + cRef + 'G2:G501)=MONTH(EDATE(TODAY(),1)))*' +
      '(YEAR(' + cRef + 'G2:G501)=YEAR(EDATE(TODAY(),1)))*' +
      cRef + 'F2:F501),0)'
  ).setNumberFormat('¥#,##0'); r += 2;

  sheet.getRange(r, 1).setValue('▶ ACE / web（手入力）').setFontWeight('bold'); r++;

  var ACE_ROW = r;
  sheet.getRange(r, 1).setValue('ACE収益（今月）');
  sheet.getRange(r, 2).setValue(0).setNumberFormat('¥#,##0'); r++;

  var WEB_ROW = r;
  sheet.getRange(r, 1).setValue('その他web収益');
  sheet.getRange(r, 2).setValue(0).setNumberFormat('¥#,##0'); r += 2;

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
  sheet.getRange(r, 3).setValue('← マイナス = リアン獲得が急務').setFontColor('#cc0000').setFontStyle('italic');
  r += 2;

  // ════════════════════════════════════════════════════
  // D: 配送フェードアウトライン
  // ════════════════════════════════════════════════════
  _cSection(sheet, r, '🚪 配送フェードアウトライン'); r++;

  sheet.getRange(r, 1).setValue('生活費月額（固定費合計）');
  sheet.getRange(r, 2).setFormula('=B' + FIXED_TOTAL_ROW).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('配送やめるに必要なACE月収');
  sheet.getRange(r, 2).setFormula('=B' + FIXED_TOTAL_ROW).setNumberFormat('¥#,##0'); r++;

  sheet.getRange(r, 1).setValue('必要リアン数（3ヶ月並行）').setFontWeight('bold');
  sheet.getRange(r, 2)
    .setFormula('=CEILING(B' + FIXED_TOTAL_ROW + '*3/' + RIAN_CELL + ',1)')
    .setFontWeight('bold').setFontSize(14);
  sheet.getRange(r, 3).setValue('← これが揃えば配送やめられる').setFontColor('#1a6b2e').setFontStyle('italic');
  r += 2;

  // ════════════════════════════════════════════════════
  // E: 配送ペース目標
  // ════════════════════════════════════════════════════
  _cSection(sheet, r, '📦 配送ペース目標（1日あたり）'); r++;

  sheet.getRange(r, 1, 1, 4).setValues([['時間枠', '稼働時間(h)', '目標個数', '1時間あたり']]);
  _cSubHeader(sheet, r, 4); r++;

  var PACE_DATA_START = r;
  var paceRows = [
    ['09:00 - 12:00', 3, 64],
    ['14:00 - 16:00', 2, 43],
    ['16:00 - 18:00', 2, 43],
    ['18:00 - 19:00', 1, 20],
  ];
  paceRows.forEach(function(row) {
    sheet.getRange(r, 1).setValue(row[0]);
    sheet.getRange(r, 2).setValue(row[1]);
    sheet.getRange(r, 3).setValue(row[2]);
    sheet.getRange(r, 4).setFormula('=IFERROR(ROUND(C' + r + '/B' + r + ',1),"")');
    r++;
  });

  var PACE_DATA_END = r - 1;
  sheet.getRange(r, 1).setValue('ペース合計').setFontWeight('bold');
  sheet.getRange(r, 2).setFormula('=SUM(B' + PACE_DATA_START + ':B' + PACE_DATA_END + ')').setFontWeight('bold');
  sheet.getRange(r, 3).setFormula('=SUM(C' + PACE_DATA_START + ':C' + PACE_DATA_END + ')').setFontWeight('bold');
  sheet.getRange(r, 4)
    .setFormula('=IFERROR("平均 "&ROUND(C' + r + '/B' + r + ',2)&"個 / 時","")')
    .setFontWeight('bold');

  // ── スタイル ──────────────────────────────────────
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 170);
  sheet.setColumnWidth(4, 130);
  sheet.setFrozenRows(1);

  _compassRestore(sheet);

  Logger.log('💰財務コンパス 再生成完了');
  SpreadsheetApp.getUi().alert('💰財務コンパスを更新しました。');
}

// ════════════════════════════════════════════════════════
// データ退避 / 復元
// ════════════════════════════════════════════════════════

function _compassSave(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var values   = sheet.getRange(1, 1, lastRow, 4).getValues();
  var formulas = sheet.getRange(1, 1, lastRow, 4).getFormulas();
  var data = {};

  values.forEach(function(row, i) {
    var label = String(row[0]).trim();
    if (!label) return;
    data[label] = {
      b: formulas[i][1] ? null : row[1],
      c: formulas[i][2] ? null : row[2],
      d: formulas[i][3] ? null : row[3],
    };
  });

  try {
    PropertiesService.getScriptProperties().setProperty(COMPASS_DATA_KEY, JSON.stringify(data));
    Logger.log('💰コンパス退避: ' + Object.keys(data).length + '件');
  } catch (e) {
    Logger.log('compass save error: ' + e.message);
  }
}

function _compassRestore(sheet) {
  var raw = PropertiesService.getScriptProperties().getProperty(COMPASS_DATA_KEY);
  if (!raw) return;

  var data;
  try { data = JSON.parse(raw); } catch (e) { return; }

  var lastRow  = sheet.getLastRow();
  var values   = sheet.getRange(1, 1, lastRow, 1).getValues();
  var formulas = sheet.getRange(1, 1, lastRow, 4).getFormulas();

  values.forEach(function(row, i) {
    var label = String(row[0]).trim();
    if (!label || !data[label]) return;
    var saved = data[label];
    if (saved.b !== null && saved.b !== undefined && !formulas[i][1]) sheet.getRange(i + 1, 2).setValue(saved.b);
    if (saved.c !== null && saved.c !== undefined && !formulas[i][2]) sheet.getRange(i + 1, 3).setValue(saved.c);
    if (saved.d !== null && saved.d !== undefined && !formulas[i][3]) sheet.getRange(i + 1, 4).setValue(saved.d);
  });

  Logger.log('💰コンパス復元完了');
}

// ════════════════════════════════════════════════════════
// onEdit ハンドラ
// ════════════════════════════════════════════════════════

function compassOnEdit(e) {
  var sheet = e.range.getSheet();
  var col   = e.range.getColumn();
  var row   = e.range.getRow();

  if (col > 4) return;

  if (col === 1) {
    _compassSave(sheet);
    return;
  }

  var label = String(sheet.getRange(row, 1).getValue()).trim();
  if (!label) return;

  var formula = sheet.getRange(row, col).getFormula();
  if (formula) return;

  var raw = PropertiesService.getScriptProperties().getProperty(COMPASS_DATA_KEY);
  var data;
  try { data = raw ? JSON.parse(raw) : {}; } catch (err) { data = {}; }

  if (!data[label]) data[label] = {b: null, c: null, d: null};
  var colKey = ['b', 'c', 'd'][col - 2];
  data[label][colKey] = e.range.getValue();

  try {
    PropertiesService.getScriptProperties().setProperty(COMPASS_DATA_KEY, JSON.stringify(data));
  } catch (err) {
    Logger.log('compass onEdit error: ' + err.message);
  }
}

// ── ヘルパー ─────────────────────────────────────────

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
