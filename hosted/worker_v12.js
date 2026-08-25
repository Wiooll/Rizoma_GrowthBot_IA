import { buildPrompt } from "./prompt.js";
import { createRepository } from "./repository.js";

const APP_VERSION = "1.2.0";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};
const GEMINI_MODELS = new Set(["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.5-pro", "gemini-2.0-flash-exp"]);
const OPENAI_MODELS = new Set(["gpt-4o-mini", "gpt-4o"]);
const PROVIDERS = new Set(["gemini", "openai", "youtube"]);
const MAX_BODY_BYTES = 64_000;
const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const BACKUP_SCHEMA = 2;
const ACCOUNT_DELETE_CONFIRMATION = "EXCLUIR MINHA CONTA";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS = {
  "/api/gerar": 8,
  "/api/youtube/stats": 20,
  "/api/canais": 40,
  "/api/ideias": 40,
  "/api/config": 20,
  "/api/credentials": 20,
  "/api/account/import": 4,
  "/api/account/delete": 2,
};
const rateState = new Map();
const youtubeCache = new Map();
const encoder = new TextEncoder();

class ControlledError extends Error {
  constructor(message, status = 400, code = "bad_request") {
    super(message);
    this.name = "ControlledError";
    this.status = status;
    this.code = code;
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function error(detail, status = 400, code = "bad_request") {
  return json({ detail, code }, status);
}

function safeDetail(cause, fallback) {
  return cause instanceof ControlledError ? cause.message : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(value) {
  return typeof value === "string" && value.includes("@") ? value.trim().toLowerCase() : "";
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlEncode(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function parseJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new ControlledError("Sessão protegida inválida. Faça login novamente.", 401, "invalid_session");
  try {
    return {
      header: JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0]))),
      payload: JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))),
      signingInput: encoder.encode(`${parts[0]}.${parts[1]}`),
      signature: base64UrlDecode(parts[2]),
    };
  } catch {
    throw new ControlledError("Sessão protegida inválida. Faça login novamente.", 401, "invalid_session");
  }
}

let cachedJwks = null;
let cachedJwksExpiresAt = 0;

async function loadJwks(env) {
  if (cachedJwks && cachedJwksExpiresAt > Date.now()) return cachedJwks;
  if (env.ACCESS_JWKS_JSON) {
    const parsed = JSON.parse(env.ACCESS_JWKS_JSON);
    return parsed.keys || [];
  }
  const url = String(env.ACCESS_JWKS_URL || "").trim();
  if (!url) throw new ControlledError("A hospedagem protegida está sem o JWKS configurado.", 503, "hosting_not_configured");
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new ControlledError("Não foi possível validar a sessão protegida agora.", 503, "auth_unavailable");
  }
  if (!response.ok) throw new ControlledError("Não foi possível validar a sessão protegida agora.", 503, "auth_unavailable");
  const parsed = await response.json();
  cachedJwks = parsed.keys || [];
  cachedJwksExpiresAt = Date.now() + 10 * 60_000;
  return cachedJwks;
}

async function resolveVerificationKey(kid, env) {
  const keys = await loadJwks(env);
  const jwk = keys.find((item) => item.kid === kid);
  if (!jwk) throw new ControlledError("A chave pública da sessão protegida não foi encontrada.", 401, "invalid_session");
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function verifyJwt(assertion, env) {
  const { header, payload, signingInput, signature } = parseJwt(assertion);
  if (header.alg !== "RS256") throw new ControlledError("A sessão protegida usa um algoritmo não suportado.", 401, "invalid_session");
  const issuer = String(env.ACCESS_ISSUER || "").trim();
  const audience = String(env.ACCESS_AUDIENCE || "").trim();
  if (!issuer || !audience) throw new ControlledError("A hospedagem protegida ainda não foi configurada corretamente.", 503, "hosting_not_configured");
  const tokenAudience = payload.aud;
  const audienceOk = Array.isArray(tokenAudience) ? tokenAudience.includes(audience) : tokenAudience === audience;
  if (!audienceOk || payload.iss !== issuer) throw new ControlledError("A sessão protegida não pertence a este ambiente.", 401, "invalid_session");
  if (!payload.exp || Number(payload.exp) * 1000 <= Date.now()) throw new ControlledError("Sua sessão expirou. Entre novamente para continuar.", 401, "session_expired");
  const subject = String(payload.sub || "").trim();
  const email = normalizeEmail(payload.email);
  if (!subject || !email) throw new ControlledError("A identidade protegida não trouxe os dados necessários.", 401, "invalid_session");
  const key = await resolveVerificationKey(header.kid, env);
  const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signingInput);
  if (!verified) throw new ControlledError("A assinatura da sessão protegida é inválida.", 401, "invalid_session");
  return { sub: subject, email };
}

