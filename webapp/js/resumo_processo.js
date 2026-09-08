// Resumo Inteligente de Processos — Buscador DJEN v50.71
// Feature B: Geração de resumo jurídico estruturado via LLM
// Inspirado em: jhondados/resumo-processos
// Compatível com Gemini, OpenAI, Ollama e Chrome AI (via APIClient.fetchAIPrompt)

const ResumoProcesso = {

    /**
     * Monta o prompt jurídico estruturado para o LLM.
     * @param {string} textoIntimacao - Texto completo da intimação/publicação
     * @param {object} [dadosDataJud] - Dados opcionais enriquecidos do DataJud
     * @returns {string} Prompt formatado
     */
    montarPrompt(textoIntimacao, dadosDataJud = null) {
        const MAX_CHARS = 6000; // Evita tokens excessivos
        const textoTruncado = textoIntimacao.substring(0, MAX_CHARS);

        let contexto = '';
        if (dadosDataJud) {
            const partes = [
                dadosDataJud.poloAtivo?.join(', '),
                dadosDataJud.poloPassivo?.join(', ')
            ].filter(Boolean);
            contexto = `
DADOS DO PROCESSO (DataJud/CNJ):
- Número: ${dadosDataJud.numeroProcesso || 'Não informado'}
- Classe: ${dadosDataJud.classe || 'Não informada'}
- Assunto: ${dadosDataJud.assunto || 'Não informado'}
- Tribunal: ${dadosDataJud.orgaoJulgador || dadosDataJud.tribunalSigla || 'Não informado'}
- Partes: ${partes.join(' x ') || 'Não informadas'}
- Status: ${dadosDataJud.status || 'Em andamento'}
- Última movimentação: ${dadosDataJud.ultimoMovimento?.nome || 'Não informada'} em ${dadosDataJud.ultimoMovimento?.data?.substring(0, 10) || ''}
`;
        }

        return `Você é um assistente jurídico especializado em direito processual brasileiro.
Analise a publicação judicial abaixo e gere um resumo OBJETIVO e ESTRUTURADO.
Responda SOMENTE com o JSON especificado. Não escreva nada fora do JSON.
${contexto}
PUBLICAÇÃO DO DJEN:
"""
${textoTruncado}
"""

Responda EXATAMENTE neste formato JSON (sem markdown, sem blocos de código):
{
  "tipo_ato": "<Despacho|Decisão Interlocutória|Sentença|Acórdão|Intimação|Citação|Outro>",
  "fatos_relevantes": "<máx. 2 frases descrevendo o que aconteceu processualmente>",
  "pedido_determinacao": "<o que foi determinado, deferido, indeferido ou pedido>",
  "prazo_indicado": "<prazo mencionado na publicação, ex: '15 dias úteis' ou 'Não identificado'>",
  "providencia_sugerida": "<ação recomendada ao advogado: contestar, recorrer, cumprir, aguardar, etc.>",
  "urgente": <true|false>,
  "palavras_chave": ["<palavra1>", "<palavra2>"],
  "tarefas_sugeridas": ["<Tarefa objetiva 1, ex: Anotar prazo de 15 dias>", "<Tarefa 2, ex: Preparar petição XYZ>"]
}`;
    },

    /**
     * Gera o resumo inteligente de uma intimação usando IA.
     *
     * @param {string} textoIntimacao - Texto completo da publicação
     * @param {object} [dadosDataJud] - Dados enriquecidos do processo (opcional)
     * @param {object} [configIA] - { provider, apiKey, model, endpoint }
     * @returns {Promise<object>} Resumo estruturado ou objeto de erro
     */
    async gerarResumo(textoIntimacao, dadosDataJud = null, configIA = {}) {
        if (!textoIntimacao || textoIntimacao.trim().length < 30) {
            return { erro: 'Texto muito curto para resumir.' };
        }

        // Recuperar configuração de IA do storage se não fornecida
        let provider = configIA.provider;
        let apiKey = configIA.apiKey;
        let model = configIA.model;
        let endpoint = configIA.endpoint;

        if (!provider) {
            // Ler do SafeStorage se disponível
            if (typeof SafeStorage !== 'undefined') {
                await new Promise(resolve => {
                    SafeStorage.get([
                        'djen_ia_provider', 'djen_ia_api_key',
                        'djen_ia_model', 'djen_ia_endpoint'
                    ], (data) => {
                        provider = data.djen_ia_provider || 'chrome_ai';
                        apiKey = data.djen_ia_api_key || '';
                        model = data.djen_ia_model || '';
                        endpoint = data.djen_ia_endpoint || '';
                        resolve();
                    });
                });
            } else {
                provider = 'chrome_ai'; // Fallback seguro
            }
        }

        if (!provider) {
            return { erro: 'Nenhum provedor de IA configurado. Configure em Configurações → IA.' };
        }

        const prompt = this.montarPrompt(textoIntimacao, dadosDataJud);

        try {
            const client = globalThis.APIClient;
            if (!client) throw new Error('APIClient não disponível');

            const respostaRaw = await client.fetchAIPrompt(provider, apiKey, model, endpoint, prompt);

            // Tentar parsear o JSON da resposta
            const resumo = this._parsearResposta(respostaRaw);
            return resumo;

        } catch (err) {
            console.error('[ResumoProcesso] Erro ao gerar resumo:', err.message);
            return { erro: `Falha na IA: ${err.message}` };
        }
    },

    /**
     * Parseia a resposta do LLM (JSON) com fallback robusto.
     */
    _parsearResposta(respostaRaw) {
        if (!respostaRaw) return { erro: 'Resposta vazia da IA.' };

        // Remover blocos de código markdown se presentes
        const limpa = respostaRaw
            .replace(/```json\s*/gi, '')
            .replace(/```\s*/gi, '')
            .trim();

        // Tentar extrair JSON da resposta
        const jsonMatch = limpa.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            // Fallback: retornar como texto simples
            return {
                tipo_ato: 'Não identificado',
                fatos_relevantes: limpa.substring(0, 500),
                pedido_determinacao: '',
                prazo_indicado: 'Não identificado',
                providencia_sugerida: 'Verifique o texto completo da publicação.',
                urgente: false,
                palavras_chave: [],
                _raw: true
            };
        }

        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            return { erro: 'Resposta da IA não pôde ser interpretada.', _raw: limpa.substring(0, 300) };
        }
    },

    /**
     * Renderiza o resumo como HTML para exibição no sidebar.
     * @param {object} resumo - Objeto retornado por gerarResumo()
     * @returns {string} HTML do resumo
     */
    renderizarHTML(resumo) {
        if (resumo.erro) {
            return `<div class="resumo-erro">⚠️ ${resumo.erro}</div>`;
        }

        const urgenteBadge = resumo.urgente
            ? `<span class="badge-resumo urgente">🚨 URGENTE</span>`
            : '';

        const palavrasChave = (resumo.palavras_chave || []).length > 0
            ? `<div class="resumo-tags">${resumo.palavras_chave.map(p =>
                `<span class="tag-resumo">${p}</span>`).join('')}</div>`
            : '';

        const linhas = [
            { label: '📋 Tipo de Ato', valor: resumo.tipo_ato },
            { label: '📖 Fatos Relevantes', valor: resumo.fatos_relevantes },
            { label: '⚖️ Determinação', valor: resumo.pedido_determinacao },
            { label: '⏰ Prazo', valor: resumo.prazo_indicado },
            { label: '✅ Providência', valor: resumo.providencia_sugerida },
        ].filter(l => l.valor && l.valor !== 'Não identificado' && l.valor.trim())
         .map(l => `
            <div class="resumo-linha">
                <span class="resumo-label">${l.label}</span>
                <span class="resumo-valor">${l.valor}</span>
            </div>`).join('');

        return `
<div class="resumo-ia-card${resumo.urgente ? ' urgente' : ''}">
    <div class="resumo-header">
        <span class="resumo-titulo">✨ Resumo IA</span>
        ${urgenteBadge}
    </div>
    <div class="resumo-corpo">
        ${linhas}
    </div>
    ${palavrasChave}
    <div class="resumo-footer">Gerado por IA · Verifique o texto original</div>
</div>`;
    }
};

// Exportar globalmente
globalThis.ResumoProcesso = ResumoProcesso;
