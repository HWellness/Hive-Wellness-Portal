// Empty service worker to handle browser requests
// This prevents 404 errors when the browser tries to load a service worker
self.addEventListener('install', (event) => {
  // Skip waiting and activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

// No-op fetch handler to prevent errors
self.addEventListener('fetch', (event) => {
  // Let the browser handle all requests normally
  return;
});