#!/usr/bin/env python3
"""
cutout-sprites.py — 精靈圖去背工具（純 Pillow，無 numpy/scipy 依賴）
對指定目錄下的 .jpg 進行「邊界連通域洪水填充」去背，
僅移除與四邊相連的近均勻深灰背景，避免挖穿深色盔甲/衣物。
輸出 PNG32 帶 alpha，邊緣 feather，去除殘邊 halo。

用法:
  python3 tools/cutout-sprites.py assets/transform/ --recursive
  python3 tools/cutout-sprites.py assets/class/ assets/monster/ --recursive
"""

import os
import sys
import argparse
from PIL import Image, ImageDraw, ImageFilter


def sample_border_color(img, samples=80):
    """從四邊取樣，計算中位背景色與標準差"""
    w, h = img.size
    pixels = []
    step_x = max(1, w // samples)
    step_y = max(1, h // samples)
    px = img.load()
    for x in range(0, w, step_x):
        pixels.append(px[x, 0])
        pixels.append(px[x, h-1])
    for y in range(0, h, step_y):
        pixels.append(px[0, y])
        pixels.append(px[w-1, y])
    if not pixels:
        return (128, 128, 128), 20
    # 中位數
    pixels_sorted = sorted(pixels, key=lambda p: sum(p))
    mid = len(pixels_sorted) // 2
    median = pixels_sorted[mid]
    # 標準差（近似）
    diffs = [sum(abs(median[i] - p[i]) for i in range(3)) for p in pixels]
    avg_diff = sum(diffs) / len(diffs)
    # 容差：平均差 * 4，但至少 25、最多 70
    tolerance = max(25, min(70, avg_diff * 1.8))
    return median, tolerance


def floodfill_from_borders(img, bg_color, tolerance):
    """
    從四邊做 flood fill，把所有與邊界相連、顏色接近 bg_color 的像素
    填成透明。回傳 RGBA 圖。
    使用 PIL ImageDraw.floodfill 從四邊多點發起。
    """
    w, h = img.size
    rgba = img.convert('RGBA')
    # 我們用「綠幕」技巧：先把背景填成某種特殊色，再換成透明
    # 更可靠的做法：建立一個遮罩圖，從四邊多次 floodfill
    # 用一個灰色遮罩圖：0=未知，255=背景
    mask = Image.new('L', (w, h), 0)
    # bg_color 轉灰階當填充色？不，floodfill 是比對來源圖顏色
    # 我們直接在 rgba 上操作：用一個特殊 marker 色當背景
    # 更好的方法：使用 PIL ImageDraw.floodfill 搭配 thresh 參數（PIL 9.1+）
    
    # 方法：從四邊每個像素啟動 floodfill，把背景像素設為某個綠色
    # 然後把所有綠色像素設為透明
    draw = ImageDraw.Draw(rgba)
    # 特殊色：亮綠色（遠離深灰背景與角色）
    marker = (0, 255, 0, 255)
    
    # 容忍值（每通道）
    thresh = int(tolerance)
    
    # 從上邊界多點發起（100 點）
    n_pts = 100
    step = max(1, w // n_pts)
    for x in range(0, w, step):
        try:
            ImageDraw.floodfill(rgba, (x, 0), marker, thresh=thresh)
        except Exception:
            pass
    # 下邊界
    for x in range(0, w, step):
        try:
            ImageDraw.floodfill(rgba, (x, h-1), marker, thresh=thresh)
        except Exception:
            pass
    # 左邊界
    step = max(1, h // n_pts)
    for y in range(0, h, step):
        try:
            ImageDraw.floodfill(rgba, (0, y), marker, thresh=thresh)
        except Exception:
            pass
    # 右邊界
    for y in range(0, h, step):
        try:
            ImageDraw.floodfill(rgba, (w-1, y), marker, thresh=thresh)
        except Exception:
            pass
    # 四角再加強
    for pt in [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1),
               (w//2, 0), (w//2, h-1), (0, h//2), (w-1, h//2)]:
        try:
            ImageDraw.floodfill(rgba, pt, marker, thresh=thresh)
        except Exception:
            pass
    
    # 提取 alpha：marker 像素 → 透明，其餘 → 實心
    px = rgba.load()
    alpha_img = Image.new('L', (w, h), 255)
    apx = alpha_img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 250 and r < 10 and b < 10:  # 是 marker 色
                apx[x, y] = 0
                # 順便把 RGB 恢復（不讓 marker 色殘留）
                px[x, y] = bg_color + (0,)
    
    return rgba, alpha_img


def feather_alpha(alpha_img, radius=1.5):
    """邊緣 feather：高斯模糊 alpha 通道"""
    # 半徑轉為模糊半徑（PIL 的 GausianBlur radius 參數）
    blurred = alpha_img.filter(ImageFilter.GaussianBlur(radius=radius))
    return blurred


def remove_halo(rgba, alpha_img):
    """去除邊緣 halo：半透明區的 RGB 會被背景污染，把顏色壓向前景"""
    w, h = rgba.size
    px = rgba.load()
    apx = alpha_img.load()
    for y in range(h):
        for x in range(w):
            a = apx[x, y]
            if 0 < a < 240:
                r, g, b, _ = px[x, y]
                # alpha 越高越保留，越低越壓縮（減少背景污染）
                factor = max(0.2, a / 255.0 * 1.4 + 0.1)
                r = min(255, int(r * factor))
                g = min(255, int(g * factor))
                b = min(255, int(b * factor))
                px[x, y] = (r, g, b, a)
    return rgba


def cutout_image(src_path, dst_path):
    try:
        img = Image.open(src_path).convert('RGB')
    except Exception as e:
        return False, f"無法讀取: {e}"

    w, h = img.size
    
    # 取樣邊框色，自動計算容差
    bg_color, tolerance = sample_border_color(img)
    
    # flood fill 從四邊
    rgba, alpha_raw = floodfill_from_borders(img, bg_color, tolerance)
    
    # 若四角沒清乾淨，自動放寬容差重試（最多 3 次）
    fpx = rgba.load()
    w, h = img.size
    corners_alpha = [
        fpx[0, 0][3],
        fpx[w-1, 0][3],
        fpx[0, h-1][3],
        fpx[w-1, h-1][3],
    ]
    if any(c > 10 for c in corners_alpha):
        for attempt in range(3):
            tolerance = min(100, tolerance + 15)
            rgba, alpha_raw = floodfill_from_borders(img, bg_color, tolerance)
            fpx = rgba.load()
            corners_alpha = [
                fpx[0, 0][3],
                fpx[w-1, 0][3],
                fpx[0, h-1][3],
                fpx[w-1, h-1][3],
            ]
            if all(c <= 10 for c in corners_alpha):
                break
    
    # feather alpha
    alpha_feathered = feather_alpha(alpha_raw, radius=1.2)
    
    # 組合
    r_chan, g_chan, b_chan, _ = rgba.split()
    final = Image.merge('RGBA', (r_chan, g_chan, b_chan, alpha_feathered))
    
    # 去除 halo
    final = remove_halo(final, alpha_feathered)
    
    # 檢核
    fpx = final.load()
    corners = [
        fpx[0, 0][3],
        fpx[w-1, 0][3],
        fpx[0, h-1][3],
        fpx[w-1, h-1][3],
    ]
    corners_ok = all(c == 0 for c in corners)
    
    # 中央主體檢核
    cx1, cx2 = w // 4, w * 3 // 4
    cy1, cy2 = h // 4, h * 3 // 4
    center_count = 0
    center_total = 0
    for y in range(cy1, cy2, 4):
        for x in range(cx1, cx2, 4):
            center_total += 1
            if fpx[x, y][3] > 128:
                center_count += 1
    center_ok = center_total > 0 and (center_count / center_total) > 0.03
    
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    final.save(dst_path, 'PNG', optimize=True)
    
    return (corners_ok and center_ok), {
        'corners_ok': corners_ok,
        'center_ok': center_ok,
        'size': (w, h),
        'bg_color': bg_color,
        'tolerance': tolerance,
    }


def find_images(root_dir, recursive=True):
    exts = ('.jpg', '.jpeg', '.JPG', '.JPEG')
    results = []
    if recursive:
        for dirpath, _, filenames in os.walk(root_dir):
            for fn in filenames:
                if fn.endswith(exts):
                    results.append(os.path.join(dirpath, fn))
    else:
        for fn in sorted(os.listdir(root_dir)):
            if fn.endswith(exts):
                results.append(os.path.join(root_dir, fn))
    return sorted(results)


def verify_bbox_consistency(sprite_dir):
    """同一變身所有幀的 bbox 中心位移 < 5% 畫面寬高"""
    pngs = sorted([f for f in os.listdir(sprite_dir) if f.endswith('.png')])
    if len(pngs) < 2:
        return True, "僅1張"
    centers = []
    ref_w = ref_h = 0
    for p in pngs:
        img = Image.open(os.path.join(sprite_dir, p)).convert('RGBA')
        ref_w, ref_h = img.size
        alpha = img.split()[3]
        # 快速找 bbox
        bbox = alpha.getbbox()
        if not bbox:
            continue
        left, top, right, bottom = bbox
        cx = (left + right) / 2
        cy = (top + bottom) / 2
        centers.append((p, cx, cy))
    if not centers:
        return False, "無前景"
    cxs = [c[1] for c in centers]
    cys = [c[2] for c in centers]
    dx = max(cxs) - min(cxs)
    dy = max(cys) - min(cys)
    ok = dx < ref_w * 0.05 and dy < ref_h * 0.05
    return ok, f"dx={dx:.1f}px dy={dy:.1f}px (閾值 {ref_w*0.05:.1f}/{ref_h*0.05:.1f})"


def main():
    parser = argparse.ArgumentParser(description='精靈圖去背（純 Pillow）')
    parser.add_argument('dirs', nargs='+', help='要處理的目錄')
    parser.add_argument('--recursive', '-r', action='store_true')
    parser.add_argument('--in-place', action='store_true', help='刪除來源 jpg')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()

    total = ok = fail = 0

    for root in args.dirs:
        if not os.path.exists(root):
            print(f"[跳過] 不存在: {root}")
            continue
        images = find_images(root, recursive=args.recursive)
        if not images:
            print(f"[跳過] 無 jpg: {root}")
            continue
        print(f"\n[處理] {root} — {len(images)} 張")

        for i, src in enumerate(images, 1):
            dst = os.path.splitext(src)[0] + '.png'
            if args.verify_only:
                if os.path.exists(dst):
                    img = Image.open(dst).convert('RGBA')
                    w, h = img.size
                    px = img.load()
                    corners = [px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]
                    c_ok = all(c == 0 for c in corners)
                    # 中央主體比例
                    count = total_c = 0
                    for y in range(h//4, h*3//4, 8):
                        for x in range(w//4, w*3//4, 8):
                            total_c += 1
                            if px[x,y][3] > 128:
                                count += 1
                    ct_ok = total_c > 0 and count / total_c > 0.03
                    total += 1
                    if c_ok and ct_ok:
                        ok += 1
                    else:
                        fail += 1
                        print(f"  [FAIL] {src} corners={corners}")
                continue

            success, info = cutout_image(src, dst)
            total += 1
            if success:
                ok += 1
            else:
                fail += 1
                print(f"  [WARN] {os.path.relpath(src)} {info}")

            if args.in_place and os.path.exists(dst):
                try:
                    os.remove(src)
                except OSError:
                    pass
            if i % 25 == 0:
                print(f"  ... {i}/{len(images)}")

    print(f"\n=== 總計: {total} 張, 通過 {ok}, 未通過 {fail} ===")
    return 0 if fail == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
