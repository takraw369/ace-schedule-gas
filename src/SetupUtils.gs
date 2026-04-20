/**
 * SetupUtils.gs - スプシ統合ユーティリティ（一回実行用）
 *
 * タスク1-2: スプシB削除・スプシAリネーム
 * タスク4:   旧シート整理
 * タスク6:   シートタブ順序調整
 */

// ════════════════════════════════════════════════════════
// タスク1: スプシB（旧MASA Control Sheet）をゴミ箱へ
// ════════════════════════════════════════════════════════

function deleteOldMASAControlSheet() {
  var OLD_SHEET_B_ID = '1Iz3Hz_s7G9DeK_faUZi0N7U41_DMx3sfaXP5fXxkUBY';
  try {
    DriveApp.getFileById(OLD_SHEET_B_ID).setTrashed(true);
    Logger.log('スプシB ゴミ箱へ移動完了: ' + OLD_SHEET_B_ID);
    SpreadsheetApp.getUi().alert('旧MASA Control Sheet をゴミ箱に移動しました。\nドライブのゴミ箱から完全削除するかはMASAが判断してください。');
  } catch (e) {
    Logger.log('ERROR deleteOldMASAControlSheet: ' + e.message);
    SpreadsheetApp.getUi().alert('削除エラー: ' + e.message + '\n手動でドライブから削除してください。');
  }
}

// ════════════════════════════════════════════════════════
// タスク2: 現在のスプシを「MASA Control Sheet」にリネーム
// ════════════════════════════════════════════════════════

function renameTOMASAControlSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var oldName = ss.getName();
  ss.rename('MASA Control Sheet');
  Logger.log('スプシリネーム: ' + oldName + ' → MASA Control Sheet');
  SpreadsheetApp.getUi().alert('スプレッドシート名を「MASA Control Sheet」に変更しました。');
}

// ════════════════════════════════════════════════════════
// タスク4: 旧シート整理
// ════════════════════════════════════════════════════════

function cleanupLegacySheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  // 旧「ダッシュボード」シート削除（0_DASHBOARDに移管済み）
  var oldDash = ss.getSheetByName('ダッシュボード');
  if (oldDash) {
    ss.deleteSheet(oldDash);
    log.push('「ダッシュボード」削除');
  }

  // 「デイリースケジュール」→「3_Daily_Schedule」リネーム
  var daily = ss.getSheetByName('デイリースケジュール');
  if (daily) {
    daily.setName(SHEET_DAILY);
    log.push('「デイリースケジュール」→「' + SHEET_DAILY + '」リネーム');
  }

  var msg = log.length > 0
    ? '旧シート整理完了:\n' + log.join('\n')
    : '対象シートは見つかりませんでした。';
  Logger.log(msg);
  SpreadsheetApp.getUi().alert(msg);
}

// ════════════════════════════════════════════════════════
// タスク6: シートタブ順序調整
// ════════════════════════════════════════════════════════

function reorderSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var order = [
    SHEET_DASHBOARD,      // 0_DASHBOARD
    SHEET_ACE_SCHEDULE,   // 1_ACE_Schedule
    SHEET_DELIVERY_ROUTE, // 2_Delivery_Route
    SHEET_DAILY,          // 3_Daily_Schedule
    SHEET_INPUT,          // 4_Income_Log
    SHEET_MASTER_CONFIG,  // 5_Master_Config
    SHEET_CALC,           // 計算
    SHEET_COMPASS,        // 💰財務コンパス
    SHEET_PROVIDER,       // プロバイダマスタ
    SHEET_ARCHIVE,        // _Archive
  ];

  order.forEach(function(name, i) {
    var sheet = ss.getSheetByName(name);
    if (sheet) {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(i + 1);
    } else {
      Logger.log('reorderSheets: シートなし → ' + name);
    }
  });

  Logger.log('シート順序調整完了');
  SpreadsheetApp.getUi().alert('シートタブの順序を調整しました。');
}
