import { buildPrompt } from "./prompt.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const GEMINI_MODELS = new Set(["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.5-pro", "gemini-2.0-flash-exp"]);
const OPENAI_MODELS = new Set(["gpt-4o-mini", "gpt-4o"]);
const MAX_BODY_BYTES = 32_000;
const youtubeCache = new Map();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function error(detail, status = 400) {
  return json({ detail }, status);
}

function authenticated(request) {
  return Boolean(request.headers.get("oai-authenticated-user-id"));
}

async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) throw new Error("Envie os dados como JSON.");
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("Solicitação maior que o limite permitido.");
  const text = await request.text();
  if (!text || new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("Solicitação vazia ou maior que o limite permitido.");
  }
  try { return JSON.parse(text); } catch { throw new Error("JSON inválido."); }
}

function text(value, name, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`${name} inválido.`);
  }
  return value.trim();
}

function validateGeneration(body) {
  const provider = text(body.provider, "Provedor", 20);
  if (!new Set(["gemini", "openai"]).has(provider)) throw new Error("Provedor indisponível na versão móvel.");
  const mode = text(body.modo, "Modo", 10);
  if (!new Set(["pre", "pos"]).has(mode)) throw new Error("Modo inválido.");
  const model = text(body.model, "Modelo", 80);
  const allowedModels = provider === "gemini" ? GEMINI_MODELS : OPENAI_MODELS;
  if (!allowedModels.has(model)) throw new Error("Modelo não autorizado.");
  if (!body.canal || typeof body.canal !== "object" || Array.isArray(body.canal)) throw new Error("Canal inválido.");
  const channel = {
    nome: text(body.canal.nome, "Nome do canal", 160),
    nicho: text(body.canal.nicho, "Nicho", 300),
    tom: text(body.canal.tom, "Tom", 600),
    publico: text(body.canal.publico, "Público", 600),
    plataformas: Array.isArray(body.canal.plataformas)
      ? body.canal.plataformas.slice(0, 20).map((item) => text(item, "Plataforma", 80))
      : [],
  };
  return { provider, mode, model, topic: text(body.tema, "Tema", 4_000), channel };
}

async function externalJson(url, init, timeoutMs = 90_000) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new Error("O serviço externo demorou demais ou está indisponível.");
  }
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
  if (!response.ok) {
    if (response.status === 429) throw new Error("Limite temporário do provedor atingido. Tente novamente em alguns instantes.");
    if (response.status === 401 || response.status === 403) throw new Error("A chave do provedor foi recusada. Verifique o segredo configurado.");
    throw new Error(`O provedor retornou uma falha controlada (${response.status}).`);
  }
  return data;
}

async function callGemini(env, model, prompt) {
  if (!env.GEMINI_API_KEY) throw new Error("A chave do Gemini ainda não foi configurada na hospedagem.");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const data = await externalJson(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
  });
  const resultText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  try { return JSON.parse(resultText); } catch { throw new Error("O Gemini retornou conteúdo em formato inválido."); }
}

async function callOpenAI(env, model, prompt) {
  if (!env.OPENAI_API_KEY) throw new Error("A chave da OpenAI ainda não foi configurada na hospedagem.");
  const data = await externalJson("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" } }),
  });
  const resultText = data?.choices?.[0]?.message?.content || "";
  try { return JSON.parse(resultText); } catch { throw new Error("A OpenAI retornou conteúdo em formato inválido."); }
}

function youtubeIdentifier(value) {
  const input = value.trim();
  if (/^UC[\w-]{22}$/.test(input)) return ["id", input];
  if (/^@[\w.-]+$/.test(input)) return ["forHandle", input];
  let match = input.match(/\/channel\/(UC[\w-]+)/i);
  if (match) return ["id", match[1]];
  match = input.match(/\/(@[\w.-]+)/);
  if (match) return ["forHandle", match[1]];
  match = input.match(/\/(?:c|user)\/([\w-]+)/i);
  if (match) return ["forUsername", match[1]];
  return null;
}

async function youtubeStats(request, env) {
  if (!env.YOUTUBE_API_KEY) return error("A chave do YouTube ainda não foi configurada na hospedagem.", 503);
  const rawUrl = new URL(request.url).searchParams.get("url") || "";
  if (rawUrl.length > 500) return error("URL do canal inválida.");
  const identifier = youtubeIdentifier(rawUrl);
  if (!identifier) return error("URL ou identificador do canal inválido.");
  const cacheKey = identifier.join(":");
  const cached = youtubeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return json(cached.data);
  const query = new URLSearchParams({ part: "statistics", [identifier[0]]: identifier[1], key: env.YOUTUBE_API_KEY });
  const data = await externalJson(`https://www.googleapis.com/youtube/v3/channels?${query}`, {}, 10_000);
  const stats = data?.items?.[0]?.statistics;
  if (!stats) return error("Canal não encontrado na API do YouTube.", 404);
  const result = {
    subscriberCount: stats.subscriberCount || "0",
    viewCount: stats.viewCount || "0",
    videoCount: stats.videoCount || "0",
  };
  youtubeCache.set(cacheKey, { data: result, expiresAt: Date.now() + 3_600_000 });
  return json(result);
}

async function api(request, env) {
  if (!authenticated(request)) return error("Autenticação necessária.", 401);
  const url = new URL(request.url);

  if (url.pathname === "/api/config" && request.method === "GET") {
    return json({
      provider: "gemini",
      gemini_model: "gemini-3.1-flash-lite",
      openai_model: "gpt-4o-mini",
      gemini_api_key_set: Boolean(env.GEMINI_API_KEY),
      openai_api_key_set: Boolean(env.OPENAI_API_KEY),
      youtube_api_key_set: Boolean(env.YOUTUBE_API_KEY),
    });
  }

  if (url.pathname === "/api/gerar" && request.method === "POST") {
    try {
      const input = validateGeneration(await readJson(request));
      const prompt = buildPrompt(input.topic, input.channel, input.mode);
      const result = input.provider === "gemini"
        ? await callGemini(env, input.model, prompt)
        : await callOpenAI(env, input.model, prompt);
      return json({ resultado: result });
    } catch (cause) {
      return error(cause instanceof Error ? cause.message : "Falha controlada ao gerar conteúdo.", 400);
    }
  }

  if (url.pathname.startsWith("/api/youtube/stats/") && request.method === "GET") {
    try { return await youtubeStats(request, env); }
    catch (cause) { return error(cause instanceof Error ? cause.message : "Falha controlada ao consultar o YouTube.", 502); }
  }

  return error("Rota não encontrada.", 404);
}

function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data: blob:; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;
    if (url.pathname.startsWith("/api/")) response = await api(request, env);
    else if (url.pathname === "/") response = Response.redirect(new URL("/index.html", request.url), 302);
    else {
      response = await env.ASSETS.fetch(request);
      if (url.pathname === "/index.html" && response.ok) {
        const html = (await response.text()).replaceAll('content="/og.png"', `content="${url.origin}/og.png"`);
        response = new Response(html, { status: response.status, headers: response.headers });
      }
    }
    return securityHeaders(response);
  },
};
