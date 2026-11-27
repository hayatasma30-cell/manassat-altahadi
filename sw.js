self.addEventListener("install",event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    try{
      const items=await self.registration.getNotifications();
      items.forEach(item=>item.close());
    }catch(_){}
    try{await self.registration.unregister();}catch(_){}
    try{
      const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
      for(const client of clients){try{client.postMessage({type:"TAHADI_PUSH_DISABLED"});}catch(_){}}
    }catch(_){}
  })());
});