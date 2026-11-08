(()=>{
'use strict';
if(window.__tahadiWritingToolsLoaded)return;window.__tahadiWritingToolsLoaded=true;
const style=document.createElement('style');style.textContent=`.tw-tools{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:5px 0 12px;direction:rtl}.tw-tools.inline{margin:5px 0 10px}.tw-tools button{appearance:none;border:1px solid #cbdcc8;border-bottom:2px solid #8eae88;background:#f3f8ef;color:#205333;border-radius:9px;padding:5px 9px;min-height:32px;font:600 12px Tahoma,Arial,sans-serif;cursor:pointer}.tw-tools button:active{transform:translateY(1px)}.tw-tools button.tw-recording{background:#fff0ee;border-color:#e5aaa4;color:#a52e2e}.tw-tools .tw-status{font:12px Tahoma,Arial,sans-serif;color:#647568;min-width:0}.tw-tools .tw-status:empty{display:none}@media(max-width:600px){.tw-tools{gap:4px}.tw-tools button{padding:5px 7px;font-size:11px;min-height:31px}}`;
document.head.appendChild(style);
let activeRecognition=null,activeButton=null;
const isTextField=e=>{if(!e||e.disabled||e.readOnly||e.closest('[data-no-writing-tools]'))return false;if(e.tagName==='TEXTAREA')return true;if(e.tagName==='INPUT')return ['text','search','email','tel','url'].includes((e.type||'text').toLowerCase());return e.isContentEditable===true;};
const fire=e=>{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
function insertAtCursor(el,value){if(typeof el.setRangeText==='function'){const a=el.selectionStart??el.value.length,b=el.selectionEnd??el.value.length;el.setRangeText(value,a,b,'end');}else if(el.isContentEditable){document.execCommand('insertText',false,value);}else{el.value=(el.value||'')+value;}fire(el);el.focus();}
function stopSpeech(){if(activeRecognition){try{activeRecognition.stop()}catch(e){}}}
function startSpeech(el,button,status){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){status.textContent='الإملاء الصوتي غير مدعوم في هذا المتصفح؛ جرّبي Chrome.';return;}if(activeRecognition){if(activeButton===button){stopSpeech();return;}stopSpeech();}
let recognition;try{recognition=new SR();}catch(e){status.textContent='تعذر تشغيل الإملاء الصوتي.';return;}recognition.lang='ar-DZ';recognition.continuous=true;recognition.interimResults=false;activeRecognition=recognition;activeButton=button;button.classList.add('tw-recording');button.textContent='■ إيقاف';status.textContent='استمع الآن… تحدثي بوضوح';
recognition.onresult=ev=>{let text='';for(let i=ev.resultIndex;i<ev.results.length;i++){if(ev.results[i].isFinal)text+=ev.results[i][0].transcript;}if(text.trim())insertAtCursor(el,(el.value&&el.selectionStart>0&&!/[\\s]$/.test(el.value.slice(0,el.selectionStart))?' ':'')+text.trim()+' ');};
recognition.onerror=ev=>{status.textContent=ev.error==='not-allowed'?'اسمحي للمتصفح باستعمال الميكروفون.':ev.error==='no-speech'?'لم أسمع كلامًا؛ حاولي مرة أخرى.':'حدث خطأ في الإملاء الصوتي: '+ev.error;};
recognition.onend=()=>{button.classList.remove('tw-recording');button.textContent='🎙️ إملاء صوتي';if(activeRecognition===recognition){activeRecognition=null;activeButton=null;}if(status.textContent==='استمع الآن… تحدثي بوضوح')status.textContent='انتهى الإملاء.';};
try{recognition.start()}catch(e){status.textContent='تعذر بدء الميكروفون؛ حاولي من جديد.';activeRecognition=null;activeButton=null;button.classList.remove('tw-recording');button.textContent='🎙️ إملاء صوتي';}}
async function copyText(el,status){const text=el.value??el.innerText??'';if(!text){status.textContent='لا يوجد نص لنسخه.';return;}try{await navigator.clipboard.writeText(text);status.textContent='تم نسخ النص.';}catch(e){try{el.focus();el.select();document.execCommand('copy');status.textContent='تم النسخ.';}catch(x){status.textContent='تعذر النسخ؛ حددي النص وانسخيه يدويًا.';}}}
async function pasteText(el,status){try{const text=await navigator.clipboard.readText();if(!text){status.textContent='الحافظة فارغة.';return;}insertAtCursor(el,text);status.textContent='تم اللصق.';}catch(e){status.textContent='استخدمي ضغطًا مطولًا داخل الخانة ثم «لصق».';}}
function addButton(bar,label,action){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);bar.appendChild(b);return b;}
function enhance(el){if(!isTextField(el)||el.dataset.twEnhanced)return;el.dataset.twEnhanced='1';const bar=document.createElement('div');bar.className='tw-tools'+(el.tagName==='TEXTAREA'?'':' inline');bar.setAttribute('aria-label','أدوات الكتابة');const status=document.createElement('span');status.className='tw-status';
const mic=addButton(bar,'🎙️ إملاء صوتي',()=>startSpeech(el,mic,status));
if(el.tagName==='TEXTAREA'){
addButton(bar,'• تعداد نقطي',()=>{const a=el.selectionStart??0,b=el.selectionEnd??0,selected=el.value.slice(a,b)||' ';insertAtCursor(el,selected.split('\\n').map(x=>'• '+x).join('\\n'));});
addButton(bar,'1. تعداد رقمي',()=>{const a=el.selectionStart??0,b=el.selectionEnd??0,selected=el.value.slice(a,b)||' ';insertAtCursor(el,selected.split('\\n').map((x,i)=>(i+1)+'. '+x).join('\\n'));});
addButton(bar,'↶ تراجع',()=>{el.focus();document.execCommand('undo');});addButton(bar,'↷ إعادة',()=>{el.focus();document.execCommand('redo');});
}
addButton(bar,'نسخ',()=>copyText(el,status));addButton(bar,'لصق',()=>pasteText(el,status));addButton(bar,'مسح',()=>{if(!el.value&&!el.isContentEditable)return;if(confirm('هل تريدين مسح النص من هذه الخانة؟')){if(el.isContentEditable)el.textContent='';else el.value='';fire(el);el.focus();status.textContent='تم مسح النص.';}});bar.appendChild(status);
el.insertAdjacentElement('afterend',bar);
}
function scan(root){if(root.matches&&root.matches('input,textarea,[contenteditable="true"]'))enhance(root);root.querySelectorAll?.('input,textarea,[contenteditable="true"]').forEach(enhance);}
function init(){scan(document);const observer=new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n);})));observer.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
