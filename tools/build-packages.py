#!/usr/bin/env python3
"""
v2.7.0 打包腳本（貪心裝箱，每包 ≤ 25MB）
輸出到 static/ 目錄
"""
import os
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'static'
OUT.mkdir(exist_ok=True)
VERSION = '2.7.0'
MAX_SIZE = 25 * 1024 * 1024  # 25MB

def pack_files(file_list, zip_prefix):
    """用 first-fit-decreasing 裝箱"""
    # 計算每個檔案大小
    items = []
    for f in file_list:
        fp = ROOT / f
        if not fp.exists():
            continue
        items.append((f, fp.stat().st_size))
    # 由大到小排序
    items.sort(key=lambda x: x[1], reverse=True)
    
    bins = []  # 每個 bin 是 [(path, size), ...]
    bin_sizes = []
    
    for fpath, fsize in items:
        placed = False
        for i, bs in enumerate(bin_sizes):
            if bs + fsize <= MAX_SIZE:
                bins[i].append((fpath, fsize))
                bin_sizes[i] += fsize
                placed = True
                break
        if not placed:
            bins.append([(fpath, fsize)])
            bin_sizes.append(fsize)
    
    zips = []
    for i, bin_items in enumerate(bins, 1):
        zip_name = f'{zip_prefix}-part{i}.zip'
        zip_path = OUT / zip_name
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for fpath, _ in bin_items:
                zf.write(ROOT / fpath, fpath)
        sz = zip_path.stat().st_size
        print(f'  {zip_name}  {sz/1024/1024:.1f}MB  ({len(bin_items)} 檔)')
        zips.append((zip_name, sz))
    
    return zips


def main():
    print(f'=== v{VERSION} 打包開始 ===')
    print(f'輸出: {OUT}')
    
    all_zips = []
    
    # 1. code 包
    print('\n[1/4] code 包')
    code_files = [
        'index.html', 'gm.html', 'diag.html', 'e2e.html', 'game-bundle.html',
        'game.js', 'audio-manager.js', 'multiplayer.js', 'auth.js',
        'bug-report.js', 'sprite_object.js',
        'styles.css', 'styles-mobile.css', 'styles-tablet.css',
        'manifest.json', 'assets/icons',
        'server', 'tools',
    ]
    code_zip = OUT / f'update-{VERSION}-code.zip'
    with zipfile.ZipFile(code_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for item in code_files:
            item_path = ROOT / item
            if not item_path.exists():
                continue
            if item_path.is_dir():
                for dp, _, fns in os.walk(item_path):
                    rel = os.path.relpath(dp, ROOT)
                    for fn in fns:
                        if '__pycache__' in rel or fn.endswith('.pyc'):
                            continue
                        if rel.startswith('server/') and rel.startswith('server/data'):
                            continue
                        if rel.startswith('.git'):
                            continue
                        zf.write(os.path.join(dp, fn), os.path.join(rel, fn))
            else:
                zf.write(item_path, item)
    sz = code_zip.stat().st_size
    print(f'  update-{VERSION}-code.zip  {sz/1024/1024:.1f}MB')
    all_zips.append((f'update-{VERSION}-code.zip', sz))
    
    # 2. transform 各階
    print('\n[2/4] transform 各階 PNG 分包（≤25MB）')
    tiers = ['gold', 'red', 'purple', 'blue', 'green', 'white']
    for tier in tiers:
        src_dir = ROOT / 'assets' / 'transform' / tier
        if not src_dir.exists():
            continue
        pngs = []
        for dp, _, fns in os.walk(src_dir):
            for fn in fns:
                if fn.lower().endswith('.png'):
                    pngs.append(os.path.relpath(os.path.join(dp, fn), ROOT))
        if not pngs:
            continue
        print(f'  --- {tier} ({len(pngs)} 張) ---')
        zips = pack_files(pngs, f'update-{VERSION}-transform-{tier}')
        all_zips.extend(zips)
    
    # 3. sprites 包（hero + monster 動畫 + class 動畫 + 原 misc PNG 不含）
    print('\n[3/4] sprites 去背包（hero/monster/class 的動畫 PNG）')
    sprite_files = []
    # hero 全部 PNG（60 張新轉 + 原 12 張雜項，全部打包）
    for f in sorted((ROOT / 'assets' / 'hero').glob('*.png')):
        sprite_files.append(f'assets/hero/{f.name}')
    # monster 子目錄動畫 PNG
    for dp, _, fns in os.walk(ROOT / 'assets' / 'monster'):
        rel = os.path.relpath(dp, ROOT)
        for fn in fns:
            if fn.lower().endswith('.png'):
                sprite_files.append(os.path.join(rel, fn))
    # class 子目錄動畫 PNG
    for dp, _, fns in os.walk(ROOT / 'assets' / 'class'):
        if dp == str(ROOT / 'assets' / 'class'):
            continue  # 跳過根目錄雜項
        rel = os.path.relpath(dp, ROOT)
        for fn in fns:
            if fn.lower().endswith('.png'):
                sprite_files.append(os.path.join(rel, fn))
    
    print(f'  共 {len(sprite_files)} 張 sprite PNG')
    zips = pack_files(sprite_files, f'update-{VERSION}-sprites')
    all_zips.extend(zips)
    
    # 4. audio 包
    print('\n[4/4] audio 包')
    audio_files = []
    audio_dir = ROOT / 'assets' / 'audio'
    if audio_dir.exists():
        for dp, _, fns in os.walk(audio_dir):
            rel = os.path.relpath(dp, ROOT)
            for fn in fns:
                if fn.lower().endswith(('.wav', '.mp3', '.ogg')):
                    audio_files.append(os.path.join(rel, fn))
    if audio_files:
        zip_name = f'update-{VERSION}-audio.zip'
        zip_path = OUT / zip_name
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
            for f in audio_files:
                zf.write(ROOT / f, f)
        sz = zip_path.stat().st_size
        print(f'  {zip_name}  {sz/1024/1024:.1f}MB')
        all_zips.append((zip_name, sz))
    
    # 完整性驗證
    print('\n=== zip 完整性驗證 ===')
    fail = 0
    for zname, _ in all_zips:
        zpath = OUT / zname
        try:
            with zipfile.ZipFile(zpath) as zf:
                bad = zf.testzip()
                if bad is None:
                    print(f'  [OK] {zname}')
                else:
                    print(f'  [FAIL] {zname}: 損壞檔 {bad}')
                    fail += 1
        except Exception as e:
            print(f'  [FAIL] {zname}: {e}')
            fail += 1
    
    # 大小驗證
    print('\n=== 大小驗證（≤ 25MB） ===')
    oversize = []
    for zname, sz in all_zips:
        mb = sz / 1024 / 1024
        if mb > 25.5:  # 容許 2% 浮動
            oversize.append((zname, mb))
            print(f'  [WARN] {zname}: {mb:.1f}MB > 25MB')
    if not oversize:
        print('  全部 ≤ 25MB')
    
    # 統計
    total_mb = sum(sz for _, sz in all_zips) / 1024 / 1024
    print(f'\n=== 總計 {len(all_zips)} 個 zip，共 {total_mb:.1f}MB ===')
    
    if fail > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
