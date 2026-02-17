// const clipboardy = require('clipboardy'); // 削除
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec, spawn } = require('child_process');

/**
 * PowerShell経由でクリップボードを読み込む
 */
function readClipboard() {
  return new Promise((resolve, reject) => {
    // UTF-8で出力するように指定
    const cmd = '$OutputEncoding = [System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Clipboard';
    const ps = spawn('powershell', ['-NoProfile', '-Command', cmd], {
      maxBuffer: 10 * 1024 * 1024, // 10MB
      windowsHide: true
    });
    let data = '';
    let errorData = '';

    ps.stdout.on('data', (chunk) => {
      data += chunk.toString('utf8');
    });

    ps.stderr.on('data', (chunk) => {
      errorData += chunk.toString('utf8');
    });

    ps.on('close', (code) => {
      if (errorData) {
        console.error('❌ PowerShellエラー:', errorData);
      }
      if (code === 0) {
        const result = data.trim();
        console.log(`📊 クリップボード読込: ${result.length}文字`);
        resolve(result);
      } else {
        console.error(`❌ PowerShell終了コード: ${code}`);
        resolve('');
      }
    });

    ps.on('error', (err) => {
      console.error('❌ PowerShell起動エラー:', err.message);
      resolve('');
    });
  });
}

/**
 * PowerShell経由でクリップボードに書き込む
 */
