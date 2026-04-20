/**
 * Main.gs - エントリポイント
 * ACE Schedule System
 */

function setupAll() {
  try {
    Logger.log('=== ACE Schedule セットアップ開始 ===');
    backupSheet();
    setupMasterConfig();   // 5_Master_Config（プロバイダ設定のソース）
    setupProviderMaster(); // プロバイダマスタ（5_Master_Config のビュー）
    setupInputSheet();     // 4_Income_Log
    setupCalcSheet();      // 計算
    setupDashboard();      // DEPRECATED: no-op
    setupFinanceCompass(); // 💰財務コンパス
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
    if (sheetName === COMPASS_SHEET_NAME)   compassOnEdit(e);
    if (sheetName === SHEET_MASTER_CONFIG)  masterConfigOnEdit(e);
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
    .addItem('初期セットアップ', 'setupAll')
    .addSeparator()
    .addItem('計算シート再生成', 'setupCalcSheet')
    .addItem('財務コンパス更新', 'setupFinanceCompass')
    .addItem('マスター設定更新', 'setupMasterConfig')
    .addSeparator()
    .addItem('GitHubへ同期', 'exportStateToGit')
    .addItem('バックアップ作成', 'backupSheet')
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
