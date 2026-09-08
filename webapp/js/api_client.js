// API Client - Camada de acesso a dados externos
// v50.71: Refatorado com consulta DataJud via POST Elasticsearch + verificação TPU
// Fix Bug #3: A v50.70 usava GET simples sem body. A API pública do DataJud exige
// POST com query ES body para filtrar por numeroProcesso corretamente.

const APIClient = {
    // Cache de sessão: evita chamadas repetidas ao DataJud para o mesmo processo
    _datajudCache: new Map(),
    // Cache de códigos TPU consultados no SGT/CNJ (persiste na sessão)
    _tpuCache: new Map(),

    /**
     * Faz um fetch com suporte a retentativas (retry pattern).
     */
    async fetchComRetry(url, retries = 3, options = {}, delay = 2000) {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.status === 429) {
                    console.warn(`[API] Rate limit atingido. Tentativa ${i+1}/${retries}`);
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 2)));
                    continue;
                }
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return await response.json();
            } catch (err) {
                lastError = err;
                console.warn(`[API] Falha no fetch (${i+1}/${retries}): ${err.message}`);
                if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    },

    /**
     * Mapeia a sigla do tribunal para o índice da API pública do DataJud.
     */
    _resolverIndiceTribunal(siglaTribunal) {
        if (!siglaTribunal) return null;
        const sigla = siglaTribunal.trim().toUpperCase();
        const mapa = {
            'STJ': 'stj', 'STF': 'stf', 'TST': 'tst', 'TSE': 'tse', 'STM': 'stm',
            'TRF1': 'trf-1', 'TRF2': 'trf-2', 'TRF3': 'trf-3',
            'TRF4': 'trf-4', 'TRF5': 'trf-5', 'TRF6': 'trf-6',
            'TRT1': 'trt-1', 'TRT2': 'trt-2', 'TRT3': 'trt-3', 'TRT4': 'trt-4',
            'TRT5': 'trt-5', 'TRT6': 'trt-6', 'TRT7': 'trt-7', 'TRT8': 'trt-8',
            'TRT9': 'trt-9', 'TRT10': 'trt-10', 'TRT11': 'trt-11', 'TRT12': 'trt-12',
            'TRT13': 'trt-13', 'TRT14': 'trt-14', 'TRT15': 'trt-15', 'TRT16': 'trt-16',
            'TRT17': 'trt-17', 'TRT18': 'trt-18', 'TRT19': 'trt-19', 'TRT20': 'trt-20',
            'TRT21': 'trt-21', 'TRT22': 'trt-22', 'TRT23': 'trt-23', 'TRT24': 'trt-24',
        };
        if (mapa[sigla]) return mapa[sigla];
        if (/^TJ[A-Z]{2}$/.test(sigla)) return sigla.toLowerCase();
        return sigla.toLowerCase();
    },

    /**
     * Consulta o DataJud (API Pública CNJ) para um número de processo.
     * Usa POST com query Elasticsearch — padrão correto exigido pela API.
     *
     * @param {string} numeroCNJ - Número do processo (com ou sem formatação)
     * @param {string} siglaTribunal - Sigla do tribunal (ex: "TJSP", "STJ")
     * @param {string} [apiKey] - Chave da API pública (usa padrão CNJ se omitida)
     * @returns {Promise<object|null>} Dados estruturados do processo ou null
     */
    async consultarProcessoDataJud(numeroCNJ, siglaTribunal, apiKey) {
        const numLimpo = String(numeroCNJ || '').replace(/\D/g, '');
        if (!numLimpo || numLimpo.length < 20) {
            console.warn(`[DataJud] Número CNJ inválido: "${numeroCNJ}" (${numLimpo.length} dígitos)`);
            return null;
        }

        // Cache: se já consultamos nesta sessão, retorna imediatamente
        if (this._datajudCache.has(numLimpo)) {
            return this._datajudCache.get(numLimpo);
        }

        const indice = this._resolverIndiceTribunal(siglaTribunal);
        if (!indice) {
            console.warn(`[DataJud] Tribunal não reconhecido: "${siglaTribunal}"`);
            return null;
        }

        // Chave pública oficial do CNJ
        const KEY = apiKey || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
        const endpoint = `https://api-publica.datajud.cnj.jus.br/api_publica/${indice}/_search`;

        // Query Elasticsearch: filtra por número exato do processo
        const queryBody = {
            query: {
                term: { 'numeroProcesso.keyword': numeroCNJ.trim() }
            },
            size: 1,
            sort: [{ 'dataHoraUltimaAtualizacao': { order: 'desc' } }]
        };

        try {
            console.log(`[DataJud] Consultando ${numLimpo} em /${indice}...`);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `ApiKey ${KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryBody)
            });

            if (!response.ok) {
                const txt = await response.text().catch(() => '');
                throw new Error(`HTTP ${response.status}: ${txt.substring(0, 150)}`);
            }

            const result = await response.json();
            const hits = result?.hits?.hits || [];

            if (hits.length === 0) {
                console.warn(`[DataJud] Processo ${numLimpo} não encontrado em ${indice}.`);
                this._datajudCache.set(numLimpo, null);
                return null;
            }

            const dados = await this._extrairDadosDataJud(hits[0]._source);
            this._datajudCache.set(numLimpo, dados);
            console.log(`[DataJud] OK: ${numLimpo} — ${dados.classe} [${dados.status}]`);
            return dados;

        } catch (err) {
            console.error(`[DataJud] Erro ao consultar ${numLimpo}:`, err.message);
            return null;
        }
    },

    /**
     * Extrai e estrutura os dados relevantes de um _source do DataJud.
     */
    async _extrairDadosDataJud(source) {
        const poloAtivo = (source.partes || [])
            .filter(p => p.polo === 'ATIVO').map(p => p.nome).filter(Boolean);
        const poloPassivo = (source.partes || [])
            .filter(p => p.polo === 'PASSIVO').map(p => p.nome).filter(Boolean);
        const advogados = (source.partes || [])
            .flatMap(p => p.advogados || [])
            .map(a => ({ nome: a.nome, oab: a.codigoSistema || '' }));

        const movimentos = (source.movimentos || []).map(m => ({
            data: m.dataHora || m.data || '',
            nome: m.nome || m.descricao || '',
            codigoTPU: m.codigo || m.codigoNacional || null
        })).sort((a, b) => new Date(b.data) - new Date(a.data));

        const ultimoMovimento = movimentos[0] || null;

        // Verificar arquivamento via TPU
        let arquivado = false;
        if (ultimoMovimento?.codigoTPU) {
            arquivado = await this.verificarArquivamentoPorTPU(
                ultimoMovimento.codigoTPU, ultimoMovimento.nome
            );
        }

        // Bug Fix #2: Filtrar vinculados com número CNJ incompleto (<20 dígitos)
        const processosVinculados = (source.vinculadosProcessos || source.processosVinculados || [])
            .map(v => ({ numeroProcesso: v.numeroProcesso || v.numero || '', tipo: v.tipo || '' }))
            .filter(v => String(v.numeroProcesso).replace(/\D/g, '').length >= 20);

        return {
            numeroProcesso: source.numeroProcesso || '',
            classe: source.classe?.nome || source.classeProcessual || '',
            assunto: (source.assuntos || []).map(a => a.nome).filter(Boolean).join('; '),
            orgaoJulgador: source.orgaoJulgador?.nome || '',
            tribunalSigla: source.tribunal || source.siglaTribunal || '',
            grau: source.grau || '',
            ufOrigem: source.uf || '',
            dataAjuizamento: source.dataAjuizamento || '',
            dataUltimaAtualizacao: source.dataHoraUltimaAtualizacao || '',
            sistema: source.sistema?.nome || source.sistema || '',
            status: arquivado ? 'ARQUIVADO' : 'EM ANDAMENTO',
            arquivado,
            poloAtivo,
            poloPassivo,
            advogados,
            movimentos: movimentos.slice(0, 10),
            ultimoMovimento,
            vinculados: processosVinculados,
            nivelSigilo: source.nivelSigilo || 0
        };
    },

    /**
     * Verifica se um código TPU representa arquivamento/baixa/extinção.
     * Consulta o WebService SGT/CNJ com cache em memória.
     * Inspirado em: robson-nunes/Consultador-de-Processos-Datajud-CNJ
     */
    async verificarArquivamentoPorTPU(codigoTPU, nomeMovimentoLocal = '') {
        const codigo = parseInt(codigoTPU, 10);
        if (!codigo || isNaN(codigo)) return this._textoPareceArquivamento(nomeMovimentoLocal);

        // Códigos TPU conhecidos de arquivamento
        const CODIGOS_CONHECIDOS = new Set([246, 861, 22, 10963, 849, 233, 848]);
        if (CODIGOS_CONHECIDOS.has(codigo)) return true;

        if (this._tpuCache.has(codigo)) return this._tpuCache.get(codigo);

        try {
            const resp = await fetch(
                `https://sgt.cnj.jus.br/sgt-server-web/service/movimento/${codigo}`,
                { signal: AbortSignal.timeout(8000) }
            );
            if (resp.ok) {
                const dados = await resp.json();
                const nomeOficial = (dados?.nomeMovimentoNacional || dados?.nome || '').toLowerCase();
                const glossario = (dados?.glossario || '').toLowerCase();
                const ehArquivamento = this._textoPareceArquivamento(nomeOficial) ||
                                       this._textoPareceArquivamento(glossario);
                this._tpuCache.set(codigo, ehArquivamento);
                return ehArquivamento;
            }
        } catch (e) {
            console.debug(`[TPU] Timeout no código ${codigo}, usando fallback textual.`);
        }

        const resultado = this._textoPareceArquivamento(nomeMovimentoLocal);
        this._tpuCache.set(codigo, resultado);
        return resultado;
    },

    _textoPareceArquivamento(texto) {
        const t = String(texto || '').toLowerCase();
        return ['arquivad','arquivament','definitiv','baixa definitiv',
                'baixad','extincao','extinção','encerrad','encerramento']
            .some(termo => t.includes(termo));
    },

    /**
     * Helper para disparar IA multi-provedor (isolando da view).
     */
    async fetchAIPrompt(provider, apiKey, model, endpoint, prompt) {
        if (provider === 'chrome_ai') {
            if (!window.ai || !window.ai.languageModel) throw new Error("Chrome AI indisponível.");
            const session = await window.ai.languageModel.create({
                systemPrompt: "Você é um assistente jurídico experiente que resume publicações judiciais em português brasileiro. Seja muito curto e objetivo."
            });
            const result = await session.prompt(prompt);
            if (typeof session.destroy === 'function') session.destroy();
            return result;
        }

        let url = "";
        let headers = { 'Content-Type': 'application/json' };
        let body = {};

        if (provider === 'gemini') {
            const m = model || "gemini-1.5-flash";
            url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
            body = { contents: [{ parts: [{ text: prompt }] }] };
        } else if (provider === 'openai' || provider === 'custom') {
            url = endpoint || "https://api.openai.com/v1/chat/completions";
            if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
            body = { model: model || "gpt-4o-mini", messages: [{ role: "user", content: prompt }] };
        } else if (provider === 'ollama') {
            url = endpoint || "http://localhost:11434/v1/chat/completions";
            body = { model: model || "llama3", messages: [{ role: "user", content: prompt }] };
        }

        const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        const result = await response.json();

        if (provider === 'gemini') {
            return result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        } else {
            return result?.choices?.[0]?.message?.content?.trim() || "";
        }
    }
};

// Compatibilidade com código legado
globalThis.fetchComRetry = APIClient.fetchComRetry.bind(APIClient);
globalThis.APIClient = APIClient;
