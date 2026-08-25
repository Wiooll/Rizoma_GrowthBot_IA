import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../hosted/worker_v12.js';
import { MemoryRepository } from '../hosted/repository.js';

async function createSignedAssertion(overrides = {}) {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  publicJwk.kid = 'test-key';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';
  const header = { alg: 'RS256', typ: 'JWT', kid: 'test-key' };
  const payload = {
    iss: 'https://rizoma.cloudflareaccess.com',
    aud: 'audience-test',
    sub: overrides.sub || 'user-1',
    email: overrides.email || 'user@example.com',
    exp: overrides.exp || Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(signingInput));
  const token = `${signingInput}.${Buffer.from(signature).toString('base64url')}`;
  return { token, jwks: JSON.stringify({ keys: [publicJwk] }) };
}

async function createEnv() {
  const { token, jwks } = await createSignedAssertion();
  return {
    token,
    env: {
      ACCESS_ISSUER: 'https://rizoma.cloudflareaccess.com',
      ACCESS_AUDIENCE: 'audience-test',
      ACCESS_JWKS_JSON: jwks,
      CREDENTIAL_MASTER_KEY: 'segredo-mestre-de-testes-rizoma',
      __repo: new MemoryRepository(),
      ASSETS: { fetch: async () => new Response('asset') },
    },
  };
}

test('worker hospedado exige assertion valida do Cloudflare Access', async () => {
  const { env } = await createEnv();
  const response = await worker.fetch(new Request('https://rizoma.test/api/config'), env);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'auth_required');
});

test('configuracao hospedada mostra apenas estados das chaves pessoais', async () => {
  const { env, token } = await createEnv();
  const repo = env.__repo;
  await repo.ensureUser({ sub: 'user-1', email: 'user@example.com' });
  await repo.setCredential('user-1', 'gemini', {
    ciphertext: 'abc',
    iv: 'def',
    crypto_version: 1,
    last4: '1234',
  });
  const response = await worker.fetch(new Request('https://rizoma.test/api/config', {
    headers: { 'Cf-Access-Jwt-Assertion': token },
  }), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.gemini_api_key_set, true);
  assert.equal(body.credentials.gemini.last4, '1234');
  assert.equal(JSON.stringify(body).includes('ciphertext'), false);
});

test('geracao hospedada usa apenas a chave pessoal do usuario autenticado', async () => {
  const { env, token } = await createEnv();
  const repo = env.__repo;
  await repo.ensureUser({ sub: 'user-1', email: 'user@example.com' });
  const channel = await repo.createChannel('user-1', {
    nome: 'Canal',
    nicho: 'Tecnologia',
    tom: 'Direto',
    publico: 'Criadores',
    plataformas: ['YouTube'],
    youtube_url: '',
  });
  const credential = await (async () => {
    const response = await worker.fetch(new Request('https://rizoma.test/api/credentials/gemini', {
      method: 'PUT',
      headers: {
        'Cf-Access-Jwt-Assertion': token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ api_key: 'minha-chave-gemini' }),
    }), env);
    assert.equal(response.status, 200);
    return response;
  })();
  void credential;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.match(String(url), /generativelanguage/);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ youtube: { titulo: 'Teste' } }) }] } }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const response = await worker.fetch(new Request('https://rizoma.test/api/gerar', {
      method: 'POST',
      headers: {
        'Cf-Access-Jwt-Assertion': token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'gemini',
        model: 'gemini-3.1-flash-lite',
        modo: 'pos',
        tema: 'Tema de teste',
        canal_id: channel.id,
      }),
    }), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.resultado.youtube.titulo, 'Teste');
    assert.equal((await repo.listHistory('user-1', channel.id, 10)).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('canal hospedado rejeita atualizacao com versao desatualizada', async () => {
  const { env, token } = await createEnv();
  const repo = env.__repo;
  await repo.ensureUser({ sub: 'user-1', email: 'user@example.com' });
  const channel = await repo.createChannel('user-1', {
    nome: 'Canal',
    nicho: 'Games',
    tom: 'Leve',
    publico: 'Jogadores',
    plataformas: ['YouTube'],
    youtube_url: '',
  });
  await repo.updateChannel('user-1', channel.id, { ...channel, version: 1 });
  const response = await worker.fetch(new Request(`https://rizoma.test/api/canais/${channel.id}`, {
    method: 'PUT',
    headers: {
      'Cf-Access-Jwt-Assertion': token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      nome: 'Canal antigo',
      nicho: 'Games',
      tom: 'Leve',
      publico: 'Jogadores',
      plataformas: ['YouTube'],
      youtube_url: '',
      version: 1,
    }),
  }), env);
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'optimistic_conflict');
});
