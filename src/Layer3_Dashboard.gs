/**
 * Layer3_Dashboard.gs
 *
 * DEPRECATED 2026-04-20: 0_DASHBOARD に統合済み。
 * setupDashboard() は no-op。シートは手動で削除してください。
 */

function setupDashboard() {
  // DEPRECATED: 0_DASHBOARD に統合済み (2026-04-20)
  // GAS管理の「ダッシュボード」シートは廃止。
  // 集計は 0_DASHBOARD シートで管理すること。
  Logger.log('setupDashboard: DEPRECATED — 0_DASHBOARD を使用してください');
}

// addSection は setupDashboard 内でのみ使用していたため一緒に廃止
// function addSection(...) { ... }
