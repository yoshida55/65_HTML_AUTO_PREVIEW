# HTML/SVG自動プレビューツール

Claude Code用のHTML/SVG自動プレビューツール。2つのモードでHTML/SVGを自動ブラウザ表示します。

## 📋 2つのモード

### パターンC: クリップボード監視型（メイン）
- ✅ HTML/SVGコードをコピー→自動ブラウザ表示
- ✅ 固定フォルダに保存（会社/自宅自動判定）
- ✅ インストール不要（EXE版あり）
- **用途**: Claude Code でHTML/SVG生成→コピー→即プレビュー

### パターンA: ファイル監視型（サブ）
- ✅ プロジェクト内のHTML/SVGファイル作成・更新を監視
- ✅ 自動でブラウザ起動
- ✅ 除外パターン対応（node_modules等）
- **用途**: 開発中のHTML/SVGファイルを編集→保存→即プレビュー

## 🚀 使い方

### EXE版（会社PC・自宅PC共通）

1. **セットアップ**
   ```
   html-preview-tool.zip を解凍
   ```

2. **起動**
   ```
   clipboard-watch.exe をダブルクリック
   ```

3. **使い方**
   ```
   1. clipboard-watch.exe 起動
   2. Claude CodeでHTML/SVG生成
   3. HTML/SVGコードをコピー（Ctrl+C）
   4. 自動でブラウザ表示 ✅
   ```

4. **停止**
   ```
   Ctrl+C または ウィンドウを閉じる
   ```

### Node.js版（開発用）

1. **セットアップ**
   ```bash
   npm install
   ```

2. **起動**

   **パターンC（クリップボード監視型）**
   ```bash
   npm start
   # または
   node clipboard-watch.js
   ```

   **パターンA（ファイル監視型）**
   ```bash
   npm run watch
   # または
   node watch.js
   ```

3. **停止**
   ```
   Ctrl+C
   ```

## 📂 保存先フォルダ

以下のフォルダに自動保存されます（自動判定）:

- 会社PC: `C:\Users\guest04\Desktop\高橋研三\03_knowledge\images`
- 自宅PC: `D:\50_knowledge\images`

**注意**: フォルダが存在しない場合はエラーで停止します。

## 📝 ファイル名

タイムスタンプ形式で自動命名（拡張子は自動判定）:
```
preview-20260213-153045.html
preview-20260213-153045.svg
         YYYYMMDD-HHMMSS
```

## 🔧 EXE化（開発者向け）

```bash
# 依存関係インストール
npm install

# EXE化
npm run build

# 生成されるファイル
# build/clipboard-watch.exe (約40MB)
```

## ⚠ 注意事項

### パターンC（クリップボード監視型）
- Windows専用
- クリップボード監視の遅延（1秒）
- コード判定基準:
  - **HTML**: `</html>` タグを含む
  - **SVG**: `<svg` で始まる、または `<?xml` と `<svg` を含む

### パターンA（ファイル監視型）
- Windows専用
- プロジェクト全体を再帰的に監視
- 監視対象: `.html`, `.svg` ファイル
- 除外パターン:
  - `node_modules/`, `bkup/`, `venv/`, `__pycache__/`, `.git/`
  - `build/`, `dist/`, `preview-*.html`, `preview-*.svg`
- ファイル書き込み完了を500ms待ってから起動

## 📖 詳細

詳しい仕様は [仕様書.md](仕様書.md) を参照してください。

## 📄 ライセンス

MIT
