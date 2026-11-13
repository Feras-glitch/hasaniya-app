import re, base64, io, os
import sys
# يبني نسخة «ملف واحد» من التطبيق: كل السكربتات والأنماط والصور داخل HTML واحد.
# الاستعمال: python3 tools/build_standalone.py [مسار_الإخراج]
root=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")+os.sep
html=io.open(root+"index.html",encoding="utf-8").read()
html=re.sub(r'<link rel="manifest"[^>]*>\n?','',html)
# v105: الصوت البشري المضمّن (إن وُجد) يدخل الملف الواحد، لأن الملف الواحد لا يقرأ ملفاً بجانبه.
# يُضاف قبل إدخال السكربتات، فلا يختلط بنص «</head>» داخل أحدها
cfg=io.open(root+"js/config.js",encoding="utf-8").read()
vid=re.search(r'const BUNDLED_VOICE_ID = "([0-9a-f]*)";',cfg)
assert vid, "BUNDLED_VOICE_ID غير موجود في config.js"
if vid.group(1):
    pack=root+"audio/voice-pack.zip"
    assert os.path.exists(pack), "BUNDLED_VOICE_ID مكتوب بلا ملف audio/voice-pack.zip"
    b64=base64.b64encode(open(pack,"rb").read()).decode()
    assert html.count("</head>")==1
    html=html.replace("</head>",'<script>window.HASANIYA_VOICE_PACK_B64="%s";</script>\n</head>'%b64)
css=io.open(root+"css/styles.css",encoding="utf-8").read()
# v105: الخط المضمّن يدخل الملف الواحد نفسه
def font_inline(m):
    rel=m.group(1); data=base64.b64encode(open(root+rel,"rb").read()).decode()
    return 'url("data:font/woff;base64,%s")'%data
css=re.sub(r'url\("\.\./(fonts/[A-Za-z0-9_\-]+\.woff)"\)', font_inline, css)
html=re.sub(r'<link rel="stylesheet" href="css/styles.css">', lambda m: "<style>\n"+css+"\n</style>", html)
def inline(m):
    src=m.group(1); body=io.open(root+src,encoding="utf-8").read()
    assert "</script" not in body.lower(), src
    return "<script>\n// ---- "+src+" ----\n"+body+"\n</script>"
html,n=re.subn(r'<script src="([^"]+)"></script>', inline, html)
scenes=io.open(root+"js/data/scenes.js",encoding="utf-8").read()
for rel in set(re.findall(r'img/scenes/[A-Za-z0-9_\-]+\.(?:jpg|png|webp)', html+scenes)):
    data=base64.b64encode(open(root+rel,"rb").read()).decode()
    mime={"jpg":"image/jpeg","png":"image/png","webp":"image/webp"}[rel.rsplit(".",1)[1]]
    html=html.replace(rel,"data:%s;base64,%s"%(mime,data))
out=sys.argv[1] if len(sys.argv)>1 else os.path.join(root,"..","hasaniya-standalone.html")
os.makedirs(os.path.dirname(os.path.abspath(out)),exist_ok=True)
io.open(out,"w",encoding="utf-8").write(html)
print("scripts:",n,"size MB:",round(os.path.getsize(out)/1e6,2))
