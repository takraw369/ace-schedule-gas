/**
 * DailySheet.gs - 🔥Daily スケジュールシート生成
 *
 * Quest日（木・土）に配達ブロック4枠＋ACE並走枠を自動塗り。
 * GW（5/3-7）は黄色マーク、ブロックなし。
 */

// ── 設定 ──────────────────────────────────────────────
const DAILY_SHEET_NAME = '🔥Daily';
const QUEST_DAYS       = [4, 6];   // 0=日, 1=月 … 4=木, 6=土
const TIME_START       = 7;        // 開始時刻（時）
const TIME_END         = 21;       // 終了時刻（時）
const NUM_WEEKS        = 7;        // 生成週数

/**
 * Quest日の自動ブロック定義
 * [startHour, spanRows, colOffset (0=配達 1=ACE), label, bgColor, fontColor]
 *
 * bgColor が null のセルはテキストのみ（vault メモ欄）
 */
const QUEST_BLOCK_DEFS = [
  [9,  3, 0, '■構造把握',   '#1e6b2e', '#ffffff'],
  [14, 2, 0, '■身体フロー', '#b84a1a', '#ffffff'],
  [16, 2, 0, '■音声',       '#1a4d7a', '#ffffff'],
  [16, 2, 1, '🎧音声',      '#1a4d7a', '#ffffff'],
  [18, 3, 0, '■夜ピーク',   '#5b2c6f', '#ffffff'],
  [21, 1, 1, '📝vault',     null,      null     ],
];

// ── メイン関数 ────────────────────────────────────────
function generateDailySheet() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const today = new Date();

  // 既存シートを削除して再生成
  const existing = ss.getSheetByName(DAILY_SHEET_NAME);
  if (existing) ss.deleteSheet(existing);
  const sheet = ss.insertSheet(DAILY_SHEET_NAME);

  // 日付リスト（当週月曜日 → NUM_WEEKS週）
  const startDate = _getMonday(today);
  const dates = [];
  for (let i = 0; i < NUM_WEEKS * 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    dates.push(d);
  }

  // 時刻リスト（7:00 … 21:00）
  const times = [];
  for (let h = TIME_START; h <= TIME_END; h++) times.push(h + ':00');

  const GW_START    = new Date(today.getFullYear(), 4, 3); // 5/3
  const GW_END      = new Date(today.getFullYear(), 4, 7); // 5/7
  const DAY_JP      = ['日', '月', '火', '水', '木', '金', '土'];
  const HEADER_ROWS = 3;
  const numCols     = 1 + dates.length * 2;
  const numRows     = HEADER_ROWS + times.length;

  // ── データ構築 ──────────────────────────────────────
  const row1 = ['']; // 行1: 日付
  const row2 = ['']; // 行2: 曜日
  const row3 = ['時間']; // 行3: 配達/ACEヘッダー

  dates.forEach(d => {
    row1.push((d.getMonth() + 1) + '/' + d.getDate(), '');
    row2.push(DAY_JP[d.getDay()], '');
    row3.push('配達', 'ACE');
  });

  const timeRows = times.map(t => [t, ...new Array(dates.length * 2).fill('')]);
  const allData  = [row1, row2, row3, ...timeRows];

  sheet.getRange(1, 1, allData.length, allData[0].length).setValues(allData);

  // ── 結合: 日付・曜日セルを2列分マージ ──────────────
  dates.forEach((_, i) => {
    const col = 2 + i * 2;
    sheet.getRange(1, col, 1, 2).merge();
    sheet.getRange(2, col, 1, 2).merge();
  });

  // ── 列幅 ───────────────────────────────────────────
  sheet.setColumnWidth(1, 55);
  dates.forEach((_, i) => {
    sheet.setColumnWidth(2 + i * 2,     80); // 配達
    sheet.setColumnWidth(2 + i * 2 + 1, 65); // ACE
  });

  // ── ヘッダー装飾（行1・2・3） ───────────────────────
  // 行3: 共通グレー
  sheet.getRange(3, 1, 1, numCols)
    .setBackground('#e0e0e0').setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(1, 1).setBackground('#e0e0e0').setFontWeight('bold');

  // 行1・2: 曜日別カラー
  dates.forEach((date, i) => {
    const col = 2 + i * 2;
    const dow = date.getDay();
    let bg = '#f5f5f5', fc = '#333333';
    if (dow === 0) { bg = '#fce4e4'; fc = '#cc0000'; } // 日=赤
    if (dow === 6) { bg = '#dce8ff'; fc = '#0033cc'; } // 土=青

    [sheet.getRange(1, col), sheet.getRange(2, col)].forEach(r =>
      r.setBackground(bg).setFontColor(fc).setHorizontalAlignment('center').setFontWeight('bold')
    );
  });

  // ── GW 黄色マーク ───────────────────────────────────
  dates.forEach((date, i) => {
    if (!_isGW(date, GW_START, GW_END)) return;
    const col = 2 + i * 2;
    sheet.getRange(1, col).setBackground('#fff176');
    sheet.getRange(2, col).setBackground('#fff176');
    sheet.getRange(HEADER_ROWS + 1, col, times.length, 2).setBackground('#fffde7');
  });

  // ── Quest日ブロック塗り ─────────────────────────────
  dates.forEach((date, i) => {
    if (_isGW(date, GW_START, GW_END)) return;
    if (!QUEST_DAYS.includes(date.getDay())) return;

    const baseCol = 2 + i * 2;

    QUEST_BLOCK_DEFS.forEach(([startH, span, colOff, label, bg, fc]) => {
      const timeIdx = startH - TIME_START;
      if (timeIdx < 0 || timeIdx >= times.length) return;

      const startRow   = HEADER_ROWS + timeIdx + 1;
      const targetCol  = baseCol + colOff;
      const actualSpan = Math.min(span, times.length - timeIdx);

      sheet.getRange(startRow, targetCol).setValue(label);

      if (bg) {
        sheet.getRange(startRow, targetCol, actualSpan, 1)
          .setBackground(bg).setFontColor(fc).setFontWeight('bold');
      }
    });
  });

  // ── 固定（行3まで・列1） ────────────────────────────
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(1);

  // ── グリッド枠線 ────────────────────────────────────
  sheet.getRange(1, 1, numRows, numCols)
    .setBorder(true, true, true, true, true, true, '#bbbbbb', SpreadsheetApp.BorderStyle.SOLID);

  SpreadsheetApp.getUi().alert('✅ 🔥Daily シートを生成しました！\n\nQuest日（木・土）に4ブロック自動入力済み。');
}

// ── ヘルパー ───────────────────────────────────────────
function _getMonday(date) {
  const d   = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function _isGW(date, gwStart, gwEnd) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return d >= gwStart && d <= gwEnd;
}
