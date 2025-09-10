import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Registro do Service Worker para PWA - APENAS EM PRODUÇÃO
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch((registrationError) => {
          console.log('Falha no registro do Service Worker:', registrationError);
        });
    });
  } else {
    // DESENVOLVIMENTO: Desregistrar qualquer Service Worker existente
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
        console.log('DEV: Service Worker desregistrado');
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
