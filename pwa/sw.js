/* eslint-env worker */
const CACHE_NAME = '[short_name]-site-cache';
// eslint-disable-next-line no-undef
[urlsToCache]

self.addEventListener('install', function (event) {
  // Perform install steps
  event.waitUntil(async function() {
    const cache = await caches.open(CACHE_NAME);
    // Cache all predetermined urls
    // eslint-disable-next-line no-undef
    await cache.addAll(urlsToCache);
    return self.skipWaiting();
  }());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(async function() {
    // Feature-detect
    if (self.registration.navigationPreload) {
      // Enable navigation preloads!
      await self.registration.navigationPreload.enable();
    }
    let cacheNames = await caches.keys();
    return Promise.all(
      cacheNames.map(function (cacheName) {
        // Remove all caches on this site other than this SW's cache
        return CACHE_NAME !== cacheName ? caches.delete(cacheName) : null;
      })
    );
  }());
});

self.addEventListener('fetch', function (event) {
  // Parse the URL
  const requestURL = new URL(event.request.url);
  // Make sure we're only caching GET requests from our site
  // DON'T CACHE ADMIN, PDFs, OR THANK YOU PAGES
  if (event.request.method === 'GET' &&
  !(/admin/.test(requestURL.pathname) || /thank-you/.test(requestURL.pathname) || /\.pdf$/.test(requestURL.pathname))) {

    event.respondWith(async function() {
      const cachedResponse = await caches.match(event.request.url);

      if (event.request.mode === 'navigate') {
        // This is a navigation/document request. Only use the cache response as a fallback.
        // Also checking to see if the browser supports navigation preload requests by using Promise.resolve()
        const preloadResponse = await Promise.resolve(event.preloadResponse)
          .catch(() => {
            // We're adding a catch handler here because the preloadResponse will fail
            // if the browser supports it and the user is offline
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match(location.origin + '/offline.html');
          });
        if (preloadResponse) {
          let responseToCache = preloadResponse.clone();
          event.waitUntil(async function() {
            const cache = await caches.open(CACHE_NAME);
            return cache.put(event.request.url, responseToCache);
          }());
          return preloadResponse;
        }
        return fetch(event.request.clone())
          .then(response => {
            let responseToCache = response.clone();
            event.waitUntil(async function() {
              const cache = await caches.open(CACHE_NAME);
              return cache.put(event.request.url, responseToCache);
            }());
            return response;
          })
          .catch(() => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match(location.origin + '/offline.html');
          });
      }

      // If we've got a response from the cache then we'll
      // return the cached response immediately and try to
      // update the cache in the background
      if (cachedResponse) {
        event.waitUntil(async function() {
          const cache = await caches.open(CACHE_NAME);
          return cache.add(event.request.url);
        }());
        return cachedResponse;
      }

      return fetch(event.request.clone()).then(response => {
        if (response && [200, 404].indexOf(response.status) > -1 && response.type === 'basic') {
          // Cache the response in the background if it's valid
          let responseToCache = response.clone();
          event.waitUntil(async function() {
            const cache = await caches.open(CACHE_NAME);
            return cache.put(event.request.url, responseToCache);
          }());
        }
        return response;
      });
    }());
  }
});

self.addEventListener('message', function (event) {
  if (event.data) {
    let action = event.data.action;
    if (action === 'cache' && event.data.url) {
      caches.open(CACHE_NAME).then((cache) => {
        cache.add(event.data.url);
      });
    } else if (action === 'remove') {
      caches.delete(CACHE_NAME);
    } else if (action === 'debug') {
      console.log(event.data.message);
    }
  }
});
