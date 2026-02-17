const chokidar = require('chokidar');
const clipboardy = require('clipboardy');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');

// 保存先候補（自動判定）
const savePaths = [
  'C:\\Users\\guest04\\Desktop\\高橋研三\\03_knowledge\\images',
  'D:\\50_knowledge\\images'
];

// HTTPサーバー設定
const HTTP_PORT = 8080;
let activeSaveDir = null;

// 監視対象パターン
const watchPattern = '**/*.{html,svg}';

// 除外パターン
const ignorePatterns = [
  '**/node_modules/**',
  '**/bkup/**',
  '**/venv/**',
  '**/__pycache__/**',
  '**/.git/**',
  '**/build/**',
  '**/dist/**',
  '**/preview-*.html',  // 自動生成されたプレビューファイルは監視しない
  '**/preview-*.svg'    // 自動生成されたプレビューファイルは監視しない
];

// 保存先フォルダ取得
function getSavePath() {
  for (const p of savePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  console.error('❌ 保存先フォルダが見つかりません');
  console.error('   以下のフォルダを確認してください:');
  savePaths.forEach(p => console.error(`   - ${p}`));
  throw new Error('保存先フォルダが見つかりません');
}

// ファイル名生成（タイムスタンプ形式）
function getFileName(ext) {
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

// ファイルを処理（コピー → ブラウザ表示 → リンク挿入 → 元ファイル削除）
function processFile(filePath) {
  try {
    const absolutePath = path.resolve(filePath);
    const ext = path.extname(filePath).substring(1); // .html → html, .svg → svg
    const fileName = getFileName(ext);
    const fullPath = path.join(activeSaveDir, fileName);

    // ファイル内容を読み込んでコピー
    const content = fs.readFileSync(absolutePath, 'utf8');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ コピー保存: ${path.basename(filePath)} → ${fileName}`);

    // Windowsでブラウザ起動
    exec(`start "" "${fullPath}"`, (error) => {
      if (error) {
        console.error('❌ ブラウザ起動失敗:', error.message);
      } else {
        console.log('✅ ブラウザ起動成功');
      }
    });

    // クリップボードにlocalhostへのMarkdownリンクを挿入
    const markdownLink = `[プレビュー](http://localhost:${HTTP_PORT}/${fileName})`;
    clipboardy.writeSync(markdownLink);
    console.log(`📋 クリップボードにリンク挿入: ${markdownLink}`);

    // 元のファイルを削除（切り取り）
    setTimeout(() => {
      try {
        fs.unlinkSync(absolutePath);
        console.log(`🗑️  元ファイル削除: ${path.basename(filePath)}`);
      } catch (err) {
        console.error(`⚠️  元ファイル削除失敗: ${err.message}`);
      }
      console.log('');
    }, 500); // 書き込み完了を待つ

  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

// HTTPサーバー起動
function startHTTPServer() {
  const server = http.createServer((req, res) => {
    const fileName = req.url.substring(1);

    if (!fileName || fileName === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>HTML/SVG自動プレビューツール</h1><p>HTTPサーバー稼働中</p>');
      return;
    }

    const filePath = path.join(activeSaveDir, fileName);

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

  server.listen(HTTP_PORT, () => {
    console.log(`🌐 HTTPサーバー起動: http://localhost:${HTTP_PORT}`);
  });
}

// ファイル監視開始
function startWatching() {
  const watcher = chokidar.watch(watchPattern, {
    ignored: ignorePatterns,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });

  watcher
    .on('add', filePath => {
      console.log(`📄 新規ファイル検知: ${filePath}`);
      processFile(filePath);
    })
    .on('change', filePath => {
      console.log(`📝 ファイル更新検知: ${filePath}`);
      processFile(filePath);
    })
    .on('error', error => {
      console.error('❌ 監視エラー:', error.message);
    });

  // 終了処理
  process.on('SIGINT', () => {
    console.log('');
    console.log('⏹  監視を停止しました');
    watcher.close();
    process.exit(0);
  });
}

// 初期化
function initialize() {
  console.log('========================================');
  console.log('  HTML/SVG自動プレビューツール v2.1');
  console.log('  完全自動モード（ファイル監視型）');
  console.log('========================================');
  console.log('');

  try {
    activeSaveDir = getSavePath();
    console.log(`✅ 保存先フォルダ: ${activeSaveDir}`);
    console.log('');

    startHTTPServer();
    console.log('');

    console.log('🔍 ファイル監視開始...');
    console.log('   対象: .html, .svg ファイル');
    console.log('   除外: node_modules, build, dist 等');
    console.log('');
    console.log('   動作: ファイル検知 → コピー保存 → ブラウザ表示');
    console.log('         → リンクをクリップボードに → 元ファイル削除');
    console.log('   停止: Ctrl+C');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('初期化エラーにより終了します。');
    process.exit(1);
  }
}

// メイン処理
initialize();
startWatching();