async function authenticate(request, env) {
  const assertion = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!assertion) throw new ControlledError("Autenticação necessária.", 401, "auth_required");
  return verifyJwt(assertion, env);
}

function pseudonymize(value) {
  const bytes = encoder.encode(String(value || ""));
  let hash = 0;
  for (const byte of bytes) hash = (hash * 31 + byte) >>> 0;
  return `u${hash.toString(16).padStart(8, "0")}`;
}

function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("x-frame-options", "DENY");
  headers.set(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data: blob:; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readJson(request) {
  const type = String(request.headers.get("content-type") || "").toLowerCase();
  if (!type.includes("application/json")) throw new ControlledError("Envie os dados como JSON.", 415, "invalid_content_type");
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new ControlledError("Solicitação maior que o limite permitido.", 413, "payload_too_large");
  const text = await request.text();
  if (!text) throw new ControlledError("Envie um corpo JSON válido.", 400, "empty_body");
  if (encoder.encode(text).byteLength > MAX_BODY_BYTES) throw new ControlledError("Solicitação maior que o limite permitido.", 413, "payload_too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new ControlledError("JSON inválido.", 400, "invalid_json");
  }
}

function boundedText(value, label, max, required = true) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new ControlledError(`${label} inválido.`, 400, "invalid_field");
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new ControlledError(`${label} inválido.`, 400, "invalid_field");
  if (trimmed.length > max) throw new ControlledError(`${label} inválido.`, 400, "invalid_field");
  return trimmed;
}

function boundedArray(value, label, maxItems, itemMax) {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw new ControlledError(`${label} inválido.`, 400, "invalid_field");
  return value.map((item) => boundedText(item, label, itemMax));
}

function safeLimit(value, fallback, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function validateOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const url = new URL(request.url);
  if (origin !== url.origin) throw new ControlledError("A origem desta ação não é permitida.", 403, "invalid_origin");
}

