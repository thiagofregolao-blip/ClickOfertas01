import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service Worker embutido para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swCode = `
      const CACHE_NAME = 'click-ofertas-v1';
      const urlsToCache = [
        '/',
        '/cards'
      ];
      
      self.addEventListener('install', (event) => {
        event.waitUntil(
          caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
        );
      });
      
      self.addEventListener('fetch', (event) => {
        event.respondWith(
          caches.match(event.request)
            .then((response) => {
              return response || fetch(event.request);
            })
        );
      });
    `;
    
    const blob = new Blob([swCode], {type: 'application/javascript'});
    const swURL = URL.createObjectURL(blob);
    
    navigator.serviceWorker.register(swURL)
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
