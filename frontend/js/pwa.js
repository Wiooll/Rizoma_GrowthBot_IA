(function () {
  'use strict';

  async function init() {
    if (document.documentElement.dataset.runtime !== 'hosted') return;
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); }
      catch (error) { console.warn('Não foi possível ativar o modo instalável.', error); }
    }
  }

  window.RizomaPwa = { init };
})();
