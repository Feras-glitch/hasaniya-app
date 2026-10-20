#!/usr/bin/env python3
"""يضغط صور المشاهد في img/scenes إلى WebP خفيف (الهدف 40 كيلوبايت للصورة).
الاستعمال: python3 tools/compress_scenes.py [مجلد_مصدر_اختياري]
- بلا وسيط: يعيد ضغط الصور الموجودة في img/scenes في مكانها.
- مع مجلد مصدر: يقرأ منه PNG/JPG/WEBP ويكتب <معرّف_البيت>.webp في img/scenes (اسم الملف بلا امتداد = معرّف البيت).
"""
import io, os, sys
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "img", "scenes")
TARGET = 40 * 1024
MAX_W = 640
def encode(img):
    q = 82
    while True:
        buf = io.BytesIO(); img.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= TARGET or q <= 40: return buf.getvalue(), q
        q -= 6
def process(src, dst):
    img = Image.open(src); img = img.convert("RGB")
    if img.width > MAX_W: img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
    data, q = encode(img)
    if os.path.abspath(src) == os.path.abspath(dst) and len(data) >= os.path.getsize(src): return os.path.getsize(src), os.path.getsize(src), q, False
    old = os.path.getsize(src)
    with open(dst, "wb") as f: f.write(data)
    return old, len(data), q, True
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    srcdir = sys.argv[1] if len(sys.argv) > 1 else OUT
    tot0 = tot1 = 0
    for n in sorted(os.listdir(srcdir)):
        base, ext = os.path.splitext(n)
        if ext.lower() not in (".png", ".jpg", ".jpeg", ".webp"): continue
        a, b, q, ch = process(os.path.join(srcdir, n), os.path.join(OUT, base + ".webp"))
        tot0 += a; tot1 += b
        print(f"{base}: {a//1024}KB -> {b//1024}KB (q={q})")
    print(f"المجموع: {tot0//1024}KB -> {tot1//1024}KB")
