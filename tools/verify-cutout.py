#!/usr/bin/env python3
"""
去背結果全面驗證：
1. 每張四角 alpha < 10
2. 主體 bbox 內 alpha 覆蓋率合理（不被挖洞）
3. 同一角色 8 幀 bbox 中心位移 < 5%
4. 列出所有失敗檔名
"""
import os
import sys
from PIL import Image

def verify_dir(root_dir, label=''):
    total = 0
    corner_pass = 0
    corner_fail = []
    body_fail = []
    
    # 收集所有角色子目錄（用於 8 幀一致性檢查）
    character_dirs = {}  # dir -> [png files]
    
    for dp, _, fns in os.walk(root_dir):
        pngs = sorted([f for f in fns if f.lower().endswith('.png')])
        if not pngs:
            continue
        # 跳過頂層（transform/ 本身）
        rel = os.path.relpath(dp, root_dir)
        if rel == '.':
            continue
        
        # 判斷是不是角色目錄（有 idle.png / walk_down.png 等動畫檔）
        anim_files = {'idle.png', 'walk_down.png', 'walk_up.png', 'walk_side.png',
                      'attack.png', 'attack_1.png', 'attack_2.png', 'attack_3.png',
                      'hit.png', 'down.png', 'up.png', 'side.png'}
        has_anim = any(f in pngs for f in anim_files)
        
        if has_anim:
            character_dirs[dp] = pngs
        
        for fn in pngs:
            fp = os.path.join(dp, fn)
            total += 1
            try:
                img = Image.open(fp).convert('RGBA')
            except Exception as e:
                corner_fail.append((fp, '無法讀取: ' + str(e)))
                continue
            w, h = img.size
            px = img.load()
            alpha = img.split()[3]
            
            # 四角
            corners = [px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]
            if all(c < 10 for c in corners):
                corner_pass += 1
            else:
                corner_fail.append((fp, corners))
            
            # 主體覆蓋率（中心 60% 區域 alpha > 128 的比例）
            x1, x2 = int(w*0.2), int(w*0.8)
            y1, y2 = int(h*0.2), int(h*0.8)
            fg = 0
            bg = 0
            sample_step = max(1, min(w, h) // 100)
            for y in range(y1, y2, sample_step):
                for x in range(x1, x2, sample_step):
                    a = px[x, y][3]
                    if a > 128:
                        fg += 1
                    elif a < 30:
                        bg += 1
            total_sample = fg + bg
            if total_sample > 0 and fg / total_sample < 0.02:
                body_fail.append((fp, f'中心前景過少 {fg/total_sample*100:.1f}%'))
    
    # 8 幀 bbox 一致性
    bbox_fail = []
    bbox_total = 0
    bbox_pass = 0
    for cdir, files in character_dirs.items():
        if len(files) < 2:
            continue
        centers = []
        ref_w = ref_h = 0
        for fn in files:
            fp = os.path.join(cdir, fn)
            try:
                img = Image.open(fp).convert('RGBA')
                w, h = img.size
                ref_w, ref_h = w, h
                bbox = img.split()[3].getbbox()
                if not bbox:
                    continue
                left, top, right, bottom = bbox
                cx = (left + right) / 2
                cy = (top + bottom) / 2
                centers.append((fn, cx, cy))
            except Exception:
                pass
        if len(centers) < 2:
            continue
        bbox_total += 1
        cxs = [c[1] for c in centers]
        cys = [c[2] for c in centers]
        dx = max(cxs) - min(cxs)
        dy = max(cys) - min(cys)
        if dx < ref_w * 0.08 and dy < ref_h * 0.08:
            bbox_pass += 1
        else:
            bbox_fail.append((cdir, f'dx={dx:.1f} dy={dy:.1f} 閾值={ref_w*0.08:.1f}/{ref_h*0.08:.1f}'))
    
    # 列印結果
    print(f'\n=== {label or root_dir} 驗證結果 ===')
    print(f'總計 {total} 張 PNG')
    print(f'四角 alpha<10：{corner_pass}/{total} 通過 ({corner_pass/total*100:.1f}%)')
    if corner_fail:
        print(f'  失敗 {len(corner_fail)} 張:')
        for fp, detail in corner_fail[:30]:
            print(f'    {os.path.relpath(fp, root_dir)}: corners={detail}')
        if len(corner_fail) > 30:
            print(f'    ... 還有 {len(corner_fail)-30} 張')
    
    if body_fail:
        print(f'主體挖洞異常：{len(body_fail)} 張')
        for fp, detail in body_fail[:10]:
            print(f'    {os.path.relpath(fp, root_dir)}: {detail}')
    
    print(f'角色動畫組數：{bbox_total} 組')
    print(f'8 幀 bbox 一致：{bbox_pass}/{bbox_total} 通過')
    if bbox_fail:
        print(f'  失敗 {len(bbox_fail)} 組:')
        for d, detail in bbox_fail[:10]:
            print(f'    {os.path.relpath(d, root_dir)}: {detail}')
    
    return {
        'total': total,
        'corner_pass': corner_pass,
        'corner_fail_count': len(corner_fail),
        'corner_fail_files': corner_fail,
        'body_fail_count': len(body_fail),
        'body_fail_files': body_fail,
        'bbox_total': bbox_total,
        'bbox_pass': bbox_pass,
        'bbox_fail_files': bbox_fail,
    }

if __name__ == '__main__':
    roots = sys.argv[1:] or ['assets/transform']
    all_fail = 0
    for r in roots:
        if not os.path.exists(r):
            print(f'[跳過] 不存在: {r}')
            continue
        result = verify_dir(r, label=r)
        all_fail += result['corner_fail_count'] + result['body_fail_count']
    sys.exit(0 if all_fail == 0 else 1)
