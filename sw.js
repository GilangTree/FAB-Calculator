// Calculator FAB — Service Worker v1.0
const CACHE='fab-v1';
const ASSETS=['/','/index.html','/manifest.json','/icon-192.png','/icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch',e=>{
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{
    if(res&&res.status===200&&res.type==='basic'){
      const clone=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,clone));
    }
    return res;
  }).catch(()=>caches.match('/index.html'))));
});

const timers={};
self.addEventListener('message',e=>{
  if(!e.data)return;
  if(e.data.type==='SCHEDULE_TIMER'){
    const{id,label,kembaliMs,totalDurMin}=e.data;
    scheduleTimer(id,label,kembaliMs,totalDurMin);
  }
  if(e.data.type==='CANCEL_TIMER'){
    if(timers[e.data.id]){timers[e.data.id].forEach(t=>clearTimeout(t));delete timers[e.data.id];}
  }
});

function scheduleTimer(id,label,kembaliMs,totalDurMin){
  if(timers[id])timers[id].forEach(t=>clearTimeout(t));
  timers[id]=[];
  const now=Date.now(),rem=kembaliMs-now;
  if(rem<=0)return;
  const sched=(delay,mins,state)=>{if(delay>0)timers[id].push(setTimeout(()=>notify(id,label,mins,state),delay));};
  sched(rem-(5*60000),5,'warning');
  sched(rem-(2*60000),2,'urgent');
  sched(rem-(60000),1,'urgent');
  sched(rem,0,'done');
  sched(rem+(2*60000),-2,'overdue');
}

function notify(id,label,mins,state){
  const msgs={
    warning:{title:'⚠️ Segera Kembali — '+label,body:mins+' menit lagi harus kembali!',req:false},
    urgent: {title:'🔴 SEGERA! '+label,body:(mins<=1?'1 MENIT LAGI!':mins+' menit lagi!')+'  Jangan terlambat!',req:true},
    done:   {title:'✅ Waktu Habis — '+label,body:'Saatnya kembali ke lantai sekarang!',req:true},
    overdue:{title:'🚨 TERLAMBAT! '+label,body:'Sudah melewati batas waktu! Segera kembali!',req:true}
  };
  const m=msgs[state]||msgs.done;
  self.registration.showNotification(m.title,{
    body:m.body,icon:'/icon-192.png',badge:'/icon-192.png',
    tag:'fab-'+id+'-'+state,requireInteraction:m.req,
    vibrate:m.req?[200,100,200,100,200]:[200,100,200],
    data:{id,label,state,url:'/index.html'},
    actions:[{action:'open',title:'📊 Buka App'},{action:'dismiss',title:'✕ Tutup'}]
  });
}

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  if(e.action==='dismiss')return;
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(cl=>{
    for(const c of cl){if(c.url.includes('index.html')&&'focus'in c)return c.focus();}
    if(clients.openWindow)return clients.openWindow('/index.html');
  }));
});
console.log('[SW] FAB Calculator Service Worker v1.0 loaded');
