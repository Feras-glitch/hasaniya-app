#!/usr/bin/env python3
"""v108: آيات القرآن في التطبيق برسم مصحف المدينة (خطوط مجمع الملك فهد QPC V2، خط لكل صفحة).

المصادر محفوظة في المستودع (sources/quran/) حتى لا تضيع:
  - qpc-v2-ayah-by-ayah-glyphs.json.zip : رموز كل آية كاملة (مع علامة رقم الآية) ورقم صفحتها، كما أرسلها فراس
  - fonts/QCF2xxx.ttf                    : خط الصفحة xxx من خطوط المجمع (عن nuqayah/qpc-fonts، مجلد mushaf-v2)

ما يفعله:
  1) يقرأ مراجع الآيات من web/js/data/links.js (مثل «الفيل 105:1–5»)
  2) يكتب web/js/data/quran-glyphs.js : { "105:1": [601, "رموز الآية"], ... }
  3) يقتطع من خط كل صفحة الرموز المستعملة فقط ← web/fonts/qpc-pNNN.woff
  4) يكتب كتلة @font-face بين علامتين في web/css/styles.css

التشغيل: python3 tools/build_quran_glyphs.py
لإضافة آية من صفحة جديدة: انسخ QCF2NNN.ttf من المصدر نفسه إلى sources/quran/fonts ثم أعد التشغيل.
"""
import json, os, re, subprocess, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "sources", "quran")
WEB = os.path.join(ROOT, "web")

with zipfile.ZipFile(os.path.join(SRC, "qpc-v2-ayah-by-ayah-glyphs.json.zip")) as z:
    G = json.loads(z.read("qpc-v2-ayah-by-ayah-glyphs.json"))

links = open(os.path.join(WEB, "js", "data", "links.js"), encoding="utf8").read()
keys = []
for s, a, b in re.findall(r'ref:\s*"[^"]*?(\d+):(\d+)(?:[–-](\d+))?"', links):
    for n in range(int(a), int(b or a) + 1):
        k = f"{s}:{n}"
        if k not in keys:
            keys.append(k)
if not keys:
    sys.exit("لم أجد مراجع آيات في links.js")

out, pages = {}, {}
for k in keys:
    g = G[k]
    out[k] = [g["page_number"], g["text"]]
    pages.setdefault(g["page_number"], set()).update(g["text"].replace(" ", ""))

js = ("/* مولَّد آلياً بـ tools/build_quran_glyphs.py — لا يُعدَّل يدوياً.\n"
      "   رموز آيات مصحف المدينة (QPC V2): [رقم الصفحة، رموز الآية كاملة مع علامة رقمها]. تُرسم بخط الصفحة qpc-pNNN.woff */\n"
      "const QURAN_GLYPHS = " + json.dumps(out, ensure_ascii=False, indent=0).replace("\n", "") + ";\n")
open(os.path.join(WEB, "js", "data", "quran-glyphs.js"), "w", encoding="utf8").write(js)

fonts = os.path.join(WEB, "fonts")
for f in os.listdir(fonts):
    if re.fullmatch(r"qpc-p\d+\.woff", f):
        os.remove(os.path.join(fonts, f))
css = []
for p in sorted(pages):
    ttf = os.path.join(SRC, "fonts", f"QCF2{p:03d}.ttf")
    if not os.path.exists(ttf):
        sys.exit(f"خط الصفحة {p} غير موجود: {ttf}")
    dst = os.path.join(fonts, f"qpc-p{p}.woff")
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf8") as t:
        t.write(" " + "".join(sorted(pages[p])))
    subprocess.run(["pyftsubset", ttf, f"--text-file={t.name}", "--flavor=woff", f"--output-file={dst}",
                    "--no-hinting", "--layout-features=*"], check=True)
    os.remove(t.name)
    css.append(f'@font-face{{font-family:"QPC{p}";src:url("../fonts/qpc-p{p}.woff") format("woff");font-display:block}}'
               f'.qpc-p{p}{{font-family:"QPC{p}"}}')

cp = os.path.join(WEB, "css", "styles.css")
s = open(cp, encoding="utf8").read()
A, B = "/* QPC-BEGIN: مولَّد بـ tools/build_quran_glyphs.py */", "/* QPC-END */"
block = A + "\n" + "\n".join(css) + "\n" + B
s = re.sub(re.escape(A) + r".*?" + re.escape(B), lambda m: block, s, flags=re.S) if A in s else s.rstrip("\n") + "\n" + block + "\n"
open(cp, "w", encoding="utf8").write(s)
print(f"{len(keys)} آية من {len(pages)} صفحة: {sorted(pages)}")
