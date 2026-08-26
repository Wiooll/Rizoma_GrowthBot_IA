/* ═══════════════════════════════════════════════════════════
   RIZOMA — JavaScript Principal
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─── Estado Global ───────────────────────────────────────────────────────────
const state = {
  channels: [],
  currentChannel: null,
  currentMode: 'pos',
  starRating: 3,
  currentResults: null,
  currentTab: 'youtube',
};
const isHostedRuntime = document.documentElement.dataset.runtime === 'hosted';

// ─── API ─────────────────────────────────────────────────────────────────────
const api = {
  async request(method, path, body) {
    if (isHostedRuntime && window.RizomaMobile?.canHandle(path)) {
      return window.RizomaMobile.request(method, path, body);
    }
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.detail || 'Erro na solicitação');
    return payload;
  },
  async get(path) {
    return this.request('GET', path);
  },
  async post(path, body) {
    return this.request('POST', path, body);
  },
  async put(path, body) {
    return this.request('PUT', path, body);
  },
  async del(path) {
    return this.request('DELETE', path);
  },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

// ─── Navegação ────────────────────────────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  if (page === 'historico') loadHistoricoPage();
  if (page === 'ideias')    loadIdeiasPage();
  if (page === 'config')    loadConfig();
  if (page === 'canais')    renderGestaoCanais();
}

// ─── Canais ───────────────────────────────────────────────────────────────────
async function loadChannels() {
  try {
    state.channels = await api.get('/api/canais');
    renderChannelSelect();

    const saved = localStorage.getItem('rizoma_canal');
    if (saved) {
      const el = document.getElementById('channelSelect');
      if ([...el.options].some(o => o.value === saved)) {
        el.value = saved;
        onChannelChange();
        if (document.getElementById('page-canais')?.classList.contains('active')) renderGestaoCanais();
        return;
      }
    }

    if (state.channels.length > 0) {
      document.getElementById('channelSelect').value = String(state.channels[0].id);
      onChannelChange();
    } else {
      onChannelChange();
    }

    if (document.getElementById('page-canais')?.classList.contains('active')) renderGestaoCanais();
  } catch (e) {
    console.error(e);
  }
}

function renderChannelSelect() {
  const sel = document.getElementById('channelSelect');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Selecione um canal —</option>';
  state.channels.forEach(c => {
    const opt = document.createElement('option');
    opt.value = String(c.id);
    opt.textContent = `${c.nome}`;
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
}

function onChannelChange() {
  const sel = document.getElementById('channelSelect');
  const id = parseInt(sel.value);
  if (!id) {
    state.currentChannel = null;
    document.getElementById('editChannelBtn').style.display = 'none';
    document.getElementById('dashTitle').textContent = 'Dashboard';
    document.getElementById('dashSubtitle').textContent = 'Selecione um canal para começar';
    document.getElementById('trendsList').innerHTML = '<div class="empty-msg">Selecione um canal</div>';
    document.getElementById('ideiasDash').innerHTML = '<div class="empty-msg">Selecione um canal</div>';
    document.getElementById('recentList').innerHTML = '<div class="empty-msg">Nenhum conteúdo ainda</div>';
    if (document.getElementById('page-canais')?.classList.contains('active')) renderGestaoCanais();
    return;
  }
  state.currentChannel = state.channels.find(c => c.id === id);
  localStorage.setItem('rizoma_canal', String(id));
  document.getElementById('editChannelBtn').style.display = 'flex';
  document.getElementById('dashTitle').textContent = state.currentChannel.nome;
  document.getElementById('dashSubtitle').textContent =
    `Nicho: ${state.currentChannel.nicho} · ${state.currentChannel.plataformas.length} plataformas`;
  loadTrends();
  loadIdeiasDash();
  loadRecentList();
  if (document.getElementById('page-canais')?.classList.contains('active')) renderGestaoCanais();
}

function selectChannelAndShow(canalId, page) {
  const sel = document.getElementById('channelSelect');
  sel.value = String(canalId);
  onChannelChange();
  showPage(page);
}

// ─── Modal Canal ──────────────────────────────────────────────────────────────
function openModal(id, mode = 'create') {
  if (id === 'channelModal') {
    if (mode === 'create') {
      document.getElementById('channelModalTitle').textContent = 'Novo Canal';
      document.getElementById('channelId').value = '';
      document.getElementById('channelNome').value = '';
      document.getElementById('channelNicho').value = '';
      document.getElementById('channelTom').value = '';
      document.getElementById('channelPublico').value = '';
      document.getElementById('channelYoutubeUrl').value = '';
      document.querySelectorAll('.platform-check input').forEach(cb => {
        cb.checked = ['YouTube', 'Instagram'].includes(cb.value);
      });
    }
  }
  if (id === 'ideiaModal') {
    document.getElementById('ideiaText').value = '';
    setStars(3);
  }
  document.getElementById(id).style.display = 'flex';
  setTimeout(() => {
    const firstInput = document.querySelector(`#${id} .form-control`);
    if (firstInput) firstInput.focus();
  }, 100);
}

function openEditChannel() {
  if (!state.currentChannel) return;
  const c = state.currentChannel;
  document.getElementById('channelModalTitle').textContent = 'Editar Canal';
  document.getElementById('channelId').value = c.id;
  document.getElementById('channelNome').value = c.nome;
  document.getElementById('channelNicho').value = c.nicho;
  document.getElementById('channelTom').value = c.tom;
  document.getElementById('channelPublico').value = c.publico;
  document.getElementById('channelYoutubeUrl').value = c.youtube_url || '';
  document.querySelectorAll('.platform-check input').forEach(cb => {
    cb.checked = c.plataformas.includes(cb.value);
  });
  document.getElementById('channelModal').style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

async function saveChannel() {
  const nome = document.getElementById('channelNome').value.trim();
  const nicho = document.getElementById('channelNicho').value.trim();
  const tom = document.getElementById('channelTom').value.trim();
  const publico = document.getElementById('channelPublico').value.trim();
  const youtube_url = document.getElementById('channelYoutubeUrl').value.trim();

  if (!nome || !nicho || !tom || !publico) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }

  const plataformas = [...document.querySelectorAll('.platform-check input:checked')]
    .map(cb => cb.value);

  const id = document.getElementById('channelId').value;

  try {
    if (id) {
      await api.put(`/api/canais/${id}`, { nome, nicho, tom, publico, plataformas, youtube_url });
      showToast('Canal atualizado! 🌿');
    } else {
      const res = await api.post('/api/canais', { nome, nicho, tom, publico, plataformas, youtube_url });
      document.getElementById('channelSelect').value = String(res.id);
      localStorage.setItem('rizoma_canal', String(res.id));
      showToast('Canal criado! 🌿');
    }
    closeModal('channelModal');
    await loadChannels();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Gestão de Canais ─────────────────────────────────────────────────────────
function renderGestaoCanais() {
  const grid = document.getElementById('gestaoCanaisGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (state.channels.length === 0) {
    grid.innerHTML = '<div class="empty-msg centered">Você ainda não tem nenhum canal cadastrado.</div>';
    return;
  }

  state.channels.forEach(c => {
    const cardId = `ccard_${c.id}`;
    const youtubeUrl = c.youtube_url || '';
    const activeClass = state.currentChannel?.id === c.id ? ' active' : '';

    const html = `
      <div class="card channel-card${activeClass}" id="${cardId}">
        <div class="card-header channel-card-header">
          <div>
            <h2 class="card-title">${escapeHtml(c.nome)}</h2>
            <p class="channel-card-subtitle">${escapeHtml(c.nicho)}</p>
          </div>
          <span class="recent-modo pos">Ativo</span>
        </div>

        <div class="channel-stats">
          <div class="channel-stat">
            <strong id="${cardId}_subs">--</strong>
            <span>Inscritos</span>
          </div>
          <div class="channel-stat">
            <strong id="${cardId}_views">--</strong>
            <span>Views</span>
          </div>
          <div class="channel-stat">
            <strong id="${cardId}_vids">--</strong>
            <span>Vídeos</span>
          </div>
        </div>

        <div class="channel-card-meta">
          <span>${c.plataformas.length} plataformas ativas</span>
          <span>${youtubeUrl ? 'YouTube conectado' : 'YouTube não configurado'}</span>
        </div>

        <div class="channel-card-actions">
          <button class="btn-secondary-sm" onclick="selectChannelAndShow(${c.id}, 'dashboard')">Produzir</button>
          <button class="btn-secondary-sm" onclick="selectChannelAndShow(${c.id}, 'historico')">Histórico</button>
          <button class="btn-primary-sm" onclick="selectChannelAndShow(${c.id}, 'dashboard');openEditChannel()">Editar</button>
          <button class="btn-danger-sm" onclick="confirmDeleteCanal(${c.id}, '${escapeHtml(c.nome).replace(/'/g, '&#39;')}')">🗑️ Excluir</button>
        </div>
      </div>
    `;
    grid.insertAdjacentHTML('beforeend', html);

    if (youtubeUrl) {
      fetchYoutubeStats(c.id, cardId);
    } else {
      document.getElementById(`${cardId}_subs`).textContent = 'N/A';
      document.getElementById(`${cardId}_views`).textContent = 'N/A';
      document.getElementById(`${cardId}_vids`).textContent = 'N/A';
    }
  });
}

async function fetchYoutubeStats(canalId, cardId) {
  try {
    const data = await api.get(`/api/youtube/stats/${canalId}`);
    if (data.error || data._error) {
      document.getElementById(`${cardId}_subs`).textContent = 'Erro';
      document.getElementById(`${cardId}_views`).textContent = 'Erro';
      document.getElementById(`${cardId}_vids`).textContent = 'Erro';
      return;
    }

    const fmt = (n) => {
      const num = parseInt(n) || 0;
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    };

    document.getElementById(`${cardId}_subs`).textContent = fmt(data.subscriberCount);
    document.getElementById(`${cardId}_views`).textContent = fmt(data.viewCount);
    document.getElementById(`${cardId}_vids`).textContent = fmt(data.videoCount);
  } catch(e) {
    document.getElementById(`${cardId}_subs`).textContent = 'Erro';
    document.getElementById(`${cardId}_views`).textContent = 'Erro';
    document.getElementById(`${cardId}_vids`).textContent = 'Erro';
  }
}

// ─── Excluir Canal ───────────────────────────────────────────────────────────────────────────
let _pendingDeleteId = null;

function confirmDeleteCanal(id, nome) {
  _pendingDeleteId = id;
  document.getElementById('deleteChannelName').textContent = nome;
  document.getElementById('deleteChannelModal').style.display = 'flex';
}

async function executeDeleteCanal() {
  if (!_pendingDeleteId) return;
  const id = _pendingDeleteId;
  _pendingDeleteId = null;
  closeModal('deleteChannelModal');

  try {
    // api.del roteia automaticamente para o IndexedDB (RizomaMobile) no modo hosted,
    // e para o backend FastAPI no modo local — ambos aplicam cascata de conteúdos e ideias.
    await api.del(`/api/canais/${id}`);

    // Determina próximo canal a selecionar antes de recarregar
    const wasActive = state.currentChannel?.id === id;
    const remaining = state.channels.filter(c => c.id !== id);
    const nextId = wasActive && remaining.length > 0 ? String(remaining[0].id) : null;

    // Recarrega lista de canais
    state.channels = await api.get('/api/canais');
    renderChannelSelect();

    if (wasActive) {
      if (nextId) {
        document.getElementById('channelSelect').value = nextId;
        localStorage.setItem('rizoma_canal', nextId);
      } else {
        document.getElementById('channelSelect').value = '';
        localStorage.removeItem('rizoma_canal');
      }
      onChannelChange();
    }

    renderGestaoCanais();
    showToast('Canal excluído com sucesso.');
  } catch (e) {
    showToast(e.message || 'Erro ao excluir canal.', 'error');
  }
}

// ─── Modo ─────────────────────────────────────────────────────────────────────
function setMode(mode) {
  state.currentMode = mode;
  document.getElementById('btnPos').classList.toggle('active', mode === 'pos');
  document.getElementById('btnPre').classList.toggle('active', mode === 'pre');

  const hints = {
    pos: 'Pós-produção — gere todos os assets para um vídeo já gravado',
    pre: 'Pré-produção — planeje, roteirize e valide sua ideia antes de gravar',
  };
  document.getElementById('modeHint').textContent = hints[mode];
}

// ─── Geração de Conteúdo ──────────────────────────────────────────────────────
async function gerarConteudo() {
  if (!state.currentChannel) {
    showToast('Selecione um canal primeiro', 'error');
    return;
  }

  const tema = document.getElementById('temaInput').value.trim();
  if (!tema) {
    showToast('Digite o tema ou título do conteúdo', 'error');
    document.getElementById('temaInput').focus();
    return;
  }

  const btn = document.getElementById('generateBtn');
  const btnText = document.getElementById('generateBtnText');
  btn.classList.add('loading');
  btnText.textContent = '⏳ Gerando conteúdo...';

  try {
    const res = await api.post('/api/gerar', {
      canal_id: state.currentChannel.id,
      tema,
      modo: state.currentMode,
    });

    state.currentResults = res.resultado;
    renderResults(res.resultado, tema);
    loadRecentList();
    showToast('Conteúdo gerado com sucesso! ✨');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btnText.textContent = '🚀 Gerar Conteúdo';
  }
}

// ─── Renderização dos Resultados ──────────────────────────────────────────────
function renderResults(data, tema) {
  const section = document.getElementById('resultsSection');
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Meta info
  const modo = state.currentMode === 'pre' ? 'Pré-produção' : 'Pós-produção';
  document.getElementById('resultsMeta').textContent =
    `${state.currentChannel?.nome} · ${modo}`;

  // Demo warning
  const demoEl = document.getElementById('demoWarning');
  demoEl.style.display = data._demo ? 'block' : 'none';

  // Show/hide roteiro tab
  const roteiroTab = document.querySelector('.tab-roteiro');
  if (roteiroTab) roteiroTab.style.display = data.roteiro_completo ? 'block' : 'none';

  // Render first tab
  switchTab('youtube');
}

function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderTabContent(tab, state.currentResults);
}

function renderTabContent(tab, data) {
  const container = document.getElementById('tabContent');
  if (!data) { container.innerHTML = ''; return; }

  const d = data[tab];
  if (!d) {
    container.innerHTML = '<div class="empty-msg centered">Nenhum conteúdo para esta plataforma.</div>';
    return;
  }

  let html = '';

  switch (tab) {
    case 'youtube':
      html += assetBox('📝 Título SEO', d.titulo);
      html += assetBox('📄 Descrição Completa', d.descricao, true);
      html += chipGroup('🏷️ Tags', d.tags, 'tag');
      html += chipGroup('# Hashtags', d.hashtags, 'hashtag');
      html += assetBox('📢 CTA', d.cta);
      html += assetBox('📌 Comentário Fixado', d.comentario_fixado);
      break;

    case 'instagram':
      html += assetBox('📄 Legenda', d.legenda, true);
      html += chipGroup('# Hashtags', d.hashtags, 'hashtag');
      html += assetBox('📢 CTA', d.cta);
      break;

    case 'x_twitter':
      html += assetBoxWithCount('🐦 Tweet Principal', d.tweet, 280);
      html += threadGroup(d.thread);
      break;

    case 'linkedin':
      html += assetBox('💼 Post LinkedIn', d.post, true);
      break;

    case 'facebook':
      html += assetBox('📘 Post Facebook', d.post, true);
      break;

    case 'short_reel':
      html += assetBox('🎬 Roteiro Short/Reel (60s)', d.roteiro, true);
      break;

    case 'tiktok':
      html += assetBox('🎵 Roteiro TikTok', d.roteiro, true);
      html += assetBox('💬 Caption + Hashtags', d.caption);
      break;

    case 'telegram':
      html += assetBox('✈️ Mensagem Telegram', d.mensagem, true);
      break;

    case 'thumbnail':
      html += assetBox('🖼️ Prompt para IA (Midjourney/DALL-E)', d.prompt_ia, true);
      if (d.ideias_titulo) html += assetBox('✏️ Texto da Thumbnail', d.ideias_titulo);
      if (d.cores_sugeridas) html += assetBox('🎨 Paleta de Cores', d.cores_sugeridas);
      break;

    case 'blog':
      html += assetBox('📝 Título SEO', d.titulo_seo);
      html += assetBox('🔍 Meta Description (160 chars)', d.meta_description);
      if (d.introducao) html += assetBox('📖 Introdução do Artigo', d.introducao, true);
      break;

    case 'roteiro_completo':
      if (data.roteiro_completo) {
        const r = data.roteiro_completo;
        html += assetBox('🎬 Introdução', r.intro, true);
        if (r.topicos) html += topicsList(r.topicos);
        html += assetBox('📢 CTA Final', r.cta_final);
        if (r.duracao_estimada) html += assetBox('⏱️ Duração Estimada', r.duracao_estimada);
        if (r.checklist_pesquisa) html += topicsList(r.checklist_pesquisa, '📋 Checklist de Pesquisa');
        if (r.analise) html += analysisBlock(r.analise);
      }
      break;

    default:
      html = '<div class="empty-msg centered">Plataforma não configurada.</div>';
  }

  container.innerHTML = html;
}

// ─── Helpers de Render ────────────────────────────────────────────────────────
function assetBox(label, content, multiline = false) {
  if (!content) return '';
  const id = `asset_${Math.random().toString(36).substr(2, 9)}`;
  return `
    <div class="asset-group">
      <div class="asset-label">${label}</div>
      <div class="asset-box-row">
        <div class="asset-box" id="${id}">${escapeHtml(content)}</div>
        <button class="btn-copy" onclick="copyAsset('${id}', this)">📋 Copiar</button>
      </div>
    </div>`;
}

function assetBoxWithCount(label, content, maxChars) {
  if (!content) return '';
  const id = `asset_${Math.random().toString(36).substr(2, 9)}`;
  const count = content.length;
  const color = count > maxChars ? 'var(--red)' : count > maxChars * 0.9 ? 'var(--yellow)' : 'var(--accent)';
  return `
    <div class="asset-group">
      <div class="asset-label">${label}</div>
      <div class="asset-box-row">
        <div>
          <div class="asset-box" id="${id}">${escapeHtml(content)}</div>
          <div class="char-count" style="color:${color}">${count}/${maxChars} caracteres</div>
        </div>
        <button class="btn-copy" onclick="copyAsset('${id}', this)">📋 Copiar</button>
      </div>
    </div>`;
}

function chipGroup(label, items, type = 'tag') {
  if (!items || items.length === 0) return '';
  const cssClass = type === 'hashtag' ? 'hashtag-chip' : 'tag-chip';
  const id = `chips_${Math.random().toString(36).substr(2, 9)}`;
  const chips = items.map(t =>
    `<span class="${cssClass}" onclick="copyText(decodeURIComponent('${encodeInline(t)}'))">${escapeHtml(t)}</span>`
  ).join('');
  return `
    <div class="asset-group">
      <div class="asset-label">${label}</div>
      <div class="asset-box-row">
        <div class="tags-cloud" id="${id}">${chips}</div>
        <button class="btn-copy" onclick="copyText(decodeURIComponent('${encodeInline(items.join(' '))}'), this)">📋 Copiar todos</button>
      </div>
    </div>`;
}

function threadGroup(items) {
  if (!items || items.length === 0) return '';
  const itemsHtml = items.map((t, i) => `
    <div class="thread-item">
      <div class="thread-num">${i + 1}/${items.length}</div>
      <div class="thread-text">${escapeHtml(t)}</div>
      <button class="btn-copy" onclick="copyText(decodeURIComponent('${encodeInline(t)}'), this)">📋</button>
    </div>
  `).join('');
  return `
    <div class="asset-group">
      <div class="asset-label">🧵 Thread Completa</div>
      <div style="display:flex;flex-direction:column;gap:8px">${itemsHtml}</div>
    </div>`;
}

function topicsList(items, label = '📋 Tópicos do Vídeo') {
  if (!items || items.length === 0) return '';
  const listHtml = items.map(t => `
    <div class="thread-item">
      <div class="thread-text">${escapeHtml(t)}</div>
    </div>`).join('');
  return `
    <div class="asset-group">
      <div class="asset-label">${label}</div>
      <div style="display:flex;flex-direction:column;gap:6px">${listHtml}</div>
    </div>`;
}

function analysisBlock(analise) {
  const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  return `
    <div class="asset-group">
      <div class="asset-label">📊 Análise</div>
      <div class="analysis-grid">
        <div class="analysis-card">
          <div class="analysis-label">Vale a pena gravar?</div>
          <div class="analysis-value">${analise.vale_a_pena ? '✅ Sim' : '❌ Não'}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">${escapeHtml(analise.motivo || '')}</div>
        </div>
        <div class="analysis-card">
          <div class="analysis-label">Potencial de viralizar</div>
          <div class="analysis-value analysis-stars">${stars(analise.potencial_viralizar || 0)}</div>
        </div>
        <div class="analysis-card">
          <div class="analysis-label">Dificuldade de produção</div>
          <div class="analysis-value analysis-stars">${stars(analise.dificuldade_producao || 0)}</div>
        </div>
      </div>
    </div>`;
}

function closeResults() {
  document.getElementById('resultsSection').style.display = 'none';
  state.currentResults = null;
}

// ─── Tendências ───────────────────────────────────────────────────────────────
async function loadTrends() {
  if (!state.currentChannel) return;
  try {
    const data = await api.get(`/api/trends/${state.currentChannel.id}`);
    const el = document.getElementById('trendsList');
    if (!data.trends || data.trends.length === 0) {
      el.innerHTML = '<div class="empty-msg">Sem tendências disponíveis</div>';
      return;
    }
    el.innerHTML = data.trends.map(t => `
      <div class="trend-item" onclick="useTrend(decodeURIComponent('${encodeInline(t.tema)}'))">
        <span class="trend-stars">${'★'.repeat(t.potencial)}${'☆'.repeat(5 - t.potencial)}</span>
        <span class="trend-text">${escapeHtml(t.tema)}</span>
        <span class="trend-use">Usar →</span>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('trendsList').innerHTML = '<div class="empty-msg">Erro ao carregar tendências</div>';
  }
}

function useTrend(tema) {
  document.getElementById('temaInput').value = tema;
  document.getElementById('temaInput').focus();
  showToast('Tendência adicionada ao campo de criação!');
}

// ─── Ideias ───────────────────────────────────────────────────────────────────
async function loadIdeiasDash() {
  if (!state.currentChannel) return;
  try {
    const ideias = await api.get(`/api/ideias/${state.currentChannel.id}?limit=4`);
    const el = document.getElementById('ideiasDash');
    if (!ideias.length) {
      el.innerHTML = '<div class="empty-msg">Nenhuma ideia ainda</div>';
      return;
    }
    el.innerHTML = ideias.map(i => `
      <div class="idea-item-dash" onclick="useIdeia(decodeURIComponent('${encodeInline(i.tema)}'))">
        <span class="idea-text-dash">${escapeHtml(i.tema)}</span>
        <span class="idea-stars-dash">${'★'.repeat(i.potencial)}</span>
      </div>
    `).join('');
  } catch (e) {}
}

async function loadIdeiasPage() {
  const el = document.getElementById('ideiasPageList');
  if (!state.currentChannel) {
    el.innerHTML = '<div class="empty-msg centered">Selecione um canal para ver as ideias.</div>';
    return;
  }
  try {
    const ideias = await api.get(`/api/ideias/${state.currentChannel.id}?limit=50`);
    if (!ideias.length) {
      el.innerHTML = '<div class="empty-msg centered">Nenhuma ideia ainda. Adicione sua primeira!</div>';
      return;
    }
    el.innerHTML = ideias.map(i => `
      <div class="idea-card">
        <div style="flex:1">
          <div class="idea-card-text">${escapeHtml(i.tema)}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${formatDate(i.criado_em)}</div>
        </div>
        <span class="idea-card-stars">${'★'.repeat(i.potencial)}${'☆'.repeat(5 - i.potencial)}</span>
        <div class="idea-actions">
          <button class="btn-idea-action" onclick="useIdeia(decodeURIComponent('${encodeInline(i.tema)}'));showPage('dashboard')">Usar</button>
          <button class="btn-idea-action danger" onclick="deleteIdeia(${i.id})">✕</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = '<div class="empty-msg centered">Erro ao carregar ideias.</div>';
  }
}

function useIdeia(tema) {
  document.getElementById('temaInput').value = tema;
  showToast('Ideia adicionada ao campo de criação!');
}

function setStars(n) {
  state.starRating = n;
  document.querySelectorAll('#starRating .star').forEach((s, i) => {
    s.classList.toggle('active', i < n);
  });
}

async function saveIdeia() {
  if (!state.currentChannel) {
    showToast('Selecione um canal primeiro', 'error');
    return;
  }
  const tema = document.getElementById('ideiaText').value.trim();
  if (!tema) {
    showToast('Digite o tema da ideia', 'error');
    return;
  }
  try {
    await api.post('/api/ideias', {
      canal_id: state.currentChannel.id,
      tema,
      potencial: state.starRating,
    });
    showToast('Ideia salva! 💡');
    closeModal('ideiaModal');
    loadIdeiasDash();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function deleteIdeia(id) {
  if (!confirm('Remover esta ideia?')) return;
  try {
    await api.del(`/api/ideias/${id}`);
    showToast('Ideia removida');
    loadIdeiasPage();
    loadIdeiasDash();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Histórico ────────────────────────────────────────────────────────────────
async function loadRecentList() {
  if (!state.currentChannel) return;
  try {
    const items = await api.get(`/api/historico?canal_id=${state.currentChannel.id}&limit=5`);
    const el = document.getElementById('recentList');
    if (!items.length) {
      el.innerHTML = '<div class="empty-msg">Nenhum conteúdo ainda</div>';
      return;
    }
    el.innerHTML = items.map(h => `
      <div class="recent-item" onclick="openHistDetail(${h.id})">
        <span class="recent-modo ${h.modo}">${h.modo === 'pre' ? 'Pré' : 'Pós'}</span>
        <span class="recent-text">${escapeHtml(h.tema)}</span>
        <span class="recent-date">${formatDate(h.criado_em)}</span>
      </div>
    `).join('');
  } catch (e) {}
}

async function loadHistoricoPage() {
  const el = document.getElementById('historicoList');
  try {
    const q = state.currentChannel ? `?canal_id=${state.currentChannel.id}&limit=50` : '?limit=50';
    const items = await api.get(`/api/historico${q}`);
    if (!items.length) {
      el.innerHTML = '<div class="empty-msg centered">Nenhum conteúdo gerado ainda.</div>';
      return;
    }
    el.innerHTML = items.map(h => `
      <div class="history-card" onclick="openHistDetail(${h.id})">
        <span class="history-modo ${h.modo}">${h.modo === 'pre' ? 'Pré-produção' : 'Pós-produção'}</span>
        <div class="history-info">
          <div class="history-tema">${escapeHtml(h.tema)}</div>
          <div class="history-meta">${escapeHtml(h.canal_nome)} · ${formatDate(h.criado_em)}</div>
        </div>
        <span style="color:var(--text-muted);font-size:16px">→</span>
      </div>
    `).join('');
  } catch (e) {
    el.innerHTML = '<div class="empty-msg centered">Erro ao carregar histórico.</div>';
  }
}

async function openHistDetail(id) {
  try {
    const conteudo = await api.get(`/api/historico/${id}`);
    document.getElementById('histDetailTitle').textContent = conteudo.tema;

    // Reutiliza o sistema de renderização de resultados
    state.currentResults = conteudo.dados;
    const modo = conteudo.modo === 'pre' ? 'Pré-produção' : 'Pós-produção';

    // Monta uma visualização compacta dentro do modal
    document.getElementById('histDetailBody').innerHTML = `
      <p style="font-size:12px;color:var(--text-secondary);margin-bottom:16px">${modo} · ${formatDate(conteudo.criado_em)}</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${buildQuickPreview(conteudo.dados)}
      </div>
    `;
    document.getElementById('histDetailModal').style.display = 'flex';
  } catch (e) {
    showToast('Erro ao carregar conteúdo', 'error');
  }
}

function buildQuickPreview(data) {
  if (!data) return '<div class="empty-msg">Sem dados</div>';
  let html = '';
  if (data.youtube?.titulo) {
    html += `<div class="asset-group">${assetBox('📹 Título YouTube', data.youtube.titulo)}</div>`;
  }
  if (data.instagram?.legenda) {
    html += `<div class="asset-group">${assetBox('📸 Legenda Instagram', data.instagram.legenda?.substring(0, 200) + '...')}</div>`;
  }
  if (data.x_twitter?.tweet) {
    html += `<div class="asset-group">${assetBox('🐦 Tweet', data.x_twitter.tweet)}</div>`;
  }
  return html || '<div class="empty-msg">Dados não disponíveis</div>';
}

// ─── Configurações ────────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const cfg = await api.get('/api/config');
    document.getElementById('cfgProvider').value = cfg.provider || 'demo';
    document.getElementById('cfgGeminiModel').value = cfg.gemini_model || 'gemini-3.1-flash-lite';
    document.getElementById('cfgOpenaiModel').value = cfg.openai_model || 'gpt-4o-mini';
    document.getElementById('cfgOllamaUrl').value = cfg.ollama_url || 'http://localhost:11434';
    document.getElementById('cfgOllamaModel').value = cfg.ollama_model || 'llama3';

    if (cfg.gemini_api_key_set) {
      document.getElementById('geminiKeyStatus').textContent = '✅ Chave configurada';
    }
    if (cfg.openai_api_key_set) {
      document.getElementById('openaiKeyStatus').textContent = '✅ Chave configurada';
    }
    if (cfg.youtube_api_key_set) {
      document.getElementById('youtubeKeyStatus').textContent = '✅ Chave configurada';
    }

    if (isHostedRuntime) applyHostedConfigUi();
    onProviderChange();
  } catch (e) {}
}

function onProviderChange() {
  const provider = document.getElementById('cfgProvider').value;
  document.getElementById('geminiSection').style.display = provider === 'gemini' ? 'block' : 'none';
  document.getElementById('openaiSection').style.display = provider === 'openai' ? 'block' : 'none';
  document.getElementById('ollamaSection').style.display = provider === 'ollama' ? 'block' : 'none';
}

async function saveConfig() {
  try {
    await api.put('/api/config', {
      provider: document.getElementById('cfgProvider').value,
      gemini_model: document.getElementById('cfgGeminiModel').value,
      gemini_api_key: document.getElementById('cfgGeminiKey').value,
      openai_model: document.getElementById('cfgOpenaiModel').value,
      openai_api_key: document.getElementById('cfgOpenaiKey').value,
      ollama_url: document.getElementById('cfgOllamaUrl').value,
      ollama_model: document.getElementById('cfgOllamaModel').value,
      youtube_api_key: document.getElementById('cfgYoutubeKey').value,
    });
    showToast('Configurações salvas! 💾');
    document.getElementById('cfgGeminiKey').value = '';
    document.getElementById('cfgOpenaiKey').value = '';
    document.getElementById('cfgYoutubeKey').value = '';
    loadConfig();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function applyHostedConfigUi() {
  const ollamaOption = document.querySelector('#cfgProvider option[value="ollama"]');
  if (ollamaOption) {
    ollamaOption.disabled = true;
    ollamaOption.textContent = 'Ollama — disponível apenas no computador';
  }
  for (const id of ['cfgGeminiKey', 'cfgOpenaiKey', 'cfgYoutubeKey']) {
    const input = document.getElementById(id);
    if (!input) continue;
    input.value = '';
    input.disabled = true;
    input.placeholder = 'Chave protegida na hospedagem';
  }
  document.querySelectorAll('.link-get-key').forEach(link => { link.style.display = 'none'; });
  document.getElementById('mobileDataCard').style.display = 'block';
}

async function exportMobileBackup() {
  try {
    const counts = await window.RizomaMobile.exportBackup();
    showToast(`Backup exportado: ${counts.canais} canais, ${counts.conteudos} conteúdos e ${counts.ideias} ideias.`);
  } catch (error) {
    showToast(error.message || 'Não foi possível exportar o backup.', 'error');
  }
}

async function importMobileBackup(input) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (!confirm('Importar este backup substituirá os dados atuais deste iPhone. Deseja continuar?')) return;
    const counts = await window.RizomaMobile.importBackup(file);
    localStorage.removeItem('rizoma_canal');
    await loadChannels();
    showToast(`Backup importado: ${counts.canais} canais, ${counts.conteudos} conteúdos e ${counts.ideias} ideias.`);
  } catch (error) {
    showToast(error.message || 'Backup inválido.', 'error');
  } finally {
    input.value = '';
  }
}

async function updateStorageStatus() {
  if (!isHostedRuntime || !window.RizomaMobile) return;
  const element = document.getElementById('storageStatus');
  try {
    const status = await window.RizomaMobile.storageStatus();
    element.textContent = status.persisted
      ? '✅ Armazenamento persistente autorizado neste aparelho.'
      : '⚠️ O iOS não garantiu persistência. Mantenha um backup recente em Downloads.';
    element.classList.toggle('protected', status.persisted);
  } catch {
    element.textContent = '⚠️ Não foi possível confirmar a persistência. Mantenha um backup recente.';
  }
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
function copyAsset(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  copyText(el.textContent, btn);
}

function copyText(text, btn = null) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado! 📋');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = '✅ Copiado';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 2000);
    }
  }).catch(() => {
    showToast('Erro ao copiar', 'error');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function encodeInline(str) {
  return encodeURIComponent(String(str || '')).replace(/'/g, '%27');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'hoje';
    if (days === 1) return 'ontem';
    if (days < 7) return `${days}d atrás`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await window.RizomaPwa?.init();
  if (isHostedRuntime) {
    applyHostedConfigUi();
    await window.RizomaMobile.openDatabase();
    await updateStorageStatus();
  }
  // Channel select listener
  document.getElementById('channelSelect').addEventListener('change', onChannelChange);

  // Keyboard shortcut: Ctrl+Enter para gerar
  document.getElementById('temaInput').addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') gerarConteudo();
  });

  await loadChannels();
});
