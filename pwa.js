// Nance Group — installation de l'application (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(e => console.log('Service worker :', e));
  });
}
