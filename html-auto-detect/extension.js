const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

let debounceTimer = null;
let isEnabled = true;
let statusBarItem = null;
let lastProcessedContent = '';
let httpServer = null;

// HTTPサーバー設定
const HTTP_PORT = 8080;

// 保存先候補（自動判定）
const savePaths = [
  'C:\\Users\\guest04\\Desktop\\高橋研三\\03_knowledge\\images',
  'D:\\50_knowledge\\images'
];

/**
 * 保存先フォルダ取得
 */
function getSavePath() {
  for (const p of savePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * HTMLコードかどうか判定（完全なHTML文書）
 */
function isCompleteHTML(text) {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if (trimmed.length < 50) return false;  // 短すぎるものは無視
  
  const hasDoctype = /<!DOCTYPE html>/i.test(trimmed);
  const hasHtmlOpen = /<html[\s>]/i.test(trimmed);
  const hasHtmlClose = /<\/html>/i.test(trimmed);
  const hasHead = /<head[\s>]/i.test(trimmed) && /<\/head>/i.test(trimmed);
  const hasBody = /<body[\s>]/i.test(trimmed) && /<\/body>/i.test(trimmed);
  
  return (hasDoctype || (hasHtmlOpen && hasHtmlClose)) && hasHead && hasBody;
}

/**
 * HTMLコンテンツを抽出
 */
function extractHTML(text) {
  const trimmed = text.trim();
  
  // <!DOCTYPE html> or <html から </html> までを抽出
  let startMatch = trimmed.match(/<!DOCTYPE html>/i);
  let startIndex = startMatch ? startMatch.index : -1;
  
  if (startIndex === -1) {
    startMatch = trimmed.match(/<html[\s>]/i);
    startIndex = startMatch ? startMatch.index : 0;
  }
  
  let endIndex = trimmed.lastIndexOf('</html>');
  if (endIndex !== -1) endIndex += '</html>'.length;
  else endIndex = trimmed.length;
  
  return trimmed.substring(startIndex, endIndex);
}

/**
 * タイムスタンプ付きファイル名
 */
function getFileName() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `preview-${y}${m}${d}-${h}${mi}${s}.html`;
}

/**
 * HTMLを処理（保存 → ブラウザ表示 → リンク挿入 → エディタクリア）
 */
async function processHTML(editor) {
  const text = editor.document.getText();
  
  if (!isCompleteHTML(text)) return;
  
  const htmlContent = extractHTML(text);
  
  // 同じ内容なら処理しない
  if (htmlContent === lastProcessedContent) return;
  lastProcessedContent = htmlContent;
  
  const saveDir = getSavePath();
  if (!saveDir) {
    vscode.window.showErrorMessage('❌ 保存先フォルダが見つかりません');
    return;
  }
  
  const fileName = getFileName();
  const fullPath = path.join(saveDir, fileName);
  
  try {
    // HTMLファイルを保存
    fs.writeFileSync(fullPath, htmlContent, 'utf8');
    
    // ブラウザで開く
    exec(`start "" "${fullPath}"`, (error) => {
      if (error) {
        console.error('ブラウザ起動失敗:', error.message);
      }
    });
    
    // クリップボードにMarkdownリンクを挿入
    const markdownLink = `[プレビュー](http://localhost:${HTTP_PORT}/${fileName})`;
    await vscode.env.clipboard.writeText(markdownLink);
    
    // エディタの内容をクリア（切り取り）
    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(text.length)
    );
    
    await editor.edit(editBuilder => {
      editBuilder.replace(fullRange, '');
    });
    
    // 通知
    updateStatusBar(`✅ ${fileName}`);
    vscode.window.showInformationMessage(
      `✅ HTML検知 → ブラウザ表示 → リンクをクリップボードにコピー`,
      'Ctrl+Vで貼り付け'
    );
    
  } catch (error) {
    vscode.window.showErrorMessage(`❌ エラー: ${error.message}`);
  }
}

/**
 * デバウンス付きでHTMLを検知
 */
function onDocumentChange(event) {
  if (!isEnabled) return;
  
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  
  // 保存済みの.htmlファイルは無視（通常のHTML編集を邪魔しない）
  const filePath = editor.document.uri.fsPath;
  if (filePath && filePath.endsWith('.html')) return;
  
  const config = vscode.workspace.getConfiguration('htmlAutoDetect');
  const debounceMs = config.get('debounceMs') || 3000;
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    const currentEditor = vscode.window.activeTextEditor;
    if (currentEditor) {
      const text = currentEditor.document.getText();
      if (isCompleteHTML(text)) {
        processHTML(currentEditor);
      }
    }
  }, debounceMs);
}

/**
 * HTTPサーバー起動
 */
function startHTTPServer() {
  const saveDir = getSavePath();
  if (!saveDir) return;
  
  try {
    httpServer = http.createServer((req, res) => {
      const fileName = req.url.substring(1);
      
      if (!fileName || fileName === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>HTML Auto Detect</h1><p>HTTPサーバー稼働中</p>');
        return;
      }
      
      const filePath = path.join(saveDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 Not Found</h1>');
        return;
      }
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>500 Error</h1>');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
    });
    
    httpServer.listen(HTTP_PORT, () => {
      console.log(`HTML Auto Detect: HTTPサーバー起動 http://localhost:${HTTP_PORT}`);
    });
    
    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`HTML Auto Detect: ポート${HTTP_PORT}は使用中。サーバーは起動しません。`);
      }
    });
  } catch (error) {
    console.error('HTTPサーバー起動失敗:', error.message);
  }
}

/**
 * ステータスバー更新
 */
function updateStatusBar(text) {
  if (statusBarItem) {
    statusBarItem.text = text || (isEnabled ? '$(eye) HTML検知: ON' : '$(eye-closed) HTML検知: OFF');
    statusBarItem.show();
  }
  
  if (text) {
    setTimeout(() => updateStatusBar(), 3000);
  }
}

/**
 * アクティベーション
 */
function activate(context) {
  console.log('HTML Auto Detect 起動');
  
  // ステータスバー
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'htmlAutoDetect.toggle';
  updateStatusBar();
  context.subscriptions.push(statusBarItem);
  
  // HTTPサーバー起動
  startHTTPServer();
  
  // テキスト変更監視
  const changeDisposable = vscode.workspace.onDidChangeTextDocument(onDocumentChange);
  context.subscriptions.push(changeDisposable);
  
  // トグルコマンド
  const toggleCmd = vscode.commands.registerCommand('htmlAutoDetect.toggle', () => {
    isEnabled = !isEnabled;
    updateStatusBar();
    vscode.window.showInformationMessage(
      `HTML Auto Detect: ${isEnabled ? '✅ 有効' : '⏸️ 無効'}`
    );
  });
  context.subscriptions.push(toggleCmd);
  
  // 手動抽出コマンド
  const extractCmd = vscode.commands.registerCommand('htmlAutoDetect.extractNow', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('アクティブなエディタがありません');
      return;
    }
    const text = editor.document.getText();
    if (isCompleteHTML(text)) {
      processHTML(editor);
    } else {
      vscode.window.showWarningMessage('完全なHTMLコードが見つかりません');
    }
  });
  context.subscriptions.push(extractCmd);
}

function deactivate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (httpServer) httpServer.close();
}

module.exports = { activate, deactivate };
