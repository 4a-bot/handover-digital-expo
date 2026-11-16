const base = new URL(document.documentElement.dataset.base || './', location.href);
const url = (path = '') => new URL(path, base).href;
const page = document.body.dataset.page || 'dashboard';
const query = new URLSearchParams(location.search);
const ST = { todo: '待開始', doing: '進行中', blocked: '待處理', done: '已完成' };
const STATE_KEY = 'handover-work-v1';
const themeNames = { harbor: '清爽深藍', paper: '暖白紙感', night: '深色展場' };
const icons = {
  brand: '<path d="M8 5H5v16h13v-3M9 2h12v14H9zM12 6h6M12 10h6M8 15l3 3 6-6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/>',
  box: '<path d="m3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 5l10 4"/>',
  file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6"/>',
  alert: '<path d="m12 3 10 18H2zM12 9v5M12 17v.1"/>',
  note: '<path d="M8 4H4v17h15v-4M8 4h7v4H8zM12 15l7-8 3 3-7 8-4 1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 16v5h16v-5"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="8" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="7" cy="14" r="1"/><path d="M20 15h-6l-2 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  external: '<path d="M14 3h7v7M21 3 10 14M10 5H4v16h16v-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>'
};

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') el.className = value;
    else if (['value', 'checked', 'disabled', 'selected', 'readOnly'].includes(key)) el[key] = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child !== undefined && child !== null && child !== false) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}
function replace(el, ...children) { el.replaceChildren(...children.flat(Infinity).filter(x => x !== false && x !== null && x !== undefined)); }
function icon(name) {
  const el = h('span', { class: 'icon', 'aria-hidden': 'true' });
  el.innerHTML = '<svg viewBox="0 0 24 24">' + (icons[name] || icons.file) + '</svg>';
  return el;
}
const link = (text, path, cls = '') => h('a', { href: url(path), class: cls }, text);
const button = (text, onClick, cls = 'btn', symbol) => h('button', { type: 'button', class: cls, onClick }, symbol && icon(symbol), text);
const badge = (text, cls = '') => h('span', { class: 'badge ' + cls }, text);
const list = (items, ordered = false) => h(ordered ? 'ol' : 'ul', { class: 'list-clean' }, items.map(x => h('li', {}, x)));
let D, state = { tasks: {}, notes: [] }, storageOK = true, main, currentRender;
let toastTimer;
function toast(text) {
  let el = document.querySelector('.toast');
  if (!el) { el = h('div', { class: 'toast', role: 'status' }); document.body.append(el); }
  el.textContent = text; el.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}
