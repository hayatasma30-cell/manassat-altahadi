/* Tahadi workspace recovery: save and restore the last working state per page. */
(function(){
  "use strict";
  if(window.__tahadiWorkspaceRecoveryV2)return;
  window.__tahadiWorkspaceRecoveryV2=true;
  let path=location.pathname;
  while(path.length>1&&path.endsWith("/"))path=path.slice(0,-1);
  const key="tahadi_workspace_v2:"+path;
  const skip=new Set(["password","file","hidden","submit","button","reset"]);
  const dirty=new WeakSet();
  let restoring=false,timer=0;
  const safe=fn=>{try{fn()}catch(e){console.warn("[Tahadi workspace]",e)}};
  function save(){
    if(restoring)return;
    safe(()=>{
      const fields=[];
      document.querySelectorAll("input,select,textarea").forEach((el,index)=>{
        const type=(el.type||"").toLowerCase();
        if(skip.has(type)||el.id==="tahadi_teacher_token"||el.name==="password"||el.disabled)return;
        fields.push({id:el.id||"",name:el.name||"",index,type,
          value:(type==="checkbox"||type==="radio")?!!el.checked:el.value,
          selectedIndex:el.tagName==="SELECT"?el.selectedIndex:null});
      });
      const views=[...document.querySelectorAll(".view")];
      const active=views.find(v=>v.classList.contains("active")||getComputedStyle(v).display!=="none");
      const details=[];
      document.querySelectorAll("details").forEach((el,i)=>{if(el.open)details.push(el.id||"@"+i)});
      localStorage.setItem(key,JSON.stringify({at:Date.now(),url:location.href,view:active?.id||"",scrollX,scrollY,fields,details,activeControls:[...document.querySelectorAll("[aria-selected=true],[aria-pressed=true]")].map(el=>({id:el.id||"",name:el.getAttribute("name")||"",value:el.getAttribute("aria-selected")!==null?"selected":"pressed"}))}));
    });
  }
  function queue(){clearTimeout(timer);timer=setTimeout(save,250)}
  function markDirty(event){
    const el=event.target;
    if(el&&el.matches&&el.matches("input,select,textarea")){
      const type=(el.type||"").toLowerCase();
      if(!skip.has(type)&&el.id!=="tahadi_teacher_token")dirty.add(el);
    }
    queue();
  }
  document.addEventListener("input",markDirty,true);
  document.addEventListener("change",markDirty,true);
  document.addEventListener("click",()=>setTimeout(save,400),true);
  document.addEventListener("submit",event=>{
    const form=event.target;
    if(form&&form.querySelectorAll)form.querySelectorAll("input,select,textarea").forEach(el=>dirty.delete(el));
    setTimeout(save,500);
  },true);
  window.addEventListener("scroll",queue,{passive:true});
  window.addEventListener("pagehide",save);
  window.addEventListener("beforeunload",save);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)save()});
  function restore(){
    let state=null;
    safe(()=>{state=JSON.parse(localStorage.getItem(key)||"null")});
    if(!state||Date.now()-Number(state.at||0)>7*86400000)return;
    restoring=true;
    safe(()=>{
      (state.fields||[]).forEach(item=>{
        let el=item.id?document.getElementById(item.id):null;
        if(!el&&item.name)el=[...document.getElementsByName(item.name)][0]||null;
        if(!el&&!item.id&&!item.name)el=document.querySelectorAll("input,select,textarea")[item.index]||null;
        if(!el||el.disabled)return;
        if(item.type==="checkbox"||item.type==="radio")el.checked=!!item.value;
        else if(el.tagName==="SELECT"&&Number.isInteger(item.selectedIndex)&&item.selectedIndex>=0&&item.selectedIndex<el.options.length)el.selectedIndex=item.selectedIndex;
        else if("value" in el)el.value=item.value??"";
      });
      (state.activeControls||[]).forEach(item=>{const el=item.id?document.getElementById(item.id):item.name?document.querySelector('[name="'+CSS.escape(item.name)+'"]'):null;if(el)el.setAttribute(item.value==="selected"?"aria-selected":"aria-pressed","true")});
      (state.details||[]).forEach(id=>{
        const el=id.startsWith("@")?document.querySelectorAll("details")[Number(id.slice(1))]:document.getElementById(id);
        if(el&&el.tagName==="DETAILS")el.open=true;
      });
      // The teacher page has one authoritative view/scroll restorer in index.html.
      // This helper restores form fields and expanded panels only, avoiding competing navigation/scroll jumps.
    });
    setTimeout(()=>{restoring=false},1300);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(restore,1100),{once:true});
  else setTimeout(restore,1100);
})();