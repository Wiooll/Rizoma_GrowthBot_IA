(function () {
  'use strict';

  const BACKUP_SCHEMA = 2;
  const APP_VERSION = '1.2.0';
  const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
  const LEGACY_DB_NAME = 'rizoma-mobile';

  async function remote(path, method = 'GET', body) {
    const response = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.detail || 'Falha na comunicação protegida.');
      error.code = payload.code || 'remote_error';
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function deleteLegacyIndexedDb() {
    if (!window.indexedDB) return;
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  }

  async function clearLocalState() {
    try { localStorage.removeItem('rizoma_canal'); } catch {}
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {}
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      if (registrations?.length) await Promise.all(registrations.map((item) => item.unregister()));
    } catch {}
    await deleteLegacyIndexedDb();
  }

  function normalizeConfigPayload(body) {
    return {
      provider: body.provider,
      gemini_model: body.gemini_model,
      openai_model: body.openai_model,
      gemini_api_key: typeof body.gemini_api_key === 'string' ? body.gemini_api_key.trim() : '',
      openai_api_key: typeof body.openai_api_key === 'string' ? body.openai_api_key.trim() : '',
      youtube_api_key: typeof body.youtube_api_key === 'string' ? body.youtube_api_key.trim() : '',
    };
  }

  function validateBackup(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Backup inválido.');
    if (![1, BACKUP_SCHEMA].includes(Number(input.schema_version))) throw new Error('Versão do backup não suportada.');
    if (!Array.isArray(input.canais) || !Array.isArray(input.conteudos) || !Array.isArray(input.ideias)) {
      throw new Error('O backup precisa conter canais, conteúdos e ideias.');
    }
    return input;
  }

  async function saveHostedConfig(body) {
    const payload = normalizeConfigPayload(body);
    if (payload.provider === 'ollama') throw new Error('Ollama está disponível apenas no modo local do computador.');
    await remote('/api/config', 'PUT', {
      provider: payload.provider,
      gemini_model: payload.gemini_model,
      openai_model: payload.openai_model,
    });
    if (payload.gemini_api_key) await remote('/api/credentials/gemini', 'PUT', { api_key: payload.gemini_api_key });
    if (payload.openai_api_key) await remote('/api/credentials/openai', 'PUT', { api_key: payload.openai_api_key });
    if (payload.youtube_api_key) await remote('/api/credentials/youtube', 'PUT', { api_key: payload.youtube_api_key });
    return loadHostedConfig();
  }

  async function loadHostedConfig() {
    const [config, session] = await Promise.all([remote('/api/config'), remote('/api/session')]);
    return {
      ...config,
      session,
      app_version: config.app_version || APP_VERSION,
    };
  }

  async function exportBackup() {
    const payload = await remote('/api/account/export', 'POST');
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rizoma-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return payload.counts;
  }

  async function importBackup(file) {
    if (!(file instanceof Blob) || file.size > MAX_BACKUP_BYTES) throw new Error('O backup deve ser um JSON de até 10 MB.');
    let parsed;
    try { parsed = JSON.parse(await file.text()); } catch { throw new Error('O arquivo não contém JSON válido.'); }
    const backup = validateBackup(parsed);
    const payload = await remote('/api/account/import', 'POST', { backup });
    return payload.counts;
  }

  async function storageStatus() {
    return {
      supported: true,
      persisted: navigator.onLine !== false,
      mode: 'cloud',
    };
  }

  async function deleteAccount() {
    const result = await remote('/api/account/delete', 'POST', { confirmation: 'EXCLUIR MINHA CONTA' });
    await clearLocalState();
    return result;
  }

  window.RizomaMobile = {
    canHandle(path) { return String(path).startsWith('/api/'); },
    async request(method, path, body) {
      if (path === '/api/config' && method === 'GET') return loadHostedConfig();
      if (path === '/api/config' && method === 'PUT') return saveHostedConfig(body || {});
      if (path === '/api/trends/' || path.startsWith('/api/trends/')) {
        const channelId = String(path.split('/').pop() || '').trim();
        return remote(`/api/trends?canal_id=${encodeURIComponent(channelId)}`);
      }
      return remote(path, method, body);
    },
    exportBackup,
    importBackup,
    storageStatus,
    validateBackup,
    openDatabase: async () => null,
    clearLocalState,
    deleteAccount,
  };
})();
