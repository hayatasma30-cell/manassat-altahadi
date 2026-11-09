/* منصة التحدي — نوافذ الرسائل الموحدة */
(function(){
  if(window.__tahadiDialogsLoaded) return;
  window.__tahadiDialogsLoaded = true;
  const css = `
  .tahadi-dialog-backdrop{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(12,35,23,.48);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
  .tahadi-dialog-card{width:min(100%,390px);background:#fffdf6;border:1px solid #dce8d8;border-radius:22px;box-shadow:0 18px 55px rgba(12,35,23,.24),0 5px 0 #dce8d8;overflow:hidden;font:16px/1.8 Tahoma,Arial,sans-serif;color:#18382a;direction:rtl;text-align:right;animation:tahadiDialogIn .18s ease-out}
  @keyframes tahadiDialogIn{from{opacity:0;transform:translateY(9px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
  .tahadi-dialog-top{height:7px;background:linear-gradient(90deg,#b58a32,#217747,#14532d)}
  .tahadi-dialog-body{padding:22px 20px 16px}
  .tahadi-dialog-mark{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:#eaf4e6;color:#17613a;font-size:25px;margin-bottom:10px}
  .tahadi-dialog-title{font-size:19px;font-weight:800;color:#14532d;margin:0 0 7px}
  .tahadi-dialog-message{font-size:15px;color:#42594a;white-space:pre-wrap;overflow-wrap:anywhere}
  .tahadi-dialog-input{display:block;width:100%;box-sizing:border-box;margin-top:13px;border:1px solid #cbdcc8;border-radius:12px;background:#fff;padding:11px 12px;font:inherit;color:#18382a;outline:none}
  .tahadi-dialog-input:focus{border-color:#217747;box-shadow:0 0 0 3px #21774720}
  .tahadi-dialog-actions{display:flex;gap:9px;padding:0 20px 20px}
  .tahadi-dialog-btn{flex:1;min-height:43px;border:1px solid #cbdcc8;border-radius:12px;padding:9px 14px;background:#fff;color:#24543a;box-shadow:0 3px 0 #dfe8dc;font:inherit;font-weight:700;cursor:pointer}
  .tahadi-dialog-btn.primary{background:linear-gradient(120deg,#14532d,#217747);border-color:#14532d;color:#fff;box-shadow:0 4px 0 #b9d2bd}
  .tahadi-dialog-btn:active{transform:translateY(2px);box-shadow:0 1px 0 #b9d2bd}
  @media(prefers-reduced-motion:reduce){.tahadi-dialog-card{animation:none}}
  `;
  function install(){if(!document.head)return;const style=document.createElement('style');style.id='tahadi-dialog-styles';style.textContent=css;document.head.appendChild(style);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  let queue=Promise.resolve();
  function show(message,kind){
    const run=()=>new Promise(resolve=>{
      const backdrop=document.createElement('div');backdrop.className='tahadi-dialog-backdrop';backdrop.setAttribute('role','presentation');
      const card=document.createElement('section');card.className='tahadi-dialog-card';card.setAttribute('role',kind==='alert'?'alertdialog':'dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','tahadi-dialog-title');
      const title=kind==='alert'?'تنبيه من منصة التحدي':kind==='confirm'?'تأكيد الإجراء':'إدخال المعلومات';
      const icon=kind==='alert'?'✓':kind==='confirm'?'؟':'✎';
      card.innerHTML='<div class="tahadi-dialog-top"></div><div class="tahadi-dialog-body"><div class="tahadi-dialog-mark" aria-hidden="true">'+icon+'</div><h2 class="tahadi-dialog-title" id="tahadi-dialog-title">'+title+'</h2><div class="tahadi-dialog-message"></div></div><div class="tahadi-dialog-actions"></div>';
      card.querySelector('.tahadi-dialog-message').textContent=String(message??'');
      const actions=card.querySelector('.tahadi-dialog-actions');
      let input=null;
      if(kind==='prompt'){input=document.createElement('input');input.className='tahadi-dialog-input';input.type='text';input.value=String(arguments[2]??'');input.setAttribute('aria-label','الإجابة');card.querySelector('.tahadi-dialog-body').appendChild(input);}
      const finish=value=>{document.removeEventListener('keydown',onKey);backdrop.remove();resolve(value);};
      const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(kind==='alert'?undefined:null);}if(e.key==='Enter'&&kind!=='alert'){e.preventDefault();finish(kind==='prompt'?input.value:true);}};
      document.addEventListener('keydown',onKey);
      if(kind!=='alert'){const cancel=document.createElement('button');cancel.className='tahadi-dialog-btn';cancel.type='button';cancel.textContent='إلغاء';cancel.onclick=()=>finish(null);actions.appendChild(cancel);}
      const ok=document.createElement('button');ok.className='tahadi-dialog-btn primary';ok.type='button';ok.textContent=kind==='alert'?'حسنًا':kind==='confirm'?'تأكيد':'حفظ';ok.onclick=()=>finish(kind==='prompt'?input.value:true);actions.appendChild(ok);
      backdrop.addEventListener('click',e=>{if(e.target===backdrop&&kind!=='alert')finish(null);});
      backdrop.appendChild(card);document.body.appendChild(backdrop);(input||ok).focus();
    });
    const result=queue.then(run,run);queue=result.then(()=>undefined,()=>undefined);return result;
  }
  window.TahadiDialog={alert:message=>show(message,'alert'),confirm:message=>show(message,'confirm'),prompt:(message,value='')=>show(message,'prompt',value)};
  window.alert=message=>{window.TahadiDialog.alert(message);};
})();