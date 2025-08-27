const CACHE_NAME = 'click-ofertas-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Arquivos essenciais para cache estático
const STATIC_ASSETS = [
  '/',
  '/cards',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// URLs de API para cache dinâmico
const CACHE_API_ROUTES = [
  '/api/public/stores',
  '/api/auth/user'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Cache estático criado');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Arquivos estáticos cacheados');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('Service Worker: Erro no cache estático:', err);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Remove caches antigos
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Ativado e controlando páginas');
        return self.clients.claim();
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requisições que não são GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignora requisições para outros domínios
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    handleRequest(request, url)
  );
});

async function handleRequest(request, url) {
  try {
    // Estratégia para páginas HTML: Network First, Cache Fallback
    if (request.headers.get('accept')?.includes('text/html')) {
      return await networkFirstStrategy(request, STATIC_CACHE);
    }
    
    // Estratégia para APIs: Network First com cache dinâmico
    if (url.pathname.startsWith('/api/')) {
      if (CACHE_API_ROUTES.some(route => url.pathname.startsWith(route))) {
        return await networkFirstStrategy(request, DYNAMIC_CACHE);
      }
      // APIs não cacheadas - só rede
      return await fetch(request);
    }
    
    // Estratégia para assets estáticos: Cache First
    return await cacheFirstStrategy(request, STATIC_CACHE);
    
  } catch (error) {
    console.error('Service Worker: Erro ao processar requisição:', error);
    
    // Fallback para página offline se disponível
    if (request.headers.get('accept')?.includes('text/html')) {
      const cache = await caches.open(STATIC_CACHE);
      const cachedResponse = await cache.match('/');
      return cachedResponse || new Response('Offline - Sem conexão', { 
        status: 503,
        statusText: 'Service Unavailable'
      });
    }
    
    throw error;
  }
}

// Network First Strategy - tenta rede primeiro, fallback para cache
async function networkFirstStrategy(request, cacheName) {
  try {
    // Tenta buscar da rede
    const networkResponse = await fetch(request);
    
    // Se sucesso, atualiza o cache
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request.clone(), networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Se falha na rede, busca do cache
    console.log('Service Worker: Rede falhou, buscando do cache para:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache First Strategy - busca do cache primeiro
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Se não está no cache, busca da rede e cacheia
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request.clone(), networkResponse.clone());
  }
  
  return networkResponse;
}

// Mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Sync em background (para quando voltar online)
self.addEventListener('sync', event => {
  console.log('Service Worker: Sincronização em background:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aqui podemos sincronizar dados quando voltar online
      syncData()
    );
  }
});

async function syncData() {
  try {
    console.log('Service Worker: Sincronizando dados...');
    // Implementar lógica de sincronização se necessário
  } catch (error) {
    console.error('Service Worker: Erro na sincronização:', error);
  }
}