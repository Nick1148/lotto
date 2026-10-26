/**
 * Service Worker - 로또 번호 예상기 PWA
 * 오프라인 캐시 + 빠른 로딩
 */

// 자산 목록/전략이 바뀌면 버전을 올려 이전 캐시를 정리한다
const CACHE_NAME = 'lotto-v2';
const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/js/kst.js',
  '/js/app.js',
  '/js/data.js',
  '/js/analysis.js',
  '/js/saju.js',
  '/js/name.js',
  '/js/chemistry.js',
  '/js/mbti.js',
  '/js/explain.js',
  '/js/lotto.js',
  '/js/gamification.js',
  '/js/auth.js',
  '/js/i18n.js',
  '/data/lotto_history.json',
  '/lang/ko.json',
  '/lang/en.json',
  '/icons/icon.svg'
];

// 설치: 정적 자산 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 네트워크 우선, 실패 시 캐시 (lotto_history.json은 항상 네트워크 우선)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 외부 CDN, Firebase, Analytics 등은 캐시하지 않음
  if (!request.url.startsWith(self.location.origin)) return;

  // POST 등은 무시
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 정상 응답(200, 같은 출처)만 캐시 — 404/500/리다이렉트를 캐시해 오프라인에서 오류 화면이 나오는 것 방지
        if (response.ok && response.type === 'basic' && !response.redirected) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => {
        // 오프라인: 캐시에서 반환
        return caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then((cached) => {
          if (cached) return cached;
          // 페이지 이동은 캐시된 메인 화면으로 대체
          if (request.mode === 'navigate') {
            return caches.match('/').then((home) => home || new Response('오프라인입니다', {
              status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            }));
          }
          return new Response('오프라인입니다', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