function writeClipboard(text) {
  try {
    // エスケープ処理（簡易的）
    const safeText = text.replace(/"/g, '`"');
    const cmd = `Set-Clipboard -Value "${safeText}"`;
    spawn('powershell', ['-NoProfile', '-Command', cmd]);
  } catch (e) {
    console.error('クリップボード書き込みエラー:', e);
  }
}

// 保存先候補（自動判定）
const savePaths = [
  'C:\\Users\\guest04\\Desktop\\高橋研三\\03_knowledge\\images',
  'D:\\50_knowledge\\images'
];

// HTTPサーバー設定
const FIXED_PORT = 54321; // 競合しにくいポート番号（固定）
let httpServer = null;
let activeSaveDir = null;

let lastContent = '';

// 保存先フォルダ取得
function getSavePath() {
  for (const p of savePaths) {
    if (fs.existsSync(p)) {
      console.log(`✅ 保存先フォルダ: ${p}`);
      return p;
    }
  }
  console.error('❌ 保存先フォルダが見つかりません');
  console.error('   以下のフォルダを確認してください:');
  savePaths.forEach(p => console.error(`   - ${p}`));
  throw new Error('保存先フォルダが見つかりません');
}

// ファイル名生成（タイムスタンプ形式）
function getFileName(ext = 'html') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${year}${month}${day}-${hour}${minute}${second}`;
  return `preview-${timestamp}.${ext}`;
}

// HTMLコード判定（完全なHTMLドキュメントのみ）
function isHTML(text) {
  if (!text || typeof text !== 'string') return false;

  // </html>タグがある場合のみHTML自動プレビュー
  // それ以外は普通のテキストとしてコピペ可能
  return text.includes('</html>');
}

// SVGコード判定
function isSVG(text) {
  if (!text || typeof text !== 'string') return false;

  const trimmed = text.trim();
  // <svg で始まるか、<?xml を含み <svg を含む場合
  return trimmed.startsWith('<svg') ||
         trimmed.startsWith('<SVG') ||
         (text.includes('<?xml') && text.includes('<svg'));
}

// ファイルタイプ検出
function detectFileType(content) {
  if (isHTML(content)) return 'html';
  if (isSVG(content)) return 'svg';
  return null;
}

// コードをクリーニング（markdown記号などを削除）
function cleanCode(text, fileType) {
  let cleaned = text;

  // 先頭の```html, ```svg, ``` などを削除
  cleaned = cleaned.replace(/^```(html|htm|svg|xml)?\s*\n?/i, '');

  // 末尾の```を削除
  cleaned = cleaned.replace(/\n?```\s*$/i, '');

  if (fileType === 'html') {
    // HTMLの場合: <!DOCTYPE html> より前の行を全て削除
    const doctypeIndex = cleaned.search(/<!DOCTYPE\s+html>/i);
    if (doctypeIndex > 0) {
      cleaned = cleaned.substring(doctypeIndex);
      console.log(`🧹 HTML先頭のゴミ削除: <!DOCTYPE より前の ${doctypeIndex} 文字を削除`);
    }
  } else if (fileType === 'svg') {
    // SVGの場合: <svg または <?xml より前の行を全て削除
    const svgIndex = cleaned.search(/<(\?xml|svg)/i);
    if (svgIndex > 0) {
      cleaned = cleaned.substring(svgIndex);
      console.log(`🧹 SVG先頭のゴミ削除: <svg より前の ${svgIndex} 文字を削除`);
    }
  }

  // 先頭・末尾の空白行を削除
  cleaned = cleaned.trim();

  if (cleaned.length !== text.length) {
    console.log(`🧹 ${fileType.toUpperCase()} クリーニング: ${text.length}文字 → ${cleaned.length}文字`);
  }

  return cleaned;
}

// ファイル保存＆ブラウザ起動
function saveAndOpen(content, fileType) {
  try {
    // コードをクリーニング（markdown記号削除）
    const cleanedContent = cleanCode(content, fileType);

    const saveDir = activeSaveDir;
    const fileName = getFileName(fileType);
    const fullPath = path.join(saveDir, fileName);

    // ファイルを保存
    fs.writeFileSync(fullPath, cleanedContent, 'utf8');
    console.log(`✅ ${fileType.toUpperCase()}ファイル保存: ${fileName}`);

    // Windowsでブラウザ起動
    exec(`start "" "${fullPath}"`, (error) => {
      if (error) {
        console.error('❌ ブラウザ起動失敗:', error.message);
      } else {
        console.log('✅ ブラウザ起動成功');
      }
    });

    // クリップボードにlocalhostへのMarkdownリンクを挿入
    const markdownLink = `[プレビュー](http://localhost:${FIXED_PORT}/${fileName})`;
    writeClipboard(markdownLink);
    console.log(`📋 クリップボードにリンク挿入: ${markdownLink}`);
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

// HTTPサーバー起動
function startHTTPServer() {
  const server = http.createServer((req, res) => {
    // URLからファイル名を取得
    const fileName = req.url.substring(1); // 先頭の'/'を除去

    if (!fileName || fileName === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>HTML/SVG自動プレビューツール</h1><p>HTTPサーバー稼働中</p>');
      return;
    }

    const filePath = path.join(activeSaveDir, fileName);

    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    // Content-Type判定
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'text/html; charset=utf-8';
    if (ext === '.svg') {
      contentType = 'image/svg+xml; charset=utf-8';
    }

    // ファイルを読み込んで返す
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>500 Internal Server Error</h1>');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`❌ ポート ${FIXED_PORT} は既に使用されています。`);
      console.error('   別のアプリがこのポートを使用している可能性があります。');
    } else {
      console.error('❌ HTTPサーバーエラー:', e.message);
    }
  });
  
  server.listen(FIXED_PORT, '127.0.0.1', () => {
    console.log(`🌐 HTTPサーバー起動: http://localhost:${FIXED_PORT}`);
    httpServer = server;
  });
}

// クリップボード監視（1秒ごと）
function startWatching() {
  setInterval(async () => {
    try {
      const content = await readClipboard();

      // 前回と同じ内容なら無視
      if (content === lastContent) return;
      lastContent = content;

      // ファイルタイプ判定（50文字以上）
      if (content.length > 50) {
        const fileType = detectFileType(content);
        if (fileType) {
          console.log(`🔍 ${fileType.toUpperCase()}コード検知`);
          saveAndOpen(content, fileType);
          console.log('');
        }
      }
    } catch (error) {
      // クリップボード読み込みエラーは静かに失敗
    }
  }, 1000);
}

// 初期化：保存先フォルダ確認
function initialize() {
  console.log('========================================');
  console.log('  HTML/SVG自動プレビューツール v2.1');
  console.log('========================================');
  console.log('');

  try {
    activeSaveDir = getSavePath();
    console.log('');

    // HTTPサーバー起動
    startHTTPServer();
    console.log('');

    console.log('🔍 クリップボード監視開始...');
    console.log('   HTML/SVGコードをコピーすると自動でブラウザ表示します');
    console.log('   停止: Ctrl+C');
    console.log('');

    // 監視開始
    startWatching();

  } catch (error) {
    console.error('');
    console.error('初期化エラーにより終了します。');
    process.exit(1);
  }
}

// メイン処理
initialize();