function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (const t of D.tasks) if (Object.hasOwn(ST, saved.tasks?.[t.id])) state.tasks[t.id] = saved.tasks[t.id];
      if (Array.isArray(saved.notes)) state.notes = saved.notes.filter(n => n && ['id','title','status','observation','action','next','role','time'].every(k => typeof n[k] === 'string')).slice(0, 200);
    }
  } catch (_) { storageOK = false; }
}
function persist() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); storageOK = true; }
  catch (_) { storageOK = false; toast('瀏覽器無法保存；請先匯出交接紀錄，離開頁面可能遺失。'); }
}
function status(id) { return state.tasks[id] || 'todo'; }
function setStatus(id, value) { state.tasks[id] = value; persist(); currentRender(); }
function download(text, filename, type = 'text/markdown;charset=utf-8') {
  const objectURL = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: objectURL, download: filename });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(objectURL), 30000);
}
const phaseById = id => D.phases.find(p => p.id === id);
const relatedTasks = (key, id) => D.tasks.filter(t => t[key].includes(id));
function sectionHead(title, sub, target) {
  return h('div', { class: 'section-head' }, h('h2', {}, title), target ? link(sub, target, 'small') : h('span', { class: 'small muted' }, sub || ''));
}
function hero(eyebrow, title, description, actions = []) {
  return h('div', { class: 'hero' }, h('div', {}, h('div', { class: 'eyebrow' }, eyebrow), h('h1', {}, title), h('p', { class: 'muted' }, description)), h('div', { class: 'hero-actions' }, actions));
}
function modal(title, children) {
  const dialog = h('dialog', { class: 'modal', 'aria-label': title });
  const close = button('', () => dialog.close(), 'icon-btn', 'close'); close.setAttribute('aria-label', '關閉視窗');
  dialog.append(h('div', { class: 'modal-head' }, h('h2', {}, title), close), h('div', { class: 'modal-body' }, children));
  dialog.addEventListener('close', () => dialog.remove());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  document.body.append(dialog); dialog.showModal(); return dialog;
}
function taskModal(t) {
  const field = h('select', { id: 'task-status', onChange: e => { setStatus(t.id, e.target.value); toast(storageOK ? '已保存目前任務狀態' : '本次狀態尚未保存'); } }, Object.entries(ST).map(([value, name]) => h('option', { value, selected: status(t.id) === value }, name)));
  modal(t.title, [
    h('div', { class: 'modal-meta' }, badge(phaseById(t.phaseId).title), h('span', {}, t.role)),
    h('div', { class: 'task-control' }, h('label', { for: 'task-status' }, '目前工作狀態'), field),
    h('p', { class: 'small muted' }, '依實際進度更新；標成完成前，請先對照下方完成判準。'),
    h('section', { class: 'modal-section' }, h('h3', {}, '開始前，先備妥'), list(t.prerequisites)),
    h('section', { class: 'modal-section' }, h('h3', {}, '操作步驟'), list(t.steps, true)),
    h('section', { class: 'modal-section info-box' }, h('h3', {}, '完成後應留下'), h('p', {}, t.deliverable), h('h3', {}, '怎樣才算完成？'), list(t.doneWhen)),
    h('section', { class: 'modal-section' }, h('h3', {}, '相關文件與展示入口'), h('div', { class: 'pill-row' }, t.templateIds.map(id => link(D.templates.find(x => x.id === id).title, 'templates/?id=' + id, 'btn sm')), t.exhibitIds.map(id => { const x = D.exhibits.find(x => x.id === id); return link(x.title, 'exhibits/?id=' + id, 'btn sm'); }))),
    t.incidentIds.length > 0 && h('section', { class: 'modal-section' }, h('h3', {}, '遇到問題時'), list(t.incidentIds.map(id => link(D.incidents.find(x => x.id === id).title, 'incidents/?id=' + id)))),
    t.nextIds.length > 0 && h('section', { class: 'modal-section' }, h('h3', {}, '下一個交接節點'), list(t.nextIds.map(id => link(D.tasks.find(x => x.id === id).title, 'guide/?task=' + id))))
  ]);
}
function taskRow(t) {
  const s = status(t.id);
  const toggle = button('', () => { setStatus(t.id, s === 'done' ? 'todo' : 'done'); toast(s === 'done' ? '任務已移回待開始' : '已完成，可再次點擊取消'); }, 'task-check ' + (s === 'done' ? 'done' : ''), s === 'done' ? 'check' : null);
  toggle.setAttribute('aria-label', (s === 'done' ? '取消完成：' : '標記完成：') + t.title);
  return h('div', { class: 'task-row' }, toggle,
    h('div', { class: 'task-row-content' }, button(t.title, () => taskModal(t), 'task-name'), h('div', { class: 'task-meta' }, phaseById(t.phaseId).title + ' · ' + t.role)),
    badge(ST[s], s === 'done' ? 'good' : s === 'blocked' ? 'bad' : s === 'doing' ? 'warn' : ''),
    h('button', {type:'button',class:'icon-btn task-go','aria-label':'查看任務：'+t.title,onClick:()=>taskModal(t)},icon('chevron')));
}
function renderDashboard() {
  const completed = D.tasks.filter(t => status(t.id) === 'done').length;
  const blocked = D.tasks.filter(t => status(t.id) === 'blocked').length;
  const activePhase = D.phases.find(p => p.taskIds.some(id => status(id) !== 'done'));
  const open = D.tasks.filter(t => status(t.id) !== 'done').sort((a,b) => (status(a.id) === 'blocked' ? -1 : 0) - (status(b.id) === 'blocked' ? -1 : 0));
  const verified = D.exhibits.filter(x => x.implementationStatus === 'browser-checked').length;
  replace(main,
    hero('EXHIBITION OPERATIONS / 課程專題與數位作品展', '把下一步，交代清楚。', '從籌備到收尾，把任務、文件與作品狀態放在同一處。', [link('新增交接紀錄', 'handover/#new-note', 'btn primary')]),
    h('div', { class: 'stats' }, [
      ['工作進度', String(completed).padStart(2,'0') + ' / ' + D.tasks.length, '依本機勾選狀態計算'],
      ['待處理任務', String(blocked).padStart(2,'0'), blocked ? '優先處理阻礙與缺漏' : '目前沒有標記為待處理的任務'],
      ['展示工具', String(verified).padStart(2,'0') + ' / ' + D.exhibits.length, '已試跑範例與主要操作'],
      ['工作範本', String(D.templates.length).padStart(2,'0'), '每份都有空白檔與填寫示例']
    ].map(([label,value,note]) => h('div', { class:'stat' }, h('div',{class:'stat-label'}, label), h('div',{class:'stat-value'},value),h('div',{class:'stat-note'},note)))),
    sectionHead('展務進程', activePhase ? '接續階段：' + activePhase.title : '所有任務已完成'),
    h('div',{class:'phase-track'},D.phases.map((p,i) => { const done = p.taskIds.filter(id=>status(id)==='done').length; return h('a',{class:'phase-item '+(activePhase?.id===p.id?'current':''),href:url('guide/?phase='+p.id)},h('div',{class:'phase-top'},h('span',{},'0'+(i+1)),h('span',{},done+'/'+p.taskIds.length)),h('strong',{},p.title),h('div',{class:'phase-line'},h('span',{style:'width:'+(done/p.taskIds.length*100)+'%'}))); })),
    h('div',{class:'dashboard-grid'},
      h('section',{class:'panel'},h('div',{class:'panel-title'},h('h2',{},'接下來要做的事 ',h('span',{class:'count'},open.length)),link('查看所有任務','guide/','small')),h('p',{class:'small muted'},'先查看操作與完成判準，再更新工作狀態。'),
        h('div',{class:'task-list'},open.length ? open.slice(0,5).map(taskRow) : h('div',{class:'empty'},icon('check'),h('strong',{},'本輪任務已完成'),link('整理並匯出交接紀錄','handover/'))),
        h('div',{class:'note'},icon('info'),h('span',{},'這是一份示範展務專案。工作進度由你實際更新，不代表真實活動已舉辦。'))),
      h('div',{class:'dashboard-side'},
        h('section',{class:'panel'},h('div',{class:'panel-title'},h('h2',{},'接手準備'),badge('本機紀錄')),
          h('div',{class:'progress-head'},h('span',{},'任務完成度'),h('strong',{},Math.round(completed/D.tasks.length*100)+'%')),
          h('progress',{value:completed,max:D.tasks.length,'aria-label':'任務完成度'}),
          h('p',{class:'small muted'},state.notes.length ? '已留下 '+state.notes.length+' 筆交接紀錄，可匯出給接手者。' : '尚無交接紀錄。把問題、已做處理與下一步一起留下。'),
          link('開啟交接紀錄 →','handover/','small')),
        h('section',{class:'panel'},h('div',{class:'panel-title'},h('h2',{},'示範展品'),link('全部展品','exhibits/','small')),
          D.exhibits.map((x,i)=>h('a',{class:'exhibit-mini',href:url('tools/'+x.slug+'/')},h('span',{class:'exhibit-mark'},icon(i?'file':'route')),h('span',{},h('strong',{},x.title),h('small',{class:'muted'},'開啟工具，試跑固定範例')),icon('arrow'))))
      )),
    h('section',{class:'section-space'},sectionHead('常用文件，隨手可取','所有範本 →','templates/'),h('div',{class:'template-strip'},D.templates.map((t,i)=>h('a',{class:'template-mini',href:url('templates/?id='+t.id)},h('small',{},'FORM 0'+(i+1)),h('b',{},t.title),h('span',{class:'small muted'},'空白範本 · 填寫示例'))))),
    h('section',{class:'section-space'},sectionHead('現場遇到狀況？','先依症狀找到處理順序'),h('div',{class:'three-cols'},D.incidents.map(x=>h('a',{class:'link-row',href:url('incidents/?id='+x.id)},icon('alert'),h('span',{},x.title),icon('chevron')))))
  );
  addFooter();
}
const guideFilter = { phase: query.get('phase') || '', role:'', status:'' };
function renderGuide() {
  const select = (label, choices, key) => h('label',{class:'field-label'},label,h('select',{value:guideFilter[key],onChange:e=>{guideFilter[key]=e.target.value;renderGuide();}},h('option',{value:''},'全部'+label),choices.map(([id,title])=>h('option',{value:id,selected:guideFilter[key]===id},title))));
  const filtered = D.tasks.filter(t=>(!guideFilter.phase||t.phaseId===guideFilter.phase)&&(!guideFilter.role||t.role===guideFilter.role)&&(!guideFilter.status||status(t.id)===guideFilter.status));
  replace(main,hero('WORKFLOW / 06 PHASES', '每一步，都有接手依據。','從任務進入，找到需要的資料、操作步驟與完成判準。'),
    h('div',{class:'filter-bar'},select('階段',D.phases.map(p=>[p.id,p.title]),'phase'),select('職務',[...new Set(D.tasks.map(t=>t.role))].map(x=>[x,x]),'role'),select('狀態',Object.entries(ST),'status'),button('清除篩選',()=>{Object.assign(guideFilter,{phase:'',role:'',status:''});renderGuide();},'btn quiet')),
    !filtered.length && h('div',{class:'panel empty'},h('strong',{},'沒有符合條件的任務'),h('p',{},'試著調整階段、職務或狀態。')),
    D.phases.filter(p=>filtered.some(t=>t.phaseId===p.id)).map(p=>h('section',{class:'chapter'},h('div',{class:'chapter-head'},h('span',{class:'chapter-number'},String(D.phases.indexOf(p)+1).padStart(2,'0')),h('div',{},h('h2',{},p.title),h('p',{class:'muted small'},p.summary))),h('div',{class:'panel'},filtered.filter(t=>t.phaseId===p.id).map(taskRow)))));
  addFooter();
}
function exhibitGraphic(x) {
  return h('div',{class:'demo-preview','aria-hidden':'true'},h('div',{class:'demo-window'},h('div',{class:'window-dots'},h('i'),h('i'),h('i')),
    x.slug==='list-cleaner' ? h('div',{class:'mini-lines'},h('div',{},'延長線',icon('check')),h('div',{},'HDMI 線',icon('check')),h('div',{},'筆電',icon('check'))) : h('div',{class:'mini-label'},h('small',{},'DIGITAL EXHIBITION / 02'),h('b',{},'讓作品，被看懂。'),h('small',{},'作品名稱・一句介紹・創作署名'))));
}
function exhibitDetail(x) {
  return [h('p',{class:'muted'},x.purpose),h('div',{class:'pill-row'},badge('示範工具'),badge('v'+(x.version||'0.2')),badge(x.implementationStatus==='browser-checked'?'已試跑':'待完成檢查',x.implementationStatus==='browser-checked'?'good':'warn')),
    h('section',{class:'modal-section'},h('h3',{},'操作示範'),list(x.steps,true)),
    h('section',{class:'modal-section'},h('h3',{},'範例輸入'),h('pre',{class:'code-note'},typeof x.sampleInput==='string'?x.sampleInput:JSON.stringify(x.sampleInput,null,2)),h('h3',{},'預期結果'),h('pre',{class:'code-note'},x.expectedOutput)),
    h('section',{class:'modal-section'},h('h3',{},'使用條件與限制'),list(x.limits),h('p',{class:'small muted'},x.verificationNote)),
    h('section',{class:'modal-section info-box'},h('h3',{},'備援方式'),h('p',{},'下載單檔 HTML，在支援 JavaScript 的桌面瀏覽器直接開啟。內含相同核心邏輯，不需網路或安裝套件。行動裝置可能需要另選瀏覽器開啟。'),h('div',{class:'pill-row'},h('a',{href:url('downloads/'+x.slug+'-offline.html'),download:'',class:'btn sm'},icon('download'),'下載離線版'),link('開啟線上工具','tools/'+x.slug+'/','btn primary sm'))),
    h('section',{class:'modal-section'},h('h3',{},'相關任務'),list(relatedTasks('exhibitIds',x.id).map(t=>link(t.title,'guide/?task='+t.id)))),h('p',{class:'small muted'},x.creation)];
}
function renderExhibits() {
  replace(main,hero('EXHIBITS / HANDOVER FILES','作品能操作，資料能接手。','兩件原創示範工具，把收件、試跑、備援與版本核對串成實際案例。'),
    h('div',{class:'two-cols'},D.exhibits.map(x=>h('article',{class:'content-card'},exhibitGraphic(x),h('div',{class:'content-card-body'},h('div',{class:'pill-row'},badge(x.implementationStatus==='browser-checked'?'已試跑':'待檢查',x.implementationStatus==='browser-checked'?'good':'warn'),badge('v'+(x.version||'0.2'))),h('h2',{},x.title),h('p',{class:'muted'},x.purpose),h('div',{class:'card-actions'},link('開啟工具','tools/'+x.slug+'/','btn primary'),button('操作與交接資料',()=>modal(x.title,exhibitDetail(x)),'btn')))))),
    h('section',{class:'panel section-space'},h('h2',{},'展示前，完成一次完整試跑'),list(['核對作品名稱與版本，打開預定展示的入口。','貼上固定範例，對照輸出與限制。','下載備援檔案並在展示裝置試開，留下實際檢查紀錄。'],true),link('查看展示準備任務 →','guide/?phase=preparation')));
  addFooter();
}
function incidentDetail(x) {
  return [h('section',{class:'modal-section'},h('h3',{},'先辨認症狀'),list(x.symptoms)),h('section',{class:'modal-section'},h('h3',{},'依序檢查'),list(x.checks,true)),h('section',{class:'modal-section'},h('h3',{},'處理與備援'),list(x.actions,true)),h('section',{class:'modal-section info-box'},h('h3',{},'恢復展示的判準'),list(x.recovery)),h('section',{class:'modal-section'},h('h3',{},'留給接手者的紀錄'),h('p',{},x.handover),link('新增交接紀錄','handover/#new-note','btn primary')),h('section',{class:'modal-section'},h('h3',{},'相關範本'),h('div',{class:'pill-row'},x.templateIds.map(id=>link(D.templates.find(t=>t.id===id).title,'templates/?id='+id,'btn sm')))),h('section',{class:'modal-section'},h('h3',{},'相關任務'),list(relatedTasks('incidentIds',x.id).map(t=>link(t.title,'guide/?task='+t.id))))];
}
function renderIncidents() {
  replace(main,hero('INCIDENT GUIDE','出現狀況，先確認再處理。','用可觀察的症狀找到檢查順序，保留原因、處理與下一步。'),h('div',{class:'three-cols'},D.incidents.map((x,i)=>h('article',{class:'content-card'},h('div',{class:'content-card-body'},h('div',{class:'eyebrow'},'CASE 0'+(i+1)),h('h2',{},x.title),list(x.symptoms),button('查看處理步驟',()=>modal(x.title,incidentDetail(x)),'btn', 'arrow'))))),h('div',{class:'callout section-space'},icon('info'),h('div',{},h('h3',{},'無法重現，也是一種需要留下的資訊。'),h('p',{},'記錄當時裝置、輸入、版本與看到的現象。未確認原因時，保留「待確認」，讓下一位能繼續查。'))));addFooter();
}
function templateModal(t) {
  const inputs = t.fields.map(([label,guidance])=>h('textarea',{rows:2,'aria-label':label,placeholder:guidance}));
  const form = h('form',{class:'template-form',onSubmit:e=>{e.preventDefault();download('# '+t.title+'\n\n'+t.fields.map(([label],i)=>'## '+label+'\n\n'+(inputs[i].value.trim()||'待填')+'\n').join('\n'),t.id+'-filled.md');toast('已產生填寫內容的 Markdown 檔案');}},t.fields.map(([label,guidance],i)=>h('label',{class:'form-field'},h('strong',{},label),h('small',{class:'muted'},guidance),inputs[i])),h('button',{type:'submit',class:'btn primary'},icon('download'),'下載填寫內容'));
  modal(t.title,[h('p',{class:'muted'},t.purpose),h('div',{class:'info-box'},h('strong',{},'何時使用'),h('p',{},t.when)),h('div',{class:'card-actions'},h('a',{class:'btn sm',href:url('downloads/'+t.id+'-blank.md'),download:''},'下載空白範本'),h('a',{class:'btn sm',href:url('downloads/'+t.id+'-example.md'),download:''},'下載填寫示例')),h('section',{class:'modal-section'},h('h3',{},'完整示例'),h('p',{class:'small muted'},'以下是教學用填寫情境；正式檢查結果請依你的實際操作填寫。'),h('div',{class:'table-wrap'},h('table',{},h('thead',{},h('tr',{},h('th',{},'欄位'),h('th',{},'示例'))),h('tbody',{},t.fields.map(([label,,sample])=>h('tr',{},h('th',{},label),h('td',{},sample))))))),h('section',{class:'modal-section'},h('h3',{},'直接填寫並帶走'),h('p',{class:'small muted'},'此表單不會自動保存，關閉前請先下載。'),form),h('section',{class:'modal-section'},h('h3',{},'使用此表單的任務'),list(relatedTasks('templateIds',t.id).map(t=>link(t.title,'guide/?task='+t.id))))]);
}
function renderTemplates() {
  replace(main,hero('DOCUMENTS / READY TO USE','把該交代的，放進同一份表。','五份核心文件，都有欄位說明、完整示例和可下載的空白範本。'),h('div',{class:'two-cols'},D.templates.map((t,i)=>h('article',{class:'content-card'},h('div',{class:'content-card-body'},h('div',{class:'eyebrow'},'FORM 0'+(i+1)),h('h2',{},t.title),h('p',{class:'muted'},t.purpose),h('p',{class:'small'},t.when),h('div',{class:'card-actions'},button('查看示例與填寫',()=>templateModal(t),'btn primary'),h('a',{class:'btn',href:url('downloads/'+t.id+'-blank.md'),download:''},icon('download'),'空白檔')))))));addFooter();
}
function exportHandover() {
  const text = '# 交接有據｜本機工作紀錄\n\n匯出時間：'+new Date().toLocaleString('zh-TW')+'\n\n此文件由目前瀏覽器中的工作進度與紀錄產生。未包含其他裝置或他人的紀錄。\n\n## 任務狀態\n\n'+D.phases.map(p=>'### '+p.title+'\n\n'+D.tasks.filter(t=>t.phaseId===p.id).map(t=>'- ['+(status(t.id)==='done'?'x':' ')+'] '+t.title+'｜'+ST[status(t.id)]+'｜'+t.role).join('\n')).join('\n\n')+'\n\n## 交接紀錄\n\n'+(state.notes.length?state.notes.map(n=>'### '+n.title+'\n\n- 狀態：'+n.status+'\n- 職務：'+n.role+'\n- 紀錄時間：'+n.time+'\n\n**觀察與問題**\n\n'+n.observation+'\n\n**已採取處理**\n\n'+n.action+'\n\n**下一步**\n\n'+n.next).join('\n\n---\n\n'):'尚無紀錄。')+'\n';
  download(text,'handover-record.md');toast('已產生目前的交接紀錄');
}
function renderHandover() {
  const field=(label,name,placeholder,required=true,multiline=true)=>h('label',{class:'form-field'},h('strong',{},label+(required?' *':'')),h(multiline?'textarea':'input',{type:multiline?null:'text',name,required,placeholder,rows:3,maxlength:multiline?3000:100}));
  const form=h('form',{id:'new-note',class:'panel',onSubmit:e=>{e.preventDefault();const f=new FormData(e.target);const missing=['title','role','observation','next'].find(k=>!String(f.get(k)||'').trim());if(missing){e.target.elements.namedItem(missing).focus();toast('必填欄位不能只有空白，請補上內容。');return;}state.notes.unshift({id:crypto.randomUUID(),title:f.get('title').trim(),status:f.get('status'),observation:f.get('observation').trim(),action:f.get('action').trim()||'尚未處理',next:f.get('next').trim(),role:f.get('role').trim(),time:new Date().toLocaleString('zh-TW')});persist();renderHandover();toast(storageOK?'已保存一筆交接紀錄':'紀錄尚未保存，請立即匯出');}},h('h2',{},'新增交接紀錄'),field('主旨','title','例如：展示電腦需要重新確認字級',true,false),h('div',{class:'two-cols'},h('label',{class:'form-field'},h('strong',{},'狀態'),h('select',{name:'status'},h('option',{},'待處理'),h('option',{},'已解決'),h('option',{},'待確認'))),field('接手職務','role','例如：測試與設備人員',true,false)),field('觀察與問題','observation','記錄發生情況、版本、裝置與可重現的操作。'),field('已採取處理','action','做了什麼？結果如何？',false),field('下一步','next','接手者下一步做什麼？怎樣算完成？'),h('button',{type:'submit',class:'btn primary'},icon('plus'),'儲存交接紀錄'));
  replace(main,hero('HANDOVER / LOCAL WORKSPACE','讓接手的人，少猜一點。','把觀察、已做處理與下一步連在一起，匯出一份可以帶走的工作紀錄。',[button('匯出交接文件',exportHandover,'btn primary','download')]),
    h('div',{class:'callout'},icon('info'),h('div',{},h('h3',{},'紀錄保存在目前瀏覽器'),h('p',{},'這裡沒有多人同步。換裝置或清除瀏覽資料前，請先匯出；表單輸入完成後須按「儲存交接紀錄」。'))),
    h('div',{class:'two-cols section-space'},form,h('section',{},sectionHead('已留下的紀錄',state.notes.length+' 筆'),state.notes.length ? state.notes.map(n=>h('article',{class:'panel log-card'},h('div',{class:'pill-row'},badge(n.status,n.status==='已解決'?'good':'warn'),h('span',{class:'small muted'},n.time)),h('h3',{},n.title),h('p',{class:'small muted'},'接手職務：'+n.role),h('p',{},n.observation),h('div',{class:'info-box'},h('strong',{},'已做處理'),h('p',{},n.action),h('strong',{},'下一步'),h('p',{},n.next)),h('div',{class:'log-card-footer'},button('刪除這筆紀錄',()=>{if(confirm('確定刪除「'+n.title+'」？此操作無法復原。')){state.notes=state.notes.filter(x=>x.id!==n.id);persist();renderHandover();}},'btn quiet sm')))) : h('div',{class:'panel empty'},icon('note'),h('strong',{},'從第一筆紀錄開始'),h('p',{class:'muted'},'試跑作品、處理問題或交付文件後，留下下一位需要知道的資訊。')))),
    h('section',{class:'panel section-space'},h('h2',{},'管理本機資料'),h('p',{class:'small muted'},'清除會刪除目前瀏覽器中的任務狀態與交接紀錄；網站範本及示範作品不受影響。'),button('清除本機工作紀錄',()=>{if(confirm('請確認已匯出需要的紀錄。要清除所有任務狀態與交接紀錄嗎？')){state={tasks:{},notes:[]};persist();renderHandover();toast('已清除本機工作紀錄');}},'btn danger sm')));addFooter();
  if(location.hash==='#new-note') requestAnimationFrame(()=>document.getElementById('new-note').scrollIntoView({block:'start'}));
}
function renderAbout() {
  replace(main,hero('ABOUT / BUILT TO CONTINUE','不只交出成果，也交代做法。','一份能延伸的展務網站，配上一份讓 AI 繼續維護的專案規則。'),
    h('div',{class:'two-cols'},h('section',{class:'panel'},h('h2',{},'這個專案在做什麼？'),h('p',{},'「交接有據」協助課程專題與數位作品展的工作人員，找到任務、範本、作品操作及問題處理方式。先用兩件真正可操作的小工具，建立可重複使用的交接格式。'),h('p',{class:'muted'},'這是我與 AI 協作完成的課程專案，以數位作品展的交接需求為題。流程與填寫示例是設計練習，實際軟體測試另有紀錄。'),h('div',{class:'card-actions'},h('a',{class:'btn',href:'https://github.com/4a-bot/handover-digital-expo',target:'_blank',rel:'noopener'},'GitHub 完整專案'),h('a',{class:'btn',href:'https://github.com/4a-bot/handover-digital-expo/blob/main/docs/submission.md',target:'_blank',rel:'noopener'},'作業繳交說明'))),h('section',{class:'panel'},h('h2',{},'AGENTS.md：讓下一次有規則可循'),h('p',{},'規則明訂內容格式、固定 ID、檔案位置、頁面關聯、工具行為及實際驗證。後續加入新任務時，沿用同一套資料與介面。'),h('a',{class:'btn primary',href:url('downloads/AGENTS.md'),download:''},icon('download'),'下載專案規則'))),
    h('section',{class:'panel section-space'},h('h2',{},'新增內容時，AI 應該怎麼做？'),list(['先讀 AGENTS.md、專案範圍與決策紀錄，確認新內容的目的。','依固定欄位加入資料：任務需有步驟、產出、完成判準與關聯。','共用頁面自動讀取資料，相關展品、範本與問題案例從任務反向連結。','更新衍生的下載檔，檢查 ID、關聯、畫面與操作。','把真正做過的修改與檢查記錄下來，再交付可重現的成果。'],true),h('p',{class:'small muted'},'已實際新增「執行換班交接與接手試跑」：任務由 12 項增為 13 項，同步修改 F05 交接表，保留修改前後資料及檢查紀錄。')),
    h('section',{class:'panel section-space'},h('h2',{},'規則真的能接著用'),h('p',{},'換班時，接手者需要拿到正確文件並親自試跑。這次沿用既有資料欄位新增任務，同步連結操作表、交接表與問題指引，沒有另外複製一套任務頁面。'),h('div',{class:'card-actions'},link('查看新增的換班任務','guide/?task=shift-handover','btn primary'),h('a',{class:'btn',href:url('downloads/extension-log.md'),download:''},'下載擴充演練紀錄'),h('a',{class:'btn',href:url('downloads/validation.md'),download:''},'下載實際驗證紀錄'))),
    h('section',{class:'panel section-space'},h('h2',{},'來源與原創方式'),h('ul',{class:'source-list'},h('li',{},h('a',{href:'https://diveai-lab.github.io/diveai-lessons/',target:'_blank',rel:'noopener'},'呆一布講義'),h('p',{class:'small muted'},'參考以規則文件支持內容擴充的方法，將任務、範本與操作指引整理為本專案的展務結構。')),h('li',{},h('a',{href:'https://museum.sinica.edu.tw/knowledge-base/item/214/',target:'_blank',rel:'noopener'},'中研院史語所：策展工作介紹'),h('p',{class:'small muted'},'作為展覽工作有清冊與佈展文件需求的背景參考；數位作品流程與工具依本專案需求設計。'))),h('p',{class:'small muted'},'查閱日期：2026-11-16。正式驗證與規則修訂紀錄保存在專案 docs 資料夾。')));addFooter();
}
function renderDesign() {
  const descriptions={harbor:'深藍文字與青綠重點，明亮、清楚，適合日常處理任務。',paper:'暖白底與陶土色，接近整理好的紙本工作手冊，安定、親切。',night:'深色背景與薄荷綠，讓工作資訊在展示環境中更集中。'};
  replace(main,hero('DESIGN / THREE DIRECTIONS','同一份工作台，三種視覺語氣。','每一種都能實際切換。功能與內容相同，選擇適合目前閱讀環境的主題。'),h('div',{class:'three-cols'},Object.entries(themeNames).map(([id,name],i)=>h('article',{class:'content-card'},h('div',{class:'theme-sample','data-theme':id},h('div',{class:'theme-sample-top'},icon('brand'),h('strong',{},'交接有據')),h('div',{class:'theme-sample-body'},h('div',{class:'eyebrow'},'WORKSPACE / 0'+(i+1)),h('h2',{},'把下一步，交代清楚。'),h('div',{class:'theme-demo-task'},icon('check'),h('span',{},'確認展示目的與範圍')),h('div',{class:'theme-demo-task'},icon('clock'),h('span',{},'準備並試用備援材料'))),h('div',{class:'theme-sample-bottom'},badge(D.tasks.length+' 個任務'),badge(D.templates.length+' 份範本'))),h('div',{class:'content-card-body'},h('h2',{},String(i+1).padStart(2,'0')+' '+name),h('p',{class:'muted'},descriptions[id]),button('套用並查看首頁',()=>{try{localStorage.setItem('handover-theme-v1',id);}catch(_){}location.href=url('?theme='+id);},'btn primary'))))),h('p',{class:'small muted section-space'},'正式預設已選定「深色展場」。本頁保留比較紀錄，也可切換個人閱讀偏好。'));addFooter();
}
function addFooter(){main.append(h('footer',{class:'page-footer'},h('span',{},'交接有據 · 課程專題與數位作品展'),h('span',{},storageOK?'工作進度保存在此瀏覽器 · 可匯出':'瀏覽器儲存不可用 · 請及時匯出')));}
function searchModal(){
  const entries=[...D.tasks.map(x=>({title:x.title,kind:'任務',detail:x.role,path:'guide/?task='+x.id})),...D.templates.map(x=>({title:x.title,kind:'範本',detail:x.purpose,path:'templates/?id='+x.id})),...D.exhibits.map(x=>({title:x.title,kind:'展品',detail:x.purpose,path:'exhibits/?id='+x.id})),...D.incidents.map(x=>({title:x.title,kind:'問題處理',detail:x.symptoms.join(' '),path:'incidents/?id='+x.id}))];
  const results=h('div',{'aria-live':'polite'});const input=h('input',{class:'search-input',type:'search',placeholder:'搜尋任務、展品或文件…','aria-label':'搜尋工作台',onInput:()=>update()});
  const update=()=>{const term=input.value.trim().toLowerCase();const found=entries.filter(x=>(x.title+' '+x.detail).toLowerCase().includes(term));replace(results,h('p',{class:'small muted'},found.length+' 筆結果'),found.length?found.map(x=>h('a',{class:'search-result',href:url(x.path)},badge(x.kind),h('div',{},h('strong',{},x.title),h('p',{class:'small muted'},x.detail)),icon('chevron'))):h('p',{},'找不到符合的內容，請換個關鍵字。'));};
  modal('搜尋工作台',[input,results]);update();input.focus();
}
function shell(){
  document.addEventListener('click', async event => {
    const anchor = event.target.closest('a[download]');
    if (!anchor || !anchor.href.startsWith(base.origin) || anchor.dataset.loading) return;
    event.preventDefault();
    anchor.dataset.loading = 'true';
    anchor.setAttribute('aria-busy','true');
    try {
      const response = await fetch(anchor.href);
      if (!response.ok) throw new Error('Download HTTP ' + response.status);
      const content = await response.blob();
      download(content, anchor.getAttribute('download') || new URL(anchor.href).pathname.split('/').pop(), content.type || 'application/octet-stream');
      toast('下載檔案已準備完成');
    } catch (error) { toast('下載未完成，請確認網路後重試。'); console.error(error); }
    finally { delete anchor.dataset.loading; anchor.removeAttribute('aria-busy'); }
  });
  const navs=[['dashboard','展務工作台','','grid'],['guide','流程與任務','guide/','route'],['exhibits','展品檔案','exhibits/','box'],['templates','範本中心','templates/','file'],['incidents','問題處理','incidents/','alert'],['handover','交接紀錄','handover/','note']];
  const closeNav=()=>document.body.classList.remove('nav-open');
  const sidebar=h('aside',{class:'sidebar'},h('a',{class:'brand',href:url()},h('span',{class:'brand-icon'},icon('brand')),h('span',{},h('strong',{},'交接有據'),h('small',{},'HANDOVER, WITH CONTEXT'))),h('p',{class:'nav-label'},'展務管理'),h('nav',{'aria-label':'主要導覽',class:'nav-list'},navs.map(([id,title,path,symbol])=>h('a',{class:'nav-link '+(page===id?'active':''),href:url(path),'aria-current':page===id?'page':null},icon(symbol),title))),h('div',{class:'nav-spacer'}),h('div',{class:'sidebar-note'},h('strong',{},'交接，從留下一步開始。'),h('p',{},'寫清楚做了什麼、還缺什麼，讓下一位能接著做。')),h('div',{class:'sidebar-bottom'},link('專案說明與規則','about/','nav-link '+(page==='about'?'active':'')),link('比較視覺風格','design/','nav-link '+(page==='design'?'active':''))));
  main=h('main',{id:'main',class:'main',tabindex:'-1'});
  const menu=button('',()=>document.body.classList.toggle('nav-open'),'icon-btn mobile-menu','menu');menu.setAttribute('aria-label','開啟導覽');
  const search=button('搜尋',searchModal,'btn quiet sm','search');
  document.body.replaceChildren(h('a',{class:'skip-link',href:'#main'},'跳到主要內容'),sidebar,button('',closeNav,'nav-scrim'),h('div',{class:'shell'},h('header',{class:'topbar'},h('div',{class:'breadcrumb'},menu,h('span',{},'數位作品展'),icon('chevron'),h('strong',{},navs.find(x=>x[0]===page)?.[1]||({about:'專案說明',design:'視覺方向'})[page])),h('div',{class:'header-actions'},search,link('匯出與交接','handover/','btn sm'))),main));
  document.querySelector('.nav-scrim').setAttribute('aria-label','關閉導覽');
  currentRender=({dashboard:renderDashboard,guide:renderGuide,exhibits:renderExhibits,templates:renderTemplates,incidents:renderIncidents,handover:renderHandover,about:renderAbout,design:renderDesign})[page]||renderDashboard;
  currentRender();
  const id=query.get('id');
  if(page==='guide'&&query.has('task')){const x=D.tasks.find(x=>x.id===query.get('task'));if(x)taskModal(x);}
  if(page==='exhibits'&&id){const x=D.exhibits.find(x=>x.id===id);if(x)modal(x.title,exhibitDetail(x));}
  if(page==='incidents'&&id){const x=D.incidents.find(x=>x.id===id);if(x)modal(x.title,incidentDetail(x));}
  if(page==='templates'&&id){const x=D.templates.find(x=>x.id===id);if(x)templateModal(x);}
}
try {
  const names=['phases','tasks','exhibits','templates','incidents'];
  const values=await Promise.all(names.map(async name=>{const r=await fetch(url('data/'+name+'.json'));if(!r.ok)throw new Error(name+' '+r.status);return r.json();}));
  D=Object.fromEntries(names.map((n,i)=>[n,values[i]]));readState();shell();
}catch(error){document.body.replaceChildren(h('main',{class:'main'},h('h1',{},'工作台暫時無法載入'),h('p',{},'請確認網路後重新整理。如果你直接開啟本機檔案，請改用網站網址；離線工具可從備援 HTML 開啟。'),button('重新載入',()=>location.reload(),'btn primary')));console.error(error);}
