"""Build deterministic HTML wrappers and standalone tools; no third-party packages."""
from pathlib import Path
import json, html, re, shutil, zipfile

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
pages={'':'展務工作台','guide':'流程與任務','exhibits':'展品檔案','templates':'範本中心','incidents':'問題處理','handover':'交接紀錄','about':'專案說明與規則','design':'比較視覺方向'}
for route,title in pages.items():
    prefix='../' if route else './'
    output=DIST/route/'index.html'
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(f'''<!doctype html>
<html lang="zh-Hant" data-base="{prefix}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="課程專題與數位作品展的展務工作台。找到任務、展品、範本與接手紀錄，讓下一步有依據。">
<meta name="theme-color" content="#101922"><title>{title}｜交接有據</title>
<link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml">
<script src="{prefix}assets/js/boot.js"></script><link rel="stylesheet" href="{prefix}assets/css/site.css">
</head><body data-page="{route or 'dashboard'}"><main class="main"><div class="loading">正在開啟展務工作台…</div><noscript>請開啟 JavaScript 以查看工作台、操作工具及保存本機進度。</noscript></main>
<script type="module" src="{prefix}assets/js/app.js"></script></body></html>''',encoding='utf-8')

theme_css=(DIST/'assets/css/site.css').read_text().split('*{box-sizing')[0]
tool_css=(DIST/'assets/css/tools.css').read_text()
boot=(DIST/'assets/js/boot.js').read_text()
core=re.sub(r'\bexport\s+', '', (DIST/'assets/js/tool-logic.mjs').read_text())
controller=(DIST/'assets/js/tool-ui.js').read_text()
exhibits=json.loads((DIST/'data/exhibits.json').read_text())
for x in exhibits:
    slug=x['slug']
    if slug not in ('list-cleaner','label-maker'): continue
    if slug=='list-cleaner':
        subtitle='去掉空白與重複，留下真正需要的項目。'
        body='''<section class="tool-panel input-panel"><div class="panel-head"><h2><span class="step">01</span>貼上原始清單</h2><button class="btn quiet sm" id="sample" type="button">載入範例</button></div>
<label class="sr-only" for="source">原始清單</label><textarea id="source" class="list-input" placeholder="每一行一個項目，例如：&#10;延長線&#10;HDMI 線&#10;延長線" spellcheck="false"></textarea>
<div class="options"><label><input type="checkbox" id="trim" checked>去除首尾空白</label><label><input type="checkbox" id="removeEmpty" checked>移除空行</label><label><input type="checkbox" id="deduplicate" checked>移除完全重複</label></div>
<div class="actions"><button id="process" class="btn primary" type="button">整理清單</button><button id="clear" class="btn quiet" type="button">清空</button></div></section>
<section class="tool-panel"><div class="panel-head"><h2><span class="step">02</span>查看整理結果</h2><span class="small muted">保留原順序</span></div>
<label class="sr-only" for="output">整理結果</label><textarea id="output" class="list-input" readonly placeholder="整理後的項目會顯示在這裡。"></textarea>
<div class="stats"><div><strong id="kept">—</strong><span>保留項目</span></div><div><strong id="empty-count">—</strong><span>移除空行</span></div><div><strong id="duplicate-count">—</strong><span>移除重複</span></div></div>
<div class="actions"><button id="copy" class="btn" type="button" disabled>複製結果</button><button id="download" class="btn" type="button" disabled>下載 TXT</button></div><p id="feedback" class="feedback" role="status"></p></section>'''
        tips='<p>載入範例後，原始 5 行會留下 3 筆：延長線、HDMI 線、筆電。移除 1 個空行與 1 個重複項目。</p>'
    else:
        subtitle='把作品重點排好，帶到展場使用。'
        fields=[('title','作品名稱',40,True),('format','作品形式',30,True),('description','作品介紹',160,True),('credit','署名',40,False)]
        controls=[]
        for key,label,limit,required in fields:
            inp=(f'<textarea id="{key}" rows="4" aria-describedby="error-{key} count-{key}"></textarea>' if key=='description' else f'<input type="text" id="{key}" aria-describedby="error-{key} count-{key}">')
            controls.append(f'<label class="field" for="{key}"><span class="field-title">{label}{" *" if required else "（選填）"}<small class="count" id="count-{key}">0/{limit}</small></span>{inp}<span class="error-text" id="error-{key}"></span></label>')
        body='''<section class="tool-panel input-panel"><div class="panel-head"><h2><span class="step">01</span>填寫作品資料</h2><button class="btn quiet sm" id="sample" type="button">載入範例</button></div><form id="label-form" novalidate>'''+''.join(controls)+'''<button class="btn primary" type="submit">產生說明牌</button></form><p id="feedback" class="feedback" role="status"></p></section>
<section class="tool-panel preview-panel"><div class="panel-head"><h2><span class="step">02</span>確認版面</h2><span class="small muted">列印預覽</span></div>
<div id="placeholder" class="preview-placeholder"><div><b>你的作品，值得被清楚介紹。</b><span class="small">填寫左側資料，再產生說明牌。</span></div></div>
<article id="label-preview" class="exhibit-label" aria-label="展品說明牌預覽" hidden><small>DIGITAL EXHIBITION</small><h2 id="preview-title"></h2><div class="format" id="preview-format"></div><p class="description" id="preview-description"></p><p class="credit" id="preview-credit"></p></article>
<div class="actions"><button id="print" class="btn" type="button" disabled>列印／另存 PDF</button></div><div class="print-note">列印時僅保留說明牌。可在瀏覽器的列印視窗選擇另存 PDF；紙張與邊界仍以預覽為準。</div></section>'''
        tips='<p>載入範例，產生「清單整理器」說明牌。再把名稱留空或輸入超過 40 字，確認有錯誤提示且原文保留。</p>'
    steps=''.join('<li>'+html.escape(s)+'</li>' for s in x['steps'])
    limits=''.join('<li>'+html.escape(s)+'</li>' for s in x['limits'])
    for offline in (False,True):
        back='../exhibits/' if offline else '../../exhibits/'
        doc=f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(x['title'])}｜交接有據</title><style>{theme_css}{tool_css}</style><script>{boot}</script></head>
