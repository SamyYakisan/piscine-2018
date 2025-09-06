// CoachFit Service Worker
const CACHE_NAME = 'coachfit-v1.0.0';
const STATIC_CACHE = 'coachfit-static-v1.0.0';
const DYNAMIC_CACHE = 'coachfit-dynamic-v1.0.0';

const STATIC_ASSETS = [
  '/',
  '/v2',
  '/static/app.js',
  '/static/styles.css',
  '/manifest.json',
  'https://cdn.tailwindcss.com/3.4.0',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(error => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and non-GET requests
  if (url.origin !== location.origin || request.method !== 'GET') {
    return;
  }

  // API requests - network first, cache as fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirstStrategy(request)
    );
    return;
  }

  // Static assets - cache first
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      cacheFirstStrategy(request)
    );
    return;
  }

  // Other requests - network first for dynamic content
  event.respondWith(
    networkFirstStrategy(request)
  );
});

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first strategy failed:', error);
    // Return offline page or fallback
    return new Response('Offline - Content not available', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network-first strategy (for API and dynamic content)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API requests
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Offline - Unable to reach server',
        offline: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return offline page for other requests
    return new Response('Offline - Please check your connection', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

async function syncOfflineMessages() {
  try {
    // Get offline messages from IndexedDB and sync them
    console.log('[SW] Syncing offline messages...');
    // Implementation would depend on IndexedDB structure
  } catch (error) {
    console.error('[SW] Error syncing offline messages:', error);
  }
}

// Push notification handler
self.addEventListener('push', event => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification CoachFit',
    icon: '/static/icon-192x192.png',
    badge: '/static/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'coachfit-notification',
    actions: [
      {
        action: 'view',
        title: 'Voir',
        icon: '/static/view-icon.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/static/close-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('CoachFit', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});