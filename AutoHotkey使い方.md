# AutoHotkey 補助スクリプト - 使い方

## 📋 概要

HTMLコードを**1回のキー操作**でコピーして、自動ブラウザ表示できるようにする補助ツールです。

---

## 🚀 セットアップ

### 1. AutoHotkeyをインストール

**自宅PC（インストール可能）:**

- https://www.autohotkey.com/ からダウンロード＆インストール

**会社PC（インストール不可）:**

- AutoHotkey v2 Portable版を使用
- または、`.ahk`ファイルを`.exe`に変換（後述）

### 2. スクリプトを起動

```
html-quick-copy.ahk をダブルクリック
```

タスクトレイにAutoHotkeyアイコン（H）が表示されます。

---

## 💡 使い方

### パターン1: コピー（推奨）

1. AIが生成したHTMLコードがある画面で
2. **Alt+H** を押す
3. 自動的にコピー＆ブラウザ表示！

**動作**:

- 全選択 → コピー → 元に戻す（テキストは消えない）

### パターン2: 切り取り

1. AIが生成したHTMLコードがある画面で
2. **Alt+X** を押す
3. 自動的に切り取り＆ブラウザ表示！

**動作**:

- 全選択 → 切り取り（テキストが消える）

---

## ⚙️ カスタマイズ

### ホットキーを変更したい場合

`html-quick-copy.ahk`を編集:

```autohotkey
; Alt+H を Ctrl+Shift+H に変更
^+h::

; Alt+X を Ctrl+Shift+X に変更
^+x::
```

**記号の意味**:

- `!` = Alt
- `^` = Ctrl
- `+` = Shift
- `#` = Win

---

## 🔧 会社PC用: EXE化

会社PCでAutoHotkeyがインストールできない場合、スクリプトをEXEに変換:

### 方法1: AutoHotkey Compiler（公式）

1. AutoHotkeyインストール済みPCで
2. `html-quick-copy.ahk`を右クリック
3. 「Compile Script」を選択
4. 生成された`html-quick-copy.exe`を会社PCにコピー

### 方法2: Ahk2Exe（コマンドライン）

```bash
Ahk2Exe.exe /in html-quick-copy.ahk /out html-quick-copy.exe
```

---

## 📝 注意事項

- AutoHotkeyスクリプトは**常駐型**です（起動したら自動で監視）
- 終了: タスクトレイのアイコンを右クリック → Exit
- スタートアップ登録すると、PC起動時に自動起動

---

## 🎯 全体の流れ

```
1. clipboard-watch.js 起動（常駐）
   ↓
2. html-quick-copy.ahk 起動（常駐）
   ↓
3. AIがHTMLコード生成
   ↓
4. Alt+H 押す（1回だけ）
   ↓
5. 自動的にブラウザ表示！✅
```

---

## 🆘 トラブルシューティング

### AutoHotkeyが動かない

- スクリプトが起動しているか確認（タスクトレイ）
- 管理者権限で実行してみる

### ホットキーが効かない

- 他のアプリとキーが競合している可能性
- ホットキーを変更（上記「カスタマイズ」参照）

### コピーされない

- 対象のウィンドウがアクティブか確認
- Sleep時間を増やす（100 → 200）
