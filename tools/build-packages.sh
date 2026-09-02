#!/bin/bash
# v2.7.0 打包腳本：產出所有更新包到 static/ 目錄
# 依賴：zip、curl
# 用法: bash tools/build-packages.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="static"
mkdir -p "$OUT"

VERSION="2.7.0"

echo "=== v$VERSION 打包開始 ==="
echo "輸出目錄: $ROOT/$OUT"

# -------- 1. code --------
echo ""
echo "[1/4] code 包"
CODE_ZIP="update-${VERSION}-code.zip"
# 只放源碼/配置/工具，不放 assets 與 data 與 .git
zip -q -r "$OUT/$CODE_ZIP" \
  index.html login.html select.html gm.html \
  game.js audio-manager.js multiplayer.js auth.js bug-report.js sprite_object.js \
  styles.css styles-mobile.css styles-tablet.css \
  manifest.json assets/icons \
  server/ tools/ \
  -x "server/data/*" -x "server/node_modules/*" -x "tools/__pycache__/*" -x "*.pyc" \
  -x ".git/*" -x ".git*" -x "data/*" -x "tmp/*" -x "static/*" \
  2>/dev/null || true
CODE_SIZE=$(du -m "$OUT/$CODE_ZIP" | cut -f1)
echo "  $CODE_ZIP  ${CODE_SIZE}MB"

# -------- 2. transform 各階分層 --------
echo ""
echo "[2/4] transform 去背 PNG 分包（每階≤25MB）"
TIERS="gold red purple blue green white"
for tier in $TIERS; do
  SRCDIR="assets/transform/$tier"
  if [ ! -d "$SRCDIR" ]; then continue; fi
  # 計算總大小
  TOTAL_MB=$(du -s -m "$SRCDIR" | cut -f1)
  # 決定分幾包
  PARTS=1
  if [ "$TOTAL_MB" -gt 25 ]; then
    PARTS=$(( (TOTAL_MB + 24) / 25 ))
  fi
  # 收集檔案清單
  FILELIST=$(mktemp)
  find "$SRCDIR" -name "*.png" -type f | sort > "$FILELIST"
  TOTAL_FILES=$(wc -l < "$FILELIST")
  if [ "$TOTAL_FILES" -eq 0 ]; then
    echo "  $tier: 無 png，跳過"
    rm "$FILELIST"
    continue
  fi
  # 按文件大小均分到多個包（貪心算法）
  # 簡單做法：按檔序平分成 PARTS 份
  PER_PART=$(( (TOTAL_FILES + PARTS - 1) / PARTS ))
  part=1
  count=0
  CURRENT_LIST=$(mktemp)
  while read -r f; do
    echo "$f" >> "$CURRENT_LIST"
    count=$((count + 1))
    if [ "$count" -ge "$PER_PART" ]; then
      ZIP_NAME="update-${VERSION}-transform-${tier}-part${part}.zip"
      cat "$CURRENT_LIST" | zip -q -@ "$OUT/$ZIP_NAME" 2>/dev/null || true
      SZ=$(du -m "$OUT/$ZIP_NAME" 2>/dev/null | cut -f1 || echo 0)
      echo "  $ZIP_NAME  ${SZ}MB (${count} 檔)"
      part=$((part + 1))
      count=0
      CURRENT_LIST=$(mktemp)
    fi
  done < "$FILELIST"
  # 尾包
  if [ -s "$CURRENT_LIST" ]; then
    ZIP_NAME="update-${VERSION}-transform-${tier}-part${part}.zip"
    cat "$CURRENT_LIST" | zip -q -@ "$OUT/$ZIP_NAME" 2>/dev/null || true
    SZ=$(du -m "$OUT/$ZIP_NAME" 2>/dev/null | cut -f1 || echo 0)
    echo "  $ZIP_NAME  ${SZ}MB (${count} 檔)"
  fi
  rm -f "$FILELIST"
done

# -------- 3. sprites 包（hero/monster/npc/class 的去背 PNG） --------
echo ""
echo "[3/4] sprites 去背包"
SPRITE_FILES=$(mktemp)
for d in hero monster npc class; do
  if [ -d "assets/$d" ]; then
    find "assets/$d" -name "*.png" -type f 2>/dev/null >> "$SPRITE_FILES" || true
  fi
done
SPRITE_COUNT=$(wc -l < "$SPRITE_FILES")
if [ "$SPRITE_COUNT" -gt 0 ]; then
  # 總大小
  TOTAL_MB=$(cat "$SPRITE_FILES" | xargs du -c 2>/dev/null | tail -1 | awk '{print int($1/1024)+1}')
  PARTS=1
  if [ "$TOTAL_MB" -gt 25 ]; then
    PARTS=$(( (TOTAL_MB + 24) / 25 ))
  fi
  PER_PART=$(( (SPRITE_COUNT + PARTS - 1) / PARTS ))
  part=1
  count=0
  CUR=$(mktemp)
  while read -r f; do
    echo "$f" >> "$CUR"
    count=$((count + 1))
    if [ "$count" -ge "$PER_PART" ]; then
      ZIP_NAME="update-${VERSION}-sprites-part${part}.zip"
      cat "$CUR" | zip -q -@ "$OUT/$ZIP_NAME" 2>/dev/null || true
      SZ=$(du -m "$OUT/$ZIP_NAME" 2>/dev/null | cut -f1 || echo 0)
      echo "  $ZIP_NAME  ${SZ}MB (${count} 檔)"
      part=$((part + 1))
      count=0
      CUR=$(mktemp)
    fi
  done < "$SPRITE_FILES"
  if [ -s "$CUR" ]; then
    ZIP_NAME="update-${VERSION}-sprites-part${part}.zip"
    cat "$CUR" | zip -q -@ "$OUT/$ZIP_NAME" 2>/dev/null || true
    SZ=$(du -m "$OUT/$ZIP_NAME" 2>/dev/null | cut -f1 || echo 0)
    echo "  $ZIP_NAME  ${SZ}MB (${count} 檔)"
  fi
else
  echo "  無 sprite PNG，跳過"
fi
rm -f "$SPRITE_FILES"

# -------- 4. audio 包 --------
echo ""
echo "[4/4] audio 包"
AUDIO_ZIP="update-${VERSION}-audio.zip"
if [ -d "assets/audio" ]; then
  find assets/audio -type f \( -name "*.wav" -o -name "*.mp3" -o -name "*.ogg" \) | \
    zip -q -@ "$OUT/$AUDIO_ZIP" 2>/dev/null || true
  AUDIO_SIZE=$(du -m "$OUT/$AUDIO_ZIP" 2>/dev/null | cut -f1 || echo 0)
  echo "  $AUDIO_ZIP  ${AUDIO_SIZE}MB"
fi

# -------- 總結 --------
echo ""
echo "=== 打包完成 ==="
echo "所有包:"
ls -lhS "$OUT/"update-${VERSION}-*.zip 2>/dev/null
echo ""

# 驗證每個 zip 完整性
echo "=== zip 完整性驗證 ==="
FAIL=0
for z in "$OUT"/update-${VERSION}-*.zip; do
  if [ -f "$z" ]; then
    if unzip -t "$z" > /dev/null 2>&1; then
      echo "  [OK] $(basename $z)"
    else
      echo "  [FAIL] $(basename $z)"
      FAIL=$((FAIL + 1))
    fi
  fi
done
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "全部 zip 完整通過"
else
  echo "有 $FAIL 個 zip 損壞"
fi