<body><main class="tool-shell"><nav class="tool-nav" aria-label="工具導覽"><a class="back-link" id="back-link" href="{back}">← 回展品檔案</a><span class="tool-brand">交接有據</span><span class="tool-meta" id="offline-note">示範工具 · v{x.get('version','0.2')}</span></nav>
<header class="tool-hero"><div class="eyebrow">PRACTICAL TOOLS / DIGITAL EXHIBITION</div><h1>{html.escape(x['title'])}</h1><p class="muted">{subtitle}</p></header>
<div class="tool-grid">{body}</div>
<section class="tool-info"><div><h3>示範怎麼做？</h3>{tips}<ol>{steps}</ol></div><div><h3>使用範圍</h3><ul>{limits}</ul><p class="small muted">資料在瀏覽器內處理，不上傳。輸入不會自動保存，關閉頁面前請帶走需要的結果。</p></div></section>
<footer class="tool-footer"><span>交接有據 · 本專案以 AI 協作開發的示範工具</span><span>兩種版本使用相同核心邏輯</span></footer></main>
<script>const TOOL_ID={json.dumps(slug)};const SAMPLE={json.dumps(x['sampleInput'],ensure_ascii=False)};\n{core}\n{controller}</script></body></html>'''
        dest=DIST/'downloads'/f'{slug}-offline.html' if offline else DIST/'tools'/slug/'index.html'
        dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(doc,encoding='utf-8')
shutil.copyfile(ROOT/'AGENTS.md',DIST/'downloads/AGENTS.md')
for name in ('extension-log.md','validation.md'):
    shutil.copyfile(ROOT/'docs'/name,DIST/'downloads'/name)
print('Built 8 website pages, 2 online tools, 2 offline tools, and AGENTS.md download.')
