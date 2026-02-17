# 65_HTML自動プレビュー プロジェクトメモ

## アーキテクチャ
- `clipboard-watch.js` → `pkg` で単一exe化（`clipboard-watch.exe`）
- Node.js + 依存パッケージすべてバンドル済み → exeだけで動作
- HTTPサーバー（port:54321）内蔵

## ビルド
```bash
npm run build
# → build/clipboard-watch.exe 生成（約40MB）
```

## 配布構成（build/内）
| ファイル | 役割 |
|---------|------|
| `clipboard-watch.exe` | 本体（pkg バンドル済み） |
| `start-hidden.vbs` | コンソール非表示で起動するVBSラッパー |

## 保存先パス（自動判定）
- 会社PC: `C:\Users\guest04\Desktop\高橋研三\03_knowledge\images`
- 自宅PC: `D:\50_knowledge\images`
- 上から順にチェック、最初に見つかったフォルダを使用
- どちらもなければエラー停止

## スタートアップ登録
1. `clipboard-watch.exe` と `start-hidden.vbs` を同じフォルダに配置
2. `Win + R` → `shell:startup`
3. `start-hidden.vbs` のショートカットを配置

## コンソール非表示の仕組み
- `start-hidden.vbs` が `WScript.Shell.Run` でウィンドウ非表示（第2引数=0）で起動
- `clipboard-watch.js` 内の `spawn` に `windowsHide: true` → PowerShell子プロセスも非表示
