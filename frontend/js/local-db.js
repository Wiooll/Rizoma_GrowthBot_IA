(function () {
  'use strict';

  const DB_NAME = 'rizoma-mobile';
  const DB_VERSION = 1;
  const APP_VERSION = '1.1.0';
  const BACKUP_SCHEMA = 1;
  const MAX_RECORDS = 10000;
  const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
  let databasePromise;

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Falha no banco local.'));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Falha ao salvar dados locais.'));
      transaction.onabort = () => reject(transaction.error || new Error('Operação local cancelada.'));
    });
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('canais')) {
          const store = db.createObjectStore('canais', { keyPath: 'id', autoIncrement: true });
          store.createIndex('criado_em', 'criado_em');
        }
        if (!db.objectStoreNames.contains('conteudos')) {
          const store = db.createObjectStore('conteudos', { keyPath: 'id', autoIncrement: true });
          store.createIndex('canal_id', 'canal_id');
          store.createIndex('criado_em', 'criado_em');
        }
        if (!db.objectStoreNames.contains('ideias')) {
          const store = db.createObjectStore('ideias', { keyPath: 'id', autoIncrement: true });
          store.createIndex('canal_id', 'canal_id');
          store.createIndex('criado_em', 'criado_em');
        }
        if (!db.objectStoreNames.contains('preferencias')) {
          db.createObjectStore('preferencias', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Não foi possível abrir o banco local.'));
      request.onblocked = () => reject(new Error('Feche outras abas do Rizoma e tente novamente.'));
    });
    return databasePromise;
  }

  async function all(storeName) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).getAll());
  }

  async function get(storeName, id) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readonly');
    return requestResult(transaction.objectStore(storeName).get(id));
  }

  async function add(storeName, value) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    const id = await requestResult(transaction.objectStore(storeName).add(value));
    await transactionDone(transaction);
    return id;
  }

  async function put(storeName, value) {
    const db = await openDatabase();
    const transaction = db.transaction(storeName, 'readwrite');
    await requestResult(transaction.objectStore(storeName).put(value));
    await transactionDone(transaction);
  }

  function positiveId(value, label) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
    return id;
  }

  function limitedString(value, label, max, required = true) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
      throw new Error(`${label} inválido.`);
    }
    return value.trim();
  }

  function isoDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  }

  function validateChannel(input, keepId = false) {
    const channel = {
      nome: limitedString(input.nome, 'Nome do canal', 160),
      nicho: limitedString(input.nicho, 'Nicho', 300),
      tom: limitedString(input.tom, 'Tom', 600),
      publico: limitedString(input.publico, 'Público', 600),
      plataformas: Array.isArray(input.plataformas)
        ? input.plataformas.slice(0, 20).map((item) => limitedString(item, 'Plataforma', 80))
        : [],
      youtube_url: limitedString(input.youtube_url || '', 'URL do YouTube', 500, false),
      criado_em: isoDate(input.criado_em),
    };
    if (keepId) channel.id = positiveId(input.id, 'ID do canal');
    return channel;
  }

  function validateBackup(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Backup inválido.');
    if (input.schema_version !== BACKUP_SCHEMA) throw new Error('Versão do backup não suportada.');
    for (const key of ['canais', 'conteudos', 'ideias']) {
      if (!Array.isArray(input[key]) || input[key].length > MAX_RECORDS) throw new Error(`Coleção ${key} inválida.`);
    }

    const canais = input.canais.map((item) => validateChannel(item, true));
    const channelIds = new Set(canais.map((item) => item.id));
    if (channelIds.size !== canais.length) throw new Error('O backup contém canais duplicados.');

    const conteudos = input.conteudos.map((item) => {
      const canalId = positiveId(item.canal_id, 'Canal do conteúdo');
      if (!channelIds.has(canalId)) throw new Error('O backup contém conteúdo sem canal correspondente.');
      if (!item.dados || typeof item.dados !== 'object' || Array.isArray(item.dados)) throw new Error('Dados de conteúdo inválidos.');
      return {
        id: positiveId(item.id, 'ID do conteúdo'),
        canal_id: canalId,
        tema: limitedString(item.tema, 'Tema', 4000),
        modo: new Set(['pre', 'pos']).has(item.modo) ? item.modo : 'pos',
        dados: item.dados,
        criado_em: isoDate(item.criado_em),
      };
    });
    if (new Set(conteudos.map((item) => item.id)).size !== conteudos.length) {
      throw new Error('O backup contém conteúdos duplicados.');
    }

    const ideias = input.ideias.map((item) => {
      const canalId = positiveId(item.canal_id, 'Canal da ideia');
      if (!channelIds.has(canalId)) throw new Error('O backup contém ideia sem canal correspondente.');
      return {
        id: positiveId(item.id, 'ID da ideia'),
        canal_id: canalId,
        tema: limitedString(item.tema, 'Tema da ideia', 4000),
        potencial: Math.min(5, Math.max(1, Number(item.potencial) || 3)),
        status: limitedString(item.status || 'nova', 'Status da ideia', 40),
        criado_em: isoDate(item.criado_em),
      };
    });
    if (new Set(ideias.map((item) => item.id)).size !== ideias.length) {
      throw new Error('O backup contém ideias duplicadas.');
    }

    const preferencias = input.preferencias && typeof input.preferencias === 'object' && !Array.isArray(input.preferencias)
      ? input.preferencias
      : {};
    return { canais, conteudos, ideias, preferencias };
  }

  async function getPreferences() {
    const entry = await get('preferencias', 'config');
    return {
      provider: entry?.value?.provider || 'gemini',
      gemini_model: entry?.value?.gemini_model || 'gemini-3.1-flash-lite',
      openai_model: entry?.value?.openai_model || 'gpt-4o-mini',
    };
  }

  async function setPreferences(value) {
    const provider = new Set(['demo', 'gemini', 'openai']).has(value.provider) ? value.provider : 'gemini';
    await put('preferencias', {
      key: 'config',
      value: {
        provider,
        gemini_model: limitedString(value.gemini_model || 'gemini-3.1-flash-lite', 'Modelo Gemini', 80),
        openai_model: limitedString(value.openai_model || 'gpt-4o-mini', 'Modelo OpenAI', 80),
      },
    });
  }

  async function remote(path, method = 'GET', body) {
    const response = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || 'Falha na comunicação protegida.');
    return payload;
  }

  async function deleteChannel(id) {
    const db = await openDatabase();
    const transaction = db.transaction(['canais', 'conteudos', 'ideias'], 'readwrite');
    transaction.objectStore('canais').delete(id);
    for (const storeName of ['conteudos', 'ideias']) {
      const index = transaction.objectStore(storeName).index('canal_id');
      const cursorRequest = index.openKeyCursor(IDBKeyRange.only(id));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        transaction.objectStore(storeName).delete(cursor.primaryKey);
        cursor.continue();
      };
    }
    await transactionDone(transaction);
  }

  async function listByChannel(storeName, channelId, limit) {
    const records = await all(storeName);
    return records
      .filter((item) => !channelId || item.canal_id === channelId)
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
      .slice(0, limit);
  }

  const trends = {
    tecnologia: [['IA generativa no dia a dia', 5], ['Python moderno: o que mudou', 4], ['Automação prática para criadores', 4]],
    games: [['Jogos independentes em destaque', 5], ['Setup acessível para jogar melhor', 4], ['IA aplicada aos jogos', 3]],
    reflexões: [['Como reduzir a procrastinação', 5], ['Filosofia estoica na prática', 4], ['Minimalismo digital', 4]],
  };

  async function handleGet(path) {
    const url = new URL(path, location.origin);
    if (url.pathname === '/api/canais') return (await all('canais')).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    if (url.pathname === '/api/historico') {
      const channelId = url.searchParams.get('canal_id') ? Number(url.searchParams.get('canal_id')) : null;
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 30));
      const channels = new Map((await all('canais')).map((channel) => [channel.id, channel.nome]));
      return (await listByChannel('conteudos', channelId, limit)).map((item) => ({ ...item, canal_nome: channels.get(item.canal_id) || 'Canal removido' }));
    }
    const historyMatch = url.pathname.match(/^\/api\/historico\/(\d+)$/);
    if (historyMatch) {
      const item = await get('conteudos', Number(historyMatch[1]));
      if (!item) throw new Error('Conteúdo não encontrado.');
      return item;
    }
    const ideasMatch = url.pathname.match(/^\/api\/ideias\/(\d+)$/);
    if (ideasMatch) {
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 10));
      return listByChannel('ideias', Number(ideasMatch[1]), limit);
    }
    const trendsMatch = url.pathname.match(/^\/api\/trends\/(\d+)$/);
    if (trendsMatch) {
      const channel = await get('canais', Number(trendsMatch[1]));
      const niche = String(channel?.nicho || 'tecnologia').toLocaleLowerCase('pt-BR');
      const key = Object.keys(trends).find((candidate) => niche.includes(candidate) || candidate.includes(niche)) || 'tecnologia';
      return { trends: trends[key].map(([tema, potencial]) => ({ tema, potencial, fonte: 'Rizoma Trends' })), fase: 2 };
    }
    if (url.pathname === '/api/config') {
      const [preferences, hosted] = await Promise.all([getPreferences(), remote('/api/config')]);
      return { ...hosted, ...preferences, ollama_url: '', ollama_model: '' };
    }
    const youtubeMatch = url.pathname.match(/^\/api\/youtube\/stats\/(\d+)$/);
    if (youtubeMatch) {
      const channel = await get('canais', Number(youtubeMatch[1]));
      if (!channel?.youtube_url) return { subscriberCount: '0', viewCount: '0', videoCount: '0' };
      return remote(`${url.pathname}?url=${encodeURIComponent(channel.youtube_url)}`);
    }
    throw new Error('Operação local não reconhecida.');
  }

  async function handlePost(path, body) {
    if (path === '/api/canais') {
      const id = await add('canais', validateChannel(body));
      return { id };
    }
    if (path === '/api/ideias') {
      const channelId = positiveId(body.canal_id, 'Canal');
      if (!await get('canais', channelId)) throw new Error('Canal não encontrado.');
      const id = await add('ideias', {
        canal_id: channelId,
        tema: limitedString(body.tema, 'Tema', 4000),
        potencial: Math.min(5, Math.max(1, Number(body.potencial) || 3)),
        status: 'nova',
        criado_em: new Date().toISOString(),
      });
      return { id };
    }
    if (path === '/api/gerar') {
      const channelId = positiveId(body.canal_id, 'Canal');
      const channel = await get('canais', channelId);
      if (!channel) throw new Error('Canal não encontrado.');
      const preferences = await getPreferences();
      if (preferences.provider === 'demo') throw new Error('Selecione Gemini ou OpenAI nas configurações.');
      const model = preferences.provider === 'gemini' ? preferences.gemini_model : preferences.openai_model;
      const generated = await remote('/api/gerar', 'POST', {
        tema: limitedString(body.tema, 'Tema', 4000),
        modo: body.modo,
        canal: channel,
        provider: preferences.provider,
        model,
      });
      const id = await add('conteudos', {
        canal_id: channelId,
        tema: body.tema.trim(),
        modo: body.modo === 'pre' ? 'pre' : 'pos',
        dados: generated.resultado,
        criado_em: new Date().toISOString(),
      });
      return { id, resultado: generated.resultado };
    }
    throw new Error('Operação local não reconhecida.');
  }

  async function handlePut(path, body) {
    if (path === '/api/config') {
      await setPreferences(body);
      return { ok: true };
    }
    const channelMatch = path.match(/^\/api\/canais\/(\d+)$/);
    if (channelMatch) {
      const id = Number(channelMatch[1]);
      const current = await get('canais', id);
      if (!current) throw new Error('Canal não encontrado.');
      await put('canais', { ...validateChannel(body), id, criado_em: current.criado_em });
      return { ok: true };
    }
    const ideaMatch = path.match(/^\/api\/ideias\/(\d+)\/status$/);
    if (ideaMatch) {
      const id = Number(ideaMatch[1]);
      const current = await get('ideias', id);
      if (!current) throw new Error('Ideia não encontrada.');
      await put('ideias', { ...current, status: limitedString(body.status, 'Status', 40) });
      return { ok: true };
    }
    throw new Error('Operação local não reconhecida.');
  }

  async function handleDelete(path) {
    const channelMatch = path.match(/^\/api\/canais\/(\d+)$/);
    if (channelMatch) {
      await deleteChannel(Number(channelMatch[1]));
      return { ok: true };
    }
    const ideaMatch = path.match(/^\/api\/ideias\/(\d+)$/);
    if (ideaMatch) {
      const db = await openDatabase();
      const transaction = db.transaction('ideias', 'readwrite');
      transaction.objectStore('ideias').delete(Number(ideaMatch[1]));
      await transactionDone(transaction);
      return { ok: true };
    }
    throw new Error('Operação local não reconhecida.');
  }

  async function exportBackup() {
    const [canais, conteudos, ideias, preferencias] = await Promise.all([
      all('canais'), all('conteudos'), all('ideias'), getPreferences(),
    ]);
    const backup = {
      schema_version: BACKUP_SCHEMA,
      app_version: APP_VERSION,
      exported_at: new Date().toISOString(),
      counts: { canais: canais.length, conteudos: conteudos.length, ideias: ideias.length },
      canais, conteudos, ideias, preferencias,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rizoma-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return backup.counts;
  }

  async function importBackup(file) {
    if (!(file instanceof Blob) || file.size > MAX_BACKUP_BYTES) throw new Error('O backup deve ser um JSON de até 10 MB.');
    let parsed;
    try { parsed = JSON.parse(await file.text()); } catch { throw new Error('O arquivo não contém JSON válido.'); }
    const backup = validateBackup(parsed);
    const db = await openDatabase();
    const transaction = db.transaction(['canais', 'conteudos', 'ideias', 'preferencias'], 'readwrite');
    for (const storeName of ['canais', 'conteudos', 'ideias', 'preferencias']) transaction.objectStore(storeName).clear();
    for (const item of backup.canais) transaction.objectStore('canais').put(item);
    for (const item of backup.conteudos) transaction.objectStore('conteudos').put(item);
    for (const item of backup.ideias) transaction.objectStore('ideias').put(item);
    transaction.objectStore('preferencias').put({ key: 'config', value: backup.preferencias });
    await transactionDone(transaction);
    return { canais: backup.canais.length, conteudos: backup.conteudos.length, ideias: backup.ideias.length };
  }

  async function storageStatus() {
    if (!navigator.storage?.persist) return { supported: false, persisted: false };
    const already = await navigator.storage.persisted();
    const persisted = already || await navigator.storage.persist();
    return { supported: true, persisted };
  }

  window.RizomaMobile = {
    canHandle(path) { return String(path).startsWith('/api/'); },
    async request(method, path, body) {
      if (method === 'GET') return handleGet(path);
      if (method === 'POST') return handlePost(path, body);
      if (method === 'PUT') return handlePut(path, body);
      if (method === 'DELETE') return handleDelete(path);
      throw new Error('Método não permitido.');
    },
    exportBackup,
    importBackup,
    storageStatus,
    validateBackup,
    openDatabase,
  };
})();
