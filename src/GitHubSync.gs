/**
 * GitHubSync.gs - GitHub同期機能
 * スプシの状態を takraw369/ace-schedule-state/state/latest.json へpush
 *
 * 事前準備:
 *   スクリプトプロパティに GITHUB_TOKEN を設定すること
 *   スコープ: repo (private repo含む)
 */

var GITHUB_OWNER = 'takraw369';
var GITHUB_STATE_REPO = 'ace-schedule-state';
var STATE_FILE_PATH = 'state/latest.json';

/**
 * スプシの状態をJSONにしてGitHubへpush
 */
function exportStateToGit() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');

  if (!token) {
    var msg = 'GitHubトークンが設定されていません。\n' +
              '設定手順:\n' +
              '1. Apps Script エディタ → プロジェクトの設定\n' +
              '2. スクリプトプロパティ → 追加\n' +
              '3. プロパティ名: GITHUB_TOKEN / 値: ghp_xxxxxxxx';
    Logger.log('ERROR: ' + msg);
    SpreadsheetApp.getUi().alert(msg);
    return;
  }

  try {
    Logger.log('GitHub同期開始');

    var state = buildStateJson();
    var jsonStr = JSON.stringify(state, null, 2);
    var encoded = Utilities.base64Encode(jsonStr, Utilities.Charset.UTF_8);

    // 既存ファイルのSHAを取得（更新のため）
    var sha = getFileSha(token);

    // ファイルをpush
    var payload = {
      message: 'chore: update state snapshot ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm'),
      content: encoded,
      branch: 'main'
    };
    if (sha) payload.sha = sha;

    var url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_STATE_REPO + '/contents/' + STATE_FILE_PATH;
    var response = UrlFetchApp.fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code === 200 || code === 201) {
      Logger.log('GitHub同期完了: ' + code);
      SpreadsheetApp.getUi().alert('GitHubへの同期が完了しました！\n' +
        'リポジトリ: ' + GITHUB_OWNER + '/' + GITHUB_STATE_REPO);
    } else {
      Logger.log('GitHub同期エラー: ' + code + ' / ' + response.getContentText());
      SpreadsheetApp.getUi().alert('GitHub同期エラー: ' + code + '\n' +
        '詳細はApps Scriptのログを確認してください。');
    }

  } catch (e) {
    Logger.log('ERROR in exportStateToGit: ' + e.message);
    SpreadsheetApp.getUi().alert('GitHub同期中にエラーが発生しました：\n' + e.message);
  }
}

/**
 * スプシのデータをJSONオブジェクトに変換
 */
function buildStateJson() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var inputSheet = ss.getSheetByName('入力');

  var inputData = [];
  if (inputSheet) {
    var lastRow = inputSheet.getLastRow();
    if (lastRow > 1) {
      var raw = inputSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      raw.forEach(function(row) {
        if (row[0] !== '') {
          inputData.push({
            date: row[0] instanceof Date ? Utilities.formatDate(row[0], 'Asia/Tokyo', 'yyyy-MM-dd') : String(row[0]),
            provider: row[1],
            revenue: row[2],
            memo: row[3]
          });
        }
      });
    }
  }

  // サマリー計算
  var now = new Date();
  var thisMonth = now.getMonth();
  var thisYear = now.getFullYear();

  var monthlyTotal = inputData.reduce(function(sum, d) {
    var dt = new Date(d.date);
    if (dt.getMonth() === thisMonth && dt.getFullYear() === thisYear && d.provider !== '休み') {
      return sum + (Number(d.revenue) || 0);
    }
    return sum;
  }, 0);

  return {
    exported_at: Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'),
    summary: {
      monthly_total: monthlyTotal,
      record_count: inputData.length
    },
    input_data: inputData
  };
}

/**
 * GitHubの既存ファイルSHAを取得（更新時に必要）
 */
function getFileSha(token) {
  var url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_STATE_REPO + '/contents/' + STATE_FILE_PATH;
  var response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() === 200) {
    var data = JSON.parse(response.getContentText());
    return data.sha;
  }
  return null;
}
