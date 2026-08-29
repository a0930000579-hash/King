#!/usr/bin/env python3
"""
PNG 量化壓縮：將 32-bit RGBA PNG 轉為 256 色索引色 PNG（含 alpha）
大幅縮小體積以適應 git 提交空間限制
品質：256 色 + dithering（精靈圖肉眼幾乎無損）
"""
import os
import sys
from PIL import Image


def quantize_png(png_path, colors=256):
    """量化 PNG 為索引色，節省空間"""
    try:
        img = Image.open(png_path).convert('RGBA')
    except Exception as e:
        return False, f'讀取失敗: {e}'
    
    orig_size = os.path.getsize(png_path)
    
    # 分離 RGB 與 alpha
    r, g, b, alpha = img.split()
    rgb = Image.merge('RGB', (r, g, b))
    
    # 量化 RGB（256 色，median cut + floyd-steinberg dithering）
    q_rgb = rgb.quantize(colors=colors, method=2, dither=Image.Dither.FLOYDSTEINBERG)
    q_rgb = q_rgb.convert('RGBA')
    
    # 把 alpha 放回
    q_r, q_g, q_b, _ = q_rgb.split()
    result = Image.merge('RGBA', (q_r, q_g, q_b, alpha))
    
    # 儲存
    tmp_path = png_path + '.tmp'
    result.save(tmp_path, 'PNG', optimize=True)
    
    new_size = os.path.getsize(tmp_path)
    if new_size < orig_size:
        os.replace(tmp_path, png_path)
        return True, f'{orig_size/1024:.1f}KB → {new_size/1024:.1f}KB ({new_size/orig_size*100:.1f}%)'
    else:
        os.remove(tmp_path)
        return True, f'無需壓縮（原檔更小）'


def process_dir(root_dir):
    total = compressed = skipped = 0
    total_bytes = saved_bytes = 0
    
    for dp, _, fns in os.walk(root_dir):
        for fn in sorted(fns):
            if not fn.lower().endswith('.png'):
                continue
            fp = os.path.join(dp, fn)
            total += 1
            orig = os.path.getsize(fp)
            total_bytes += orig
            success, info = quantize_png(fp, colors=256)
            if success:
                new_size = os.path.getsize(fp)
                saved = orig - new_size
                if saved > 0:
                    compressed += 1
                    saved_bytes += saved
                else:
                    skipped += 1
            else:
                skipped += 1
            
            if total % 50 == 0:
                print(f'  ... {total} 張, 已壓縮 {compressed}, 節省 {saved_bytes/1024/1024:.1f}MB')
    
    print(f'\n{root_dir}: 共 {total} 張')
    print(f'  壓縮成功: {compressed} 張')
    print(f'  無需壓縮: {skipped} 張')
    print(f'  總大小: {total_bytes/1024/1024:.1f}MB → {(total_bytes-saved_bytes)/1024/1024:.1f}MB')
    print(f'  節省: {saved_bytes/1024/1024:.1f}MB ({saved_bytes/total_bytes*100:.1f}%)')
    
    return total, compressed, saved_bytes


if __name__ == '__main__':
    dirs = sys.argv[1:] or ['assets/transform']
    for d in dirs:
        if os.path.exists(d):
            process_dir(d)
