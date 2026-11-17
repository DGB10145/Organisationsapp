/* Offline-Cache. VERSION erhöhen, wenn sich Dateien ändern. */
var VERSION = "fokusplan-v1";
var SHELL = ["./", "index.html", "css/app.css", "js/data.js", "js/ewe-phrases.js", "js/app.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("fokusplan-") === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* Erst Netz, bei Offline aus dem Cache. */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  var scope = self.registration.scope;
  if (req.url.indexOf(scope) !== 0) return; /* andere Apps unter derselben Adresse nicht anfassen */
  e.respondWith(fetch(req).then(function (res) {
    var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match("index.html"); });
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window" }).then(function (l) { if (l.length) return l[0].focus(); return self.clients.openWindow("./"); }));
});
