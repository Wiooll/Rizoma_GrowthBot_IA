const DEMO_TRENDS = {
  tecnologia: [
    ["IA generativa no dia a dia", 5],
    ["Python moderno: o que mudou", 4],
    ["Automação prática para criadores", 4],
  ],
  games: [
    ["Jogos independentes em destaque", 5],
    ["Setup acessível para jogar melhor", 4],
    ["IA aplicada aos jogos", 3],
  ],
  reflexoes: [
    ["Como reduzir a procrastinação", 5],
    ["Filosofia estoica na prática", 4],
    ["Minimalismo digital", 4],
  ],
};

function fallbackId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeRow(row) {
  if (!row) return null;
  const normalized = { ...row };
  if (typeof normalized.plataformas === "string") {
    try {
      normalized.plataformas = JSON.parse(normalized.plataformas || "[]");
    } catch {
      normalized.plataformas = [];
    }
  }
  if (typeof normalized.dados === "string") {
    try {
      normalized.dados = JSON.parse(normalized.dados || "{}");
    } catch {
      normalized.dados = {};
    }
  }
  if (typeof normalized.value === "string") {
    try {
      normalized.value = JSON.parse(normalized.value || "{}");
    } catch {
      normalized.value = {};
    }
  }
  return normalized;
}

class MemoryRepository {
  constructor(seed = {}) {
    this.users = new Map();
    this.channels = new Map();
    this.contents = new Map();
    this.ideas = new Map();
    this.preferences = new Map();
    this.credentials = new Map();
    this.backups = new Map();
    if (seed.users) {
      for (const user of seed.users) this.users.set(user.id, clone(user));
    }
  }

