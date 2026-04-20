/**
 * Main.gs - エントリポイント
 * MASA Control Sheet — ACE Schedule System
 */

function setupAll() {
  try {
    Logger.log('=== MASA Control Sheet セットアップ開始 ===');
    backupSheet();
    setupMasterConfig();    // 5_Master_Config（プロバイダ設定のソース）
    setupProviderMaster();  // プロバイダマスタ（5_Master_Config のビュー）
    setupDashboard();       // 0_DASHBOARD
    setup1ACESchedule();    // 1_ACE_Schedule
    setup2DeliveryRoute();  // 2_Delivery_Route
    setupInputSheet();      // 4_Income_Log
    setupCalcSheet();       // 計算
    setupFinanceCompass();  // 💰財務コンパス
    setupArchive();         // _Archive
    Logger.log('=== セットアップ完了 ===');
    SpreadsheetApp.getUi().alert('セットアップ完了！\n各シートを確認してください。');
  } catch (e) {
    Logger.log('ERROR in setupAll: ' + e.message);
    SpreadsheetApp.getUi().alert('エラーが発生しました：\n' + e.message + '\n\nApps Scriptのログを確認してください。');
  }
}

/**
 * 手入力データを Script Properties に自動バックアップ
 */
function onEdit(e) {
  try {
    var sheetName = e.range.getSheet().getName();
    if (sheetName === COMPASS_SHEET_NAME)  compassOnEdit(e);
    if (sheetName === SHEET_MASTER_CONFIG) masterConfigOnEdit(e);
  } catch (err) {
    Logger.log('onEdit error: ' + err.message);
  }
}

/**
 * メニューを追加する（スプシ起動時に自動実行）
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ACE Schedule')
    .addItem('🚀 初期セットアップ', 'setupAll')
    .addSeparator()
    .addItem('計算シート再生成', 'setupCalcSheet')
    .addItem('ダッシュボード更新', 'setupDashboard')
    .addItem('財務コンパス更新', 'setupFinanceCompass')
    .addItem('マスター設定更新', 'setupMasterConfig')
    .addItem('🔥Daily シート生成', 'generateDailySheet')
    .addSeparator()
    .addItem('GitHubへ同期', 'exportStateToGit')
    .addItem('バックアップ作成', 'backupSheet')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('🔧 統合ユーティリティ（一回のみ）')
      .addItem('スプシをMASA Control Sheetにリネーム', 'renameTOMASAControlSheet')
      .addItem('旧MASA Control Sheetを削除', 'deleteOldMASAControlSheet')
      .addItem('旧シート整理（ダッシュボード削除・リネーム）', 'cleanupLegacySheets')
      .addItem('シートタブ順序を整える', 'reorderSheets'))
    .addToUi();
}

/**
 * 日次トリガー用（23:00自動実行）
 */
function dailySync() {
  try {
    Logger.log('日次同期開始: ' + new Date());
    exportStateToGit();
    Logger.log('日次同期完了');
  } catch (e) {
    Logger.log('ERROR in dailySync: ' + e.message);
  }
}

/**
 * トリガーをセットアップする（初回1回だけ実行）
 */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('dailySync')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .create();

  Logger.log('トリガーセットアップ完了');
  SpreadsheetApp.getUi().alert('トリガーをセットアップしました。\n毎晩23:00にGitHubへ自動同期されます。');
}
