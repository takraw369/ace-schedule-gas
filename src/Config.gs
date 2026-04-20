/**
 * Config.gs - システム全体の定数定義
 *
 * シート名・数式参照文字列はここだけ変えれば全体に反映される。
 */

// ── シート名 ───────────────────────────────────────────
var SHEET_INPUT         = '4_Income_Log';    // 旧: '入力'
var SHEET_CALC          = '計算';
var SHEET_MASTER_CONFIG = '5_Master_Config';
var SHEET_PROVIDER      = 'プロバイダマスタ'; // 5_Master_Config のビュー
var SHEET_COMPASS       = '💰財務コンパス';
var SHEET_DASHBOARD     = '0_DASHBOARD';     // 手動管理シート（GAS不干渉）

// 既存コードとの互換エイリアス
var COMPASS_SHEET_NAME   = SHEET_COMPASS;
var PROVIDER_SHEET_NAME  = SHEET_PROVIDER;

// ── スプレッドシート数式用シート参照プレフィックス ─────
// 数字始まりのシート名は単引用符が必要
var REF_INPUT    = "'4_Income_Log'!";
var REF_CALC     = "計算!";
var REF_PROVIDER = "プロバイダマスタ!";
