import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../hosted/worker.js';

const env = {
  GEMINI_API_KEY: 'test-only', OPENAI_API_KEY: 'test-only', YOUTUBE_API_KEY: 'test-only',
  ASSETS: { fetch: async () => new Response('asset') },
};

test('proxy rejeita chamada sem identidade autenticada', async () => {
  const response = await worker.fetch(new Request('https://rizoma.test/api/config'), env);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).detail, 'Autenticação necessária.');
});

test('configuração informa somente presença dos segredos', async () => {
  const request = new Request('https://rizoma.test/api/config', {
    headers: { 'oai-authenticated-user-id': 'owner' },
  });
  const response = await worker.fetch(request, env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.gemini_api_key_set, true);
  assert.equal(JSON.stringify(body).includes('test-only'), false);
});

test('geração rejeita provedor fora da lista antes da chamada externa', async () => {
  const request = new Request('https://rizoma.test/api/gerar', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'oai-authenticated-user-id': 'owner' },
    body: JSON.stringify({
      provider: 'ollama', model: 'qualquer', modo: 'pos', tema: 'Teste',
      canal: { nome: 'Canal', nicho: 'Tech', tom: 'Direto', publico: 'Criadores', plataformas: [] },
    }),
  });
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 400);
  assert.match((await response.json()).detail, /indisponível/);
});
