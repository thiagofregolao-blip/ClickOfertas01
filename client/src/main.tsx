import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration);
      })
      .catch((registrationError) => {
        console.log('Falha no registro do Service Worker:', registrationError);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
