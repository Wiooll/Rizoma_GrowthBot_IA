const OUTPUT_FORMAT = `{
  "youtube": {"titulo":"","descricao":"","tags":[],"hashtags":[],"cta":"","comentario_fixado":""},
  "instagram": {"legenda":"","hashtags":[],"cta":""},
  "x_twitter": {"tweet":"","thread":[]},
  "linkedin": {"post":""},
  "facebook": {"post":""},
  "telegram": {"mensagem":""},
  "short_reel": {"roteiro":""},
  "tiktok": {"roteiro":"","caption":""},
  "thumbnail": {"prompt_ia":"","ideias_titulo":"","cores_sugeridas":""},
  "blog": {"titulo_seo":"","meta_description":"","introducao":""}
}`;

export function buildPrompt(topic, channel, mode) {
  const platforms = Array.isArray(channel.plataformas) ? channel.plataformas : [];
  const modeDescription = mode === "pre"
    ? "PRÉ-PRODUÇÃO: planeje o conteúdo antes de gravar, com roteiro completo, validação da ideia e abordagem."
    : "PÓS-PRODUÇÃO: o conteúdo já foi criado; gere os materiais de distribuição para múltiplas plataformas.";
  const preProduction = mode === "pre"
    ? '\nInclua também "roteiro_completo" com intro, topicos, cta_final, duracao_estimada, checklist_pesquisa e analise.'
    : "";

  return `Você é o Rizoma, especialista em crescimento orgânico ético para criadores brasileiros.

PERFIL DO CANAL:
- Nome: ${channel.nome}
- Nicho: ${channel.nicho}
- Tom de voz: ${channel.tom}
- Público-alvo: ${channel.publico}
- Plataformas ativas: ${platforms.length ? platforms.join(", ") : "todas"}

MODO: ${modeDescription}
TEMA: ${topic}

Responda somente com JSON válido, sem Markdown. Use português brasileiro natural, adapte o tom ao perfil e otimize cada material para sua plataforma. Títulos do YouTube devem ter até 70 caracteres; a thread deve começar com gancho forte; o LinkedIn deve usar insight e narrativa; hashtags devem combinar alcance e nicho.${preProduction}

Preencha este contrato sem remover chaves:
${OUTPUT_FORMAT}`;
}
