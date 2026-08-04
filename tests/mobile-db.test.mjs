import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

async function loadMobileDatabase() {
  const source = await readFile(new URL('../frontend/js/local-db.js', import.meta.url), 'utf8');
  const context = {
    window: {}, indexedDB, IDBKeyRange,
    navigator: { storage: { persisted: async () => true, persist: async () => true } },
    location: { origin: 'https://rizoma.test' },
    fetch: async () => new Response(JSON.stringify({
      gemini_api_key_set: true, openai_api_key_set: true, youtube_api_key_set: true,
    }), { headers: { 'content-type': 'application/json' } }),
    Blob, Response, URL, TextEncoder, console, setTimeout, clearTimeout,
    document: { createElement: () => ({ click() {} }) },
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'local-db.js' });
  return context.window.RizomaMobile;
}

test('IndexedDB mantém canais e aplica exclusão em cascata', async () => {
  const mobile = await loadMobileDatabase();
  const created = await mobile.request('POST', '/api/canais', {
    nome: 'Canal teste', nicho: 'Tecnologia', tom: 'Direto', publico: 'Criadores',
    plataformas: ['YouTube'], youtube_url: '',
  });
  await mobile.request('POST', '/api/ideias', { canal_id: created.id, tema: 'Ideia segura', potencial: 4 });
  assert.equal((await mobile.request('GET', '/api/canais')).length, 1);
  assert.equal((await mobile.request('GET', `/api/ideias/${created.id}?limit=10`)).length, 1);
  await mobile.request('DELETE', `/api/canais/${created.id}`);
  assert.equal((await mobile.request('GET', '/api/canais')).length, 0);
  assert.equal((await mobile.request('GET', `/api/ideias/${created.id}?limit=10`)).length, 0);
});

test('importação valida relações antes de substituir o banco local', async () => {
  const mobile = await loadMobileDatabase();
  const invalid = {
    schema_version: 1, canais: [], conteudos: [],
    ideias: [{ id: 1, canal_id: 99, tema: 'Órfã', potencial: 3, status: 'nova' }], preferencias: {},
  };
  assert.throws(() => mobile.validateBackup(invalid), /sem canal correspondente/);
  const valid = {
    schema_version: 1,
    canais: [{ id: 7, nome: 'Migrado', nicho: 'Tech', tom: 'Claro', publico: 'Público', plataformas: ['YouTube'], youtube_url: '' }],
    conteudos: [{ id: 8, canal_id: 7, tema: 'Conteúdo', modo: 'pos', dados: { youtube: { titulo: 'Teste' } } }],
    ideias: [{ id: 9, canal_id: 7, tema: 'Ideia', potencial: 5, status: 'nova' }],
    preferencias: { provider: 'gemini', gemini_model: 'gemini-3.1-flash-lite', openai_model: 'gpt-4o-mini' },
  };
  const counts = await mobile.importBackup(new Blob([JSON.stringify(valid)], { type: 'application/json' }));
  assert.equal(counts.canais, 1);
  assert.equal(counts.conteudos, 1);
  assert.equal(counts.ideias, 1);
  assert.equal((await mobile.request('GET', '/api/canais'))[0].nome, 'Migrado');
});