function applyRateLimit(userId, routeKey) {
  const limit = RATE_LIMITS[routeKey];
  if (!limit) return;
  const key = `${userId}:${routeKey}`;
  const current = rateState.get(key);
  const now = Date.now();
  if (!current || current.resetAt <= now) {
    rateState.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  if (current.count >= limit) {
    throw new ControlledError("Você atingiu o limite temporário desta ação. Aguarde um pouco e tente de novo.", 429, "rate_limited");
  }
  current.count += 1;
}

async function deriveAesKey(masterSecret, userId, provider, version) {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(masterSecret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(`${userId}:${provider}`),
      info: encoder.encode(`rizoma-credential:v${version}`),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptCredential(env, userId, provider, plainText) {
  const version = 1;
  const masterSecret = boundedText(String(env.CREDENTIAL_MASTER_KEY || ""), "Segredo mestre", 5000);
  const key = await deriveAesKey(masterSecret, userId, provider, version);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = encoder.encode(`rizoma:${provider}:${userId}:v${version}`);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad },
    key,
    encoder.encode(plainText),
  );
  return {
    ciphertext: base64UrlEncode(new Uint8Array(encrypted)),
    iv: base64UrlEncode(iv),
    crypto_version: version,
    last4: plainText.slice(-4),
  };
}

async function decryptCredential(env, userId, provider, record) {
  const masterSecret = boundedText(String(env.CREDENTIAL_MASTER_KEY || ""), "Segredo mestre", 5000);
  const key = await deriveAesKey(masterSecret, userId, provider, Number(record.crypto_version || 1));
  const aad = encoder.encode(`rizoma:${provider}:${userId}:v${Number(record.crypto_version || 1)}`);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(record.iv), additionalData: aad },
    key,
    base64UrlDecode(record.ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

function validateGeneration(body) {
  const provider = boundedText(body.provider, "Provedor", 20);
  if (!new Set(["gemini", "openai"]).has(provider)) throw new ControlledError("Provedor indisponível nesta hospedagem.", 400, "provider_unavailable");
  const mode = boundedText(body.modo, "Modo", 10);
  if (!new Set(["pre", "pos"]).has(mode)) throw new ControlledError("Modo inválido.", 400, "invalid_mode");
  const model = boundedText(body.model, "Modelo", 80);
  const allowed = provider === "gemini" ? GEMINI_MODELS : OPENAI_MODELS;
  if (!allowed.has(model)) throw new ControlledError("Modelo não autorizado.", 400, "invalid_model");
  return {
    provider,
    mode,
    model,
    topic: boundedText(body.tema, "Tema", 4000),
    channel_id: boundedText(body.canal_id, "Canal", 120),
  };
}

function validateChannelPayload(body) {
  return {
    nome: boundedText(body.nome, "Nome do canal", 160),
    nicho: boundedText(body.nicho, "Nicho", 300),
    tom: boundedText(body.tom, "Tom", 600),
    publico: boundedText(body.publico, "Público", 600),
    plataformas: boundedArray(body.plataformas, "Plataforma", 20, 80),
    youtube_url: boundedText(body.youtube_url || "", "URL do YouTube", 500, false),
    version: Number(body.version || 0),
  };
}

function validateIdeaPayload(body) {
  return {
    channel_id: boundedText(body.canal_id, "Canal", 120),
    tema: boundedText(body.tema, "Tema", 4000),
    potencial: Math.max(1, Math.min(5, Number(body.potencial) || 3)),
  };
}

function validateConfigPayload(body, hosted = false) {
  const provider = boundedText(body.provider || "gemini", "Provedor", 20);
  if (hosted && provider === "ollama") throw new ControlledError("Ollama está disponível apenas no modo local do computador.", 400, "provider_unavailable");
  const allowed = hosted ? new Set(["gemini", "openai"]) : new Set(["demo", "gemini", "openai", "ollama"]);
  if (!allowed.has(provider)) throw new ControlledError("Provedor inválido.", 400, "invalid_provider");
  return {
    provider,
    gemini_model: boundedText(body.gemini_model || "gemini-3.1-flash-lite", "Modelo Gemini", 80),
    openai_model: boundedText(body.openai_model || "gpt-4o-mini", "Modelo OpenAI", 80),
  };
}

function validateCredentialPayload(body) {
  const apiKey = boundedText(body.api_key, "Chave pessoal", 1000);
  if (apiKey.length < 8) throw new ControlledError("A chave pessoal parece curta demais.", 400, "invalid_api_key");
  return apiKey;
}

function youtubeIdentifier(value) {
  const input = value.trim();
  if (/^UC[\w-]{22}$/.test(input)) return ["id", input, input];
  if (/^@[\w.-]+$/.test(input)) return ["forHandle", input, input.toLowerCase()];
  let match = input.match(/\/channel\/(UC[\w-]+)/i);
  if (match) return ["id", match[1], match[1]];
  match = input.match(/\/(@[\w.-]+)/i);
  if (match) return ["forHandle", match[1], match[1].toLowerCase()];
  match = input.match(/\/(?:c|user)\/([\w-]+)/i);
  if (match) return ["forUsername", match[1], match[1].toLowerCase()];
  return null;
}

async function externalJson(url, init, timeoutMs = 90_000) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new ControlledError("O serviço externo demorou demais ou está indisponível.", 502, "provider_timeout");
  }
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (!response.ok) {
    if (response.status === 429) throw new ControlledError("Limite temporário do provedor atingido. Tente novamente em alguns instantes.", 429, "provider_rate_limited");
    if (response.status === 401 || response.status === 403) throw new ControlledError("A chave pessoal do provedor foi recusada. Revise ou substitua a chave.", 400, "provider_auth_failed");
    throw new ControlledError(`O provedor retornou uma falha controlada (${response.status}).`, 502, "provider_failed");
  }
  return data;
}

