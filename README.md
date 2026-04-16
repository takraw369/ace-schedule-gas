# ACE Schedule System

MASAの配送ビジネス＆web収益トラッカー。  
Googleスプレッドシート × GAS × GitHub の3層統合システム。

## アーキテクチャ

```
[入力] スプレッドシート「入力」シート（MASA聖域）
    ↓
[計算] GAS自動生成「計算」シート（再生成OK）
    ↓
[可視化] 「ダッシュボード」シート
    ↓ exportStateToGit()
[状態保存] takraw369/ace-schedule-state（プライベート）
```

## セットアップ手順

### 1. clasp push

```bash
cd ace-schedule-gas
clasp push --force
```

### 2. スプシでセットアップ実行

スプレッドシートを開き → メニュー「ACE Schedule」→「初期セットアップ」

### 3. GitHub同期の準備（初回のみ）

1. GitHub Personal Access Token を発行（スコープ: `repo`）
2. Apps Script エディタ → プロジェクトの設定 → スクリプトプロパティ
3. `GITHUB_TOKEN` = `ghp_xxxxxxxxx` を追加
4. メニュー「ACE Schedule」→「GitHubへ同期」でテスト

### 4. トリガー設定（初回のみ）

Apps Script エディタで `setupTriggers()` を手動実行 → 毎晩23:00に自動同期が有効になる

## シート構成

| シート名 | 用途 | 編集者 |
|---|---|---|
| 入力 | 日々の稼働データ入力 | MASA |
| 計算 | GAS自動計算 | GAS（再生成） |
| ダッシュボード | KPIサマリー | GAS（再生成） |
| プロバイダマスタ | 各社の前払い率等 | MASA（直接編集OK） |

## 入力シートの使い方

| 列 | 入力内容 |
|---|---|
| A（日付） | 稼働日（yyyy/mm/dd） |
| B（プロバイダ） | プルダウンから選択 |
| C（売上） | その日の売上金額 |
| D（メモ） | 自由記述 |

**GASはヘッダー行（1行目）のみ管理。2行目以降はMASAが自由に編集してOK。**

## リポジトリ

- `takraw369/ace-schedule-gas` — このリポジトリ（GASソースコード）
- `takraw369/ace-schedule-state` — 状態スナップショット（プライベート）
