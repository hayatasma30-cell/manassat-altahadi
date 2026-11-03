/* Tahadi workspace recovery: save and restore the last working state per page. */
(function(){
  "use strict";
  if(window.__tahadiWorkspaceRecoveryV2)return;
  window.__tahadiWorkspaceRecoveryV2=true;
  const path=location.pathname.replace(/\\/+$/,"")||"/";
  const key="tahadi_workspace_v2:"+path;
  const skip=new Set(["password","file","hidden","submit","button","reset"]);
  let restoring=false,timer=0;\n  const dirty=new WeakSet();
  const safe=(fn)=>{try{fn()}catch(e){console.warn("[Tahadi workspace]",e)}};
  function save(){
    if(restoring)return;
    safe(()=>{
      const fields=[];
      document.querySelectorAll("input,select,textarea").forEach((el,index)=>{
        const type=(el.type||"").toLowerCase();
        if(skip.has(type)||el.id==="tahadi_teacher_token"||el.name==="password"||!dirty.has(el))return;
        if(el.disabled)return;
        fields.push({id:el.id||"",name:el.name||"",index,type,
          value:(type==="checkbox"||type==="radio")?!!el.checked:el.value,
          selectedIndex:el.tagName==="SELECT"?el.selectedIndex:null});
      });
      const views=[...document.querySelectorAll(".view")];
      const active=views.find(v=>v.classList.contains("active")||getComputedStyle(v).display!=="none");
      const details=[];
      document.querySelectorAll("details").forEach((el,i)=>{if(el.open)details.push(el.id||"@"+i)});
      const state={at:Date.now(),url:location.href,view:active?.id||"",scrollX:scrollX,scrollY:scrollY,fields,details};
      localStorage.setItem(key,JSON.stringify(state));
    });
  }
  function queue(){clearTimeout(timer);timer=setTimeout(save,250)}
  document.addEventListener("input",queue,true);
  document.addEventListener("change",queue,true);
  document.addEventListener("click",()=>setTimeout(save,400),true);
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
      (state.details||[]).forEach(id=>{
        const el=id[0]==="@"?document.querySelectorAll("details")[Number(id.slice(1))]:document.getElementById(id);
        if(el&&el.tagName==="DETAILS")el.open=true;
      });
      if(state.view&&localStorage.getItem("tahadi_teacher_token")){
        const target=document.getElementById(state.view);
        if(target&&target.classList.contains("view")){
          document.querySelectorAll(".view").forEach(v=>{
            const on=v===target;v.classList.toggle("active",on);v.style.display=on?"block":"none";v.setAttribute("aria-hidden",on?"false":"true");
          });
        }
      }
      if(state.url&&new URL(state.url).pathname===location.pathname){
        setTimeout(()=>window.scrollTo({left:Number(state.scrollX)||0,top:Number(state.scrollY)||0,behavior:"instant"}),700);
      }
    });
    setTimeout(()=>{restoring=false},1300);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(restore,1100),{once:true});
  else setTimeout(restore,1100);
})();