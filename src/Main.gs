/**
 * Main.gs - エントリポイント
 * ACE Schedule System v1
 */

/**
 * スプレッドシートを初期化する（初回セットアップ）
 */
function setupAll() {
  try {
    Logger.log('=== ACE Schedule セットアップ開始 ===');
    backupSheet();
    setupProviderMaster();
    setupInputSheet();
    setupCalcSheet();
    setupDashboard();
    Logger.log('=== セットアップ完了 ===');
    SpreadsheetApp.getUi().alert('セットアップ完了！\n各シートを確認してください。');
  } catch (e) {
    Logger.log('ERROR in setupAll: ' + e.message);
    SpreadsheetApp.getUi().alert('エラーが発生しました：\n' + e.message + '\n\nApps Scriptのログを確認してください。');
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
    .addItem('ダッシュボード更新', 'setupDashboard')
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
  // 既存トリガー削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  // 毎晩23:00に日次同期
  ScriptApp.newTrigger('dailySync')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .create();

  Logger.log('トリガーセットアップ完了');
  SpreadsheetApp.getUi().alert('トリガーをセットアップしました。\n毎晩23:00にGitHubへ自動同期されます。');
}
