self.addEventListener("install",event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim());});
self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{}
  const title=data.title||"منصة التحدي";
  const options={
    body:data.body||"لديك إشعار جديد.",
    icon:"./icons/icon-192.png",
    badge:"./icons/icon-192.png",
    tag:data.tag||"tahadi-notification",
    data:{url:data.url||"./"}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const scope=new URL(self.registration.scope);
  const raw=String(event.notification.data?.url||"./");
  let target;
  try{
    if(/^https?:\/\//i.test(raw)) target=new URL(raw);
    else if(raw.startsWith("/")&&!raw.startsWith(scope.pathname)) target=new URL(raw.replace(/^\/+/, ""),scope);
    else target=new URL(raw,scope);
  }catch(_){target=new URL("./",scope);}
  event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if("focus" in client&&"navigate" in client){
        return client.navigate(target.href).then(()=>client.focus());
      }
    }
    return self.clients.openWindow?self.clients.openWindow(target.href):undefined;
  }));
});