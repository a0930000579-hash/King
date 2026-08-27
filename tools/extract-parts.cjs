/**
 * tools/extract-parts.cjs
 * 
 * 把 parts/ 目錄下所有 assets-part*.zip 解壓到專案根目錄，
 * 合併出完整的 assets/ 目錄。已存在的檔案會被覆蓋。
 * 
 * 適用場景：
 *   - DigitalOcean App Platform Build 階段自動執行（npm install 後 postinstall）
 *   - 本機開發：node tools/extract-parts.cjs
 * 
 * 依賴：adm-zip（純 JS，無原生模組，DO 環境可直接安裝）
 */
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const PARTS_DIR = path.join(__dirname, '..', 'parts');
const ROOT_DIR = path.join(__dirname, '..');

function main() {
  console.log('[extract-parts] 開始解壓 assets 分卷...');
  
  // 優先找 parts/ 目錄下的分段 zip
  let zipFiles = [];
  
  if (fs.existsSync(PARTS_DIR)) {
    zipFiles = fs.readdirSync(PARTS_DIR)
      .filter(f => /^assets-part\d+\.zip$/i.test(f))
      .sort()
      .map(f => path.join(PARTS_DIR, f));
  }
  
  // 若 parts/ 沒有，嘗試根目錄
  if (zipFiles.length === 0) {
    zipFiles = fs.readdirSync(ROOT_DIR)
      .filter(f => /^assets-part\d+\.zip$/i.test(f))
      .sort()
      .map(f => path.join(ROOT_DIR, f));
  }
  
  if (zipFiles.length === 0) {
    console.log('[extract-parts] ⚠️  找不到任何 assets-part*.zip，跳過');
    return;
  }
  
  console.log(`[extract-parts] 找到 ${zipFiles.length} 個分卷:`);
  zipFiles.forEach(f => console.log(`  - ${path.basename(f)} (${(fs.statSync(f).size/1024/1024).toFixed(2)} MB)`));
  
  let totalExtracted = 0;
  
  for (const zipPath of zipFiles) {
    console.log(`\n[extract-parts] 解壓 ${path.basename(zipPath)}...`);
    
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();
      
      // 解壓到根目錄
      zip.extractAllTo(ROOT_DIR, true);
      
      totalExtracted += entries.length;
      console.log(`  已解壓 ${entries.length} 個檔案`);
    } catch (err) {
      console.error(`  ❌ 解壓失敗: ${err.message}`);
      process.exit(1);
    }
  }
  
  console.log(`\n[extract-parts] ✅ 完成，共解壓 ${totalExtracted} 個檔案到 assets/`);
}

main();