async function callGemini(apiKey, model, prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const data = await externalJson(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  const resultText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  try {
    return JSON.parse(resultText);
  } catch {
    throw new ControlledError("O Gemini retornou conteúdo em formato inválido.", 502, "provider_invalid_response");
  }
}

async function callOpenAI(apiKey, model, prompt) {
  const data = await externalJson("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  const resultText = data?.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(resultText);
  } catch {
    throw new ControlledError("A OpenAI retornou conteúdo em formato inválido.", 502, "provider_invalid_response");
  }
}

async function buildHostedConfig(repo, userId) {
  const [config, credentials] = await Promise.all([
    repo.getConfig(userId),
    repo.listCredentialStates(userId),
  ]);
  return {
    provider: config.provider || "gemini",
    gemini_model: config.gemini_model || "gemini-3.1-flash-lite",
    openai_model: config.openai_model || "gpt-4o-mini",
    ollama_url: "",
    ollama_model: "",
    gemini_api_key_set: Boolean(credentials.gemini?.configured),
    openai_api_key_set: Boolean(credentials.openai?.configured),
    youtube_api_key_set: Boolean(credentials.youtube?.configured),
    credentials,
    app_version: APP_VERSION,
  };
}

function validateBackupShape(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new ControlledError("O arquivo não contém um backup válido.", 400, "invalid_backup");
  if (!Number.isInteger(parsed.schema_version) || ![1, 2].includes(parsed.schema_version)) throw new ControlledError("A versão do backup não é suportada.", 400, "unsupported_backup");
  const canais = Array.isArray(parsed.canais) ? parsed.canais : [];
  const conteudos = Array.isArray(parsed.conteudos) ? parsed.conteudos : [];
  const ideias = Array.isArray(parsed.ideias) ? parsed.ideias : [];
  if (encoder.encode(JSON.stringify(parsed)).byteLength > MAX_BACKUP_BYTES) throw new ControlledError("O backup excede o limite de 10 MB.", 413, "backup_too_large");
  const channelIds = new Set();
  for (const channel of canais) {
    if (channelIds.has(String(channel.id))) throw new ControlledError("O backup contém canais duplicados.", 400, "invalid_backup");
    channelIds.add(String(channel.id));
    validateChannelPayload(channel);
  }
  for (const content of conteudos) {
    if (!channelIds.has(String(content.canal_id))) throw new ControlledError("O backup contém conteúdo sem canal correspondente.", 400, "invalid_backup");
    boundedText(content.tema, "Tema", 4000);
    if (!new Set(["pre", "pos"]).has(String(content.modo || ""))) throw new ControlledError("O backup contém um modo inválido.", 400, "invalid_backup");
    if (!content.dados || typeof content.dados !== "object" || Array.isArray(content.dados)) throw new ControlledError("O backup contém conteúdo em formato inválido.", 400, "invalid_backup");
  }
  for (const idea of ideias) {
    if (!channelIds.has(String(idea.canal_id))) throw new ControlledError("O backup contém ideia sem canal correspondente.", 400, "invalid_backup");
    boundedText(idea.tema, "Tema da ideia", 4000);
  }
  return {
    schema_version: parsed.schema_version,
    app_version: parsed.app_version || APP_VERSION,
    preferencias: parsed.preferencias && typeof parsed.preferencias === "object" ? parsed.preferencias : {},
    canais,
    conteudos,
    ideias,
  };
}

async function exportBackup(repo, userId) {
  const dataset = await repo.exportUserData(userId);
  return {
    schema_version: BACKUP_SCHEMA,
    app_version: APP_VERSION,
    exported_at: nowIso(),
    counts: {
      canais: dataset.canais.length,
      conteudos: dataset.conteudos.length,
      ideias: dataset.ideias.length,
    },
    ...dataset,
  };
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();
  let userId = 'anon';
  let logContext = `[${requestId}] ${url.pathname} anon`;
  try {
    const identity = await authenticate(request, env);
    const repo = createRepository(env);
    await repo.ensureUser(identity);
    userId = identity.sub;
    logContext = `[${requestId}] ${url.pathname} ${pseudonymize(userId)}`;
    if (request.method !== "GET" && request.method !== "HEAD") validateOrigin(request);
    if (url.pathname === "/api/session" && request.method === "GET") {
      return json({ user: { email: identity.email, pseudonym: pseudonymize(userId) }, app_version: APP_VERSION });
    }
    if (url.pathname === "/api/config" && request.method === "GET") {
      return json(await buildHostedConfig(repo, userId));
    }
    if (url.pathname === "/api/config" && request.method === "PUT") {
      applyRateLimit(userId, "/api/config");
      const body = validateConfigPayload(await readJson(request), true);
      await repo.updateConfig(userId, body);
      return json(await buildHostedConfig(repo, userId));
    }
    if (url.pathname.startsWith("/api/credentials/")) {
      const provider = boundedText(url.pathname.split("/").pop(), "Provedor", 20);
      if (!PROVIDERS.has(provider)) return error("Provedor inválido.", 404, "provider_not_found");
      if (request.method === "PUT") {
        applyRateLimit(userId, "/api/credentials");
        const apiKey = validateCredentialPayload(await readJson(request));
        const encrypted = await encryptCredential(env, userId, provider, apiKey);
        await repo.setCredential(userId, provider, encrypted);
        return json({ ok: true, provider, configured: true, last4: encrypted.last4 });
      }
      if (request.method === "DELETE") {
        applyRateLimit(userId, "/api/credentials");
        await repo.deleteCredential(userId, provider);
        return json({ ok: true, provider, configured: false });
      }
      return error("Método não permitido.", 405, "method_not_allowed");
    }
    if (url.pathname === "/api/canais" && request.method === "GET") return json(await repo.listChannels(userId));
    if (url.pathname === "/api/canais" && request.method === "POST") {
      applyRateLimit(userId, "/api/canais");
      const payload = validateChannelPayload(await readJson(request));
      return json(await repo.createChannel(userId, payload), 201);
    }
    if (url.pathname.startsWith("/api/canais/")) {
      const channelId = decodeURIComponent(url.pathname.split("/").pop());
      if (request.method === "PUT") {
        applyRateLimit(userId, "/api/canais");
        const payload = validateChannelPayload(await readJson(request));
        const updated = await repo.updateChannel(userId, channelId, payload);
        if (!updated) return error("Canal não encontrado.", 404, "channel_not_found");
        if (updated.conflict) {
          return json({
            detail: "Este canal foi atualizado em outro dispositivo. Recarregue e tente novamente.",
            code: "optimistic_conflict",
            current: updated.current,
          }, 409);
        }
        return json(updated);
      }
      if (request.method === "DELETE") {
        applyRateLimit(userId, "/api/canais");
        const removed = await repo.deleteChannel(userId, channelId);
        if (!removed) return error("Canal não encontrado.", 404, "channel_not_found");
        return json({ ok: true });
      }
      return error("Método não permitido.", 405, "method_not_allowed");
    }
    if (url.pathname === "/api/historico" && request.method === "GET") {
      const channelId = url.searchParams.get("canal_id") || null;
      const limit = safeLimit(url.searchParams.get("limit"), 30, 100);
      return json(await repo.listHistory(userId, channelId, limit));
    }
    if (url.pathname.startsWith("/api/historico/") && request.method === "GET") {
      const contentId = decodeURIComponent(url.pathname.split("/").pop());
      const item = await repo.getHistoryItem(userId, contentId);
      if (!item) return error("Conteúdo não encontrado.", 404, "content_not_found");
      return json(item);
    }
    if (url.pathname.startsWith("/api/ideias/") && request.method === "GET") {
      const channelId = decodeURIComponent(url.pathname.split("/").pop());
      const limit = safeLimit(url.searchParams.get("limit"), 10, 100);
      const channel = await repo.getChannel(userId, channelId);
      if (!channel) return error("Canal não encontrado.", 404, "channel_not_found");
      return json(await repo.listIdeas(userId, channelId, limit));
    }
    if (url.pathname === "/api/ideias" && request.method === "POST") {
      applyRateLimit(userId, "/api/ideias");
      const payload = validateIdeaPayload(await readJson(request));
      const channel = await repo.getChannel(userId, payload.channel_id);
      if (!channel) return error("Canal não encontrado.", 404, "channel_not_found");
      return json(await repo.createIdea(userId, payload), 201);
    }
    if (url.pathname.startsWith("/api/ideias/") && request.method === "DELETE") {
      applyRateLimit(userId, "/api/ideias");
      const ideaId = decodeURIComponent(url.pathname.split("/").pop());
      const removed = await repo.deleteIdea(userId, ideaId);
      if (!removed) return error("Ideia não encontrada.", 404, "idea_not_found");
      return json({ ok: true });
    }
    if (url.pathname === "/api/trends" && request.method === "GET") {
      const channelId = boundedText(url.searchParams.get("canal_id") || "", "Canal", 120);
      return json({ trends: await repo.getTrendData(userId, channelId), fase: 2 });
    }
    if (url.pathname === "/api/gerar" && request.method === "POST") {
      applyRateLimit(userId, "/api/gerar");
      const input = validateGeneration(await readJson(request));
      const channel = await repo.getChannel(userId, input.channel_id);
      if (!channel) return error("Canal não encontrado.", 404, "channel_not_found");
      const credential = await repo.getCredential(userId, input.provider);
      if (!credential) throw new ControlledError("Configure sua chave pessoal antes de gerar conteúdo com este provedor.", 400, "missing_provider_key");
      const apiKey = await decryptCredential(env, userId, input.provider, credential);
      const prompt = buildPrompt(input.topic, channel, input.mode);
      const result = input.provider === "gemini" ? await callGemini(apiKey, input.model, prompt) : await callOpenAI(apiKey, input.model, prompt);
      const created = await repo.createContent(userId, { channel_id: input.channel_id, tema: input.topic, modo: input.mode, dados: result });
      return json({ id: created.id, resultado: result });
    }
    if (url.pathname.startsWith("/api/youtube/stats/") && request.method === "GET") {
      applyRateLimit(userId, "/api/youtube/stats");
      const channelId = decodeURIComponent(url.pathname.split("/").pop());
      const channel = await repo.getChannel(userId, channelId);
      if (!channel) return error("Canal não encontrado.", 404, "channel_not_found");
      if (!channel.youtube_url) return json({ subscriberCount: "0", viewCount: "0", videoCount: "0" });
      const credential = await repo.getCredential(userId, "youtube");
      if (!credential) throw new ControlledError("Configure sua chave pessoal do YouTube para ver as métricas.", 400, "missing_provider_key");
      const identifier = youtubeIdentifier(channel.youtube_url);
      if (!identifier) throw new ControlledError("URL ou identificador do canal inválido.", 400, "invalid_youtube_channel");
      const cacheKey = `${userId}:${identifier[2]}`;
      const cached = youtubeCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) return json(cached.data);
      const apiKey = await decryptCredential(env, userId, "youtube", credential);
      const query = new URLSearchParams({ part: "statistics", [identifier[0]]: identifier[1], key: apiKey });
      const data = await externalJson(`https://www.googleapis.com/youtube/v3/channels?${query.toString()}`, {}, 10_000);
      const stats = data?.items?.[0]?.statistics;
      if (!stats) return error("Canal não encontrado na API do YouTube.", 404, "youtube_channel_not_found");
      const result = { subscriberCount: stats.subscriberCount || "0", viewCount: stats.viewCount || "0", videoCount: stats.videoCount || "0" };
      youtubeCache.set(cacheKey, { data: result, expiresAt: Date.now() + 3_600_000 });
      return json(result);
    }
    if (url.pathname === "/api/account/export" && request.method === "POST") return json(await exportBackup(repo, userId));
    if (url.pathname === "/api/account/import" && request.method === "POST") {
      applyRateLimit(userId, "/api/account/import");
      const body = await readJson(request);
      return json({ ok: true, counts: await repo.replaceUserData(userId, validateBackupShape(body.backup)) });
    }
    if (url.pathname === "/api/account/delete" && request.method === "POST") {
      applyRateLimit(userId, "/api/account/delete");
      const body = await readJson(request);
      if (boundedText(body.confirmation, "Confirmação", 100) !== ACCOUNT_DELETE_CONFIRMATION) {
        throw new ControlledError(`Digite exatamente "${ACCOUNT_DELETE_CONFIRMATION}" para excluir sua conta.`, 400, "invalid_confirmation");
      }
      await repo.deleteBackups(userId);
      await repo.deleteUserData(userId);
      return json({ ok: true, detail: "Se o seu e-mail continuar liberado no Cloudflare Access, um novo perfil vazio poderá ser criado no próximo login." });
    }
    return error("Rota não encontrada.", 404, "not_found");
  } catch (cause) {
    const status = cause instanceof ControlledError ? cause.status : 500;
    const code = cause instanceof ControlledError ? cause.code : "internal_error";
    console.warn(`${logContext} ${code}`);
    return error(safeDetail(cause, "Falha controlada ao processar sua solicitação."), status, code);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;
    if (url.pathname.startsWith("/api/")) {
      response = await handleApi(request, env);
    } else if (url.pathname === "/") {
      response = Response.redirect(new URL("/index.html", request.url), 302);
    } else {
      response = await env.ASSETS.fetch(request);
      if (url.pathname === "/index.html" && response.ok) {
        const html = (await response.text())
          .replace('data-runtime="local"', 'data-runtime="hosted"')
          .replaceAll('content="/og.png"', `content="${url.origin}/og.png"`)
          .replaceAll("v1.1.0", "v1.2.0");
        response = new Response(html, { status: response.status, headers: response.headers });
      }
    }
    return securityHeaders(response);
  },
};
