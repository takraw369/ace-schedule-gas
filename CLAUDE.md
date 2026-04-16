# ACE Schedule System — Claude向けコンテキスト

## プロジェクト概要

MASAの配送ビジネス収益トラッカー。Google Apps Script (GAS) + Googleスプレッドシートで構成。

## 重要ルール

- **入力シートの2行目以降は絶対に触らない**（MASA聖域）
- **計算シートはGAS実行で毎回再生成**してよい（データを直接書かない）
- GAS変更前は必ず `backupSheet()` を呼ぶ
- エラーは具体的な次のアクションとともに `SpreadsheetApp.getUi().alert()` で通知

## ファイル構成

```
src/
├── Main.gs              # onOpen, setupAll, dailySync, setupTriggers
├── Layer1_Input.gs      # 入力シート（ヘッダー・プルダウン設定のみ）
├── Layer2_Calc.gs       # 計算シート（VLOOKUP数式群）
├── Layer3_Dashboard.gs  # ダッシュボード（SUMPRODUCT数式群）
├── ProviderMaster.gs    # プロバイダマスタシート
├── GitHubSync.gs        # GitHub API経由でstate pushする
└── Utils.gs             # backupSheet, clearSampleData
```

## スクリプトプロパティ

| キー | 内容 |
|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token（スコープ: repo） |

## GitHub同期先

- リポジトリ: `takraw369/ace-schedule-state`（プライベート）
- ファイル: `state/latest.json`

## push手順

```bash
clasp push --force
```

## ユーザー情報

- ADHD傾向あり → 工程を細かく分けて1ステップずつ対話しながら進める
- 「これやっといて」より「今からこれやる、準備できたら教えて」スタンス
