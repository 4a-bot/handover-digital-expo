/* This controller is embedded with the tested tool core into both online and offline HTML. */
const $ = id => document.getElementById(id);
function saveText(text,filename){const objectURL=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=objectURL;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectURL),30000);}
if(location.protocol==='file:'){$('back-link').hidden=true;$('offline-note').textContent='離線單檔版 · 不需網路';}
function feedback(text,error=false){$('feedback').textContent=text;$('feedback').classList.toggle('error',error);}
if(TOOL_ID==='list-cleaner'){
  let result=null;
  function stale(){result=null;$('copy').disabled=true;$('download').disabled=true;feedback($('output').value?'輸入或選項已變更，請重新整理清單。':'貼上清單或載入範例，然後按「整理清單」。');}
  $('source').addEventListener('input',stale);
  ['trim','removeEmpty','deduplicate'].forEach(id=>$(id).addEventListener('change',stale));
  $('sample').addEventListener('click',()=>{$('source').value=SAMPLE;['trim','removeEmpty','deduplicate'].forEach(id=>$(id).checked=true);stale();$('source').focus();});
  $('clear').addEventListener('click',()=>{$('source').value='';$('output').value='';['kept','empty-count','duplicate-count'].forEach(id=>$(id).textContent='—');stale();$('source').focus();});
  $('process').addEventListener('click',()=>{
    result=cleanList($('source').value,{trim:$('trim').checked,removeEmpty:$('removeEmpty').checked,deduplicate:$('deduplicate').checked});
    $('output').value=result.text;$('kept').textContent=result.stats.output;$('empty-count').textContent=result.stats.emptyRemoved;$('duplicate-count').textContent=result.stats.duplicatesRemoved;
    const valid=result.lines.length>0;$('copy').disabled=!valid;$('download').disabled=!valid;
    feedback(valid?'已整理 '+result.stats.input+' 行，保留 '+result.stats.output+' 筆。':'目前沒有可保留的項目，請加入清單內容。');
  });
  $('copy').addEventListener('click',async()=>{if(!result)return;try{await navigator.clipboard.writeText(result.text);feedback('已複製整理結果。');}catch(_){$('output').focus();$('output').select();feedback('瀏覽器未允許複製，已選取結果，請使用系統複製功能。');}});
  $('download').addEventListener('click',()=>{if(result){saveText(result.text,'clean-list.txt');feedback('已產生 clean-list.txt 下載檔案。');}});
  stale();
}else{
  let current=false;
  function counters(){for(const f of LABEL_FIELDS){$('count-'+f.key).textContent=Array.from($(f.key).value.trim()).length+'/'+f.max;}}
  function stale(){current=false;$('print').disabled=true;counters();feedback('填寫後按「產生說明牌」，檢查完成再列印。');}
  for(const f of LABEL_FIELDS)$(f.key).addEventListener('input',stale);
  $('sample').addEventListener('click',()=>{for(const f of LABEL_FIELDS)$(f.key).value=SAMPLE[f.key]||'';for(const f of LABEL_FIELDS)$('error-'+f.key).textContent='';stale();$('title').focus();});
  $('label-form').addEventListener('submit',e=>{
    e.preventDefault();const result=prepareLabel(Object.fromEntries(LABEL_FIELDS.map(f=>[f.key,$(f.key).value])));
    for(const f of LABEL_FIELDS){$('error-'+f.key).textContent=result.errors[f.key]||'';$(f.key).setAttribute('aria-invalid',result.errors[f.key]?'true':'false');}
    current=result.valid;$('print').disabled=!current;
    if(!current){feedback('請修正標示的欄位。原始文字已完整保留。',true);const first=LABEL_FIELDS.find(f=>result.errors[f.key]);$(first.key).focus();return;}
    for(const f of LABEL_FIELDS)$('preview-'+f.key).textContent=result.values[f.key];
    $('preview-credit').hidden=!result.values.credit;$('placeholder').hidden=true;$('label-preview').hidden=false;
    feedback('說明牌已更新；請確認文字後列印。');
  });
  $('print').addEventListener('click',()=>{if(current)window.print();});
  stale();
}