  async ensureUser(identity) {
    const current = this.users.get(identity.sub);
    if (current) {
      const updated = {
        ...current,
        email: identity.email,
        updated_at: new Date().toISOString(),
      };
      this.users.set(identity.sub, updated);
      return clone(updated);
    }
    const created = {
      id: identity.sub,
      email: identity.email,
      display_name: identity.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.users.set(identity.sub, created);
    this.preferences.set(identity.sub, {
      user_id: identity.sub,
      provider: "gemini",
      gemini_model: "gemini-3.1-flash-lite",
      openai_model: "gpt-4o-mini",
      version: 1,
      created_at: created.created_at,
      updated_at: created.updated_at,
    });
    return clone(created);
  }

  async getConfig(userId) {
    return clone(this.preferences.get(userId) || {
      user_id: userId,
      provider: "gemini",
      gemini_model: "gemini-3.1-flash-lite",
      openai_model: "gpt-4o-mini",
      version: 1,
    });
  }

  async updateConfig(userId, data) {
    const current = await this.getConfig(userId);
    const next = {
      ...current,
      provider: data.provider,
      gemini_model: data.gemini_model,
      openai_model: data.openai_model,
      version: Number(current.version || 0) + 1,
      updated_at: new Date().toISOString(),
    };
    this.preferences.set(userId, next);
    return clone(next);
  }

  async listChannels(userId) {
    return [...this.channels.values()]
      .filter((item) => item.user_id === userId)
      .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")))
      .map((item) => clone(item));
  }

  async getChannel(userId, channelId) {
    const row = this.channels.get(channelId);
    if (!row || row.user_id !== userId) return null;
    return clone(row);
  }

  async createChannel(userId, payload) {
    const now = new Date().toISOString();
    const channel = {
      id: fallbackId(),
      user_id: userId,
      nome: payload.nome,
      nicho: payload.nicho,
      tom: payload.tom,
      publico: payload.publico,
      plataformas: payload.plataformas,
      youtube_url: payload.youtube_url,
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.channels.set(channel.id, channel);
    return clone(channel);
  }

  async updateChannel(userId, channelId, payload) {
    const current = await this.getChannel(userId, channelId);
    if (!current) return null;
    if (Number(payload.version || 0) !== Number(current.version || 0)) {
      return { conflict: true, current };
    }
    const updated = {
      ...current,
      nome: payload.nome,
      nicho: payload.nicho,
      tom: payload.tom,
      publico: payload.publico,
      plataformas: payload.plataformas,
      youtube_url: payload.youtube_url,
      updated_at: new Date().toISOString(),
      version: Number(current.version || 0) + 1,
    };
    this.channels.set(channelId, updated);
    return clone(updated);
  }

  async deleteChannel(userId, channelId) {
    const current = await this.getChannel(userId, channelId);
    if (!current) return false;
    this.channels.delete(channelId);
    for (const [id, value] of this.contents.entries()) {
      if (value.user_id === userId && value.channel_id === channelId) this.contents.delete(id);
    }
    for (const [id, value] of this.ideas.entries()) {
      if (value.user_id === userId && value.channel_id === channelId) this.ideas.delete(id);
    }
    return true;
  }

  async listHistory(userId, channelId, limit) {
    const channels = new Map((await this.listChannels(userId)).map((item) => [item.id, item.nome]));
    return [...this.contents.values()]
      .filter((item) => item.user_id === userId && (!channelId || item.channel_id === channelId))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit)
      .map((item) => ({ ...clone(item), canal_nome: channels.get(item.channel_id) || "Canal removido" }));
  }

  async getHistoryItem(userId, contentId) {
    const row = this.contents.get(contentId);
    if (!row || row.user_id !== userId) return null;
    return clone(row);
  }

  async createContent(userId, payload) {
    const now = new Date().toISOString();
    const item = {
      id: fallbackId(),
      user_id: userId,
      channel_id: payload.channel_id,
      tema: payload.tema,
      modo: payload.modo,
      dados: clone(payload.dados),
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.contents.set(item.id, item);
    return clone(item);
  }

  async listIdeas(userId, channelId, limit) {
    return [...this.ideas.values()]
      .filter((item) => item.user_id === userId && item.channel_id === channelId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit)
      .map((item) => clone(item));
  }

  async createIdea(userId, payload) {
    const now = new Date().toISOString();
    const idea = {
      id: fallbackId(),
      user_id: userId,
      channel_id: payload.channel_id,
      tema: payload.tema,
      potencial: payload.potencial,
      status: payload.status || "nova",
      created_at: now,
      updated_at: now,
      version: 1,
    };
    this.ideas.set(idea.id, idea);
    return clone(idea);
  }

  async deleteIdea(userId, ideaId) {
    const row = this.ideas.get(ideaId);
    if (!row || row.user_id !== userId) return false;
    this.ideas.delete(ideaId);
    return true;
  }

  async getCredential(userId, provider) {
    return clone(this.credentials.get(`${userId}:${provider}`) || null);
  }

  async setCredential(userId, provider, payload) {
    const record = {
      user_id: userId,
      provider,
      ...clone(payload),
      updated_at: new Date().toISOString(),
    };
    this.credentials.set(`${userId}:${provider}`, record);
    return clone(record);
  }

  async deleteCredential(userId, provider) {
    return this.credentials.delete(`${userId}:${provider}`);
  }

  async listCredentialStates(userId) {
    const states = {};
    for (const provider of ["gemini", "openai", "youtube"]) {
      const current = await this.getCredential(userId, provider);
      states[provider] = current
        ? { configured: true, updated_at: current.updated_at, last4: current.last4 || "" }
        : { configured: false, updated_at: null, last4: "" };
    }
    return states;
  }

  async exportUserData(userId) {
    const [config, canais, conteudos, ideias] = await Promise.all([
      this.getConfig(userId),
      this.listChannels(userId),
      this.listHistory(userId, null, 10000),
      [...this.ideas.values()]
        .filter((item) => item.user_id === userId)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .map((item) => clone(item)),
    ]);
    return {
      preferencias: {
        provider: config.provider,
        gemini_model: config.gemini_model,
        openai_model: config.openai_model,
      },
      canais,
      conteudos: conteudos.map(({ canal_nome, ...rest }) => rest),
      ideias,
    };
  }

  async replaceUserData(userId, payload) {
    await this.deleteUserData(userId);
    const idMap = new Map();
    const importedChannels = [];
    for (const item of payload.canais) {
      const id = fallbackId();
      idMap.set(String(item.id), id);
      importedChannels.push(await this.createChannel(userId, {
        nome: item.nome,
        nicho: item.nicho,
        tom: item.tom,
        publico: item.publico,
        plataformas: item.plataformas || [],
        youtube_url: item.youtube_url || "",
      }));
    }
    for (const item of payload.conteudos) {
      await this.createContent(userId, {
        channel_id: idMap.get(String(item.canal_id)),
        tema: item.tema,
        modo: item.modo,
        dados: item.dados,
      });
    }
    for (const item of payload.ideias) {
      await this.createIdea(userId, {
        channel_id: idMap.get(String(item.canal_id)),
        tema: item.tema,
        potencial: item.potencial,
        status: item.status || "nova",
      });
    }
    await this.updateConfig(userId, {
      provider: payload.preferencias?.provider || "gemini",
      gemini_model: payload.preferencias?.gemini_model || "gemini-3.1-flash-lite",
      openai_model: payload.preferencias?.openai_model || "gpt-4o-mini",
    });
    return {
      canais: importedChannels.length,
      conteudos: payload.conteudos.length,
      ideias: payload.ideias.length,
    };
  }

  async deleteUserData(userId) {
    for (const [id, value] of this.channels.entries()) {
      if (value.user_id === userId) this.channels.delete(id);
    }
    for (const [id, value] of this.contents.entries()) {
      if (value.user_id === userId) this.contents.delete(id);
    }
    for (const [id, value] of this.ideas.entries()) {
      if (value.user_id === userId) this.ideas.delete(id);
    }
    for (const provider of ["gemini", "openai", "youtube"]) {
      this.credentials.delete(`${userId}:${provider}`);
    }
    this.backups.delete(userId);
    this.preferences.delete(userId);
    this.users.delete(userId);
  }

  async storeBackup(userId, payload) {
    this.backups.set(userId, clone(payload));
  }

  async deleteBackups(userId) {
    this.backups.delete(userId);
  }

  async listBackups(userId) {
    const backup = this.backups.get(userId);
    return backup ? [clone(backup)] : [];
  }

  async getTrendData(userId, channelId) {
    const channel = await this.getChannel(userId, channelId);
    const niche = String(channel?.nicho || "tecnologia").toLocaleLowerCase("pt-BR");
    const key = Object.keys(DEMO_TRENDS).find((candidate) => niche.includes(candidate) || candidate.includes(niche))
      || "tecnologia";
    return DEMO_TRENDS[key].map(([tema, potencial]) => ({ tema, potencial, fonte: "Rizoma Trends" }));
  }
}

class D1Repository {
  constructor(db) {
    this.db = db;
  }

  async ensureUser(identity) {
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO users (id, email, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email, updated_at = excluded.updated_at
    `).bind(identity.sub, identity.email, identity.email, now, now).run();
    await this.db.prepare(`
      INSERT INTO preferences (id, user_id, provider, gemini_model, openai_model, version, created_at, updated_at)
      VALUES (?, ?, 'gemini', 'gemini-3.1-flash-lite', 'gpt-4o-mini', 1, ?, ?)
      ON CONFLICT(user_id) DO NOTHING
    `).bind(fallbackId(), identity.sub, now, now).run();
    return this.db.prepare("SELECT * FROM users WHERE id = ?").bind(identity.sub).first();
  }

  async getConfig(userId) {
    const row = await this.db.prepare("SELECT * FROM preferences WHERE user_id = ?").bind(userId).first();
    return normalizeRow(row) || {
      user_id: userId,
      provider: "gemini",
      gemini_model: "gemini-3.1-flash-lite",
      openai_model: "gpt-4o-mini",
      version: 1,
    };
  }

  async updateConfig(userId, data) {
    const current = await this.getConfig(userId);
    const now = new Date().toISOString();
    const id = current.id || fallbackId();
    const version = Number(current.version || 0) + 1;
    await this.db.prepare(`
      INSERT INTO preferences (id, user_id, provider, gemini_model, openai_model, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        provider = excluded.provider,
        gemini_model = excluded.gemini_model,
        openai_model = excluded.openai_model,
        version = excluded.version,
        updated_at = excluded.updated_at
    `).bind(id, userId, data.provider, data.gemini_model, data.openai_model, version, current.created_at || now, now).run();
    return this.getConfig(userId);
  }

  async listChannels(userId) {
    const result = await this.db.prepare("SELECT * FROM channels WHERE user_id = ? ORDER BY updated_at DESC").bind(userId).all();
    return (result.results || []).map(normalizeRow);
  }

  async getChannel(userId, channelId) {
    return normalizeRow(await this.db.prepare("SELECT * FROM channels WHERE user_id = ? AND id = ?").bind(userId, channelId).first());
  }

  async createChannel(userId, payload) {
    const now = new Date().toISOString();
    const id = fallbackId();
    await this.db.prepare(`
      INSERT INTO channels (id, user_id, nome, nicho, tom, publico, plataformas, youtube_url, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(id, userId, payload.nome, payload.nicho, payload.tom, payload.publico, JSON.stringify(payload.plataformas), payload.youtube_url, now, now).run();
    return this.getChannel(userId, id);
  }

  async updateChannel(userId, channelId, payload) {
    const current = await this.getChannel(userId, channelId);
    if (!current) return null;
    if (Number(payload.version || 0) !== Number(current.version || 0)) return { conflict: true, current };
    const nextVersion = Number(current.version || 0) + 1;
    const now = new Date().toISOString();
    const result = await this.db.prepare(`
      UPDATE channels
      SET nome = ?, nicho = ?, tom = ?, publico = ?, plataformas = ?, youtube_url = ?, version = ?, updated_at = ?
      WHERE user_id = ? AND id = ? AND version = ?
    `).bind(
      payload.nome,
      payload.nicho,
      payload.tom,
      payload.publico,
      JSON.stringify(payload.plataformas),
      payload.youtube_url,
      nextVersion,
      now,
      userId,
      channelId,
      current.version,
    ).run();
    if (!result.success || result.meta?.changes === 0) return { conflict: true, current: await this.getChannel(userId, channelId) };
    return this.getChannel(userId, channelId);
  }

  async deleteChannel(userId, channelId) {
    const result = await this.db.prepare("DELETE FROM channels WHERE user_id = ? AND id = ?").bind(userId, channelId).run();
    return Boolean(result.meta?.changes);
  }

  async listHistory(userId, channelId, limit) {
    let result;
    if (channelId) {
      result = await this.db.prepare(`
        SELECT contents.*, channels.nome AS canal_nome
        FROM contents
        JOIN channels ON channels.id = contents.channel_id AND channels.user_id = contents.user_id
        WHERE contents.user_id = ? AND contents.channel_id = ?
        ORDER BY contents.created_at DESC
        LIMIT ?
      `).bind(userId, channelId, limit).all();
    } else {
      result = await this.db.prepare(`
        SELECT contents.*, channels.nome AS canal_nome
        FROM contents
        JOIN channels ON channels.id = contents.channel_id AND channels.user_id = contents.user_id
        WHERE contents.user_id = ?
        ORDER BY contents.created_at DESC
        LIMIT ?
      `).bind(userId, limit).all();
    }
    return (result.results || []).map(normalizeRow);
  }

  async getHistoryItem(userId, contentId) {
    return normalizeRow(await this.db.prepare("SELECT * FROM contents WHERE user_id = ? AND id = ?").bind(userId, contentId).first());
  }

  async createContent(userId, payload) {
    const now = new Date().toISOString();
    const id = fallbackId();
    await this.db.prepare(`
      INSERT INTO contents (id, user_id, channel_id, tema, modo, dados, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(id, userId, payload.channel_id, payload.tema, payload.modo, JSON.stringify(payload.dados), now, now).run();
    return this.getHistoryItem(userId, id);
  }

  async listIdeas(userId, channelId, limit) {
    const result = await this.db.prepare(`
      SELECT * FROM ideas
      WHERE user_id = ? AND channel_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(userId, channelId, limit).all();
    return (result.results || []).map(normalizeRow);
  }

  async createIdea(userId, payload) {
    const now = new Date().toISOString();
    const id = fallbackId();
    await this.db.prepare(`
      INSERT INTO ideas (id, user_id, channel_id, tema, potencial, status, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(id, userId, payload.channel_id, payload.tema, payload.potencial, payload.status || "nova", now, now).run();
    const row = await this.db.prepare("SELECT * FROM ideas WHERE user_id = ? AND id = ?").bind(userId, id).first();
    return normalizeRow(row);
  }

  async deleteIdea(userId, ideaId) {
    const result = await this.db.prepare("DELETE FROM ideas WHERE user_id = ? AND id = ?").bind(userId, ideaId).run();
    return Boolean(result.meta?.changes);
  }

  async getCredential(userId, provider) {
    return normalizeRow(await this.db.prepare("SELECT * FROM api_credentials WHERE user_id = ? AND provider = ?").bind(userId, provider).first());
  }

  async setCredential(userId, provider, payload) {
    const current = await this.getCredential(userId, provider);
    const id = current?.id || fallbackId();
    const now = new Date().toISOString();
    await this.db.prepare(`
      INSERT INTO api_credentials (id, user_id, provider, ciphertext, iv, crypto_version, last4, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        ciphertext = excluded.ciphertext,
        iv = excluded.iv,
        crypto_version = excluded.crypto_version,
        last4 = excluded.last4,
        updated_at = excluded.updated_at
    `).bind(id, userId, provider, payload.ciphertext, payload.iv, payload.crypto_version, payload.last4, current?.created_at || now, now).run();
    return this.getCredential(userId, provider);
  }

  async deleteCredential(userId, provider) {
    const result = await this.db.prepare("DELETE FROM api_credentials WHERE user_id = ? AND provider = ?").bind(userId, provider).run();
    return Boolean(result.meta?.changes);
  }

  async listCredentialStates(userId) {
    const result = await this.db.prepare(`
      SELECT provider, last4, updated_at
      FROM api_credentials
      WHERE user_id = ?
    `).bind(userId).all();
    const states = {
      gemini: { configured: false, updated_at: null, last4: "" },
      openai: { configured: false, updated_at: null, last4: "" },
      youtube: { configured: false, updated_at: null, last4: "" },
    };
    for (const item of result.results || []) {
      states[item.provider] = {
        configured: true,
        updated_at: item.updated_at,
        last4: item.last4 || "",
      };
    }
    return states;
  }

  async exportUserData(userId) {
    const [preferences, canais, conteudos, ideias] = await Promise.all([
      this.getConfig(userId),
      this.listChannels(userId),
      this.listHistory(userId, null, 10000),
      this.db.prepare("SELECT * FROM ideas WHERE user_id = ? ORDER BY created_at DESC").bind(userId).all(),
    ]);
    return {
      preferencias: {
        provider: preferences.provider,
        gemini_model: preferences.gemini_model,
        openai_model: preferences.openai_model,
      },
      canais,
      conteudos: conteudos.map(({ canal_nome, ...rest }) => rest),
      ideias: (ideias.results || []).map(normalizeRow),
    };
  }

  async replaceUserData(userId, payload) {
    const statements = [];
    statements.push(this.db.prepare("DELETE FROM contents WHERE user_id = ?").bind(userId));
    statements.push(this.db.prepare("DELETE FROM ideas WHERE user_id = ?").bind(userId));
    statements.push(this.db.prepare("DELETE FROM channels WHERE user_id = ?").bind(userId));
    const now = new Date().toISOString();
    const channelMap = new Map();
    for (const item of payload.canais) {
      const newId = fallbackId();
      channelMap.set(String(item.id), newId);
      statements.push(this.db.prepare(`
        INSERT INTO channels (id, user_id, nome, nicho, tom, publico, plataformas, youtube_url, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(newId, userId, item.nome, item.nicho, item.tom, item.publico, JSON.stringify(item.plataformas || []), item.youtube_url || "", now, now));
    }
    for (const item of payload.conteudos) {
      statements.push(this.db.prepare(`
        INSERT INTO contents (id, user_id, channel_id, tema, modo, dados, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(fallbackId(), userId, channelMap.get(String(item.canal_id)), item.tema, item.modo, JSON.stringify(item.dados || {}), now, now));
    }
    for (const item of payload.ideias) {
      statements.push(this.db.prepare(`
        INSERT INTO ideas (id, user_id, channel_id, tema, potencial, status, version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(fallbackId(), userId, channelMap.get(String(item.canal_id)), item.tema, item.potencial, item.status || "nova", now, now));
    }
    await this.db.batch(statements);
    await this.updateConfig(userId, {
      provider: payload.preferencias?.provider || "gemini",
      gemini_model: payload.preferencias?.gemini_model || "gemini-3.1-flash-lite",
      openai_model: payload.preferencias?.openai_model || "gpt-4o-mini",
    });
    return { canais: payload.canais.length, conteudos: payload.conteudos.length, ideias: payload.ideias.length };
  }

  async deleteUserData(userId) {
    await this.db.batch([
      this.db.prepare("DELETE FROM contents WHERE user_id = ?").bind(userId),
      this.db.prepare("DELETE FROM ideas WHERE user_id = ?").bind(userId),
      this.db.prepare("DELETE FROM channels WHERE user_id = ?").bind(userId),
      this.db.prepare("DELETE FROM preferences WHERE user_id = ?").bind(userId),
      this.db.prepare("DELETE FROM api_credentials WHERE user_id = ?").bind(userId),
      this.db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
    ]);
  }

  async storeBackup(userId, payload) {
    return payload;
  }

  async deleteBackups(userId) {
    return userId;
  }

  async listBackups(userId) {
    return [];
  }

  async getTrendData(userId, channelId) {
    const channel = await this.getChannel(userId, channelId);
    const niche = String(channel?.nicho || "tecnologia").toLocaleLowerCase("pt-BR");
    const key = Object.keys(DEMO_TRENDS).find((candidate) => niche.includes(candidate) || candidate.includes(niche))
      || "tecnologia";
    return DEMO_TRENDS[key].map(([tema, potencial]) => ({ tema, potencial, fonte: "Rizoma Trends" }));
  }
}

export function createRepository(env) {
  if (env.__repo) return env.__repo;
  if (env.DB) return new D1Repository(env.DB);
  return new MemoryRepository();
}

export { D1Repository, MemoryRepository };
