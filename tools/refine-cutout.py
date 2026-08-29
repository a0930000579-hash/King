#!/usr/bin/env python3
"""
去背二次精修：針對邊框透明率不足的 PNG，
以現有 alpha 為基礎重新估計背景色，再做更寬容的邊緣清理，
同時監控主體面積避免挖洞。
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter


def refine_cutout(png_path, max_tries=3):
    img = Image.open(png_path).convert('RGBA')
    w, h = img.size
    px = img.load()
    alpha = img.split()[3]
    apx = alpha.load()

    # 計算當前邊框透明率
    def border_clear_pct():
        c = t = 0
        for x in range(w):
            for dy in range(5):
                t += 2
                if apx[x, dy] < 10: c += 1
                if apx[x, h-1-dy] < 10: c += 1
        for y in range(h):
            for dx in range(5):
                t += 2
                if apx[dx, y] < 10: c += 1
                if apx[w-1-dx, y] < 10: c += 1
        return c / t * 100 if t > 0 else 0

    # 主體面積（alpha > 128 像素數抽樣）
    def fg_area_pct():
        fg = t = 0
        step = max(1, min(w, h) // 50)
        for y in range(0, h, step):
            for x in range(0, w, step):
                t += 1
                if apx[x, y] > 128: fg += 1
        return fg / t * 100 if t > 0 else 0

    initial_clear = border_clear_pct()
    initial_fg = fg_area_pct()
    if initial_clear >= 95:
        return True, '已足夠乾淨'

    # 估計背景色（從 alpha < 10 的像素取中位）
    bg_pixels = []
    step = max(1, min(w, h) // 80)
    for y in range(0, h, step):
        for x in range(0, w, step):
            if apx[x, y] < 30:
                bg_pixels.append(px[x, y][:3])
    if not bg_pixels:
        return initial_clear >= 80, f'無背景像素可估計, 邊框透明率={initial_clear:.1f}%'
    bg_pixels.sort(key=lambda p: sum(p))
    bg_color = bg_pixels[len(bg_pixels)//2]

    # 重新做 flood fill，但用更高容差
    current_tolerance = 70
    best_alpha = alpha.copy()
    best_clear = initial_clear
    
    for attempt in range(max_tries):
        current_tolerance = min(150, current_tolerance + 25)
        
        # 在現有 alpha 基礎上，進一步清理邊緣
        # 方法：對 alpha < 60 且顏色接近 bg_color 的像素，降低 alpha
        refined = alpha.copy()
        rapx = refined.load()
        
        # 從四邊做 BFS，標記所有與邊界相連的「近背景色且低 alpha」區域
        # 使用 stack
        to_process = []
        visited = set()
        # 四邊起點（alpha 介於 5~200 之間，且顏色接近 bg）
        for x in range(w):
            for y in [0, h-1]:
                a = rapx[x, y]
                if 5 < a < 200:
                    r, g, b = px[x, y][:3]
                    diff = abs(r-bg_color[0]) + abs(g-bg_color[1]) + abs(b-bg_color[2])
                    if diff < current_tolerance:
                        to_process.append((x, y))
                        visited.add((x, y))
        for y in range(h):
            for x in [0, w-1]:
                a = rapx[x, y]
                if 5 < a < 200:
                    r, g, b = px[x, y][:3]
                    diff = abs(r-bg_color[0]) + abs(g-bg_color[1]) + abs(b-bg_color[2])
                    if diff < current_tolerance:
                        if (x, y) not in visited:
                            to_process.append((x, y))
                            visited.add((x, y))
        
        # BFS 清理
        cleared = 0
        while to_process:
            x, y = to_process.pop()
            if rapx[x, y] == 0:
                continue
            # 清空
            rapx[x, y] = 0
            cleared += 1
            # 檢查四鄰
            for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    na = rapx[nx, ny]
                    if 5 < na < 200:
                        r, g, b = px[nx, ny][:3]
                        diff = abs(r-bg_color[0]) + abs(g-bg_color[1]) + abs(b-bg_color[2])
                        if diff < current_tolerance:
                            visited.add((nx, ny))
                            to_process.append((nx, ny))
        
        # 檢查主體面積是否下降太多
        fg_after = 0
        fg_total = 0
        step = max(1, min(w, h) // 50)
        for y in range(0, h, step):
            for x in range(0, w, step):
                fg_total += 1
                if rapx[x, y] > 128:
                    fg_after += 1
        fg_pct = fg_after / fg_total * 100 if fg_total > 0 else 0
        
        # 主體面積下降不能超過 5%（相對）
        if initial_fg > 0 and (initial_fg - fg_pct) / initial_fg > 0.08:
            # 挖洞了，放棄這次
            continue
        
        # 更新 alpha
        new_clear = 0
        new_total = 0
        for x in range(w):
            for dy in range(5):
                new_total += 2
                if rapx[x, dy] < 10: new_clear += 1
                if rapx[x, h-1-dy] < 10: new_clear += 1
        for y in range(h):
            for dx in range(5):
                new_total += 2
                if rapx[dx, y] < 10: new_clear += 1
                if rapx[w-1-dx, y] < 10: new_clear += 1
        new_clear_pct = new_clear / new_total * 100
        
        if new_clear_pct > best_clear:
            best_clear = new_clear_pct
            best_alpha = refined
        
        if new_clear_pct >= 98:
            break
    
    # 組合最終結果
    r_chan, g_chan, b_chan, _ = img.split()
    final = Image.merge('RGBA', (r_chan, g_chan, b_chan, best_alpha))
    final.save(png_path, 'PNG', optimize=True)
    
    final_clear = best_clear
    final_fg = fg_area_pct()
    ok = final_clear >= 90
    
    return ok, f'邊框透明率 {initial_clear:.1f}% → {final_clear:.1f}%, 主體 {initial_fg:.1f}% → {final_fg:.1f}%'


def find_low_clear_pngs(root_dir, threshold=90.0):
    results = []
    for dp, _, fns in os.walk(root_dir):
        for fn in fns:
            if not fn.lower().endswith('.png'):
                continue
            fp = os.path.join(dp, fn)
            try:
                img = Image.open(fp).convert('RGBA')
            except Exception:
                continue
            w, h = img.size
            apx = img.split()[3].load()
            c = t = 0
            for x in range(w):
                for dy in range(5):
                    t += 2
                    if apx[x, dy] < 10: c += 1
                    if apx[x, h-1-dy] < 10: c += 1
            for y in range(h):
                for dx in range(5):
                    t += 2
                    if apx[dx, y] < 10: c += 1
                    if apx[w-1-dx, y] < 10: c += 1
            pct = c / t * 100 if t > 0 else 0
            if pct < threshold:
                results.append((fp, pct))
    return results


if __name__ == '__main__':
    roots = sys.argv[1:] or ['assets/transform']
    for r in roots:
        if not os.path.exists(r):
            continue
        print(f'[{r}] 尋找邊框透明率 < 90% 的 PNG...')
        targets = find_low_clear_pngs(r, 90.0)
        print(f'  找到 {len(targets)} 張需要二次精修')
        ok = fail = 0
        for fp, pct in targets:
            success, info = refine_cutout(fp)
            if success:
                ok += 1
            else:
                fail += 1
                print(f'  [WARN] {fp}: {info}')
        print(f'  精修結果：{ok} 改善通過, {fail} 未通過')
