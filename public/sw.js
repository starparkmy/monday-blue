// Network-only: never cache staff records, authenticated pages or evidence.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>monday blue · Offline</title><body style="font:16px system-ui;padding:40px;color:#17366a"><h1>You are offline</h1><p>Connect to the internet to open monday blue. Your saved records are safe on the server.</p><button onclick="location.reload()">Try again</button></body></html>',{headers:{'Content-Type':'text/html'}})))});
