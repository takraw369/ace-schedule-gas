/**
 * Layer8_Content.gs - 8_Content シート構築
 *
 * コンテンツ投稿スケジュール管理。
 * GASはヘッダー・書式・フィルタビューを管理。2行目以降はMASA聖域。
 * フィルタビュー: 月別(1〜12月) + 四半期別(Q1〜Q4)
 */

function setup8Content() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CONTENT);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CONTENT);
    Logger.log('8_Content シート作成');
  } else {
    Logger.log('8_Content シート更新（ヘッダーのみ）');
  }

  sheet.setTabColor('#e67e22');

  // ヘッダー
  var headers = [
    '日付', '曜', 'PHASE', '記事テーマ・タイトル案',
    '狙い・目的', 'Note', 'X', 'Insta', 'TikTok', 'YT',
    '投稿ステータス', '投稿完了'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1a1a2e').setFontColor('#d4af37')
    .setFontWeight('bold').setHorizontalAlignment('center');

  // PHASEプルダウン（C列）
  var phaseRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['種まき', '収穫', 'クロージング', '加速', 'メンテ', '-'], true)
    .setAllowInvalid(true).build();
  sheet.getRange(2, 3, 500, 1).setDataValidation(phaseRule);

  // SNSチェックボックス（F〜J列）
  sheet.getRange(2, 6, 500, 5).insertCheckboxes();

  // 投稿完了チェックボックス（L列）
  sheet.getRange(2, 12, 500, 1).insertCheckboxes();

  // 投稿ステータスプルダウン（K列）
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['未', '下書き', '予約済', '投稿済', 'スキップ'], true)
    .setAllowInvalid(false).build();
  sheet.getRange(2, 11, 500, 1).setDataValidation(statusRule);

  // 日付書式（A列）
  sheet.getRange(2, 1, 500, 1).setNumberFormat('yyyy/mm/dd');

  // 列幅
  sheet.setColumnWidth(1, 110);
  sheet.setColumnWidth(2, 45);
  sheet.setColumnWidth(3, 80);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 200);
  sheet.setColumnWidth(6, 50);
  sheet.setColumnWidth(7, 40);
  sheet.setColumnWidth(8, 50);
  sheet.setColumnWidth(9, 60);
  sheet.setColumnWidth(10, 40);
  sheet.setColumnWidth(11, 90);
  sheet.setColumnWidth(12, 70);

  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);

  // フィルタビュー生成
  _buildContentFilterViews(ss, sheet);

  Logger.log('8_Content セットアップ完了');
}

function _buildContentFilterViews(ss, sheet) {
  var sheetId = sheet.getSheetId();

  // 既存フィルタビューを削除
  var requests = [];
  try {
    var meta = Sheets.Spreadsheets.get(ss.getId(), {fields: 'sheets.filterViews'});
    var sheets = meta.sheets || [];
    sheets.forEach(function(s) {
      if (s.filterViews) {
        s.filterViews.forEach(function(fv) {
          if (fv.range && fv.range.sheetId === sheetId) {
            requests.push({deleteFilterView: {filterId: fv.filterViewId}});
          }
        });
      }
    });
  } catch(e) {
    Logger.log('filterView 取得スキップ: ' + e.message);
  }

  // 月別フィルタビュー（1〜12月）
  var months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  months.forEach(function(label, i) {
    var month = i + 1;
    requests.push({
      addFilterView: {
        filter: {
          title: label,
          range: {sheetId: sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 12},
          criteria: {
            0: {  // A列（日付）で月フィルタ
              condition: {
                type: 'DATE_IS',
                values: [{relativeDate: 'PAST_YEAR'}]  // placeholder — 実際はcustomFormula
              }
            }
          },
          filterSpecs: [{
            columnIndex: 0,
            filterCriteria: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [{userEnteredValue: '=MONTH(A2)=' + month}]
              }
            }
          }]
        }
      }
    });
  });

  // 四半期別フィルタビュー
  var quarters = [
    {label: 'Q1（1-3月）',  months: [1,2,3]},
    {label: 'Q2（4-6月）',  months: [4,5,6]},
    {label: 'Q3（7-9月）',  months: [7,8,9]},
    {label: 'Q4（10-12月）', months: [10,11,12]}
  ];
  quarters.forEach(function(q) {
    var formula = '=OR(MONTH(A2)=' + q.months.join(',MONTH(A2)=') + ')';
    requests.push({
      addFilterView: {
        filter: {
          title: q.label,
          range: {sheetId: sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: 12},
          filterSpecs: [{
            columnIndex: 0,
            filterCriteria: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [{userEnteredValue: formula}]
              }
            }
          }]
        }
      }
    });
  });

  if (requests.length > 0) {
    try {
      Sheets.Spreadsheets.batchUpdate({requests: requests}, ss.getId());
      Logger.log('フィルタビュー生成完了: ' + (months.length + quarters.length) + '件');
    } catch(e) {
      Logger.log('フィルタビュー生成エラー（Sheets API未有効の可能性）: ' + e.message);
    }
  }
}
