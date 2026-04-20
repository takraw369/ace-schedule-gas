/**
 * LayerArchive.gs - _Archive シート構築
 *
 * 過去データ・廃止設定の保管場所。GASは初回のみ作成。
 */

function setupArchive() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_ARCHIVE);

  if (sheet) {
    Logger.log('_Archive 既存 — スキップ');
    return;
  }

  sheet = ss.insertSheet(SHEET_ARCHIVE);
  sheet.setTabColor('#666666');

  sheet.getRange(1, 1, 1, 2).merge()
    .setValue('_Archive — 過去データ・廃止設定の保管場所')
    .setBackground('#333333').setFontColor('#aaaaaa')
    .setFontWeight('bold').setFontSize(12);

  sheet.getRange(2, 1).setValue('このシートは手動管理です。GASは再生成しません。')
    .setFontColor('#888888').setFontStyle('italic');

  sheet.setColumnWidth(1, 400);
  Logger.log('_Archive シート作成');
}
