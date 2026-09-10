#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
King 精靈批量去背工具（本地 AI matting，不呼叫生圖、不耗生圖額度）
- 以 isnet-general-use 分割「人物主體 vs 背景墨漬/黑底/白底」
- 前景保留原始畫素與原始羽化 alpha，背景轉透明
- 可選 --trim 裁掉透明邊、--anchor 統一畫布並把腳底對齊底部中央（Foot Anchor）
注意：若「原圖本身」就有白色鏤空/缺腿等生成殘缺，缺失畫素無法憑空補回，
      此類素材需重新生成，工具只負責去背不臆造內容。
依賴：pip install rembg onnxruntime pillow numpy scipy
用法：
  python3 scripts/ai_matte.py 輸入.png -o 輸出.png
  python3 scripts/ai_matte.py assets/class --outdir assets_matted --trim --anchor 96x128
"""
import os, sys, argparse, glob
import numpy as np
from PIL import Image

def get_session(model='isnet-general-use'):
    from rembg import new_session
    return new_session(model)

def matte_one(im, sess, white_hi=235, white_sat=10):
    from rembg import remove
    from scipy import ndimage
    orig = im.convert('RGBA')
    out = remove(orig, session=sess)                       # AI 空間分割
    a = np.array(out); o = np.array(orig)
    ai_al = a[..., 3]
    r,g,b,al = o[...,0].astype(np.int16),o[...,1].astype(np.int16),o[...,2].astype(np.int16),o[...,3]
    mx=np.maximum(np.maximum(r,g),b);mn=np.minimum(np.minimum(r,g),b);sat=mx-mn
    fg = ai_al > 120
    fal = np.where(fg, al, 0).astype(np.uint8)
    keep = ndimage.binary_closing(fal>0, np.ones((3,3)), iterations=1)
    keep = ndimage.binary_fill_holes(keep)
    lab,n = ndimage.label(keep, np.ones((3,3)))
    if n>0:
        sz=np.bincount(lab.ravel()); sz[0]=0; keep=(lab==sz.argmax())
    white=(r>white_hi)&(g>white_hi)&(b>white_hi)&(sat<white_sat)&keep   # 主體內純白鏤空
    keep&=~white
    res=o.copy(); res[...,3]=np.where(keep, np.maximum(al,200), 0).astype(np.uint8)
    return Image.fromarray(res,'RGBA')

def trim(img):
    a=np.array(img)[...,3]; ys,xs=np.where(a>8)
    if len(xs)==0: return img,(0,0)
    return img.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1)),(xs.min(),ys.min())

def anchor(img, w, h):
    """統一畫布 w×h，腳底水平居中、貼底（Foot Anchor X=0.5 Y=1.0）"""
    img,_=trim(img); iw,ih=img.size
    s=min(w/iw, h/ih); nw,nh=max(1,int(iw*s)),max(1,int(ih*s))
    img=img.resize((nw,nh), Image.LANCZOS)
    canvas=Image.new('RGBA',(w,h),(0,0,0,0))
    canvas.paste(img,((w-nw)//2, h-nh), img)
    return canvas

def main():
    ap=argparse.ArgumentParser();ap.add_argument('src');ap.add_argument('-o','--out');ap.add_argument('--outdir')
    ap.add_argument('--trim',action='store_true');ap.add_argument('--anchor',help='如 96x128')
    ap.add_argument('--model',default='isnet-general-use');a=ap.parse_args()
    sess=get_session(a.model)
    aw=ah=None
    if a.anchor: aw,ah=[int(x) for x in a.anchor.lower().split('x')]
    files=[]
    if os.path.isdir(a.src):
        for ext in ('*.png','*.jpg','*.jpeg','*.webp'): files+=glob.glob(os.path.join(a.src,'**',ext),recursive=True)
    else: files=[a.src]
    for f in files:
        im=Image.open(f); res=matte_one(im,sess)
        if a.anchor: res=anchor(res,aw,ah)
        elif a.trim: res,_=trim(res)
        if a.outdir:
            rel=os.path.relpath(f,a.src); dst=os.path.join(a.outdir,os.path.splitext(rel)[0]+'.png')
            os.makedirs(os.path.dirname(dst),exist_ok=True); res.save(dst);print('->',dst)
        elif a.out: res.save(a.out);print('->',a.out)
        else:
            dst=os.path.splitext(f)[0]+'_matted.png';res.save(dst);print('->',dst)

if __name__=='__main__': main()
