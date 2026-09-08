// Motor de Busca e Filtros - Djen
const SearchEngine = (() => {
    // Variáveis locais de estado da busca
    let _resultadosBusca = [];
    let _resultadosExibidos = [];
    let _filtroRapido = "";
    let _filtroTribunal = "";
    let _filtroApenasLidos = false;
    let _filtroApenasNaoLidos = false;

    // Métodos utilitários que precisaremos expor para os outros módulos (ex: resetFilters)
    function render(items, term) {
        window.gerarBriefingDiario(items, window.palavrasUrgentes, window.cleanText);

        const res = document.getElementById('resultados');
        if (!res) return;
        res.replaceChildren();;

        const abl = document.getElementById('acoesBuscaLote');
        if (abl) abl.style.display = items.length ? 'flex' : 'none';

        if (!items.length) {
            res.replaceChildren();;
            res.appendChild(document.getElementById('tpl-empty-busca').content.cloneNode(true));
            return;
        }

        const fragment = document.createDocumentFragment();
        let totalRadarEncontrado = 0;

        const criarIntimacaoCard = window.UICards.criarIntimacaoCard;



        const gruposProcessos = {};
        items.forEach(i => {
            const txt = window.cleanText(i.texto || i.teor);
            const proc = window.formatCNJ(window.getProc(i, txt));
            if (!gruposProcessos[proc]) gruposProcessos[proc] = [];
            gruposProcessos[proc].push(i);
        });

        // Ordenar as publicações dentro de cada grupo da mais recente para a mais antiga
        Object.values(gruposProcessos).forEach(grupo => {
            grupo.sort((a, b) => new Date(b.data_disponibilizacao + 'T12:00:00') - new Date(a.data_disponibilizacao + 'T12:00:00'));
        });

        // Ordenar os grupos pela publicação mais recente de cada um
        const gruposOrdenados = Object.values(gruposProcessos).sort((a, b) => {
            return new Date(b[0].data_disponibilizacao + 'T12:00:00') - new Date(a[0].data_disponibilizacao + 'T12:00:00');
        });

        let cardIndexGlobal = 0;

        gruposOrdenados.forEach((grupo) => {
            const iPrincipal = grupo[0];
            const cardPrincipal = criarIntimacaoCard(iPrincipal, cardIndexGlobal++, term);

            if (grupo.length > 1) {
                cardPrincipal.classList.add('has-thread');
                
                const threadBtn = document.createElement('button');
                threadBtn.className = 'thread-toggle-pill';
                threadBtn.setAttribute('data-tooltip', 'Ver outras publicações deste processo');
                window.safeSetInnerHTML(threadBtn, `<span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-right:4px; vertical-align: middle;"><polyline points="6 9 12 15 18 9"></polyline></svg> Outras publicações (${grupo.length - 1})</span>`);;
                
                const threadContainer = document.createElement('div');
                threadContainer.className = 'thread-container';
                threadContainer.style.display = 'none';

                threadBtn.onclick = (e) => {
                    e.stopPropagation();
                    const isFechado = threadContainer.style.display === 'none';
                    threadContainer.style.display = isFechado ? 'block' : 'none';
                    threadBtn.classList.toggle('aberto', isFechado);
                    cardPrincipal.classList.toggle('thread-aberta', isFechado);
                };

                for (let k = 1; k < grupo.length; k++) {
                    const filhoCard = criarIntimacaoCard(grupo[k], cardIndexGlobal++, term);
                    filhoCard.classList.add('thread-filho');
                    threadContainer.appendChild(filhoCard);
                }

                cardPrincipal.appendChild(threadBtn);
                cardPrincipal.appendChild(threadContainer);
            }

            fragment.appendChild(cardPrincipal);
        });

        res.appendChild(fragment);
        if (totalRadarEncontrado > 0) {
            setTimeout(() => {
                window.showToast(`Radar detectou termos em ${totalRadarEncontrado} publicação(ões)!`, "🏷️");
            }, 500);
        }
    }


    function applyFilters() {
        const currentScroll = window.scrollY;

        const fR = document.getElementById('filtroRapido'); const term = fR ? fR.value.toLowerCase().trim() : "";
        const fT = document.getElementById('filtroTribunal'); const trib = fT ? fT.value : "";
        
        const removeAcentos = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
        const termos = removeAcentos(term).split(/\s+/);
        
        window.resultadosExibidos = window.resultadosGlobais.filter(i => { 
            const txt = window.cleanText(i.texto || i.teor); 
            const proc = String(window.getProc(i, txt)); 
            // Busca também no teor completo (#11)
            const searchableText = removeAcentos([txt, proc, i.siglaTribunal || "", i.textoCompleto || ""].join(" "));
            const matchTerm = term === "" || termos.every(t => searchableText.includes(t));
            const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, '');
            const matchNaoLidos = !window.filtroApenasNaoLidos || !window.publicacoesLidas.has(itemKey);
            return matchTerm && (trib === "" || i.siglaTribunal === trib) && matchNaoLidos;
        });
        const cr = document.getElementById('contadorResultados'); if (cr) cr.textContent = `${window.resultadosExibidos.length} resultados`; render(window.resultadosExibidos, term); window.updateProgressBar(); 

        if (currentScroll > 0) {
            window.scrollTo(0, currentScroll);
        }
    }


    const initSearch = () => {
        const btnBuscar = document.getElementById('btnBuscar');
        if (btnBuscar) {
                    btnBuscar.onclick = async () => {
            const dtIni = document.getElementById('dataInicio')?.value; const dtFim = document.getElementById('dataFim')?.value;
            if (!dtIni || !dtFim) { window.showToast("As datas inicial e final são obrigatórias para a busca.", "⚠️"); return; }

            let urlsToFetch = []; let oabContexts = []; let numProcesso = '';

            if (window.searchMode === 'oab') {
                const n = document.getElementById('oabNum')?.value.trim(); const u = document.getElementById('oabUf')?.value.trim().toUpperCase();
                if (!n || !u) { window.showToast("A busca por OAB requer o número e a UF.", "⚠️"); return; }
                window.multiOabSearch = n.includes(',');
                const oabs = n.split(/[\s,;-]+/).filter(Boolean);
                oabs.forEach(oab => {
                    urlsToFetch.push(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${oab}&ufOab=${u}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`);
                    oabContexts.push(oab);
                });
                const textoResumo = document.getElementById('textoResumoBusca'); if (textoResumo) textoResumo.textContent = `OAB ${n} ${u}`;
            } else {
                const rawProc = document.getElementById('procNumBusca')?.value.trim();
                const procApenasNumeros = window.normalizarNumeroCNJ(rawProc) || rawProc.replace(/\D/g, '');

                if (!procApenasNumeros || procApenasNumeros.length !== 20) { 
                    window.showToast("O formato exige o número completo do processo (20 dígitos).", "⚠️"); 
                    return; 
                }
                
                const procInputEl = document.getElementById('procNumBusca');
                if (procInputEl) procInputEl.value = window.formatCNJ(procApenasNumeros);
                
                window.multiOabSearch = false;

                // Envia apenas os números, pois a API do CNJ retorna erro 400 se enviar com pontos/traços
                urlsToFetch.push(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${procApenasNumeros}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`);
                oabContexts.push(null);

                const textoResumo = document.getElementById('textoResumoBusca');
                if (textoResumo) textoResumo.textContent = `Processo ${window.formatCNJ(procApenasNumeros)}`;
            }

            window.totalBuscas++; SafeStorage.set({ 'djen_total_buscas': window.totalBuscas });

            let oabUfVal = document.getElementById('oabUf')?.value.trim().toUpperCase() || "SP";
            let novoItem = window.searchMode === 'oab'
                ? { tipo: 'oab', valor: document.getElementById('oabNum').value.trim(), uf: oabUfVal }
                : { tipo: 'proc', valor: document.getElementById('procNumBusca').value.trim() };
            if (novoItem.valor) {
                window.historicoBuscas = window.historicoBuscas.filter(h => h.valor !== novoItem.valor);
                window.historicoBuscas.unshift(novoItem);
                if (window.historicoBuscas.length > 5) window.historicoBuscas.pop();
                SafeStorage.set({ 'djen_historico_buscas': JSON.stringify(window.historicoBuscas) });
                if (typeof window.renderHistoricoBuscas === 'function') window.renderHistoricoBuscas();
            }

            const formatBR = (iso) => iso.split('-').reverse().join('/'); let criterioTexto = `${formatBR(dtIni)} a ${formatBR(dtFim)}`;
            const objIni = new Date(dtIni + 'T12:00:00'); const objFim = new Date(dtFim + 'T12:00:00'); const diffDias = Math.round((objFim - objIni) / (1000 * 60 * 60 * 24));
            const dHoje = new Date(); const hojeStr = `${dHoje.getFullYear()}-${String(dHoje.getMonth() + 1).padStart(2, '0')}-${String(dHoje.getDate()).padStart(2, '0')}`;
            const dOntem = new Date(dHoje); dOntem.setDate(dOntem.getDate() - 1); const ontemStr = `${dOntem.getFullYear()}-${String(dOntem.getMonth() + 1).padStart(2, '0')}-${String(dOntem.getDate()).padStart(2, '0')}`;

            if (dtFim === hojeStr) { if (diffDias === 0) criterioTexto = "Hoje"; else if (diffDias === 1) criterioTexto = "Últimas 24h"; else if (diffDias === 7) criterioTexto = "Últimos 7 Dias"; else if (diffDias === 15) criterioTexto = "Últimos 15 Dias"; else if (diffDias === 30) criterioTexto = "Último Mês"; }
            else if (dtIni === dtFim && dtFim === ontemStr) { criterioTexto = "Ontem"; }

            const textoResumo = document.getElementById('textoResumoBusca'); if (textoResumo) textoResumo.textContent += ` | ${criterioTexto}`;
            const areaBusca = document.getElementById('areaBusca'); if (areaBusca) areaBusca.style.display = 'none';
            const rb = document.getElementById('resumoBusca'); if (rb) rb.style.display = 'flex';

            document.getElementById('btnBuscar').disabled = true; const sl = document.getElementById('skeletonLoader'); if (sl) sl.style.display = 'block';
            const welcome = document.getElementById('welcomeState'); if (welcome) welcome.style.display = 'none';
            const resEl = document.getElementById('resultados'); if (resEl) resEl.replaceChildren();; const cf = document.getElementById('containerFiltro'); if (cf) cf.style.display = 'none';

            let buscaSucesso = false;
            try {
                const arrays = [];
                for (let idx = 0; idx < urlsToFetch.length; idx++) {
                    const url = urlsToFetch[idx];
                    const d = await window.fetchComRetry(url, 3);
                    arrays.push((d.items || []).map(i => {
                        return {
                            id: i.id,
                            numeroProcesso: i.numeroProcesso || i.numero || i.processo || "",
                            data_disponibilizacao: i.data_disponibilizacao,
                            siglaTribunal: i.siglaTribunal,
                            texto: i.texto || i.teor || "",
                            oabBuscada: oabContexts[idx]
                        };
                    }));
                    if (idx < urlsToFetch.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                const mapIds = new Map();
                arrays.flat().forEach(item => {
                    if (!mapIds.has(item.id)) mapIds.set(item.id, item);
                    else { let ex = mapIds.get(item.id); if (ex.oabBuscada && item.oabBuscada && !ex.oabBuscada.includes(item.oabBuscada)) ex.oabBuscada += `, ${item.oabBuscada}`; }
                });
                window.resultadosGlobais = Array.from(mapIds.values());

                if (window.resultadosGlobais.length > 0) {
                    const resultadosParaSalvar = window.resultadosGlobais.length > 500 ? window.resultadosGlobais.slice(0, 500) : window.resultadosGlobais;
                    SafeStorage.set({ 'djen_last_search': JSON.stringify(resultadosParaSalvar) });
                }

                const tribs = [...new Set(window.resultadosGlobais.map(i => i.siglaTribunal))].sort();
                const f = document.getElementById('filtroTribunal'); if (f) { window.safeSetInnerHTML(f, '<option value="">Tribunal</option>');; tribs.forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t; f.appendChild(o); }); }
                if (cf) cf.style.display = 'flex';
                buscaSucesso = true;
            } catch (e) {
                console.error("DJEN - Erro de Rede:", e);
                if (resEl) {
                    resEl.replaceChildren();;
                    resEl.appendChild(document.getElementById('tpl-error-cnj').content.cloneNode(true));
                }
            } finally {
                document.getElementById('btnBuscar').disabled = false; if (sl) sl.style.display = 'none';
            }

            if (buscaSucesso) {
                try { applyFilters(); } catch (err) { console.error("DJEN - Erro ao desenhar os cards:", err); }
            }
        };

        }
    };

    return {
        initSearch,
        render,
        applyFilters,
        getResultadosBusca: () => _resultadosBusca,
        setResultadosBusca: (v) => _resultadosBusca = v,
        getResultadosExibidos: () => _resultadosExibidos,
        setResultadosExibidos: (v) => _resultadosExibidos = v
    };
})();

window.SearchEngine = SearchEngine;
