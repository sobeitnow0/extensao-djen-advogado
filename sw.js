// Arquivo: sw.js (O antigo background.js)
const CACHE_NAME = 'djen-cache-v1';

// Quando o app é instalado, ele salva os arquivos principais no celular
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html', // Seu antigo sidebar.html
        './sidebar.js',
        './manifest.json',
        './djen-128.png'
      ]);
    })
  );
});

// Faz o app funcionar mesmo se a internet do celular cair (Offline Mode)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
