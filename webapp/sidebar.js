/**
 * Buscador DJEN v50.3
 * 
 */

// =========================================================
// ESTADO GLOBAL DA APLICAÇÃO (Cérebro do DJEN)
// =========================================================
const AppState = {
    dados: {
        publicacoes: [],      // Guarda todas as publicações originais lidas
        resultadosAtuais: []  // Guarda apenas as que estão na tela (após filtros)
    },
    filtros: {
        tribunal: '',         // Ex: 'TJSP', 'STJ'
        termoBusca: '',       // O que foi digitado na barra de pesquisa
        apenasUrgentes: false // Se o botão do radar está ativado
    },
    config: {
        // ATENÇÃO: emailAgenda é preenchido por carregarDicionariosDoStorage() via _appCache.
        // NÃO usar localStorage.getItem aqui — o IndexedDB ainda não foi lido neste ponto.
        emailAgenda: '',
        termosRadar: []       // Palavras-chave do radar salvas pelo usuário
    }
};

function safeJSONParse(str, fallback) {
    if (!str) return fallback;
    if (typeof str !== 'string') return str;
    try {
        return JSON.parse(str);
    } catch (e) {
        return fallback;
    }
}

// =========================================================
// APP CACHE — Cache centralizado em memória para leitura síncrona
// =========================================================
// Populado UMA VEZ do IndexedDB na inicialização (via carregarDicionariosDoStorage).
// Dicionários: getGlobal*() leem daqui — nunca do localStorage.
// Configs críticas: emailGcal, prazosArquivados — idem.
// Substitui getters diretos de localStorage para todos os dados persistentes críticos.
const _appCache = {
    // Dicionários de processos
    apelidos:    {},
    classes:     {},
    sistemas:    {},
    partes:      {},
    cnjTentados: {},
    // Dados críticos de usuário (migrados de localStorage)
    emailGcal:         '',
    prazosArquivados:  []
};

async function carregarDicionariosDoStorage() {
    try {
        const data = await StorageAdapter.getMultiFromStorage([
            'djen_dicionario_apelidos',
            'djen_dicionario_classes',
            'djen_dicionario_sistemas',
            'djen_dicionario_partes',
            'djen_cnj_tentados_persistent',
            'djen_email_gcal',
            'djen_prazos_arquivados'
        ]);
        _appCache.apelidos         = safeJSONParse(data['djen_dicionario_apelidos'], {});
        _appCache.classes          = safeJSONParse(data['djen_dicionario_classes'], {});
        _appCache.sistemas         = safeJSONParse(data['djen_dicionario_sistemas'], {});
        _appCache.partes           = safeJSONParse(data['djen_dicionario_partes'], {});
        _appCache.cnjTentados      = safeJSONParse(data['djen_cnj_tentados_persistent'], {});
        _appCache.emailGcal        = data['djen_email_gcal'] || '';
        _appCache.prazosArquivados = safeJSONParse(data['djen_prazos_arquivados'], []);
        // Sincroniza AppState após IndexedDB carregar (era inicializado como '' por design)
        AppState.config.emailAgenda = _appCache.emailGcal;
        console.log('DJEN: AppCache carregado do IndexedDB com sucesso.');
    } catch (e) {
        console.warn('DJEN: Falha ao carregar AppCache do IndexedDB — fallback emergencial para localStorage.', e);
        _appCache.apelidos         = safeJSONParse(localStorage.getItem('djen_dicionario_apelidos'), {});
        _appCache.classes          = safeJSONParse(localStorage.getItem('djen_dicionario_classes'), {});
        _appCache.sistemas         = safeJSONParse(localStorage.getItem('djen_dicionario_sistemas'), {});
        _appCache.partes           = safeJSONParse(localStorage.getItem('djen_dicionario_partes'), {});
        _appCache.cnjTentados      = safeJSONParse(localStorage.getItem('djen_cnj_tentados_persistent'), {});
        _appCache.emailGcal        = localStorage.getItem('djen_email_gcal') || '';
        _appCache.prazosArquivados = safeJSONParse(localStorage.getItem('prazosCumpridosArquivados'), []);
        AppState.config.emailAgenda = _appCache.emailGcal;
    }
}

try {
    let tema = localStorage.getItem('djen_theme') || 'auto';
    if (tema === 'escuro' || (tema === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('tema-escuro');
    }
    let fontFocus = localStorage.getItem('djen_font_focus');
    if (fontFocus) { document.documentElement.style.setProperty('--font-focus', fontFocus + 'px'); }
} catch (e) { }




// As funções de UI (safeSetInnerHTML) foram extraídas para js/ui_manager.js

document.addEventListener('DOMContentLoaded', async () => {
    // Bug Fix #2/#3: Carrega dicionários do IndexedDB antes de qualquer getter ser chamado
    await carregarDicionariosDoStorage();
    verificarLembreteBackup();
    verificarOnboardingGtasks();
    setTimeout(moverLinhaLiquida, 100);

    const tabBuscaBtn = document.getElementById('tabBusca');
    if (!tabBuscaBtn) return;

    const appTitleEl = document.getElementById('appTitleVersion');
    if (appTitleEl) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
            const manifestVersion = chrome.runtime.getManifest().version;
            appTitleEl.setAttribute('data-tooltip', 'v' + manifestVersion);
        }
    }

    let temaAtual = 'auto'; let fontSizeFocoAtual = 15;
    let iaProvider = 'gemini'; let iaApiKey = ''; let iaModel = 'gemini-3.6-flash'; let iaEndpoint = '';
    let configDataJudApiKey = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
    window.configJurisflowEnabled = false; window.configJurisflowPort = '18080'; window.configJurisflowToken = 'jf_djen_secret';
    let customSuspensions = []; let isNotificarBackground = false;
    
    
    
    
    
    let brandingNome = "";
    let brandingSlogan = "";
    let brandingContato = "";
    let brandingCor = "#2e2c2a";
    let brandingLogo = "";

    // Expor funções úteis imediatamente para componentes independentes (Calculadora)
    window.getProc = getProc;
    window.renderizarSecaoResumoIA = renderizarSecaoResumoIA;
    window.atualizarBadgesCard = atualizarBadgesCard;
    window.criarRadarNavigator = criarRadarNavigator;
    window.aplicarHighlighterRadar = aplicarHighlighterRadar;


    window.varrerTeorParaSugestao = varrerTeorParaSugestao;
    window.exportarIcsPrazo = exportarIcsPrazo;
    window.getHeaderHTML = getHeaderHTML;
    window.preencherAuditoriaVisual = preencherAuditoriaVisual;
    window.applyFilters = window.SearchEngine ? window.SearchEngine.applyFilters : null;
    window.inicializarNovosRecursosFoco = inicializarNovosRecursosFoco;
    window.abrirModalApelido = abrirModalApelido;
    window.exportarIcsTarefa = exportarIcsTarefa;
    window.renderTimeline = window.SearchEngine ? window.SearchEngine.renderTimeline : renderTimeline;
    window.obterRelacoesGlobaisProcesso = obterRelacoesGlobaisProcesso;

    window.salvarPublicacoesLidas = salvarPublicacoesLidas;


    window.adicionarEventoHistorico = adicionarEventoHistorico;
    window.adicionarRelacaoProcesso = adicionarRelacaoProcesso;
    window.carregarMunicipios = carregarMunicipios;
    window.cleanText = cleanText;
    window.formatCNJ = formatCNJ;
    window.getGlobalApelido = getGlobalApelido;
    window.getGlobalPartes = getGlobalPartes;
    window.parseDateBR = parseDateBR;
    window.renderAgenda = renderAgenda;
    window.buscarFeriadosMunicipaisAnual = buscarFeriadosMunicipaisAnual;
    window.buscarFeriadosTribunal = buscarFeriadosTribunal;
    window.atualizarEstatisticas = atualizarEstatisticas;
    window.updateProgressBar = updateProgressBar;
    window.setGlobalApelido = setGlobalApelido;
    window.showToast = showToast;
    window.atualizarBadgeIcone = atualizarBadgeIcone;

    window.focarCardProcesso = (key, preferBusca = false, fromHistoryStack = false, openTimeline = false) => {
        if (!fromHistoryStack) {
            const openCard = document.querySelector('.intimacao-card.aberto');
            if (openCard && openCard.getAttribute('data-key') !== key) {
                const viewBusca = document.getElementById('viewBusca');
                const abaAtiva = (viewBusca && viewBusca.style.display !== 'none') ? 'busca' : 'salvos';
                window.historicoNavegacaoStack = window.historicoNavegacaoStack || [];
                window.historicoNavegacaoStack.push({
                    key: openCard.getAttribute('data-key'),
                    filtro: window.obterFiltroAtual ? window.obterFiltroAtual() : null,
                    aba: abaAtiva
                });
            }
        }

        const applyFocus = (c) => {
            if (!c) return;
            c.classList.remove('so-historico');
            const tw = c.querySelector('.timeline-wrapper');
            const bh = c.querySelector('.btn-historico-header');
            
            if (!openTimeline) {
                if (tw) tw.style.display = 'none';
                if (bh) bh.classList.remove('active');
            }

            if (!fromHistoryStack) {
                if (!c.classList.contains('aberto')) {
                    c.querySelector('.card-click-area')?.click();
                }
            } else {
                if (c.classList.contains('aberto')) {
                    c.querySelector('.card-click-area')?.click();
                }
            }

            if (openTimeline && bh) {
                if (!tw || tw.style.display !== 'block') {
                    setTimeout(() => {
                        bh.click();
                    }, 250);
                }
            }

            c.scrollIntoView({ behavior: 'smooth', block: 'center' });
            c.style.outline = "2px dashed var(--zen-blue)";
            c.style.outlineOffset = "2px";
            setTimeout(() => { c.style.outline = "none"; }, 2000);
        };

        // Busca genérica de card por key ou CNJ em qualquer container
        const findCardIn = (containerSelector) => {
            let el = document.querySelector(`${containerSelector} .intimacao-card[data-key="${key}"]`);
            if (!el) {
                const targetProcesso = prazosSalvos[key]?.processo;
                if (targetProcesso) {
                    const cleanTarget = targetProcesso.replace(/\D/g, '');
                    const allCards = document.querySelectorAll(`${containerSelector} .intimacao-card`);
                    for (let c of allCards) {
                        const procAttr = c.getAttribute('data-proc') || '';
                        if (procAttr.replace(/\D/g, '') === cleanTarget) {
                            el = c;
                            break;
                        }
                    }
                }
            }
            return el;
        };

        const switchTab = (tabId) => {
            const btn = document.getElementById(tabId);
            if (btn && !btn.classList.contains('active')) btn.click();
        };

        // ETAPA 1: Procurar card em AMBAS as abas do DOM atual
        let card = findCardIn('#viewSalvos');
        if (card) {
            switchTab('tabSalvos');
            applyFocus(card);
            return;
        }
        card = findCardIn('#viewBusca');
        if (card) {
            switchTab('tabBusca');
            applyFocus(card);
            return;
        }

        // ETAPA 2: Se o processo está salvo, ir para Salvos, limpar filtros, re-render
        const itemSalvo = prazosSalvos[key];
        if (itemSalvo) {
            switchTab('tabSalvos');
            if (typeof window.garantirCardVisivel === 'function') {
                window.garantirCardVisivel(key);
            }
            // Dar tempo ao re-render
            setTimeout(() => {
                card = findCardIn('#viewSalvos');
                if (card) {
                    applyFocus(card);
                } else {
                    // Fallback para API caso dê algo incrivelmente errado e não renderize
                    fazerBuscaFallback(key);
                }
            }, 300);
            return;
        }

        fazerBuscaFallback(key);

        function fazerBuscaFallback(k) {
            const target = prazosSalvos[k]?.processo;
            if (!target) {
                if (typeof showToast === 'function') showToast("Não foi possível navegar para este processo.", "⚠️");
                return;
            }

            switchTab('tabBusca');

            const itemLocal = prazosSalvos[k];
            if (itemLocal) {
                const resEl = document.getElementById('resultados');
                if (resEl) {
                    const welcome = document.getElementById('welcomeState');
                    const areaBusca = document.getElementById('areaBusca');
                    const rb = document.getElementById('resumoBusca');
                    const sl = document.getElementById('skeletonLoader');
                    const textoResumo = document.getElementById('textoResumoBusca');
                    
                    if (welcome) welcome.style.display = 'none';
                    if (areaBusca) areaBusca.style.display = 'none';
                    if (sl) sl.style.display = 'none';
                    if (rb) rb.style.display = 'flex';
                    if (textoResumo) textoResumo.textContent = `Processo ${formatCNJ(target)} (Consulta Local)`;
                    
                    resEl.replaceChildren();
                    if (typeof appendCardsToList === 'function') {
                        appendCardsToList([k], resEl, k, "Nenhum resultado");
                        setTimeout(() => {
                            let cardFallback = findCardIn('#viewBusca');
                            if (cardFallback) {
                                applyFocus(cardFallback);
                            }
                        }, 100);
                        return;
                    }
                }
            }

            // Fallback para API real caso a renderização local falhe
            const btnProc = document.getElementById('btnSearchTypeProc');
            const procInput = document.getElementById('procNumBusca');
            const btnBuscar = document.getElementById('btnBuscar');
            
            if (btnProc && procInput && btnBuscar) {
                btnProc.click();
                procInput.value = target;
                
                const dtIni = document.getElementById('dataInicio');
                const dtFim = document.getElementById('dataFim');
                if (dtIni && !dtIni.value) {
                    const d = new Date(); d.setFullYear(d.getFullYear() - 2);
                    dtIni.value = d.toISOString().split('T')[0];
                }
                if (dtFim && !dtFim.value) {
                    dtFim.value = new Date().toISOString().split('T')[0];
                }
                
                setTimeout(() => {
                    btnBuscar.click();
                    
                    if (typeof showToast === 'function') showToast("Buscando intimações do processo relacionado...", "🔍");
                    
                    let attempts = 0;
                    const maxAttempts = 20;
                    const pollInterval = setInterval(() => {
                        let cardFallback = findCardIn('#viewBusca');
                        if (cardFallback) {
                            clearInterval(pollInterval);
                            applyFocus(cardFallback);
                        } else {
                            attempts++;
                            if (attempts >= maxAttempts) {
                                clearInterval(pollInterval);
                                if (typeof showToast === 'function') showToast("Processo não encontrado no DJEN.", "⚠️");
                            }
                        }
                    }, 500);
                }, 100);
            }
        }
    };

    // Navega diretamente para a aba Controle, abrindo o processo correspondente
    window.irParaControle = (processoNum) => {
        if (!processoNum) return;
        const procNorm = String(processoNum).replace(/\D/g, '');
        if (!procNorm) return;

        // Encontra a key em prazosSalvos que corresponde ao número do processo
        let targetKey = null;
        for (let k in prazosSalvos) {
            const sp = prazosSalvos[k];
            if (sp && sp.processo && String(sp.processo).replace(/\D/g, '') === procNorm) {
                targetKey = k;
                break;
            }
        }

        if (!targetKey) {
            if (typeof showToast === 'function') showToast('Processo não está cadastrado no Controle.', '⚠️');
            return;
        }

        // Define o processo ativo ANTES de mudar de aba
        // Usamos window.mudarParaAba (alias de switchView) diretamente para não passar pelo
        // onclick da aba que faz processoControleAtivo = null
        window.processoControleAtivo = targetKey;

        // Atualiza visual das abas manualmente
        const tabControle = document.getElementById('tabControle');
        document.querySelectorAll('.view-switcher button[role="tab"]').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        if (tabControle) {
            tabControle.classList.add('active');
            tabControle.setAttribute('aria-selected', 'true');
        }

        // mudarParaAba chama switchView que chama renderControle() com processoControleAtivo já setado
        if (typeof window.mudarParaAba === 'function') {
            window.mudarParaAba('controle');
        } else {
            if (typeof renderControle === 'function') renderControle();
        }
        if (typeof moverLinhaLiquida === 'function') moverLinhaLiquida();

    };
    
    window.obterFiltroAtual = () => {
        return filtroAgendaAtivo;
    };
    
    window.restaurarFiltroStack = (filtro) => {
        if (filtroAgendaAtivo !== filtro) {
            filtroAgendaAtivo = filtro;
            document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
            if (filtro) {
                const btnClass = filtro === '5dias' ? 'stat-dias' : 
                                 filtro === 'futuros' ? 'stat-pendentes' : 
                                 `stat-${filtro}`;
                const btn = document.querySelector(`.${btnClass}`);
                if (btn) btn.classList.add('active');
            }
            if (typeof renderAgenda === 'function') renderAgenda();
        }
    };

    window.garantirCardVisivel = (key) => {
        if (!prazosSalvos[key]) return;
        let reRender = false;
        const searchInput = document.getElementById('filtroPrazos');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            reRender = true;
        }
        if (prazosSalvos[key].cumprido) {
            if (filtroAgendaAtivo !== 'cumpridos') {
                filtroAgendaAtivo = 'cumpridos';
                document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
                const btn = document.querySelector('.stat-cumpridos');
                if (btn) btn.classList.add('active');
                reRender = true;
            }
        } else {
            // Se houver qualquer filtro ativo (ex: cumpridos, 5dias ou futuros), limpamos para que o card desejado fique visível
            if (filtroAgendaAtivo !== null) {
                filtroAgendaAtivo = null;
                document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
                reRender = true;
            }
        }
        if (reRender && typeof renderAgenda === 'function') {
            renderAgenda();
        }
    };

    // window.historicoBuscas em state_manager
    // multiOabSearch agora em state_manager.js
    let chartStatusInst = null; let chartTribunaisInst = null;

    function salvarPublicacoesLidas() {
        const arr = Array.from(publicacoesLidas);
        if (arr.length > 2000) window.publicacoesLidas = new Set(arr.slice(-2000));
        SafeStorage.set({ 'djen_publicacoes_lidas': JSON.stringify(Array.from(publicacoesLidas)) });
    }

    // searchMode agora em state_manager.js


    let filtroAgendaAtivo = null;

    window.totalCumpridosHistorico = 0; /* totalBuscas em state */ window.totalLidos = 0; window.totalSalvos = 0;

    window.textoParaCompartilhar = "";
    window.tituloParaCompartilhar = "";
    window.itensParaCompartilhar = [];

    const iconesSVG = {
        calendario: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>`,
        copiar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
        check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        remover: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        foco: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
        retro: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="2" x2="14" y2="2"></line><line x1="12" y1="14" x2="15" y2="11"></line><circle cx="12" cy="14" r="8"></circle></svg>`,
        maisOpcoes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>`,
        lapis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
        eyeOff: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`,
        sirene: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--zen-red); filter: drop-shadow(0 2px 4px var(--zen-red-bg)); vertical-align: middle;"><path d="M12 2v3M4.93 4.93l2.12 2.12M19.07 4.93l-2.12 2.12"></path><path d="M12 8a6 6 0 0 0-6 6v6h12v-6a6 6 0 0 0-6-6z"></path><path d="M2 20h20"></path></svg>`,
        boxEmpty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 56px; height: 56px; color: var(--border-light); margin-bottom: 16px;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
        tag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
        share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
        whatsapp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.446-.272.371-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`
    };
    window.iconesSVG = iconesSVG;
    window.cleanText = cleanText;
    window.getProc = getProc;
    window.showToast = showToast;
    window.fetchComRetry = fetchComRetry;
    window.normalizarNumeroCNJ = normalizarNumeroCNJ;
    window.formatCNJ = formatCNJ;
    window.updateProgressBar = updateProgressBar;
    window.renderHistoricoBuscas = renderHistoricoBuscas;
    window.gerarBriefingDiario = gerarBriefingDiario;


    const pixCodeText = "50f781e2-9d94-4624-8f08-a9938bb0c4dc";
    window.palavrasUrgentes = ["penhora", "bloqueio", "revelia", "liminar", "audiência", "audiencia"];

    // IndexedDB (Offline, Sem Limite de Cota, Privacy First)

    // Implementação interna: persiste imediatamente (usada pelo debounce abaixo)
    // Estado global movido para js/state_manager.js

    function atualizarBadgeIcone(prazos) {
        const extAPI = typeof browser !== 'undefined' ? browser : chrome;
        if (!extAPI || !extAPI.action || !extAPI.action.setBadgeText) return;
        
        let vencendoHoje = 0;
        let atrasados = 0;
        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        for (const key in prazos) {
            const prazo = prazos[key];
            if (!prazo || prazo.cumprido || prazo.espera) continue;
            
            if (prazo.fatal) {
                const parts = prazo.fatal.split('/');
                if (parts.length === 3) {
                    const prazoData = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                    if (prazoData.getTime() === hoje.getTime()) vencendoHoje++;
                    else if (prazoData.getTime() < hoje.getTime()) atrasados++;
                }
            }
        }

        const totalAlertas = vencendoHoje + atrasados;
        if (totalAlertas > 0) {
            extAPI.action.setBadgeText({ text: String(totalAlertas) });
            extAPI.action.setBadgeBackgroundColor({ color: '#D44C47' }); // Vermelho
        } else {
            extAPI.action.setBadgeText({ text: '' });
        }
    }

    function adicionarEventoHistorico(key, tipo, descricao) {
        if (!prazosSalvos[key]) return;
        prazosSalvos[key].data_modificacao = new Date().toISOString();
        if (!prazosSalvos[key].historicoAcoes) {
            prazosSalvos[key].historicoAcoes = [];
            // Adiciona evento retroativo de criação
            const dataOrigem = prazosSalvos[key].data_disponibilizacao || new Date().toISOString();
            prazosSalvos[key].historicoAcoes.push({ data: dataOrigem, tipo: 'criacao', descricao: 'Processo adicionado ao Controle' });
        }
        
        // Evita flood de anotações consecutivas da mesma hora
        if (tipo === 'nota' && prazosSalvos[key].historicoAcoes.length > 0) {
            const ultimo = prazosSalvos[key].historicoAcoes[0];
            if (ultimo.tipo === 'nota' && (new Date() - new Date(ultimo.data)) < 60000) {
                return; // Atualizado no último minuto, não cria novo log
            }
        }
        
        prazosSalvos[key].historicoAcoes.unshift({
            data: new Date().toISOString(),
            tipo: tipo,
            descricao: descricao
        });
        savePrazosSalvos();
    }

    function adicionarRelacaoProcesso(keyPrincipal, numRelacionado, tipo, subTipo, espelhar) {
        if (!prazosSalvos[keyPrincipal]) return null;
        
        const numRelFormatado = formatCNJ(numRelacionado);
        if (!numRelFormatado) return null;
        
        const normalizedRel = String(numRelacionado).replace(/\D/g, '');
        const normalizedPrincipal = String(prazosSalvos[keyPrincipal].processo).replace(/\D/g, '');
        
        // Bug Fix v50.71: Rejeitar vínculos automáticos com números CNJ incompletos (<20 dígitos)
        // Número CNJ completo tem exatamente 20 dígitos. Vínculos manuais (pelo botão) não têm
        // essa restrição — apenas vínculos originados de APIs/auto-detecção.
        const isAutoVinculo = subTipo && (subTipo.includes('Auto') || subTipo.includes('DataJud') || subTipo.includes('CNJ'));
        if (isAutoVinculo && normalizedRel.length < 20) {
            console.warn(`DJEN: Vínculo automático rejeitado para número incompleto: "${numRelacionado}" (${normalizedRel.length} dígitos)`);
            return null;
        }
        
        if (!prazosSalvos[keyPrincipal].relacoes) {
            prazosSalvos[keyPrincipal].relacoes = [];
        }
        
        // Evita duplicados
        const existe = prazosSalvos[keyPrincipal].relacoes.find(r => String(r.processo).replace(/\D/g, '') === normalizedRel);
        if (existe) {
            existe.tipo = tipo;
            existe.subTipo = subTipo;
            existe.espelhar = espelhar;
        } else {
            const relId = 'rel_' + Math.random().toString(36).substring(2, 9);
            prazosSalvos[keyPrincipal].relacoes.push({
                id: relId,
                processo: numRelFormatado,
                tipo: tipo,
                subTipo: subTipo,
                espelhar: espelhar
            });
        }
        
        // Registrar acao no historico
        adicionarEventoHistorico(keyPrincipal, 'vinculo', `Vínculo criado com Processo ${numRelFormatado} [${subTipo || tipo}]`);
        
        // Bug Fix v50.71: matching por número completo (>=20 dígitos) para evitar falsos positivos.
        // A busca bilateral também exige 20 dígitos.
        let keyRelacionada = normalizedRel.length >= 20
            ? Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedRel)
            : null;
        if (!keyRelacionada) {
            // Se não existe, cria um shell processo para manter a conexão bilateral!
            const newKey = 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            prazosSalvos[newKey] = {
                processo: numRelFormatado,
                apelido: `Caso Relacionado (${numRelFormatado})`,
                manual: true,
                cumprido: false,
                espera: false,
                relacoes: [],
                historicoAcoes: [{ data: new Date().toISOString(), tipo: 'criacao', descricao: `Criado automaticamente via vínculo bilateral com o Processo ${formatCNJ(prazosSalvos[keyPrincipal].processo)}` }]
            };
            keyRelacionada = newKey;
        }
        
        if (keyRelacionada && keyRelacionada !== keyPrincipal) {
            if (!prazosSalvos[keyRelacionada].relacoes) {
                prazosSalvos[keyRelacionada].relacoes = [];
            }
            const existeInversa = prazosSalvos[keyRelacionada].relacoes.find(r => String(r.processo).replace(/\D/g, '') === normalizedPrincipal);
            if (existeInversa) {
                existeInversa.tipo = tipo;
                existeInversa.subTipo = subTipo;
                existeInversa.espelhar = espelhar;
            } else {
                const relIdInversa = 'rel_' + Math.random().toString(36).substring(2, 9);
                prazosSalvos[keyRelacionada].relacoes.push({
                    id: relIdInversa,
                    processo: formatCNJ(prazosSalvos[keyPrincipal].processo),
                    tipo: tipo,
                    subTipo: subTipo,
                    espelhar: espelhar
                });
            }
            adicionarEventoHistorico(keyRelacionada, 'vinculo', `Vínculo criado com Processo ${formatCNJ(prazosSalvos[keyPrincipal].processo)} [${subTipo || tipo}]`);
        }
        
        savePrazosSalvos();
        return true;
    }

    function removerRelacaoProcesso(keyPrincipal, idRelacao) {
        let removido = false;
        const procPrincipal = prazosSalvos[keyPrincipal]?.processo;
        if (!procPrincipal) return false;
        const normalizedPrincipal = String(procPrincipal).replace(/\D/g, '');
        
        // 1. Remover do principal se existir
        if (prazosSalvos[keyPrincipal] && prazosSalvos[keyPrincipal].relacoes) {
            let idx = prazosSalvos[keyPrincipal].relacoes.findIndex(r => r.id === idRelacao);
            if (idx === -1 && idRelacao) {
                idx = prazosSalvos[keyPrincipal].relacoes.findIndex(r => {
                    return r.id === idRelacao || formatCNJ(r.processo) === formatCNJ(idRelacao) || String(r.processo).replace(/\D/g, '') === String(idRelacao).replace(/\D/g, '');
                });
            }
            if (idx !== -1) {
                const rel = prazosSalvos[keyPrincipal].relacoes[idx];
                const numRelFormatado = formatCNJ(rel.processo);
                const normalizedRel = String(rel.processo).replace(/\D/g, '');
                prazosSalvos[keyPrincipal].relacoes.splice(idx, 1);
                adicionarEventoHistorico(keyPrincipal, 'vinculo', `Vínculo removido com Processo ${numRelFormatado}`);
                removido = true;
                
                // Procurar se tem inversa e remover tambem
                const keyRelacionada = Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedRel);
                if (keyRelacionada && prazosSalvos[keyRelacionada].relacoes) {
                    const idxInversa = prazosSalvos[keyRelacionada].relacoes.findIndex(r => {
                        return String(r.processo).replace(/\D/g, '') === normalizedPrincipal;
                    });
                    if (idxInversa !== -1) {
                        prazosSalvos[keyRelacionada].relacoes.splice(idxInversa, 1);
                        adicionarEventoHistorico(keyRelacionada, 'vinculo', `Vínculo removido com Processo ${formatCNJ(procPrincipal)}`);
                    }
                }
            }
        }
        
        // 2. Se nao foi removido, fazer uma busca global por idRelacao
        if (!removido && idRelacao) {
            for (let k in prazosSalvos) {
                if (prazosSalvos[k] && prazosSalvos[k].relacoes) {
                    const idx = prazosSalvos[k].relacoes.findIndex(r => 
                        r.id === idRelacao || 
                        formatCNJ(r.processo) === formatCNJ(idRelacao) || 
                        String(r.processo).replace(/\D/g, '') === String(idRelacao).replace(/\D/g, '')
                    );
                    if (idx !== -1) {
                        const rel = prazosSalvos[k].relacoes[idx];
                        if (String(rel.processo).replace(/\D/g, '') === normalizedPrincipal) {
                            prazosSalvos[k].relacoes.splice(idx, 1);
                            adicionarEventoHistorico(k, 'vinculo', `Vínculo removido com Processo ${formatCNJ(procPrincipal)}`);
                            removido = true;
                        }
                    }
                }
            }
        }
        
        if (removido) {
            savePrazosSalvos();
            return true;
        }
        return false;
    }

    function atualizarEspelhamentoRelacao(keyPrincipal, idRelacao, novoEspelhar) {
        const procPrincipal = prazosSalvos[keyPrincipal]?.processo;
        if (!procPrincipal) return false;
        const normalizedPrincipal = String(procPrincipal).replace(/\D/g, '');
        let atualizado = false;
        
        // 1. Atualizar no principal se existir
        if (prazosSalvos[keyPrincipal] && prazosSalvos[keyPrincipal].relacoes) {
            let rel = prazosSalvos[keyPrincipal].relacoes.find(r => r.id === idRelacao);
            if (!rel && idRelacao) {
                rel = prazosSalvos[keyPrincipal].relacoes.find(r =>
                    formatCNJ(r.processo) === formatCNJ(idRelacao) || String(r.processo).replace(/\D/g, '') === String(idRelacao).replace(/\D/g, '')
                );
            }
            if (rel) {
                rel.espelhar = novoEspelhar;
                adicionarEventoHistorico(keyPrincipal, 'vinculo', `Espelhamento do Processo ${rel.processo} ${novoEspelhar ? 'ativado' : 'desativado'}`);
                atualizado = true;
                
                const normalizedRel = String(rel.processo).replace(/\D/g, '');
                const keyRelacionada = Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedRel);
                if (keyRelacionada && prazosSalvos[keyRelacionada].relacoes) {
                    const relInversa = prazosSalvos[keyRelacionada].relacoes.find(r => String(r.processo).replace(/\D/g, '') === normalizedPrincipal);
                    if (relInversa) {
                        relInversa.espelhar = novoEspelhar;
                        adicionarEventoHistorico(keyRelacionada, 'vinculo', `Espelhamento do Processo ${formatCNJ(procPrincipal)} ${novoEspelhar ? 'ativado' : 'desativado'}`);
                    }
                }
            }
        }
        
        // 2. Se nao encontrou no principal, procurar globalmente pela relacao que aponta para o principal
        if (!atualizado && idRelacao) {
            for (let k in prazosSalvos) {
                if (prazosSalvos[k] && prazosSalvos[k].relacoes) {
                    const rel = prazosSalvos[k].relacoes.find(r => 
                        r.id === idRelacao || 
                        formatCNJ(r.processo) === formatCNJ(idRelacao) || 
                        String(r.processo).replace(/\D/g, '') === String(idRelacao).replace(/\D/g, '')
                    );
                    if (rel && String(rel.processo).replace(/\D/g, '') === normalizedPrincipal) {
                        rel.espelhar = novoEspelhar;
                        adicionarEventoHistorico(k, 'vinculo', `Espelhamento do Processo ${formatCNJ(procPrincipal)} ${novoEspelhar ? 'ativado' : 'desativado'}`);
                        atualizado = true;
                    }
                }
            }
        }
        
        if (atualizado) {
            savePrazosSalvos();
            return true;
        }
        return false;
    }

    function aplicarTema(tema) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const btnText = document.getElementById('themeBtnText');
        const root = document.documentElement;

        if (tema === 'escuro' || tema === 'dark' || (tema === 'auto' && isSystemDark)) {
            root.setAttribute('data-theme', 'dark');
            root.classList.add('tema-escuro');
        } else {
            root.removeAttribute('data-theme');
            root.classList.remove('tema-escuro');
        }

        if (btnText) {
            // Se estiver no escuro, sugere mudar para claro. Se estiver no claro, sugere escuro.
            if (root.getAttribute('data-theme') === 'dark') {
                btnText.textContent = "Mudar para Modo Claro";
            } else {
                btnText.textContent = "Mudar para Modo Escuro";
            }
        }
        if (typeof atualizarRelatorioProdutividade === 'function') {
            setTimeout(atualizarRelatorioProdutividade, 50);
        }
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (temaAtual === 'auto') aplicarTema('auto'); });

    function atualizarTamanhoFonteFoco(mudanca) {
        fontSizeFocoAtual += mudanca; if (fontSizeFocoAtual < 12) fontSizeFocoAtual = 12; if (fontSizeFocoAtual > 26) fontSizeFocoAtual = 26;
        document.documentElement.style.setProperty('--font-focus', fontSizeFocoAtual + 'px'); SafeStorage.set({ 'djen_font_focus': fontSizeFocoAtual });
    }

    function fecharModoFoco() {
        const overlay = document.getElementById('focusModeOverlay');
        if (overlay && overlay.classList.contains('show')) {
            overlay.style.animation = 'focusExit 0.3s ease forwards';
            setTimeout(() => {
                overlay.classList.remove('show');
                overlay.style.animation = '';
            }, 300);
        }
    }

    function showToast(mensagem, icone = "✅") {
        const toast = document.getElementById('toastGenerico');
        if (toast) {
            document.getElementById('toastIcone').textContent = icone; document.getElementById('toastMensagem').textContent = mensagem;
            toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }

    // Bug Fix #5: Modal de confirmação customizado
    // Substitui confirm() nativo, que não funciona em Side Panel MV3 Chrome (retorna false silenciosamente).
    function confirmarAcaoDJEN(mensagem, onConfirm, titulo = 'Confirmar Ação') {
        let modal = document.getElementById('djenConfirmModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'djenConfirmModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-box" style="max-width:380px;">
                    <div class="modal-header" style="margin-bottom:12px;">
                        <h3 id="djenConfirmTitle" style="margin:0;font-size:15px;font-weight:600;"></h3>
                    </div>
                    <div class="modal-body">
                        <p id="djenConfirmMsg" style="margin:0;font-size:13px;line-height:1.6;color:var(--text-muted);"></p>
                    </div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:16px;">
                        <button id="djenConfirmCancel" style="padding:7px 16px;border-radius:8px;border:1px solid var(--border-light);background:var(--bg-hover);color:var(--text-main);cursor:pointer;font-size:13px;">Cancelar</button>
                        <button id="djenConfirmOk" style="padding:7px 16px;border-radius:8px;border:none;background:var(--zen-red,#d44c47);color:#fff;cursor:pointer;font-size:13px;font-weight:600;">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('djenConfirmCancel').onclick = () => modal.classList.remove('show');
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
        }
        document.getElementById('djenConfirmTitle').textContent = titulo;
        document.getElementById('djenConfirmMsg').textContent = mensagem;
        const btnOk = document.getElementById('djenConfirmOk');
        // Clonar remove listeners anteriores (evita empilhamento de callbacks)
        const newBtn = btnOk.cloneNode(true);
        btnOk.replaceWith(newBtn);
        newBtn.onclick = () => { modal.classList.remove('show'); onConfirm(); };
        modal.classList.add('show');
    }
    function openSafeLink(url) { if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) { chrome.tabs.create({ url: url }); } else { window.open(url, '_blank'); } }

    function openWhatsAppWeb(text) {
        const waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
            chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, function(tabs) {
                if (tabs && tabs.length > 0) {
                    chrome.tabs.update(tabs[0].id, { url: waUrl, active: true });
                    if (chrome.windows) chrome.windows.update(tabs[0].windowId, { focused: true });
                } else {
                    chrome.tabs.create({ url: waUrl });
                }
            });
        } else {
            window.open(waUrl, '_blank');
        }
    }

    function atualizarRelatorioProdutividade() {
        const elTempoGasto = document.getElementById('modalTempoGasto');
        const elStatLidos = document.getElementById('statLidos');
        const elStatCumpridos = document.getElementById('statCumpridos');

        if (elStatLidos) elStatLidos.textContent = window.totalLidos;
        if (elStatCumpridos) elStatCumpridos.textContent = window.totalCumpridosHistorico;

        const minutosTotais = (totalBuscas * 5) + (window.totalLidos * 3) + (window.totalSalvos * 15);
        const horas = Math.floor(minutosTotais / 60);
        const mins = minutosTotais % 60;
        if (elTempoGasto) {
            if (horas > 0) elTempoGasto.textContent = `${horas}h ${mins}m`;
            else elTempoGasto.textContent = `${mins}m`;
        }

        let somaDias = 0;
        let qtdMembros = 0;

        const todosItens = Object.values(prazosSalvos);

        todosItens.forEach(p => {
            if (p.cumprido && p.dataCumprimento) {
                let baseStr = p.disp;
                if (!baseStr && p.pubOrig) {
                    const parts = p.pubOrig.split('/');
                    if (parts.length === 3) baseStr = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`;
                }
                if (!baseStr) baseStr = p.inicio;
                
                if (baseStr) {
                    const dtBase = new Date(baseStr);
                    const dtCump = new Date(p.dataCumprimento);
                    if (!isNaN(dtBase) && !isNaN(dtCump)) {
                        let diffDias = Math.floor((dtCump.getTime() - dtBase.getTime()) / (1000 * 3600 * 24));
                        if (diffDias < 0) diffDias = 0;
                        if (diffDias < 365) {
                            somaDias += diffDias;
                            qtdMembros++;
                        }
                    }
                }
            }
        });

        const elVelocidadeMedia = document.getElementById('modalVelocidadeMedia');
        if (elVelocidadeMedia) {
            if (qtdMembros > 0) {
                const media = Math.round(somaDias / qtdMembros);
                elVelocidadeMedia.textContent = `${media} dia${media !== 1 ? 's' : ''}`;
            } else {
                elVelocidadeMedia.textContent = `--`;
            }
        }

        // --- Renderização dos Gráficos (Chart.js) ---
        if (typeof Chart === 'undefined') return;
        
        // 1. Dados para o Gráfico de Status
        let countCumprido = 0;
        let countAtrasado = 0;
        let countPendente = 0;
        let countSemPrazo = 0;

        const hjTime = new Date().setHours(12, 0, 0, 0);

        todosItens.forEach(p => {
            if (p.cumprido) {
                countCumprido++;
            } else if (!p.fatal) {
                countSemPrazo++;
            } else {
                const dataFatal = parseDateBR(p.fatal);
                const diff = Math.ceil((dataFatal.getTime() - hjTime) / (1000 * 3600 * 24));
                if (diff < 0) countAtrasado++;
                else countPendente++;
            }
        });

        const ctxStatus = document.getElementById('chartStatus');
        if (ctxStatus) {
            const styles = getComputedStyle(document.documentElement);
            const colorGreen = styles.getPropertyValue('--zen-green').trim() || '#0d826e';
            const colorOrange = styles.getPropertyValue('--zen-orange').trim() || '#e8a55a';
            const colorRed = styles.getPropertyValue('--zen-red').trim() || '#d44c47';
            const colorGray = styles.getPropertyValue('--text-placeholder').trim() || '#e6dfd8';
            const colorText = styles.getPropertyValue('--text-main').trim() || '#1c1e21';

            if (chartStatusInst) chartStatusInst.destroy();
            chartStatusInst = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Cumpridos', 'Pendentes', 'Atrasados', 'Sem Prazo'],
                    datasets: [{
                        data: [countCumprido, countPendente, countAtrasado, countSemPrazo],
                        backgroundColor: [colorGreen, colorOrange, colorRed, colorGray],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'right', 
                            labels: { 
                                color: colorText,
                                font: { size: 11, family: "'Inter', -apple-system, sans-serif" } 
                            } 
                        }
                    },
                    cutout: '70%'
                }
            });
        }

        // 2. Dados para o Gráfico de Tribunais
        const tribCounts = {};
        todosItens.forEach(p => {
            let t = p.siglaTribunal;
            if (!t && p.processo) {
                const cnj = String(p.processo).replace(/\D/g, '');
                if (cnj.length === 20) {
                    const j = parseInt(cnj.substring(13, 14), 10);
                    const tr = parseInt(cnj.substring(14, 16), 10);
                    if (j === 8) {
                        const ufs = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'SP', 'TO'];
                        if (tr >= 1 && tr <= 27) t = "TJ" + ufs[tr - 1];
                    } else if (j === 4) t = "TRF" + tr;
                    else if (j === 5) t = "TRT" + tr;
                    else if (j === 1) t = "STF";
                    else if (j === 2) t = "CNJ";
                    else if (j === 3) t = "STJ";
                    else if (j === 6) t = "TSE";
                    else if (j === 7) t = "STM";
                }
            }
            if (t) {
                t = t.toUpperCase().trim();
                if (t === "TJDF") t = "TJDFT"; // Padronização comum
                tribCounts[t] = (tribCounts[t] || 0) + 1;
            }
        });

        const tribLabels = Object.keys(tribCounts).sort((a, b) => tribCounts[b] - tribCounts[a]);
        const tribData = tribLabels.map(t => tribCounts[t]);

        const ctxTribunais = document.getElementById('chartTribunais');
        if (ctxTribunais) {
            const styles = getComputedStyle(document.documentElement);
            const colorPrimary = styles.getPropertyValue('--primary').trim() || '#cc785c';
            const colorText = styles.getPropertyValue('--text-main').trim() || '#1c1e21';
            const colorBorder = styles.getPropertyValue('--border-light').trim() || 'rgba(0, 0, 0, 0.1)';

            if (chartTribunaisInst) chartTribunaisInst.destroy();
            chartTribunaisInst = new Chart(ctxTribunais, {
                type: 'bar',
                data: {
                    labels: tribLabels,
                    datasets: [{
                        label: 'Processos',
                        data: tribData,
                        backgroundColor: colorPrimary,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            ticks: { 
                                precision: 0,
                                color: colorText
                            },
                            grid: {
                                color: colorBorder
                            }
                        },
                        x: { 
                            grid: { display: false },
                            ticks: {
                                color: colorText
                            }
                        }
                    }
                }
            });
        }
    }

    function renderHistoricoBuscas() {
        const container = document.getElementById('historicoBusca');
        const chips = document.getElementById('chipsRecentes');
        if (!container || !chips) return;
        if (window.historicoBuscas.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'block';
        chips.replaceChildren();;
        window.historicoBuscas.forEach(b => {
            const btn = document.createElement('button');
            btn.className = 'tag-pill';
            btn.style.cssText = 'cursor: pointer; background: var(--bg-panel); border: 1px solid var(--border-light); color: var(--text-main); font-weight: 500; font-family: ui-monospace, monospace; transition: 0.1s; display: flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 11px; border-radius: 6px;';
            btn.onmouseover = () => btn.style.background = 'var(--bg-hover)';
            btn.onmouseleave = () => btn.style.background = 'var(--bg-panel)';
            
            if (b.tipo === 'proc') {
                btn.textContent = b.valor.substring(0, 15) + (b.valor.length > 15 ? '...' : '');
            } else if (b.tipo === 'oab') {
                btn.textContent = b.uf ? `OAB ${b.valor}/${b.uf.toUpperCase()}` : `OAB ${b.valor}`;
            } else {
                btn.textContent = b.valor;
            }
            
            btn.title = "Repetir consulta: " + b.valor;
            btn.onclick = () => {
                if (b.tipo === 'proc') {
                    document.getElementById('btnSearchTypeProc')?.click();
                    const procInput = document.getElementById('procNumBusca');
                    if (procInput) {
                        procInput.value = b.valor;
                        procInput.dispatchEvent(new Event('input'));
                    }
                } else {
                    document.getElementById('btnSearchTypeOab')?.click();
                    const oabInput = document.getElementById('oabNum');
                    if (oabInput) {
                        oabInput.value = b.valor;
                        oabInput.dispatchEvent(new Event('input'));
                    }
                    if (b.uf) {
                        const ufInput = document.getElementById('oabUf');
                        if (ufInput) {
                            ufInput.value = b.uf;
                            ufInput.dispatchEvent(new Event('change'));
                        }
                    }
                }
                setTimeout(() => {
                    document.getElementById('btnBuscar')?.click();
                }, 100);
            };
            chips.appendChild(btn);
        });
    }

    function cleanText(h) {
        if (!h) return "";
        try {
            const doc = new DOMParser().parseFromString(h, 'text/html');
            let textoPuro = doc.body.textContent || "";
            return textoPuro.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        } catch (e) {
            return h.replace(/<[^>]*>?/gm, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        }
    }
    function formatCNJ(n) { if (!n) return "Processo s/ número"; let d = String(n).replace(/\D/g, ''); return d.length === 20 ? d.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, "$1-$2.$3.$4.$5.$6") : n; }
    function normalizarNumeroCNJ(numero) {
        if (!numero) return null;
        let numStr = String(numero).replace(/\s+/g, '');
        let limpo = numStr.replace(/\D/g, '');
        
        // Se o número estiver no formato delimitado por hífen/ponto (ex: 1234-45.2023.8.19.0001)
        // mas com zeros à esquerda omitidos nas partes individuais.
        if (numStr.includes('-') || numStr.includes('.')) {
            const partes = numStr.split(/[-.]/);
            if (partes.length >= 6) {
                const seq = partes[0].replace(/\D/g, '').padStart(7, '0');
                const dig = partes[1].replace(/\D/g, '').padStart(2, '0');
                const ano = partes[2].replace(/\D/g, '').padStart(4, '0');
                const jus = partes[3].replace(/\D/g, '').padStart(1, '0');
                const trib = partes[4].replace(/\D/g, '').padStart(2, '0');
                const orig = partes[5].replace(/\D/g, '').padStart(4, '0');
                return seq + dig + ano + jus + trib + orig;
            }
        }

        // Se for apenas dígitos e estiver incompleto (entre 14 e 19 dígitos)
        if (limpo.length >= 14 && limpo.length < 20) {
            const cauda = limpo.substring(limpo.length - 13);
            const cabeca = limpo.substring(0, limpo.length - 13);
            const cabecaPadded = cabeca.padStart(7, '0');
            return cabecaPadded + cauda;
        }

        return limpo.length === 20 ? limpo : null;
    }
    function getProc(i, t) { let p = i.numeroProcesso || i.numero || i.processo; if (!p || p === "undefined") { const m = String(t).match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/); p = m ? m[0] : "Processo s/ número"; } return p; }
    function varrerTeorParaSugestao(texto, procPrincipal) {
        if (!texto) return null;
        const regex = /\b\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}\b/g;
        const matches = texto.match(regex);
        if (!matches) return null;
        
        const cleanPrincipal = String(procPrincipal).replace(/\D/g, '');
        const unicos = [...new Set(matches.map(m => formatCNJ(m)))].filter(cnj => {
            return cnj && String(cnj).replace(/\D/g, '') !== cleanPrincipal;
        });
        
        return unicos.length > 0 ? unicos[0] : null;
    }
    function atualizarBadgesCard(itemKey) {
        const cards = document.querySelectorAll(`.intimacao-card[data-key="${itemKey}"]`);
        cards.forEach(card => {
            const statusOrigem = card.querySelector('.status-origem');
            const cardInfoLeft = card.querySelector('.card-info-left');
            const container = statusOrigem || cardInfoLeft;
            
            if (container) {
                const badgeExistente = container.querySelector('.badge-conexao-rapida');
                if (badgeExistente) badgeExistente.remove();
                
                const item = prazosSalvos[itemKey];
                const numRelations = (item && item.relacoes) ? item.relacoes.length : 0;
                if (numRelations > 0) {
                    const badgeSpan = document.createElement('span');
                    badgeSpan.className = 'badge-conexao-rapida tooltip-bottom';
                    badgeSpan.setAttribute('data-tooltip', `Possui ${numRelations} processo(s) vinculado(s)`);
                    safeSetInnerHTML(badgeSpan, `🔗 ${numRelations}`);
                    
                    badgeSpan.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const isAberto = card.classList.contains('aberto');
                        if (!isAberto) {
                            const clickArea = card.querySelector('.card-click-area');
                            if (clickArea) clickArea.click();
                        }
                        
                        const btnHist = card.querySelector('.btn-historico-header');
                        if (btnHist) {
                            setTimeout(() => {
                                btnHist.click();
                            }, 50);
                        }
                    };
                    
                    container.appendChild(badgeSpan);
                }
            }
        });
    }
    function highlightText(text, searchVal) {
        if (!text) return "";
        let escapedText = String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        if (!searchVal || !searchVal.trim()) return escapedText;
        const trimmed = searchVal.trim();
        const escapedSearch = trimmed.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escapedSearch})`, 'gi');
        return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }
    function parseDateBR(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return new Date(0);
        const cleanStr = dateStr.split('T')[0].split(' ')[0];

        if (cleanStr.includes('/')) {
            const parts = cleanStr.split('/');
            return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
        } else if (cleanStr.includes('-')) {
            const parts = cleanStr.split('-');
            if (parts[0].length === 4) return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
            return new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
        }
        const parsed = new Date(cleanStr);
        return isNaN(parsed.getTime()) ? new Date(0) : parsed;
    }

    function getGlobalApelido(proc) {
        if (!proc) return "";
        const normalizedProc = String(proc).replace(/\D/g, '');
        // Bug Fix #2: Lê do cache em memória (populado do IndexedDB), nunca do localStorage
        if (_appCache.apelidos[normalizedProc]) {
            return _appCache.apelidos[normalizedProc];
        }
        let found = "";
        for (let key in prazosSalvos) {
            if (prazosSalvos[key] && prazosSalvos[key].processo && String(prazosSalvos[key].processo).replace(/\D/g, '') === normalizedProc && prazosSalvos[key].apelido) {
                found = prazosSalvos[key].apelido;
                break;
            }
        }
        return found;
    }

    function obterRelacoesGlobaisProcesso(proc) {
        if (!proc) return [];
        const normalizedProc = String(proc).replace(/\D/g, '');
        let todasRelacoes = [];
        
        // 1. Relações diretas (processos relacionados ao processo atual)
        for (let key in prazosSalvos) {
            if (prazosSalvos[key] && prazosSalvos[key].processo && String(prazosSalvos[key].processo).replace(/\D/g, '') === normalizedProc) {
                if (prazosSalvos[key].relacoes) {
                    todasRelacoes = todasRelacoes.concat(prazosSalvos[key].relacoes);
                }
            }
        }
        
        // 2. Relações inversas (outros processos que se relacionam com o processo atual)
        for (let key in prazosSalvos) {
            if (prazosSalvos[key] && prazosSalvos[key].processo) {
                const procX = formatCNJ(prazosSalvos[key].processo);
                const normalizedX = String(procX).replace(/\D/g, '');
                if (normalizedX === normalizedProc) continue;
                
                if (prazosSalvos[key].relacoes) {
                    for (let rel of prazosSalvos[key].relacoes) {
                        if (rel && rel.processo && String(rel.processo).replace(/\D/g, '') === normalizedProc) {
                            todasRelacoes.push({
                                id: rel.id || ('rel_' + Math.random().toString(36).substring(2, 9)),
                                processo: procX,
                                tipo: rel.tipo,
                                subTipo: rel.subTipo,
                                espelhar: rel.espelhar
                            });
                        }
                    }
                }
            }
        }
        
        const relacoesUnicas = [];
        const vistos = new Set();
        for (let rel of todasRelacoes) {
            const relProc = String(rel.processo).replace(/\D/g, '');
            if (!vistos.has(relProc)) {
                vistos.add(relProc);
                relacoesUnicas.push(rel);
            }
        }
        return relacoesUnicas;
    }
    function setGlobalApelido(proc, novoApelido, itemKeyBase = null) {
        let atualizouAlgum = false;
        const normalizedProc = String(proc).replace(/\D/g, '');
        
        // Bug Fix #2: Atualiza cache em memória e persiste no IndexedDB (sem localStorage)
        if (novoApelido && novoApelido.trim() !== "") {
            _appCache.apelidos[normalizedProc] = novoApelido.trim();
        } else {
            delete _appCache.apelidos[normalizedProc];
        }
        SafeStorage.set({ 'djen_dicionario_apelidos': JSON.stringify(_appCache.apelidos) });
        AppState.config.dicionario_apelidos = _appCache.apelidos;

        for (let k in prazosSalvos) {
            if (prazosSalvos[k] && prazosSalvos[k].processo && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedProc) {
                prazosSalvos[k].apelido = novoApelido;
                prazosSalvos[k].data_modificacao = new Date().toISOString();
                atualizouAlgum = true;
            }
        }
        if (!atualizouAlgum && itemKeyBase) {
            if (!prazosSalvos[itemKeyBase]) prazosSalvos[itemKeyBase] = { processo: formatCNJ(proc) };
            prazosSalvos[itemKeyBase].apelido = novoApelido;
            prazosSalvos[itemKeyBase].data_modificacao = new Date().toISOString();
        }
        savePrazosSalvos();
    }

    
    function getGlobalClasse(proc) {
        const key = proc.replace(/\D/g, '');
        // Bug Fix #2: Lê do cache em memória (populado do IndexedDB)
        if (_appCache.classes[key]) return _appCache.classes[key];
        for (let k in prazosSalvos) {
            const item = prazosSalvos[k];
            if (item && String(item.processo).replace(/\D/g, '') === key) {
                if (item.datajud_classe) return item.datajud_classe;
            }
        }
        return null;
    }

    function setGlobalClasse(proc, novaClasse) {
        if (!proc) return;
        const normalizedProc = String(proc).replace(/\D/g, '');
        // Bug Fix #2: Atualiza cache em memória e persiste no IndexedDB (sem localStorage)
        if (novaClasse) {
            _appCache.classes[normalizedProc] = novaClasse;
        } else {
            delete _appCache.classes[normalizedProc];
        }
        SafeStorage.set({ 'djen_dicionario_classes': JSON.stringify(_appCache.classes) });
        // Also update existing saved items
        let atualizou = false;
        for (let k in prazosSalvos) {
            if (prazosSalvos[k] && prazosSalvos[k].processo && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedProc) {
                prazosSalvos[k].datajud_classe = novaClasse;
                atualizou = true;
            }
        }
        if (atualizou) savePrazosSalvos();
    }

    function getGlobalSistema(proc) {
        if (!proc) return null;
        const normalizedProc = String(proc).replace(/\D/g, '');
        // Bug Fix #2: Lê do cache em memória (populado do IndexedDB)
        if (_appCache.sistemas[normalizedProc]) return _appCache.sistemas[normalizedProc];
        for (let key in prazosSalvos) {
            const item = prazosSalvos[key];
            if (item && item.processo && String(item.processo).replace(/\D/g, '') === normalizedProc && item.datajud_sistema) {
                return item.datajud_sistema;
            }
        }
        return null;
    }
    function getSiglaClasse(nome) {
        if (!nome) return '';
        const n = nome.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        
        // Mapeamento oficial baseado nas tabelas processuais unificadas e STJ/STF
        const mapa = {
            'ACAO CIVIL PUBLICA': 'ACP',
            'ACAO CAUTELAR': 'AC',
            'ACAO PENAL': 'APn',
            'ACAO RESCISORIA': 'AR',
            'AGRAVO DE EXECUCAO PENAL': 'AEP',
            'AGRAVO DE INSTRUMENTO': 'AI',
            'AGRAVO INTERNO': 'AgInt',
            'AGRAVO REGIMENTAL': 'AgRg',
            'AGRAVO EM RECURSO ESPECIAL': 'AREsp',
            'AGRAVO EM RECURSO EXTRAORDINARIO': 'ARE',
            'APELACAO': 'AC',
            'APELACAO CIVEL': 'AC',
            'APELACAO CRIMINAL': 'ACr',
            'CONFLITO DE COMPETENCIA': 'CC',
            'CUMPRIMENTO DE SENTENCA': 'CumprSen',
            'EMBARGOS A EXECUCAO': 'EmbExec',
            'EMBARGOS DE DECLARACAO': 'ED',
            'EMBARGOS DE DIVERGENCIA': 'EDv',
            'EMBARGOS INFRINGENTES': 'EI',
            'EXECUCAO DE TITULO EXTRAJUDICIAL': 'ExecTExtra',
            'EXECUCAO FISCAL': 'EF',
            'HABEAS CORPUS': 'HC',
            'HABEAS DATA': 'HD',
            'INQUERITO': 'Inq',
            'MANDADO DE INJUNCAO': 'MI',
            'MANDADO DE SEGURANCA': 'MS',
            'PROCEDIMENTO COMUM': 'PCC',
            'PROCEDIMENTO COMUM CIVEL': 'PCC',
            'PROCEDIMENTO DO JUIZADO ESPECIAL CIVEL': 'JEC',
            'PROCEDIMENTO DO JUIZADO ESPECIAL CRIMINAL': 'JECrim',
            'PROCEDIMENTO DO JUIZADO ESPECIAL DA FAZENDA PUBLICA': 'JEFP',
            'RECLAMACAO': 'Rcl',
            'RECURSO EM HABEAS CORPUS': 'RHC',
            'RECURSO EM MANDADO DE SEGURANCA': 'RMS',
            'RECURSO EM SENTIDO ESTRITO': 'RESE',
            'RECURSO ESPECIAL': 'REsp',
            'RECURSO EXTRAORDINARIO': 'RE',
            'RECURSO INOMINADO': 'RI',
            'RECURSO INOMINADO CIVEL': 'RI',
            'RECURSO ORDINARIO': 'RO',
            'REVISAO CRIMINAL': 'RvCr',
            'SUSPENSAO DE LIMINAR E DE SENTENCA': 'SLS',
            'SUSPENSAO DE SEGURANCA': 'SS',
            'TUTELA CAUTELAR ANTECEDENTE': 'TCA'
        };

        // Busca exata primeiro
        if (mapa[n]) return mapa[n];

        // Busca por inclusão para capturar nomes compostos
        for (const chave in mapa) {
            if (n.includes(chave)) return mapa[chave];
        }

        return '';
    }


    function setGlobalSistema(proc, novoSistema) {
        if (!proc) return;
        const normalizedProc = String(proc).replace(/\D/g, '');
        let atualizouAlgum = false;
        // Bug Fix #2: Atualiza cache em memória e persiste no IndexedDB (sem localStorage)
        if (novoSistema && novoSistema.trim() !== "") {
            _appCache.sistemas[normalizedProc] = novoSistema.trim();
        } else {
            delete _appCache.sistemas[normalizedProc];
        }
        SafeStorage.set({ 'djen_dicionario_sistemas': JSON.stringify(_appCache.sistemas) });
        AppState.config.dicionario_sistemas = _appCache.sistemas;

        for (let k in prazosSalvos) {
            if (prazosSalvos[k] && prazosSalvos[k].processo && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedProc) {
                prazosSalvos[k].datajud_sistema = novoSistema;
                prazosSalvos[k].data_modificacao = new Date().toISOString();
                atualizouAlgum = true;
            }
        }
        if (atualizouAlgum) savePrazosSalvos();
    }


    function setGlobalPartes(proc, partes) {
        const normalizedProc = String(proc).replace(/\D/g, '');
        // Bug Fix #2: Atualiza cache em memória e persiste no IndexedDB (sem localStorage)
        if (partes && (partes.requerente || partes.requerido)) {
            _appCache.partes[normalizedProc] = partes;
        } else {
            delete _appCache.partes[normalizedProc];
        }
        SafeStorage.set({ 'djen_dicionario_partes': JSON.stringify(_appCache.partes) });
        if(typeof AppState !== 'undefined' && AppState.config) AppState.config.dicionario_partes = _appCache.partes;
        
        for (let k in prazosSalvos) {
            if (prazosSalvos[k] && prazosSalvos[k].processo && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedProc) {
                prazosSalvos[k].partes = partes;
            }
        }
        savePrazosSalvos();
    }

    function getGlobalPartes(proc) {
        if (!proc) return null;
        const normalizedProc = String(proc).replace(/\D/g, '');
        // Bug Fix #2: Lê do cache em memória (populado do IndexedDB)
        if (_appCache.partes[normalizedProc]) {
            return _appCache.partes[normalizedProc];
        }
        for (let key in prazosSalvos) {
            if (prazosSalvos[key] && prazosSalvos[key].processo && String(prazosSalvos[key].processo).replace(/\D/g, '') === normalizedProc && prazosSalvos[key].partes) {
                return prazosSalvos[key].partes;
            }
        }
        return null;
    }

    const TRIB_MAP = {
        '8.01': 'tjac', '8.02': 'tjal', '8.03': 'tjap', '8.04': 'tjam', '8.05': 'tjba', '8.06': 'tjce', '8.07': 'tjdft', '8.08': 'tjes', '8.09': 'tjgo', '8.10': 'tjma', '8.11': 'tjmt', '8.12': 'tjms', '8.13': 'tjmg', '8.14': 'tjpa', '8.15': 'tjpb', '8.16': 'tjpr', '8.17': 'tjpe', '8.18': 'tjpi', '8.19': 'tjrj', '8.20': 'tjrn', '8.21': 'tjrs', '8.22': 'tjro', '8.23': 'tjrr', '8.24': 'tjsc', '8.25': 'tjse', '8.26': 'tjsp', '8.27': 'tjto',
        '4.01': 'trf1', '4.02': 'trf2', '4.03': 'trf3', '4.04': 'trf4', '4.05': 'trf5', '4.06': 'trf6',
        '5.01': 'trt1', '5.02': 'trt2', '5.03': 'trt3', '5.04': 'trt4', '5.05': 'trt5', '5.06': 'trt6', '5.07': 'trt7', '5.08': 'trt8', '5.09': 'trt9', '5.10': 'trt10', '5.11': 'trt11', '5.12': 'trt12', '5.13': 'trt13', '5.14': 'trt14', '5.15': 'trt15', '5.16': 'trt16', '5.17': 'trt17', '5.18': 'trt18', '5.19': 'trt19', '5.20': 'trt20', '5.21': 'trt21', '5.22': 'trt22', '5.23': 'trt23', '5.24': 'trt24',
        '2.00': 'cnj', '1.00': 'stf', '3.00': 'stj', '6.00': 'tse', '7.00': 'stm'
    };

    function obterTribunalDoCNJ(cnj) {
        if (!cnj) return null;
        const limpo = String(cnj).replace(/\D/g, '');
        if (limpo.length !== 20) return null;
        const dtr = limpo.substring(13, 14) + '.' + limpo.substring(14, 16);
        let sigla = TRIB_MAP[dtr];
        if (!sigla) {
            if (limpo.substring(13, 14) === '1') sigla = 'stf';
            else if (limpo.substring(13, 14) === '3') sigla = 'stj';
            else if (limpo.substring(13, 14) === '6') sigla = 'tse';
        }
        return sigla ? sigla.toUpperCase() : null;
    }

    function normalizarNomeSistema(nome) {
        if (!nome) return '';
        const txt = String(nome).toLowerCase();
        if (txt.includes('projudi')) return 'Projudi';
        if (txt.includes('eproc') || txt.includes('e-proc')) return 'e-Proc';
        if (txt.includes('pje') || txt.includes('processo judicial eletrônico')) return 'PJe';
        if (txt.includes('esaj') || txt.includes('e-saj') || txt.includes('sistema de automação da justiça')) return 'e-SAJ';
        return nome;
    }

    function inferirSistemaDoProcesso(processo, siglaTribunal, textoContexto = "") {
        const manualSys = getGlobalSistema(processo);
        if (manualSys) return manualSys;

        const txt = String(textoContexto || "").toLowerCase();
        if (txt.includes('projudi')) return 'Projudi';
        if (txt.includes('eproc') || txt.includes('e-proc')) return 'e-Proc';
        if (txt.includes('pje') || txt.includes('processo judicial eletrônico')) return 'PJe';
        if (txt.includes('esaj') || txt.includes('e-saj')) return 'e-SAJ';
        
        return '?';
    }

    async function consultarProcessoDataJud(numeroCnj) {
        if (!configDataJudApiKey) return null;
        const limpo = normalizarNumeroCNJ(numeroCnj) || String(numeroCnj).replace(/\D/g, '');
        if (limpo.length !== 20) return null;
        
        const dtr = limpo.substring(13, 14) + '.' + limpo.substring(14, 16);
        let sigla = TRIB_MAP[dtr];
        if (!sigla) {
            // Tentativa fallback para tribunais superiores
            if (limpo.substring(13, 14) === '1') sigla = 'stf';
            else if (limpo.substring(13, 14) === '3') sigla = 'stj';
            else if (limpo.substring(13, 14) === '6') sigla = 'tse';
            else return null;
        }

        const numeroFormatado = limpo.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, "$1-$2.$3.$4.$5.$6");
        const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${sigla}/_search`;
        const payload = { 
            "query": { 
                "match": { "numeroProcesso": limpo }
            },
            "size": 1
        };
        let apiKeyAuth = configDataJudApiKey.trim();
        if (apiKeyAuth.toLowerCase().startsWith('apikey ')) {
            apiKeyAuth = apiKeyAuth.substring(7).trim();
        } else if (apiKeyAuth.toLowerCase().startsWith('api key ')) {
            apiKeyAuth = apiKeyAuth.substring(8).trim();
        }
        
        if (apiKeyAuth.includes(':')) {
            try { apiKeyAuth = btoa(apiKeyAuth); } catch(e) {}
        }
        
        const authHeaderValue = `ApiKey ${apiKeyAuth}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeaderValue
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const txt = await response.text();
                console.error(`DJEN DataJud ERRO HTTP ${response.status}:`, txt);
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Acesso negado: Verifique sua API Key do CNJ nas opções.");
                } else if (response.status === 429) {
                    throw new Error("Erro 429: Muitas requisições ao CNJ. Tente novamente mais tarde.");
                } else {
                    throw new Error("Erro na comunicação com o CNJ.");
                }
            }
            const data = await response.json();
            if (data && data.hits && data.hits.hits && data.hits.hits.length > 0) {
                const source = data.hits.hits[0]._source;
                let poloAtivo = '';
                let poloPassivo = '';
                let advogados = [];
                
                // Formato 1: Estrutura agrupada por polo (source.polos[].partes[])
                if (source.polos && source.polos.length > 0) {
                    for (const p of source.polos) {
                        const poloStr = String(p.polo || '').toUpperCase();
                        if (poloStr === 'AT' || poloStr === 'ATIVO') {
                            if (p.partes && p.partes.length > 0) {
                                poloAtivo = p.partes[0].nome || '';
                                // Extrair advogados do polo ativo
                                for (const parte of p.partes) {
                                    if (parte.advogados) advogados.push(...parte.advogados);
                                    if (parte.representantes) advogados.push(...parte.representantes);
                                }
                            }
                            else if (p.nome) poloAtivo = p.nome;
                        } else if (poloStr === 'PA' || poloStr === 'PASSIVO') {
                            if (p.partes && p.partes.length > 0) {
                                poloPassivo = p.partes[0].nome || '';
                                for (const parte of p.partes) {
                                    if (parte.advogados) advogados.push(...parte.advogados);
                                    if (parte.representantes) advogados.push(...parte.representantes);
                                }
                            }
                            else if (p.nome) poloPassivo = p.nome;
                        }
                    }
                }
                // Formato 2: Estrutura flat (source.partes[] com campo polo)
                if (!poloAtivo && !poloPassivo && source.partes && source.partes.length > 0) {
                    for (const parte of source.partes) {
                        const poloStr = String(parte.polo || '').toUpperCase();
                        const tipoStr = String(parte.tipoParte || '').toLowerCase();
                        
                        if ((poloStr === 'AT' || poloStr === 'ATIVO' || tipoStr.includes('requerente') || tipoStr.includes('autor') || tipoStr.includes('exequente') || tipoStr.includes('impetrante')) && !poloAtivo) {
                            poloAtivo = parte.nome || '';
                            if (parte.advogados) advogados.push(...parte.advogados);
                            if (parte.representantes) advogados.push(...parte.representantes);
                        } else if ((poloStr === 'PA' || poloStr === 'PASSIVO' || tipoStr.includes('requerido') || tipoStr.includes('réu') || tipoStr.includes('reu') || tipoStr.includes('executado') || tipoStr.includes('impetrado')) && !poloPassivo) {
                            poloPassivo = parte.nome || '';
                            if (parte.advogados) advogados.push(...parte.advogados);
                            if (parte.representantes) advogados.push(...parte.representantes);
                        }
                    }
                    // Se ainda não encontrou, pegar os dois primeiros
                    if (!poloAtivo && source.partes.length >= 1) poloAtivo = source.partes[0].nome || '';
                    if (!poloPassivo && source.partes.length >= 2) poloPassivo = source.partes[1].nome || '';
                }
                // classe pode ser objeto {codigo, nome} ou string em alguns tribunais
                const classe = source.classe ? (typeof source.classe === 'string' ? source.classe : (source.classe.nome || '')) : '';
                // DataJud usa 'nome' (não 'nomeOrgao') para o órgão julgador
                const orgao = source.orgaoJulgador ? (source.orgaoJulgador.nome || source.orgaoJulgador.nomeOrgao || '') : '';
                // sistema pode ser objeto {codigo, nome} ou string
                const sistema = source.sistema ? (typeof source.sistema === 'string' ? normalizarNomeSistema(source.sistema) : normalizarNomeSistema(source.sistema.nome || '')) : '';
                const vinculados = source.processosVinculados || [];
                // tribunal diretamente da resposta (mais confiável que inferir do número)
                const tribunalSigla = source.tribunal || '';
                
                // Novos campos: assuntos, grau, dataAjuizamento
                const assuntos = (source.assuntos || []).map(a => ({ codigo: a.codigo || 0, nome: a.nome || '' })).filter(a => a.nome);
                const grau = source.grau || '';
                // dataAjuizamento pode estar ausente em processos antigos; tentar fallback para dataDistribuicao
                const dataAjuizamento = source.dataAjuizamento || source.dataDistribuicao || source.dataAutuacao || '';
                
                // Movimentações: extrair as últimas 10, ordenadas por data desc
                let movimentos = [];
                if (source.movimentos && source.movimentos.length > 0) {
                    movimentos = source.movimentos
                        .filter(m => m.nome || m.codigo)
                        .map(m => ({
                            codigo: m.codigo || 0,
                            nome: m.nome || '',
                            dataHora: m.dataHora || '',
                            complementos: (m.complementosTabelados || []).map(c => c.descricao || c.nome || '').filter(Boolean).join(', ')
                        }))
                        .sort((a, b) => (b.dataHora || '').localeCompare(a.dataHora || ''))
                        .slice(0, 10);
                }
                
                // Nível de sigilo (0 = público)
                const nivelSigilo = typeof source.nivelSigilo === 'number' ? source.nivelSigilo : (parseInt(source.nivelSigilo) || 0);
                
                let ufJud = '';
                let munJud = '';
                if (source.orgaoJulgador && source.orgaoJulgador.codigoMunicipioIBGE) {
                    try {
                        const rIbge = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${source.orgaoJulgador.codigoMunicipioIBGE}`);
                        if (rIbge.ok) {
                            const dIbge = await rIbge.json();
                            if (dIbge && dIbge.nome) {
                                munJud = dIbge.nome;
                                // Tentar extrair UF da hierarquia do IBGE (múltiplos caminhos possíveis)
                                if (dIbge.microrregiao && dIbge.microrregiao.mesorregiao && dIbge.microrregiao.mesorregiao.UF) {
                                    ufJud = dIbge.microrregiao.mesorregiao.UF.sigla || '';
                                }
                                // Fallback: regiões imediatas (estrutura mais nova do IBGE)
                                if (!ufJud && dIbge['regiao-imediata'] && dIbge['regiao-imediata']['regiao-intermediaria'] && dIbge['regiao-imediata']['regiao-intermediaria'].UF) {
                                    ufJud = dIbge['regiao-imediata']['regiao-intermediaria'].UF.sigla || '';
                                }
                            }
                        }
                    } catch(e) {
                        console.warn('DJEN: Falha ao consultar IBGE para município', source.orgaoJulgador.codigoMunicipioIBGE, e);
                    }
                }
                
                // Fallback UF: extrair da sigla do tribunal (ex: tjsp → SP, tjrj → RJ)
                if (!ufJud && sigla) {
                    const SIGLA_UF_MAP = {
                        'tjac': 'AC', 'tjal': 'AL', 'tjap': 'AP', 'tjam': 'AM', 'tjba': 'BA', 'tjce': 'CE',
                        'tjdft': 'DF', 'tjes': 'ES', 'tjgo': 'GO', 'tjma': 'MA', 'tjmt': 'MT', 'tjms': 'MS',
                        'tjmg': 'MG', 'tjpa': 'PA', 'tjpb': 'PB', 'tjpr': 'PR', 'tjpe': 'PE', 'tjpi': 'PI',
                        'tjrj': 'RJ', 'tjrn': 'RN', 'tjrs': 'RS', 'tjro': 'RO', 'tjrr': 'RR', 'tjsc': 'SC',
                        'tjse': 'SE', 'tjsp': 'SP', 'tjto': 'TO'
                    };
                    ufJud = SIGLA_UF_MAP[sigla] || '';
                }
                
                return { poloAtivo, poloPassivo, classe, orgao, sistema, vinculados, ufJud, munJud, assuntos, grau, dataAjuizamento, tribunalSigla, movimentos, nivelSigilo };
            }
            return null; // 0 hits
        } catch(e) {
            clearTimeout(timeoutId);
            // DOMException ou AbortError significa timeout ou rede falhou — não propagar para não poluir o console
            if (e.name === 'AbortError' || e instanceof DOMException) {
                console.warn('DJEN: DataJud timeout ou rede indisponível para', limpo);
                return null;
            }
            console.error("Erro DataJud:", e);
            throw e;
        }
    }

    // Guard de execução única (mutex simples) — Bug Fix #7: Race condition
    // Impede que a fila rode em paralelo se chamada duas vezes (ex: múltiplos triggers)
    let _filaDataJudRodando = false;

    async function iniciarFilaEnriquecimentoDataJud() {
        if (_filaDataJudRodando) {
            console.log('DJEN: Fila DataJud já está rodando — chamada ignorada.');
            return;
        }
        if (!configDataJudApiKey) return;
        
        _filaDataJudRodando = true;
        try {
        // Monta a fila de processos que precisam de enriquecimento
        const fila = [];
        for (const key in prazosSalvos) {
            const p = prazosSalvos[key];
            if (!p || !p.processo) continue;
            if (p.processo === "Prazo Manual") continue;
            
            const partesBase = getGlobalPartes(p.processo);
            // Se não tem partes, ou se o apelido está vazio, entra na fila
            if (!partesBase || (!partesBase.requerente && !partesBase.requerido) || !p.apelido) {
                fila.push({ key, proc: p.processo });
            }
        }
        
        if (fila.length === 0) { _filaDataJudRodando = false; return; }
        console.log(`DJEN: Iniciando enriquecimento lento via DataJud para ${fila.length} processos...`);
        
        // Loop lento
        for (const item of fila) {
            // Checa novamente se a key existe (pode ter sido excluída nesse meio tempo)
            if (!prazosSalvos[item.key]) continue;
            
            const procLimpo = normalizarNumeroCNJ(item.proc) || String(item.proc).replace(/\D/g, '');
            if (isCnjTentadoGlobal(procLimpo)) continue;

            try {
                const dataJud = await consultarProcessoDataJud(item.proc);
                // Se não lançou erro (seja por timeout ou falha HTTP), marca como tentado para não buscar de novo
                setCnjTentadoGlobal(procLimpo);
                
                if (dataJud) {
                    const partesBase = getGlobalPartes(item.proc) || {};
                    let atualizado = false;
                    if (!partesBase.requerente && dataJud.poloAtivo) { partesBase.requerente = dataJud.poloAtivo; atualizado = true; }
                    if (!partesBase.requerido && dataJud.poloPassivo) { partesBase.requerido = dataJud.poloPassivo; atualizado = true; }
                    if (atualizado) setGlobalPartes(item.proc, partesBase);
                    
                    if (!prazosSalvos[item.key].apelido && dataJud.poloAtivo && dataJud.poloPassivo) {
                        prazosSalvos[item.key].apelido = `${dataJud.poloAtivo.split(' ')[0]} x ${dataJud.poloPassivo.split(' ')[0]}`;
                        setGlobalApelido(item.proc, prazosSalvos[item.key].apelido);
                        atualizado = true;
                    }
                    
                    if (dataJud.vinculados && dataJud.vinculados.length > 0) {
                        for (const vinc of dataJud.vinculados) {
                            adicionarRelacaoProcesso(item.key, vinc.numeroProcesso, 'vinculado', 'Extraído DataJud (Auto)', false);
                        }
                        atualizado = true;
                    }
                    
                    if (dataJud.classe || dataJud.orgao || dataJud.sistema) {
                        prazosSalvos[item.key].datajud_classe = dataJud.classe || '';
                        prazosSalvos[item.key].datajud_orgao = dataJud.orgao || '';
                        prazosSalvos[item.key].datajud_sistema = dataJud.sistema || '';
                        atualizado = true;
                    }
                    if (dataJud.assuntos && dataJud.assuntos.length > 0) { prazosSalvos[item.key].datajud_assuntos = dataJud.assuntos; atualizado = true; }
                    if (dataJud.grau) { prazosSalvos[item.key].datajud_grau = dataJud.grau; atualizado = true; }
                    if (dataJud.dataAjuizamento) { prazosSalvos[item.key].datajud_ajuizamento = dataJud.dataAjuizamento; atualizado = true; }
                    
                    if (dataJud.ufJud) { prazosSalvos[item.key].datajud_uf = dataJud.ufJud; atualizado = true; }
                    if (dataJud.munJud) { prazosSalvos[item.key].datajud_mun = dataJud.munJud; atualizado = true; }
                    if (dataJud.tribunalSigla && !prazosSalvos[item.key].siglaTribunal) { prazosSalvos[item.key].siglaTribunal = dataJud.tribunalSigla.toUpperCase(); atualizado = true; }
                    if (dataJud.movimentos && dataJud.movimentos.length > 0) { prazosSalvos[item.key].datajud_movimentos = dataJud.movimentos; atualizado = true; }
                    if (typeof dataJud.nivelSigilo === 'number') { prazosSalvos[item.key].datajud_sigilo = dataJud.nivelSigilo; atualizado = true; }
                    if (atualizado) {
                        adicionarEventoHistorico(item.key, 'nota', 'Processo enriquecido via DataJud Automático (Partes/Vínculos/Classe).');
                        savePrazosSalvos();
                        // Atualiza a UI se o card estiver sendo exibido na tela
                        const titleEl = document.querySelector(`.intimacao-card[data-key="${item.key}"] .proc-apelido`);
                        if (titleEl && prazosSalvos[item.key].apelido) titleEl.textContent = prazosSalvos[item.key].apelido;
                    }
                }
            } catch (err) {
                console.warn(`DJEN: Fila DataJud erro (${err.message}): ${item.proc}`, err);
                
                // Se for 429 (Too Many Requests), a API baniu temporariamente. Parar fila inteira.
                if (err.message && err.message.includes('429')) {
                    console.warn("DJEN: Rate limit (429) do DataJud atingido. Interrompendo fila.");
                    break;
                }
                
                // Se for outro erro definitivo ou não for 429, apenas marca como tentado para não travar num processo defeituoso
                // Em caso de Timeout ou 5xx não marca se quiser tentar depois, mas aqui marcamos
                // para evitar loop infinito de erros repetidos caso o erro seja na consulta
                if (!err.message || (!err.message.includes('500') && !err.message.includes('503'))) {
                    setCnjTentadoGlobal(procLimpo);
                }
            }
            
            // Pausa entre requisições para evitar rate limit do CNJ (Erro 429)
            await new Promise(r => setTimeout(r, 4000));
        }
        console.log("DJEN: Fila de enriquecimento DataJud concluída.");
        } finally {
            // Garante que o mutex é liberado mesmo em caso de erro inesperado
            _filaDataJudRodando = false;
        }
    }

    // Nota: os Sets abaixo existiam mas nunca eram usados como guard — substituídos pelo mutex acima

    function isCnjTentadoGlobal(proc) {
        if (!proc) return false;
        const key = proc.replace(/\D/g, '');
        // Bug Fix #3: Lê do cache em memória (populado do IndexedDB)
        return !!_appCache.cnjTentados[key];
    }
    
    function setCnjTentadoGlobal(proc) {
        if (!proc) return;
        const key = proc.replace(/\D/g, '');
        // Bug Fix #3: Atualiza cache + persiste no IndexedDB (sem localStorage)
        _appCache.cnjTentados[key] = true;
        SafeStorage.set({'djen_cnj_tentados_persistent': JSON.stringify(_appCache.cnjTentados)});
    }

    async function triggerAutoSincronizarCNJ(itemKey, proc, cardElement) {
        if (!configDataJudApiKey) return;
        const procLimpo = normalizarNumeroCNJ(proc) || String(proc).replace(/\D/g, '');
        if (procLimpo.length !== 20) return;

        // Se já está buscando ou já tentou buscar esse processo nesta sessão, ou já tentou na vida útil da extensão, ignora
        if (processosBuscandoCNJ.has(procLimpo) || processosTentadosCNJ.has(procLimpo)) return;
        if (isCnjTentadoGlobal(procLimpo)) return;

        const partes = getGlobalPartes(procLimpo);
        const temPartes = partes && (partes.requerente || partes.requerido);
        
        let p = prazosSalvos[itemKey];

        // Se já tem prazo calculado (datas presentes), não consulta de novo automaticamente
        if (p && p.fatal) return;

        // Verifica se O PROCESSO já tem metadados do DataJud salvos em alguma publicação anterior (evitar re-fetch)
        let temMetaGlobal = false;
        if (p && (p.datajud_classe || p.datajud_orgao || p.datajud_sistema)) {
            temMetaGlobal = true;
        } else {
            for (let k in prazosSalvos) {
                const item = prazosSalvos[k];
                if (item && item.processo && String(item.processo).replace(/\D/g, '') === procLimpo) {
                    if (item.datajud_classe || item.datajud_orgao || item.datajud_sistema) {
                        temMetaGlobal = true;
                        break;
                    }
                }
            }
        }

        // Se já tem partes (provavelmente extraídas do PJe ou DataJud) E também já tem metadados do DataJud globalmente, não consulta
        if (temPartes && temMetaGlobal) return;

        // Inicia a busca
        processosBuscandoCNJ.add(procLimpo);
        showToast("Buscando dados no CNJ...", "⏳");

        try {
            const dataJud = await consultarProcessoDataJud(procLimpo);
            processosTentadosCNJ.add(procLimpo);
            setCnjTentadoGlobal(procLimpo);
            processosBuscandoCNJ.delete(procLimpo);

            if (dataJud) {
                const partesBase = getGlobalPartes(procLimpo) || {};
                let atualizado = false;
                if (!partesBase.requerente && dataJud.poloAtivo) { partesBase.requerente = dataJud.poloAtivo; atualizado = true; }
                if (!partesBase.requerido && dataJud.poloPassivo) { partesBase.requerido = dataJud.poloPassivo; atualizado = true; }
                if (atualizado) setGlobalPartes(procLimpo, partesBase);

                let p = prazosSalvos[itemKey];
                if (p) {
                    if (!p.apelido && dataJud.poloAtivo && dataJud.poloPassivo) {
                        p.apelido = `${dataJud.poloAtivo.split(' ')[0]} x ${dataJud.poloPassivo.split(' ')[0]}`;
                        setGlobalApelido(procLimpo, p.apelido, itemKey);
                        atualizado = true;
                    }
                    if (dataJud.vinculados && dataJud.vinculados.length > 0) {
                        for (const vinc of dataJud.vinculados) {
                            adicionarRelacaoProcesso(itemKey, vinc.numeroProcesso, 'vinculado', 'Sincronizado Auto (CNJ)', false);
                        }
                        atualizado = true;
                    }
                    if (dataJud.classe || dataJud.orgao || dataJud.sistema) {
                        p.datajud_classe = dataJud.classe || '';
                        p.datajud_orgao = dataJud.orgao || '';
                        p.datajud_sistema = dataJud.sistema || '';
                        atualizado = true;
                    }
                    if (dataJud.assuntos && dataJud.assuntos.length > 0) { p.datajud_assuntos = dataJud.assuntos; atualizado = true; }
                    if (dataJud.grau) { p.datajud_grau = dataJud.grau; atualizado = true; }
                    if (dataJud.dataAjuizamento) { p.datajud_ajuizamento = dataJud.dataAjuizamento; atualizado = true; }
                    if (dataJud.tribunalSigla && !p.siglaTribunal) { p.siglaTribunal = dataJud.tribunalSigla.toUpperCase(); atualizado = true; }
                    if (dataJud.movimentos && dataJud.movimentos.length > 0) { p.datajud_movimentos = dataJud.movimentos; atualizado = true; }
                    if (typeof dataJud.nivelSigilo === 'number') { p.datajud_sigilo = dataJud.nivelSigilo; atualizado = true; }
                    if (atualizado) {
                        adicionarEventoHistorico(itemKey, 'nota', 'Processo enriquecido via DataJud Automático ao abrir.');
                        savePrazosSalvos();
                    }
                } else {
                    if (dataJud.poloAtivo && dataJud.poloPassivo) {
                        const apelidoAuto = `${dataJud.poloAtivo.split(' ')[0]} x ${dataJud.poloPassivo.split(' ')[0]}`;
                        if (!getGlobalApelido(procLimpo)) {
                            setGlobalApelido(procLimpo, apelidoAuto, null);
                        }
                    }
                }

                // Atualizar o DOM cirurgicamente para todos os cards deste processo
                const cardsNoDOM = document.querySelectorAll(`.intimacao-card[data-proc="${formatCNJ(procLimpo)}"], .intimacao-card[data-proc="${procLimpo}"]`);
                cardsNoDOM.forEach(cardNode => {
                    // 1. Atualizar partes e badge do sistema
                    const cnjWrapper = cardNode.querySelector('.cnj-wrapper');
                    if (cnjWrapper) {
                        const partesAntigas = cnjWrapper.querySelector('.proc-partes-inline');
                        if (partesAntigas) partesAntigas.remove();

                        if (dataJud.poloAtivo || dataJud.poloPassivo) {
                            let pStr = [];
                            if (dataJud.poloAtivo) pStr.push(`<span class="parte-reqte">${dataJud.poloAtivo}</span>`);
                            if (dataJud.poloPassivo) pStr.push(`<span class="parte-reqdo">${dataJud.poloPassivo}</span>`);
                            
                            const partesSpan = document.createElement('span');
                            partesSpan.className = 'proc-partes-inline';
                            safeSetInnerHTML(partesSpan, `
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                ${pStr.join(' <span class="parte-sep">•</span> ')}
                            `);
                            cnjWrapper.appendChild(partesSpan);
                        }

                        // Atualizar badge do sistema se retornado pelo CNJ (para remover o ?)
                        if (dataJud.sistema) {
                            let badgeSistema = cnjWrapper.querySelector('.badge-sistema-modern');
                            if (badgeSistema) {
                                badgeSistema.textContent = dataJud.sistema;
                            } else {
                                const badgeTrib = cnjWrapper.querySelector('.badge-trib-modern');
                                if (badgeTrib) {
                                    const newBadge = document.createElement('span');
                                    newBadge.className = 'badge-sistema-modern';
                                    newBadge.style.cssText = 'font-size: 10px; font-weight: 500; color: var(--text-muted); background: var(--bg-hover); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);';
                                    newBadge.textContent = dataJud.sistema;
                                    badgeTrib.after(document.createTextNode(' '));
                                    badgeTrib.after(newBadge);
                                }
                            }
                        }
                    }

                    // 2. Atualizar classe/orgao
                    const headerLeft = cardNode.querySelector('.proc-header-left');
                    if (headerLeft && (dataJud.classe || dataJud.orgao)) {
                        const metaAntigo = headerLeft.querySelector('.datajud-meta-modern');
                        if (metaAntigo) metaAntigo.remove();

                        const metaDiv = document.createElement('div');
                        metaDiv.className = 'datajud-meta-modern';
                        metaDiv.style.cssText = 'font-size: 11px; margin-top: 4px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;';
                        safeSetInnerHTML(metaDiv, `
                            <span style="opacity: 0.6;">🏛️</span>
                            ${dataJud.classe ? `<span style="font-weight: 600;">${dataJud.classe}</span>` : ''}
                            ${(dataJud.classe && dataJud.orgao) ? '<span style="opacity: 0.5;">•</span>' : ''}
                            ${dataJud.orgao ? `<span>${dataJud.orgao}</span>` : ''}
                        `);
                        headerLeft.appendChild(metaDiv);
                    }

                    // 3. Atualizar apelido se necessário
                    const apelidoNovo = (p && p.apelido) ? p.apelido : (dataJud.poloAtivo && dataJud.poloPassivo ? `${dataJud.poloAtivo.split(' ')[0]} x ${dataJud.poloPassivo.split(' ')[0]}` : null);
                    if (apelidoNovo) {
                        const hintApelido = headerLeft.querySelector('.hint-apelido-modern');
                        if (hintApelido) {
                            const apelidoDiv = document.createElement('div');
                            apelidoDiv.className = 'proc-apelido-modern';
                            apelidoDiv.title = `Proc: ${proc}`;
                            apelidoDiv.textContent = apelidoNovo;
                            hintApelido.replaceWith(apelidoDiv);
                        } else {
                            const procApelido = headerLeft.querySelector('.proc-apelido-modern');
                            if (procApelido && (!procApelido.textContent || procApelido.textContent.trim() === "" || procApelido.textContent.startsWith('+'))) {
                                procApelido.textContent = apelidoNovo;
                            }
                        }
                    }
                });

                showToast("Dados do CNJ integrados!", "✅");
            } else {
                showToast("Nenhum dado encontrado no CNJ.", "ℹ️");
            }
        } catch(err) {
            processosBuscandoCNJ.delete(procLimpo);
            showToast("Erro ao buscar dados no CNJ.", "❌");
        }
    }

    let currentApelidoCallback = null;
    let currentApelidoProcesso = null;

    function tentarExtrairPartesPrazosSalvos(procNum) {
        return getGlobalPartes(procNum) || {};
    }

    async function abrirModalApelido(processo, apelidoAtual, callback) { 
        currentApelidoProcesso = processo;
        const modal = document.getElementById('apelidoModal'); 
        const input = document.getElementById('inputApelidoModal'); 
        const inputReqte = document.getElementById('inputRequerenteModal');
        const inputReqdo = document.getElementById('inputRequeridoModal');

        input.value = apelidoAtual || ''; 
        
        let partesAtuais = getGlobalPartes(processo);
        if (!partesAtuais || (!partesAtuais.requerente && !partesAtuais.requerido)) {
            partesAtuais = tentarExtrairPartesPrazosSalvos(processo) || partesAtuais;
        }

        if(inputReqte) inputReqte.value = partesAtuais ? (partesAtuais.requerente || '') : '';
        if(inputReqdo) inputReqdo.value = partesAtuais ? (partesAtuais.requerido || '') : '';

        const inputSistema = document.getElementById('inputSistemaModal');
        if (inputSistema) inputSistema.value = getGlobalSistema(processo) || '';
        
        const inputClasse = document.getElementById('inputClasseModal');
        if (inputClasse) inputClasse.value = getGlobalClasse(processo) || '';

        currentApelidoCallback = callback; 
        modal.classList.add('show'); 
        
        // DataJud Fetch se partes não existirem
        if (false && configDataJudApiKey && (!inputReqte.value || !inputReqdo.value)) { // Desativado a pedido
            const btnSalvar = document.getElementById('btnSalvarApelido');
            const originalText = btnSalvar ? btnSalvar.textContent : 'Salvar identificação';
            if (btnSalvar) {
                btnSalvar.innerHTML = `<span class="spinner-mini" style="margin-right: 8px;"></span> Buscando no CNJ...`;
                btnSalvar.disabled = true;
            }
            
            try {
                const dataJud = await consultarProcessoDataJud(processo);
                if (dataJud) {
                    if (dataJud.poloAtivo && inputReqte && !inputReqte.value) inputReqte.value = dataJud.poloAtivo;
                    if (dataJud.poloPassivo && inputReqdo && !inputReqdo.value) inputReqdo.value = dataJud.poloPassivo;
                    if (!input.value && dataJud.poloAtivo && dataJud.poloPassivo) {
                        const primeiroAtivo = dataJud.poloAtivo.split(' ')[0];
                        const primeiroPassivo = dataJud.poloPassivo.split(' ')[0];
                        input.value = `${primeiroAtivo} x ${primeiroPassivo}`;
                    }
                    if (dataJud.vinculados && dataJud.vinculados.length > 0) {
                        const procLimpo = String(processo).replace(/\D/g, '');
                        const keyPrincipal = Object.keys(prazosSalvos).find(k => String(prazosSalvos[k].processo).replace(/\D/g, '') === procLimpo);
                        if (keyPrincipal) {
                            for (const vinc of dataJud.vinculados) {
                                adicionarRelacaoProcesso(keyPrincipal, vinc.numeroProcesso, 'vinculado', 'Extraído DataJud', false);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Erro no DataJud modal identificação:", err);
            } finally {
                if (btnSalvar) {
                    btnSalvar.textContent = originalText;
                    btnSalvar.disabled = false;
                }
            }
        }
        
        setTimeout(() => input.focus(), 100); 
    }

    const inputApelidoEl = document.getElementById('inputApelidoModal');
    if (inputApelidoEl) {
        inputApelidoEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('btnSalvarApelido')?.click();
            }
        });
    }

    function getAllTagsFromNotes() {
        const tags = new Set();
        for (let key in prazosSalvos) {
            const p = prazosSalvos[key];
            if (p && p.anotacao) {
                const matches = p.anotacao.match(/#[\w\u00C0-\u00FF_]+/g);
                if (matches) {
                    matches.forEach(t => tags.add(t.toLowerCase()));
                }
            }
        }
        return [...tags].sort();
    }

    function showTagSuggestions(inputElement) {
        const existing = document.querySelector('.tag-suggestions');
        if (existing) existing.remove();

        const cursorPos = inputElement.selectionStart;
        const textBeforeCursor = inputElement.value.substring(0, cursorPos);
        const hashIndex = textBeforeCursor.lastIndexOf('#');

        if (hashIndex === -1) return;

        const termo = textBeforeCursor.substring(hashIndex + 1).toLowerCase();
        if (termo.length === 0 && textBeforeCursor.charAt(hashIndex - 1) !== ' ' && hashIndex > 0) return;

        const todasTags = getAllTagsFromNotes();
        const sugestoes = todasTags.filter(t => t.startsWith('#' + termo) && t !== '#' + termo);

        if (sugestoes.length === 0) return;

        const container = document.createElement('div');
        container.className = 'tag-suggestions show';

        const rect = inputElement.getBoundingClientRect();
        container.style.top = (rect.bottom + 4) + 'px';
        container.style.left = rect.left + 'px';

        sugestoes.slice(0, 5).forEach(tag => {
            const item = document.createElement('div');
            item.className = 'tag-suggestion-item';
            item.textContent = tag;
            item.onmousedown = (e) => {
                e.preventDefault();
                const antes = inputElement.value.substring(0, hashIndex);
                const depois = inputElement.value.substring(cursorPos);
                inputElement.value = antes + tag + ' ' + depois;
                inputElement.focus();
                inputElement.setSelectionRange((antes + tag + ' ').length, (antes + tag + ' ').length);
                container.remove();
                inputElement.dispatchEvent(new Event('input'));
            };
            container.appendChild(item);
        });

        document.body.appendChild(container);
    }

    function getAutoTagsHTML(txtLimpo) {
        let h = '';
        if (!txtLimpo) return h;

        const textoLow = txtLimpo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        palavrasUrgentes.forEach(palavra => {
            const palavraLow = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

            if (textoLow.includes(palavraLow)) {
                h += `<span class="tag-pill auto" style="background: var(--zen-blue); color: var(--zen-blue); display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">🏷️ ${palavra}</span>`;
            }
        });
        return h;
    }


    function getHeaderHTML(processo, apelido, anotacao, textoOriginal, siglaTribunal = '', opts = {}) {
        const safeAnotacao = (typeof anotacao === 'string') ? anotacao : "";
        const safeTexto = (typeof textoOriginal === 'string') ? textoOriginal : "";

        const tagsMatch = safeAnotacao.match(/#[\\w\\u00C0-\\u00FF_]+/g);
        const tagsManuais = tagsMatch ? [...new Set(tagsMatch)] : [];

        let tagsHTML = getAutoTagsHTML(safeTexto);

        if (tagsManuais.length > 0) {
            tagsHTML += tagsManuais.map(t => `<span class="tag-pill"><span style="opacity: 0.6;">#</span> ${t.replace('#', '')}</span>`).join('');
        }
        let tagsContainer = `<div class="proc-tags-wrapper" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
            <span class="badge-tarefas" style="display: none;"></span>
            ${tagsHTML ? `<div class="proc-tags" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 0;">${tagsHTML}</div>` : ''}
        </div>`;

        let textoAnotacaoLimpo = safeAnotacao.replace(/#[\\w\\u00C0-\\u00FF_]+/g, '').trim();

        let anotacaoContainer = textoAnotacaoLimpo ? `
            <div class="proc-anotacao">
                <span style="font-size: 12px; opacity: 0.8; margin-top: 1px;">📌</span> 
                <span>${textoAnotacaoLimpo}</span>
            </div>` : '';

        const tribStr = (siglaTribunal && siglaTribunal !== 'MANUAL') ? siglaTribunal : obterTribunalDoCNJ(processo);
        const sistemaStr = opts.datajud_sistema || inferirSistemaDoProcesso(processo, tribStr, textoOriginal || anotacao);
        const badgeSistemaHTML = sistemaStr ? ` <span class="badge-sistema-modern" style="font-size: 10px; font-weight: 500; color: var(--text-muted); background: var(--bg-hover); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${sistemaStr}</span>` : '';
        const badgeTribHTML = tribStr ? `<span class="badge-trib-modern">${tribStr}</span>${badgeSistemaHTML}` : '';

        let partesHTML = '';

        const btnHistoricoHeaderHTML = `
            <button type="button" class="btn-historico-header tooltip-left" data-tooltip="Ver Histórico Completo" aria-label="Ver Histórico Completo" style="margin-left: auto;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M 4 12 h 16" />
                    <path d="M 2 2 h 4 a 1 1 0 0 1 1 1 v 4 a 1 1 0 0 1 -1 1 H 5.2 L 4 10 L 2.8 8 H 2 a 1 1 0 0 1 -1 -1 V 3 a 1 1 0 0 1 1 -1 Z" />
                    <path d="M 3.5 4.5 h 1.5" stroke-width="1.2" />
                    <path d="M 3.5 6 h 1" stroke-width="1.2" />
                    <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="currentColor" stroke-width="1.8" />
                    <path d="M 10 16 h 1.2 L 12 14 L 12.8 16 H 14 a 1 1 0 0 1 1 1 v 4 a 1 1 0 0 1 -1 1 H 10 a 1 1 0 0 1 -1 -1 v -4 a 1 1 0 0 1 1 -1 Z" />
                    <path d="M 11.5 18.5 h 1.5" stroke-width="1.2" />
                    <path d="M 11.5 20 h 1" stroke-width="1.2" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="currentColor" stroke-width="1.8" />
                    <path d="M 18 2 h 4 a 1 1 0 0 1 1 1 v 4 a 1 1 0 0 1 -1 1 H 21.2 L 20 10 L 18.8 8 H 18 a 1 1 0 0 1 -1 -1 V 3 a 1 1 0 0 1 1 -1 Z" />
                    <path d="M 19.5 4.5 h 1.5" stroke-width="1.2" />
                    <path d="M 19.5 6 h 1" stroke-width="1.2" />
                    <circle cx="20" cy="12" r="1.5" fill="currentColor" stroke="currentColor" stroke-width="1.8" />
                </svg>
            </button>
        `;

        const leftContent = `
            <div class="proc-header-left">
                <div class="proc-title-row" style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; border-bottom: 1px dashed rgba(120, 120, 130, 0.2); padding-bottom: 8px; margin-bottom: 8px;">
                    ${(apelido && apelido.trim() !== "") 
                        ? `<div class="proc-apelido-modern" title="Proc: ${processo}">${apelido}</div>` 
                        : `<div class="hint-apelido-modern">+ Adicionar Identificação</div>`
                    }
                    ${opts.rightSideHTML ? `<div class="status-urgencia-group" style="display: flex; align-items: center; gap: 4px; margin-left: auto;">${opts.rightSideHTML}</div>` : ''}
                </div>
                <div class="proc-numero-secundario-modern" style="width: 100%;">
                    <span class="cnj-wrapper">
                        <span class="processo-clicavel-controle" data-proc-nav="${processo}" title="Clique para ir ao Controle deste processo">${processo}</span> ${badgeTribHTML} ${partesHTML}
                    </span>
                    ${opts.badgeRelHTML || ''} ${opts.badgeDuplicadoHTML || ''}
                    ${btnHistoricoHeaderHTML}
                </div>
                ${(() => { const classeFinal = opts.datajud_classe || getGlobalClasse(processo) || ''; return (classeFinal || opts.datajud_orgao) ? `
                <div class="proc-cnj-info" style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 6px; opacity: 0.9;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    ${classeFinal ? `<span style="font-weight: 600;">${classeFinal}</span>` : ''}
                    ${(classeFinal && opts.datajud_orgao) ? '<span style="opacity: 0.5;">•</span>' : ''}
                    ${opts.datajud_orgao ? `<span>${opts.datajud_orgao}</span>` : ''}
                </div>
                ` : ''; })()}
            </div>
        `;

        const headerRowHTML = `
            <div class="proc-header-row-modern">
                ${leftContent}
            </div>
        `;

        const dateContainer = opts.dataProc ? `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(120, 120, 130, 0.2); font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                <span><strong>Data de Disponibilização:</strong> ${opts.dataProc}</span>
            </div>
        ` : '';

        return headerRowHTML + tagsContainer + dateContainer + anotacaoContainer;
    }

    function handleCriarTag(notaInputElement) {
        const selecao = window.getSelection().toString().trim(); if (!selecao) { showToast("A criação da tag requer a seleção prévia de uma palavra no texto.", "⚠️"); return; } if (selecao.length > 50) { showToast("A seleção excede o limite de 50 caracteres para uma tag.", "⚠️"); return; }
        let tagFormatada = selecao.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9À-ÿ_]/g, '').toLowerCase();
        if (tagFormatada.length > 0) { tagFormatada = "#" + tagFormatada; notaInputElement.value = notaInputElement.value ? notaInputElement.value + " " + tagFormatada : tagFormatada; notaInputElement.dispatchEvent(new Event('change')); notaInputElement.dispatchEvent(new Event('input')); showToast(`Tag ${tagFormatada} criada!`, "🔖"); } else { showToast("O formato do texto selecionado não é válido para criar uma tag.", "⚠️"); }
    }

    function handleMarcarTexto() {
        const selection = window.getSelection(); if (!selection.rangeCount || selection.isCollapsed) { showToast("A marcação requer a seleção prévia de um trecho do texto.", "⚠️"); return; }
        const range = selection.getRangeAt(0); const mark = document.createElement('mark'); mark.className = 'marca-texto';
        try { range.surroundContents(mark); selection.removeAllRanges(); showToast("Texto destacado!", "🖌️"); const activeKey = document.getElementById('focusModeOverlay').getAttribute('data-active-key'); if (activeKey && prazosSalvos[activeKey]) { prazosSalvos[activeKey].textoHtml = document.getElementById('focusTeorContent').innerHTML; savePrazosSalvos(); const teorBox = document.querySelector(`.intimacao-card[data-key="${activeKey}"] .teor-inner-box`); if (teorBox) safeSetInnerHTML(teorBox, prazosSalvos[activeKey].textoHtml);; } } catch (e) { showToast("O destaque não suporta seleções de texto muito extensas.", "⚠️"); }
    }

    function getPdfStyles() {
        return `
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            background: #f4f5f7; /* Cream Canvas */
            margin: 0; 
            padding: 40px; 
            color: #3f3f46; /* Ink */
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #e6dfd8; padding-bottom: 24px; margin-bottom: 24px; }
        .brand-area { display: flex; align-items: center; gap: 12px; }
        .logo-box { background: #0075de; color: #ffffff; width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; letter-spacing: -1px; border: 1px solid rgba(0,0,0,0.05); }
        .brand-title { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.25px; color: #3f3f46; }
        .brand-meta { font-size: 13px; color: #6c6a64; display: flex; gap: 12px; align-items: center; margin-top: 4px; }
        .info-area { text-align: right; }
        .info-title { font-size: 14px; font-weight: 700; color: #0075de;  margin: 0 0 4px 0; letter-spacing: 0.5px; }
        .info-date { font-size: 12px; color: #8e8b82; margin: 0; }
        
        .kpi-board { display: flex; gap: 16px; margin-bottom: 32px; }
        .kpi-card { flex: 1; padding: 16px; border-radius: 8px; border: 1px solid #ffffff; background: #e4e4e7; text-align: center; }
        .kpi-val { font-size: 28px; font-weight: 700; letter-spacing: -1px; margin-bottom: 4px; color: #141413; }
        .kpi-label { font-size: 12px; font-weight: 600; color: #6c6a64;  letter-spacing: 0.5px; }

        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; margin-top: 16px; border: 1px solid #e6dfd8; border-radius: 8px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        th { color: #8e8b82; font-weight: 600; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e6dfd8; font-size: 11px;  letter-spacing: 0.05em; background: #faf9f5; }
        td { padding: 16px; border-bottom: 1px solid #e6dfd8; vertical-align: top; }
        tbody tr:nth-child(even) { background-color: #faf9f5; }
        tbody tr:last-child td { border-bottom: none; }
        .proc-name { font-weight: 700; color: #141413; display: block; margin-bottom: 4px; letter-spacing: 0.01em; }
        .proc-sub { color: #6c6a64; font-size: 11px; font-family: ui-monospace, monospace; }
        .fatal-date { font-weight: 700; color: #0075de; display: block; margin-bottom: 4px; font-size: 14px; }
        .datas-secundarias { font-size: 11px; color: #8e8b82; line-height: 1.4; display: block; margin-top: 4px; }
        
        .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; display: inline-block; white-space: nowrap; letter-spacing: 0.125px; }
        .bg-trib { background: rgba(0, 117, 222, 0.1); color: #0075de; border: 1px solid rgba(0, 117, 222, 0.2); }
        .bg-green { background: rgba(13, 130, 110, 0.1); color: #0d826e; border: 1px solid rgba(13, 130, 110, 0.2); }
        .bg-gray { background: #e6dfd8; color: #6c6a64; }
        .bg-orange { background: rgba(232, 165, 90, 0.15); color: #e8a55a; border: 1px solid rgba(232, 165, 90, 0.2); }
        .bg-red { background: rgba(212, 76, 71, 0.1); color: #d44c47; border: 1px solid rgba(212, 76, 71, 0.2); }

        .tag-badge { background: #e6dfd8; color: #6c6a64; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; margin-right: 4px; display: inline-block; margin-bottom: 4px; border: 1px solid #e6dfd8; }
        .tag-radar { background: rgba(204, 120, 92, 0.1); color: #a9583e; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-right: 4px; display: inline-block; margin-bottom: 4px; border: 1px solid rgba(204, 120, 92, 0.2); }
        
        .checklist-box { background: #f4f5f7; border: 1px solid #e6dfd8; border-radius: 6px; padding: 8px 12px; margin-top: 8px; font-size: 12px; color: #3f3f46; }
        .checklist-item { margin-bottom: 4px; display: flex; align-items: flex-start; gap: 6px; }
        .checklist-item:last-child { margin-bottom: 0; }
        
        .progress-container { width: 100%; background-color: rgba(255,255,255,0.4); border-radius: 4px; height: 6px; margin-top: 8px; overflow: hidden; border: 1px solid rgba(0,0,0,0.05); }
        .progress-bar { height: 100%; border-radius: 4px; }
        
        tr.row-cumprido { opacity: 0.6; }
    `;
    }



    function renderizarSecaoResumoIA(itemKey, text, container, btnContainer = null) {
        const targetBtnContainer = btnContainer || container;
        const existingBox = container.querySelector('.ai-summary-box');
        if (existingBox) existingBox.remove();
        const existingBtn = targetBtnContainer.querySelector('.btn-resumo-ia-trigger');
        if (existingBtn) existingBtn.remove();

        const cachedSummary = localStorage.getItem('djen_resumo_ia_' + itemKey);
        if (cachedSummary) {
            const summaryBox = document.createElement('div');
            summaryBox.className = 'ai-summary-box';
            
            const header = document.createElement('div');
            header.className = 'ai-summary-header';
            header.innerHTML = `<span>✨ Resumo Inteligente (IA)</span>`;
            
            const cleanBtn = document.createElement('button');
            cleanBtn.className = 'btn-clean-summary';
            cleanBtn.setAttribute('title', 'Remover resumo');
            cleanBtn.textContent = '×';
            cleanBtn.onclick = (e) => {
                e.stopPropagation();
                localStorage.removeItem('djen_resumo_ia_' + itemKey);
                renderizarSecaoResumoIA(itemKey, text, container, btnContainer);
            };
            header.appendChild(cleanBtn);
            
            const content = document.createElement('div');
            content.className = 'ai-summary-content';
            content.textContent = cachedSummary;
            
            summaryBox.append(header, content);
            container.prepend(summaryBox);
        } else {
            const triggerBtn = document.createElement('button');
            triggerBtn.className = 'btn-resumo-ia-trigger';
            triggerBtn.style.marginTop = '0px';
            triggerBtn.style.marginBottom = '0px';
            triggerBtn.innerHTML = `✨ Resumir com IA`;
            triggerBtn.onclick = async (e) => {
                e.stopPropagation();
                if (iaProvider !== 'ollama' && iaProvider !== 'chrome_ai' && !iaApiKey) {
                    showToast("Por favor, configure sua chave de API nas opções de IA ⚙️", "⚠️");
                    return;
                }
                
                triggerBtn.disabled = true;
                triggerBtn.innerHTML = `⏳ Resumindo...`;
                
                try {
                    const cleanTxt = cleanText(text);
                    const prompt = `Resuma a seguinte publicação jurídica de forma muito curta (máximo 2 frases), direta e objetiva, extraindo a ação necessária exigida pelo juiz ou tribunal e o prazo aplicável (se houver):\n\n${cleanTxt}`;
                    let summary = "";

                    // Integração Chrome Built-in AI
                    if (iaProvider === 'chrome_ai') {
                        if (window.ai && window.ai.languageModel) {
                            try {
                                const capabilities = await window.ai.languageModel.capabilities();
                                if (capabilities.available === "readily" || capabilities.available === "after-download") {
                                    const session = await window.ai.languageModel.create({
                                        systemPrompt: "Você é um assistente jurídico experiente que resume publicações judiciais em português brasileiro. Seja muito curto e objetivo."
                                    });
                                    summary = await session.prompt(prompt);
                                    if (typeof session.destroy === 'function') session.destroy();
                                } else {
                                    console.warn("DJEN: Chrome AI não está disponível no momento. Disponibilidade: " + capabilities.available);
                                    throw new Error("Chrome AI indisponível");
                                }
                            } catch (aiErr) {
                                console.warn("DJEN: Falha no Chrome AI. Tentando fallback para Ollama local ou API.", aiErr);
                                // Fallback for Chrome AI -> Try Ollama Local then Gemini (if key exists)
                                iaProvider = (iaApiKey) ? 'gemini' : 'ollama'; 
                            }
                        } else {
                            console.warn("DJEN: window.ai.languageModel não detectado no navegador. Usando fallback.");
                            iaProvider = (iaApiKey) ? 'gemini' : 'ollama';
                        }
                    }

                    // Se não foi resolvido pelo Chrome AI (ou o provider original era API)
                    if (!summary) {
                        let url = "";
                        let headers = { 'Content-Type': 'application/json' };
                        let body = {};
                        
                        if (iaProvider === 'gemini') {
                            let model = (iaModel || "gemini-3.6-flash").trim().replace(/^models\//, '');
                            url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${iaApiKey}`;
                            body = { contents: [{ parts: [{ text: prompt }] }] };
                        } else if (iaProvider === 'openai' || iaProvider === 'custom') {
                            url = iaEndpoint || "https://api.openai.com/v1/chat/completions";
                            if (iaApiKey) headers['Authorization'] = `Bearer ${iaApiKey}`;
                            body = {
                                model: iaModel || "gpt-4o-mini",
                                messages: [{ role: "user", content: prompt }]
                            };
                        } else if (iaProvider === 'ollama') {
                            url = iaEndpoint || "http://localhost:11434/v1/chat/completions";
                            body = {
                                model: iaModel || "llama3",
                                messages: [{ role: "user", content: prompt }]
                            };
                        }
                        
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify(body)
                        });
                        
                        if (!response.ok) {
                            const errText = await response.text();
                            console.error("DJEN API Response Error:", errText);
                            throw new Error(`Status: ${response.status}`);
                        }
                        
                        const result = await response.json();
                        
                        if (iaProvider === 'gemini') {
                            if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts[0]) {
                                summary = result.candidates[0].content.parts[0].text.trim();
                            }
                        } else {
                            if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
                                summary = result.choices[0].message.content.trim();
                            }
                        }
                    }
                    
                    if (summary) {
                        localStorage.setItem('djen_resumo_ia_' + itemKey, summary);
                        renderizarSecaoResumoIA(itemKey, text, container, btnContainer);
                    } else {
                        throw new Error("Resposta vazia ou inválida da IA");
                    }
                } catch (err) {
                    console.error("DJEN IA Error:", err);
                    showToast("Erro ao gerar resumo IA. Verifique as opções e console do navegador.", "❌");
                    triggerBtn.disabled = false;
                    triggerBtn.innerHTML = `✨ Tentar novamente`;
                }
            };
            if (targetBtnContainer === container) {
                container.prepend(triggerBtn);
            } else {
                targetBtnContainer.appendChild(triggerBtn);
            }
        }
    }

    function executarBackup() {
        const oab = document.getElementById('oabNum')?.value.replace(/\D/g, '') || "000000";
        const uf = document.getElementById('oabUf')?.value.trim().toUpperCase() || "SP";
        const agora = new Date();
        const dataStr = `${String(agora.getDate()).padStart(2, '0')}-${String(agora.getMonth() + 1).padStart(2, '0')}-${agora.getFullYear()}`;
        const horaStr = `${String(agora.getHours()).padStart(2, '0')}h${String(agora.getMinutes()).padStart(2, '0')}`;
        const nomeArquivo = `DJEN_Backup_OAB${uf}${oab}_${dataStr}_${horaStr}.json`;

        const backupData = {
            versao: 5,
            metadados: { data_geracao: agora.toISOString(), djen_versao_app: "50.69" },
            prazosSalvos: prazosSalvos,
            estatisticas: {
                totalBuscas: totalBuscas,
                totalLidos: window.totalLidos,
                totalSalvos: window.totalSalvos,
                totalCumpridosHistorico: window.totalCumpridosHistorico
            },
            configuracoes: {
                oabNum: document.getElementById('oabNum')?.value || "",
                oabUf: document.getElementById('oabUf')?.value || "SP",
                tema: temaAtual,
                fontFocus: fontSizeFocoAtual,
                termosRadar: palavrasUrgentes,
                emailGcal: document.getElementById('inputEmailGcal')?.value || "",
                datajudApiKey: configDataJudApiKey || "",
                iaProvider: iaProvider || "",
                iaApiKey: iaApiKey || "",
                iaModel: iaModel || "",
                iaEndpoint: iaEndpoint || "",
                jurisflowEnabled: configJurisflowEnabled,
                jurisflowPort: configJurisflowPort,
                jurisflowToken: configJurisflowToken,
                notificarBackground: isNotificarBackground,
                suspensoes: customSuspensions,
                googleTasksClientId: window.GoogleTasksService ? window.GoogleTasksService.getClientId() : ""
            },
            prazos_arquivados: [..._appCache.prazosArquivados],
            dicionario_apelidos: { ..._appCache.apelidos },
            dicionario_classes: { ..._appCache.classes },
            dicionario_partes: { ..._appCache.partes },
            dicionario_sistemas: { ..._appCache.sistemas },
            historico_buscas: window.historicoBuscas
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = nomeArquivo;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);

        localStorage.setItem('djen_ultimo_backup_data', agora.toISOString());
        const alertaBackup = document.getElementById('djen-backup-alert');
        if (alertaBackup) alertaBackup.remove();

        const total = Object.keys(prazosSalvos).length;
        showToast(`✅ Backup salvo! ${total} prazos protegidos.`, "💾");
    }

    function executarRestauracao(data) {
        if (!data || typeof data !== 'object') {
            throw new Error("Dados de backup inválidos ou vazios.");
        }

        for (let key in prazosSalvos) { delete prazosSalvos[key]; }

        let sourcePrazos = null;
        if (data.prazosSalvos && typeof data.prazosSalvos === 'object') {
            sourcePrazos = data.prazosSalvos;
        } else {
            // Suporta formatos legados/antigos onde o JSON raiz é o próprio dicionário de prazos
            const keys = Object.keys(data);
            const hasPrazosDirectly = keys.length > 0 && keys.every(k => {
                const item = data[k];
                return item && typeof item === 'object' && ('processo' in item || 'teor' in item || 'tarefas' in item);
            });
            if (hasPrazosDirectly) {
                sourcePrazos = data;
            }
        }

        if (sourcePrazos) {
            Object.assign(prazosSalvos, sourcePrazos);
        }

        if (data.configuracoes) {
            const cfg = data.configuracoes;
            if (cfg.oabNum) {
                const elNum = document.getElementById('oabNum');
                if (elNum) elNum.value = cfg.oabNum;
            }
            if (cfg.oabUf) {
                const elUf = document.getElementById('oabUf');
                if (elUf) elUf.value = cfg.oabUf;
            }
            if (cfg.tema) {
                temaAtual = cfg.tema;
                SafeStorage.set({ 'djen_theme': temaAtual });
                if (typeof aplicarTema === 'function') aplicarTema(temaAtual);
            }
            if (cfg.fontFocus) {
                fontSizeFocoAtual = parseInt(cfg.fontFocus);
                document.documentElement.style.setProperty('--font-focus', fontSizeFocoAtual + 'px');
                SafeStorage.set({ 'djen_font_focus': String(fontSizeFocoAtual) });
            }
            if (cfg.oabNum) SafeStorage.set({ 'djen_oab_numero': cfg.oabNum });
            if (cfg.oabUf) SafeStorage.set({ 'djen_oab_estado': cfg.oabUf });
            if (cfg.termosRadar) {
                const val = Array.isArray(cfg.termosRadar) ? cfg.termosRadar.join(',') : String(cfg.termosRadar);
                SafeStorage.set({ 'djen_termos_radar': val });
            }
            if (cfg.termosRadar) {
                window.palavrasUrgentes = Array.isArray(cfg.termosRadar) ? cfg.termosRadar : String(cfg.termosRadar).split(',');
            }
            if (cfg.emailGcal) {
                // Atualiza _appCache + SafeStorage (sem localStorage)
                _appCache.emailGcal = cfg.emailGcal;
                AppState.config.emailAgenda = cfg.emailGcal;
                SafeStorage.set({ 'djen_email_gcal': cfg.emailGcal });
                const inputGcal = document.getElementById('inputEmailGcal');
                if (inputGcal) inputGcal.value = cfg.emailGcal;
            }
            if (cfg.googleTasksClientId) {
                SafeStorage.set({ 'djen_gtasks_client_id': cfg.googleTasksClientId });
                if (window.GoogleTasksService) window.GoogleTasksService.setClientId(cfg.googleTasksClientId);
                const inputGtasks = document.getElementById('gtasksClientId');
                if (inputGtasks) inputGtasks.value = cfg.googleTasksClientId;
            }
            // Restaurar configurações avançadas (backup v5+)
            if (cfg.datajudApiKey) {
                configDataJudApiKey = cfg.datajudApiKey;
                SafeStorage.set({ 'djen_datajud_api_key': cfg.datajudApiKey });
                const inp = document.getElementById('inputApiKeyDataJud');
                if (inp) inp.value = cfg.datajudApiKey;
            }
            if (cfg.iaProvider) { iaProvider = cfg.iaProvider; SafeStorage.set({ 'djen_ia_provider': cfg.iaProvider }); }
            if (cfg.iaApiKey) { iaApiKey = cfg.iaApiKey; SafeStorage.set({ 'djen_ia_api_key': cfg.iaApiKey }); }
            if (cfg.iaModel) { iaModel = cfg.iaModel; SafeStorage.set({ 'djen_ia_model': cfg.iaModel }); }
            if (cfg.iaEndpoint) { iaEndpoint = cfg.iaEndpoint; SafeStorage.set({ 'djen_ia_endpoint': cfg.iaEndpoint }); }
            if (cfg.jurisflowEnabled !== undefined) { configJurisflowEnabled = cfg.jurisflowEnabled; SafeStorage.set({ 'djen_jurisflow_enabled': String(cfg.jurisflowEnabled) }); }
            if (cfg.jurisflowPort) { configJurisflowPort = cfg.jurisflowPort; SafeStorage.set({ 'djen_jurisflow_port': cfg.jurisflowPort }); }
            if (cfg.jurisflowToken) { configJurisflowToken = cfg.jurisflowToken; SafeStorage.set({ 'djen_jurisflow_token': cfg.jurisflowToken }); }
            if (cfg.notificarBackground !== undefined) { isNotificarBackground = cfg.notificarBackground; SafeStorage.set({ 'djen_config_notificar_background_enabled': String(cfg.notificarBackground) }); }
            if (cfg.suspensoes) {
                customSuspensions = Array.isArray(cfg.suspensoes) ? cfg.suspensoes : [];
                SafeStorage.set({ 'djen_suspensoes_custom': JSON.stringify(customSuspensions) });
            }
        }
        if (data.estatisticas) {
            window.totalBuscas = data.estatisticas.totalBuscas || 0;
            window.totalLidos = data.estatisticas.totalLidos || 0;
            window.totalSalvos = data.estatisticas.totalSalvos || 0;
            window.totalCumpridosHistorico = data.estatisticas.totalCumpridosHistorico || 0;
        }

        if (data.dicionario_apelidos) {
            const parsed = typeof data.dicionario_apelidos === 'string'
                ? safeJSONParse(data.dicionario_apelidos, {})
                : data.dicionario_apelidos;
            const val = JSON.stringify(parsed);
            // Atualiza _appCache + SafeStorage (sem localStorage)
            Object.assign(_appCache.apelidos, parsed);
            SafeStorage.set({ 'djen_dicionario_apelidos': val });
        }

        if (data.prazos_arquivados) {
            const parsed = typeof data.prazos_arquivados === 'string'
                ? safeJSONParse(data.prazos_arquivados, [])
                : data.prazos_arquivados;
            const val = JSON.stringify(parsed);
            // Atualiza _appCache + SafeStorage (sem localStorage)
            _appCache.prazosArquivados = Array.isArray(parsed) ? parsed : [];
            SafeStorage.set({ 'djen_prazos_arquivados': val });
        }

        // Restaurar dicionários adicionais (backup v5+)
        if (data.dicionario_classes) {
            const parsed = typeof data.dicionario_classes === 'string' ? safeJSONParse(data.dicionario_classes, {}) : data.dicionario_classes;
            Object.assign(_appCache.classes, parsed);
            SafeStorage.set({ 'djen_dicionario_classes': JSON.stringify(parsed) });
        }
        if (data.dicionario_partes) {
            const parsed = typeof data.dicionario_partes === 'string' ? safeJSONParse(data.dicionario_partes, {}) : data.dicionario_partes;
            Object.assign(_appCache.partes, parsed);
            SafeStorage.set({ 'djen_dicionario_partes': JSON.stringify(parsed) });
        }
        if (data.dicionario_sistemas) {
            const parsed = typeof data.dicionario_sistemas === 'string' ? safeJSONParse(data.dicionario_sistemas, {}) : data.dicionario_sistemas;
            Object.assign(_appCache.sistemas, parsed);
            SafeStorage.set({ 'djen_dicionario_sistemas': JSON.stringify(parsed) });
        }

        if (data.historico_buscas) {
            try {
                const parsedHist = Array.isArray(data.historico_buscas) ? data.historico_buscas : safeJSONParse(data.historico_buscas, []);
                if (Array.isArray(parsedHist)) {
                    window.historicoBuscas = parsedHist;
                    SafeStorage.set({ 'djen_historico_buscas': JSON.stringify(window.historicoBuscas) });
                    if (typeof renderHistoricoBuscas === 'function') renderHistoricoBuscas();
                }
            } catch (e) {
                console.error("Erro ao restaurar histórico de buscas:", e);
            }
        }

        const backupDateStr = new Date().toISOString();
        SafeStorage.set({ 'djen_last_backup_date': Date.now(), 'djen_total_buscas': totalBuscas, 'djen_total_lidos': window.totalLidos, 'djen_total_salvos': window.totalSalvos, 'djen_cumpridos_total': window.totalCumpridosHistorico });
        try { localStorage.setItem('djen_ultimo_backup_data', backupDateStr); } catch(e) {}

        if (typeof savePrazosSalvos === 'function') savePrazosSalvos();
        if (typeof atualizarEstatisticas === 'function') atualizarEstatisticas();
        if (typeof renderAgenda === 'function') renderAgenda();
        if (typeof renderCalendar === 'function') renderCalendar();
        if (typeof switchView === 'function') switchView('salvos');

        const total = Object.keys(prazosSalvos).length;
        showToast(`✅ Backup restaurado! ${total} prazos carregados.`, "🔄");
    }

    function gerarPDFPrazos() {
        const todosItens = Object.values(prazosSalvos).filter(p => p.fatal || p.manual || p.cumprido);
        if (todosItens.length === 0) { showToast("Sua agenda está vazia.", "⚠️"); return; }
        
        showToast("Gerando PDF Geral...", "⏳");
        
        try {
            const workerUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('workers/exportWorker.js') : 'workers/exportWorker.js';
            const worker = new Worker(workerUrl);
            const taskId = Date.now().toString();

            worker.onmessage = function(e) {
                const { error, result, progress } = e.data;
                if (error) {
                    showToast("Erro ao gerar PDF: " + error, "❌");
                    worker.terminate();
                } else if (result) {
                    const blob = new Blob([result], { type: 'text/html' }); 
                    const url = URL.createObjectURL(blob);
                    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) { 
                        chrome.tabs.create({ url: url }); 
                    } else { 
                        window.open(url, '_blank'); 
                    }
                    showToast("Relatório Gerencial criado!", "📄");
                    worker.terminate();
                }
            };

            worker.onerror = function(err) {
                showToast("Erro no processamento do PDF.", "❌");
                worker.terminate();
            };

            const dataHoje = new Date();
            const dataFormatada = `${String(dataHoje.getDate()).padStart(2, '0')}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${dataHoje.getFullYear()}`;

            const brandingObj = {
                nome: brandingNome || 'Buscador DJEN',
                slogan: brandingSlogan || 'Seus prazos sob controle',
                contato: brandingContato || 'www.buscadordjen.com.br',
                cor: brandingCor || '#3a72b5',
                logo: brandingLogo || 'https://www.buscadordjen.com.br/wp-content/uploads/2024/02/DJEN_03-1024x455.png'
            };

            worker.postMessage({
                action: 'gerarPDFHtml',
                payload: { 
                    itensArray: todosItens, 
                    mesAnoStr: "Geral_" + dataFormatada,
                    advogadoNome: brandingObj.nome,
                    pdfStyles: typeof getPdfStyles === 'function' ? getPdfStyles() : '',
                    palavrasUrgentes: typeof palavrasUrgentes !== 'undefined' ? palavrasUrgentes : [],
                    branding: brandingObj
                },
                taskId
            });
        } catch (err) {
            console.error("Falha ao iniciar worker:", err);
            showToast("Falha ao usar o processador em background.", "⚠️");
        }
    }

    // Funções de exportação (PDF, CSV, TXT, GCal, Compartilhamento) foram extraídas para js/export_service.js

    window.cacheMunicipios = window.cacheMunicipios || {};
    let cacheMunicipios = window.cacheMunicipios;
    let feriadosExtras = {};

    async function carregarMunicipios(uf, datalistId) {
        if (!document.getElementById(datalistId)) { const dl = document.createElement('datalist'); dl.id = datalistId; document.body.appendChild(dl); }
        const datalist = document.getElementById(datalistId);
        if (!cacheMunicipios[uf]) {
            try {
                const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
                const dados = await r.json(); cacheMunicipios[uf] = dados.map(m => m.nome); datalist.replaceChildren();;
                cacheMunicipios[uf].forEach(nome => { const opt = document.createElement('option'); opt.value = nome; datalist.appendChild(opt); });
            } catch (e) { }
        } else if (datalist.children.length === 0) {
            cacheMunicipios[uf].forEach(nome => { const opt = document.createElement('option'); opt.value = nome; datalist.appendChild(opt); });
        }
    }

    async function buscarFeriadosTribunal(siglaTribunal) {
        if (!siglaTribunal || siglaTribunal === 'MANUAL') return {};

        try {
            if (!window.cacheFeriadosTribunaisJson) {
                const url = `https://raw.githubusercontent.com/sobeitnow0/prazos-judiciais-api/main/feriados.json?v=${Date.now()}`;
                console.log("DJEN: Baixando base oficial de feriados ->", url);
                const r = await fetch(url);
                if (!r.ok) throw new Error(`Arquivo não encontrado (Erro ${r.status})`);
                window.cacheFeriadosTribunaisJson = await r.json();
            }

            const json = window.cacheFeriadosTribunaisJson;
            let regras = [];

            if (json.feriados_nacionais) regras = regras.concat(json.feriados_nacionais);
            if (json.pontos_facultativos_comuns) regras = regras.concat(json.pontos_facultativos_comuns);

            const categorias = ['tribunais_superiores', 'tribunais_regionais_federais', 'tribunais_regionais_do_trabalho', 'tribunais_de_justica'];
            let tribunalEncontrado = null;

            for (let cat of categorias) {
                if (json[cat] && json[cat][siglaTribunal.toUpperCase()]) {
                    tribunalEncontrado = json[cat][siglaTribunal.toUpperCase()];
                    break;
                }
            }

            if (tribunalEncontrado) {
                if (tribunalEncontrado.feriados_especificos) regras = regras.concat(tribunalEncontrado.feriados_especificos);
                if (tribunalEncontrado.feriados_toda_regiao) regras = regras.concat(tribunalEncontrado.feriados_toda_regiao);
                if (tribunalEncontrado.suspensoes_por_conveniencia) regras = regras.concat(tribunalEncontrado.suspensoes_por_conveniencia);

                if (tribunalEncontrado.recesso && tribunalEncontrado.recesso.inicio) {
                    regras.push({ data_inicio: tribunalEncontrado.recesso.inicio, data_fim: tribunalEncontrado.recesso.fim, descricao: "Recesso Forense" });
                }
            }

            let dicionarioFeriados = {};

            regras.forEach(regra => {
                let dataIn = regra.data_inicio || regra.data;
                let dataFi = regra.data_fim || regra.data;
                let nomeFeriado = regra.descricao || regra.nome || "Feriado/Suspensão Tribunal";

                if (!dataIn) return;

                let dtAtual = new Date(`${dataIn}T12:00:00`);
                let dtFim = new Date(`${dataFi}T12:00:00`);

                while (dtAtual <= dtFim) {
                    let chaveData = `${dtAtual.getFullYear()}-${String(dtAtual.getMonth() + 1).padStart(2, '0')}-${String(dtAtual.getDate()).padStart(2, '0')}`;
                    dicionarioFeriados[chaveData] = nomeFeriado;
                    dtAtual.setDate(dtAtual.getDate() + 1);
                }
            });

            return dicionarioFeriados;
        } catch (erro) {
            console.error("DJEN: Erro fatal ao buscar feriados do GitHub ->", erro);
            return {};
        }
    }

    async function atualizarFeriadosNacionais() {
        try {
            const r = await fetch(`https://raw.githubusercontent.com/sobeitnow0/FeriadosDoBrasil---buscador-djen/main/feriados.json?v=${Date.now()}`);
            if (!r.ok) throw new Error("404 Not Found");
            const dadosBrutos = await r.json();
            const dicionarioRapido = {};
            dadosBrutos.forEach(feriado => {
                const data = String(feriado.data || feriado.date);
                const uf = feriado.uf ? feriado.uf.toUpperCase() : null;
                const mun = feriado.municipio ? feriado.municipio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : null;
                if (mun) {
                    if (!dicionarioRapido[mun]) dicionarioRapido[mun] = [];
                    dicionarioRapido[mun].push(data);
                } else if (uf) {
                    if (!dicionarioRapido[uf]) dicionarioRapido[uf] = [];
                    dicionarioRapido[uf].push(data);
                } else {
                    if (!dicionarioRapido["BR"]) dicionarioRapido["BR"] = [];
                    dicionarioRapido["BR"].push(data);
                }
            });
            feriadosExtras = dicionarioRapido;
            SafeStorage.set({ 'djen_feriados_dinamicos': JSON.stringify(feriadosExtras) });
        } catch (e) {
            SafeStorage.get(['djen_feriados_dinamicos'], (d) => { if (d.djen_feriados_dinamicos) feriadosExtras = safeJSONParse(d.djen_feriados_dinamicos, []); });
        }
    }

    window.promessasIbge = window.promessasIbge || {};
    window.promessasFeriadosMun = window.promessasFeriadosMun || {};

    async function buscarFeriadosMunicipaisAnual(ano, uf, municipioNome) {
        if (!uf || !municipioNome) return [];

        const normalizar = (txt) => txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const ufNorm = uf.toUpperCase().trim();
        const munNorm = normalizar(municipioNome);

        if (!window.promessasIbge[ufNorm]) {
            window.promessasIbge[ufNorm] = fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufNorm}/municipios`)
                .then(r => r.json())
                .then(dados => {
                    let mapa = {};
                    dados.forEach(m => mapa[normalizar(m.nome)] = m.id);
                    return mapa;
                })
                .catch(e => {
                    console.error("DJEN: Falha no IBGE", e);
                    return {};
                });
        }

        const mapaMunicipios = await window.promessasIbge[ufNorm];
        const codigoIbge = mapaMunicipios[munNorm];

        if (!codigoIbge) {
            console.warn(`DJEN: Município '${municipioNome}' não localizado no IBGE`);
            if (typeof showToast === 'function') {
                showToast(`Município '${municipioNome}' não localizado no IBGE. Feriados locais ignorados.`, "⚠️");
            }
            return [];
        }

        if (!window.promessasFeriadosMun[ano]) {
            const url = `https://raw.githubusercontent.com/sobeitnow0/feriados-buscador-djen/main/feriados/municipal/json/${ano}.json?v=${Date.now()}`;
            window.promessasFeriadosMun[ano] = fetch(url)
                .then(r => r.ok ? r.json() : [])
                .catch(() => []);
        }

        const todosFeriadosAno = await window.promessasFeriadosMun[ano];

        const feriadosDaCidade = todosFeriadosAno.filter(f => String(f.codigo_ibge) === String(codigoIbge));

        return feriadosDaCidade.map(f => {
            const dataStr = String(f.data || f.date).trim();
            const partes = dataStr.split('/');
            if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
            return dataStr;
        });
    }

    function isRecessoForense(dataObj) {
        const m = dataObj.getMonth(); const d = dataObj.getDate();
        return (m === 11 && d >= 20) || (m === 0 && d <= 20);
    }

    function checarMotivoFeriado(dStr, dataObj, uf, municipio, feriadosTribunal, feriadosMunisDinamicos = []) {
        const ds = dataObj.getDay();
        if (ds === 0 || ds === 6) return "Fim de Semana";

        if (Array.isArray(customSuspensions)) {
            for (const susp of customSuspensions) {
                if (susp.start && susp.end && dStr >= susp.start && dStr <= susp.end) {
                    return susp.desc || "Suspensão de Prazo";
                }
            }
        }

        const mesDiaNovo = `${String(dataObj.getMonth() + 1).padStart(2, '0')}-${String(dataObj.getDate()).padStart(2, '0')}`;
        if (feriadosTribunal && typeof feriadosTribunal === 'object') {
            if (feriadosTribunal[dStr]) return feriadosTribunal[dStr];
            if (feriadosTribunal[mesDiaNovo]) return feriadosTribunal[mesDiaNovo];
        }

        if (isRecessoForense(dataObj)) return "Recesso Forense (Art. 220, CPC)";

        const ano = dataObj.getFullYear();

        const mesDia = `${String(dataObj.getMonth() + 1).padStart(2, '0')}-${String(dataObj.getDate()).padStart(2, '0')}`;
        const diaMes = `${String(dataObj.getDate()).padStart(2, '0')}/${String(dataObj.getMonth() + 1).padStart(2, '0')}`;
        const diaMesHifen = `${String(dataObj.getDate()).padStart(2, '0')}-${String(dataObj.getMonth() + 1).padStart(2, '0')}`;

        const format = (data) => data.toISOString().split('T')[0];
        const addDias = (data, dias) => { const nd = new Date(data); nd.setDate(nd.getDate() + dias); return nd; };

        const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100; const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451); const mes = Math.floor((h + l - 7 * m + 114) / 31); const dia = ((h + l - 7 * m + 114) % 31) + 1; const pascoa = new Date(ano, mes - 1, dia, 12, 0, 0);

        const nacionaisFixos = [`${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`, `${ano}-10-12`, `${ano}-11-02`, `${ano}-11-15`, `${ano}-11-20`, `${ano}-12-25`];
        const moveis = [format(addDias(pascoa, -47)), format(addDias(pascoa, -46)), format(addDias(pascoa, -3)), format(addDias(pascoa, -2)), format(addDias(pascoa, 60))];

        const feriadosBR = feriadosExtras["BR"] || [];
        if (nacionaisFixos.includes(dStr) || moveis.includes(dStr) || feriadosBR.includes(dStr) || feriadosBR.includes(mesDia) || feriadosBR.includes(diaMes) || feriadosBR.includes(diaMesHifen)) return "Feriado Nacional";

        const feriadosUF = uf ? (feriadosExtras[uf] || []) : [];
        if (feriadosUF.includes(dStr) || feriadosUF.includes(mesDia) || feriadosUF.includes(diaMes) || feriadosUF.includes(diaMesHifen)) return "Feriado Estadual";

        if (municipio) {
            const munFormatado = municipio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            const feriadosMunBase = feriadosExtras[munFormatado] || [];
            if (feriadosMunBase.includes(dStr) || feriadosMunBase.includes(mesDia) || feriadosMunBase.includes(diaMes) || feriadosMunBase.includes(diaMesHifen)) return "Feriado Municipal";
        }

        if (feriadosMunisDinamicos && (feriadosMunisDinamicos.includes(dStr) || feriadosMunisDinamicos.includes(mesDia) || feriadosMunisDinamicos.includes(diaMes) || feriadosMunisDinamicos.includes(diaMesHifen))) return "Feriado Municipal";

        if ([`${ano}-08-11`, `${ano}-11-01`, `${ano}-12-08`].includes(dStr)) return "Feriado Forense (Justiça Federal)";
        return "Dia Útil";
    }
    window.checarMotivoFeriado = checarMotivoFeriado;

    // =========================================================
    // MOTOR MATEMÁTICO DE PRAZOS (PURO E ISOLADO) - CORRIGIDO
    // =========================================================
    // MotorDePrazos extraído para js/motor_prazos.js

    // FUNÇÃO CORRIGIDA: preencherAuditoriaVisual
    function preencherAuditoriaVisual(timeline, container) {
        try {
            if (!container) {
                console.error("DJEN: Container da auditoria não encontrado");
                return;
            }

            if (!timeline || !timeline.length) {
                console.warn("DJEN: Timeline vazia ou inválida");
                safeSetInnerHTML(container, '<div class="audit-empty" style="text-align:center; padding:20px; color: var(--text-muted);">Nenhuma auditoria disponível para este prazo.</div>');;
                return;
            }

            container.replaceChildren();;
            container.className = "audit-flow";
            container.style.display = "grid";
            container.style.gridTemplateColumns = "repeat(auto-fill, minmax(72px, 1fr))";
            container.style.gap = "8px";
            container.style.marginTop = "16px";
            container.style.padding = "12px";
            container.style.background = "var(--card-inner)";
            container.style.borderRadius = "var(--radius-md)";
            container.style.border = "1px solid var(--border-light)";

            timeline.forEach(t => {
                const dia = document.createElement('div');
                const descSegura = String(t.desc || "Dia");

                dia.setAttribute('data-tooltip', descSegura);
                dia.className = `audit-day is-${t.tipo || 'info'}`;

                let icone = "🗓️";
                if (descSegura.includes("Nacional")) icone = "🇧🇷";
                else if (descSegura.includes("Estadual")) icone = "🚩";
                else if (descSegura.includes("Forense") || descSegura.includes("Tribunal") || descSegura.includes("Recesso") || descSegura.includes("Suspensão")) icone = "🏛️";
                else if (descSegura.includes("Municipal")) icone = "🏘️";
                else if (t.tipo === "fatal") icone = "🚨";
                else if (descSegura === "Disponibilizado" || descSegura === "Data do Evento") icone = "📥";
                else if (descSegura === "Publicação") icone = "📄";
                else if (descSegura.includes("Prorrogação")) icone = "⏰";

                const dataCurta = t.data ? String(t.data).split('T')[0].split('-').reverse().slice(0, 2).join('/') : "--/--";

                let numeroLimpo = t.numero ? String(t.numero).replace('Dia ', '').replace('Dia', '') : "-";
                if (!isNaN(numeroLimpo) && numeroLimpo.trim() !== '') {
                    const numVal = parseInt(numeroLimpo, 10);
                    if (!isNaN(numVal)) {
                        numeroLimpo = String(numVal).padStart(2, '0');
                    }
                }

                safeSetInnerHTML(dia, `
                    <div class="day-icon" style="font-size: 18px; margin-bottom: 6px;">${icone}</div>
                    <div class="day-num" style="font-size: 16px; font-weight: 700; line-height: 1;">${numeroLimpo}</div>
                    <div class="day-date" style="font-size: 10px; font-weight: 500; color: var(--text-muted); margin-top: 4px;">${dataCurta}</div>
                `);;

                dia.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 10px 4px;
                    border-radius: 8px;
                    border: 1px solid var(--border-light);
                    background: var(--bg-card);
                    transition: all 0.2s ease;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                `;

                if (t.tipo === "fatal") {
                    dia.style.background = "var(--zen-red-bg)";
                    dia.style.borderColor = "rgba(212, 76, 71, 0.3)";
                    const numDiv = dia.querySelector('.day-num');
                    if (numDiv) numDiv.style.color = "var(--zen-red)";
                } else if (t.tipo === "pulo") {
                    dia.style.opacity = "0.7";
                    dia.style.background = "transparent";
                    dia.style.boxShadow = "none";
                }

                container.appendChild(dia);
            });

        } catch (e) {
            console.error("DJEN: Erro ao desenhar a grade:", e);
            if (container) {
                safeSetInnerHTML(container, '<div class="audit-error" style="text-align:center; padding:20px; color: var(--zen-red);">Erro ao carregar auditoria. Recalcule o prazo.</div>');;
            }
        }
    }

    // extrairPrazoSugerido e autoPreencherTribunal extraídas para js/calculadora_manual.js

    let timeoutDesfazer;

    function animarOcultarCard(currentCardNode, callback) {
        if (!currentCardNode) {
            callback();
            return;
        }
        currentCardNode.classList.remove('aberto');
        const rect = currentCardNode.getBoundingClientRect();
        currentCardNode.style.maxHeight = rect.height + 'px';
        currentCardNode.offsetHeight; // force reflow
        currentCardNode.classList.add('removing');

        const vList = window.currentVirtualList;
        if (vList && currentCardNode.closest('#listaSalvos')) {
            const idx = parseInt(currentCardNode.getAttribute('data-vindex'));
            if (!isNaN(idx)) {
                // Temporarily zero the height of this item in the virtual scroller
                vList.itemHeights[idx] = 0;
                vList.updatePositions();
                
                // Animate other visible cards sliding up
                for (let [i, node] of vList.renderedItems.entries()) {
                    if (i !== idx) {
                        node.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
                        node.style.transform = `translateY(${vList.itemPositions[i]}px)`;
                    }
                }
            }
        }

        setTimeout(callback, 300);
    }

    function removerComDesfazer(key, isBuscaContext, currentCardNode = null) {
        if (!prazosSalvos[key]) return;
        const itemSalvoBak = JSON.parse(JSON.stringify(prazosSalvos[key]));
        delete prazosSalvos[key];
        savePrazosSalvos();
        atualizarEstatisticas();

        animarOcultarCard(currentCardNode, () => {
            if (isBuscaContext) applyFilters();
            else { renderAgenda(); renderCalendar(); }
        });

        if (isBuscaContext) updateProgressBar();
        const toast = document.getElementById('toastDesfazer');
        if (toast) {
            const msgSpan = toast.querySelector('span');
            if (msgSpan) safeSetInnerHTML(msgSpan, "Registro excluído");
            toast.classList.add('show');
        }

        document.getElementById('btnAcaoDesfazer').onclick = () => {
            prazosSalvos[key] = itemSalvoBak;
            savePrazosSalvos();
            atualizarEstatisticas();
            if (toast) toast.classList.remove('show');
            if (isBuscaContext) applyFilters();
            else { renderAgenda(); renderCalendar(); }
        };

        clearTimeout(timeoutDesfazer);
        timeoutDesfazer = setTimeout(() => { if (toast) toast.classList.remove('show'); }, 6000);
    }

    let timeoutCumprir;
    function alternarCumprimento(key, currentCardNode, isBuscaContext) {
        const item = prazosSalvos[key]; if (!item) return;
        const isCumprindo = !item.cumprido;

        // #10 - Toast de desfazer para "Marcar como Cumprido"
        if (isCumprindo) {
            const estadoAnterior = item.cumprido;
            item.cumprido = true;
            item.dataCumprimento = new Date().toISOString();
            adicionarEventoHistorico(key, 'cumprimento', 'Prazo marcado como cumprido');
            // Integração Jurisflow: Marcar como feito
            if (window.configJurisflowEnabled) {
                fetch(`http://127.0.0.1:${window.configJurisflowPort || '18080'}/api/mark_done`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.configJurisflowToken || 'jf_djen_secret'}` },
                    body: JSON.stringify({ processo: item.processo, fatal: item.fatal })
                }).catch(e => console.warn('Jurisflow offline'));
            }
            processarCheckCumprido(true, true);

            const toast = document.getElementById('toastDesfazer');
            if (toast) {
                const msgSpan = toast.querySelector('span');
                if (msgSpan) safeSetInnerHTML(msgSpan, 'Prazo marcado como cumprido');
                toast.classList.add('show');
            }
            clearTimeout(timeoutDesfazer);
            const btnDesfazer = document.getElementById('btnAcaoDesfazer');
            if (btnDesfazer) {
                btnDesfazer.onclick = () => {
                    item.cumprido = estadoAnterior;
                    delete item.dataCumprimento;
                    savePrazosSalvos();
                    processarCheckCumprido(false, true);
                    if (toast) toast.classList.remove('show');
                    if (isBuscaContext) applyFilters(); else { renderAgenda(); renderCalendar(); }
                };
            }
            timeoutDesfazer = setTimeout(() => {
                savePrazosSalvos();
                if (toast) toast.classList.remove('show');
            }, 5000);
        } else {
            item.cumprido = false;
            delete item.dataCumprimento;
            adicionarEventoHistorico(key, 'cumprimento', 'Prazo reaberto para contagem');
            savePrazosSalvos(); processarCheckCumprido(false, true);
        }


        if (isCumprindo && currentCardNode) {
            currentCardNode.classList.add('anim-success-flash');
            setTimeout(() => currentCardNode.classList.remove('anim-success-flash'), 1000);
            const btnCumprir = currentCardNode.querySelector('.btn-cumprir-quadrado');
            if (btnCumprir) {
                btnCumprir.classList.add('anim-success-pop', 'anim-success-ring');
                setTimeout(() => {
                    btnCumprir.classList.remove('anim-success-pop', 'anim-success-ring');
                }, 1000);
            }
        }

        const shouldHide = !isBuscaContext && (
            (filtroAgendaAtivo !== 'cumpridos' && isCumprindo) ||
            (filtroAgendaAtivo === 'cumpridos' && !isCumprindo)
        );

        if (shouldHide) {
            animarOcultarCard(currentCardNode, () => {
                renderAgenda();
                renderCalendar();
            });
        } else {
            currentCardNode.classList.toggle('is-cumprido', isCumprindo);
            const btnCumprir = currentCardNode.querySelector('.btn-cumprir-quadrado');
            if (btnCumprir) {
                btnCumprir.classList.toggle('is-cumprido', isCumprindo);
                if (isCumprindo) {
                    safeSetInnerHTML(btnCumprir, iconesSVG.retro);
                    btnCumprir.setAttribute('aria-label', 'Reabrir Prazo');
                    btnCumprir.setAttribute('data-tooltip', 'Reabrir Prazo');
                } else {
                    safeSetInnerHTML(btnCumprir, iconesSVG.check);
                    btnCumprir.setAttribute('aria-label', 'Marcar como Cumprido');
                    btnCumprir.setAttribute('data-tooltip', 'Marcar como Cumprido');
                }
            }

            const badge = currentCardNode.querySelector('.badge-salvo');
            if (badge) {
                if (isCumprindo) {
                    badge.className = 'badge-salvo s-gray';
                    const fatalDate = item.fatal || '';
                    badge.innerHTML = `✅ Cumprido`;
                } else {
                    const hj = new Date(); hj.setHours(12, 0, 0, 0);
                    const dataFatal = parseDateBR(item.fatal);
                    const diff = Math.ceil((dataFatal - hj) / (1000 * 3600 * 24));
                    let corSeloClass = diff <= 5 ? "s-orange" : "s-green";
                    if (diff === 0) corSeloClass = "s-hoje";
                    if (diff < 0) corSeloClass = "s-hoje";
                    if (item.espera && diff >= 0) corSeloClass = "s-purple";

                    const dataFormatada = item.fatal ? item.fatal.substring(0, 5) : "";
                    let txtStatus = "";
                    if (diff < 0) {
                        txtStatus = `Atrasado ${Math.abs(diff)}d • ${dataFormatada}`;
                    } else if (diff === 0) {
                        txtStatus = `Hoje • ${dataFormatada}`;
                    } else if (diff === 1) {
                        txtStatus = `Amanhã • ${dataFormatada}`;
                    } else {
                        txtStatus = `${diff} dias • ${dataFormatada}`;
                    }
                    badge.className = 'badge-salvo ' + corSeloClass;
                    badge.innerHTML = txtStatus;
                }
            }

            setTimeout(() => {
                if (isBuscaContext) applyFilters();
                else {
                    renderAgenda();
                    renderCalendar();
                }
            }, 250);
        }

        atualizarEstatisticas();
        const toast = document.getElementById('toastDesfazer');
        if (toast) {
            const msgSpan = toast.querySelector('span');
            if (msgSpan) safeSetInnerHTML(msgSpan, isCumprindo ? `Prazo cumprido` : `Prazo reaberto`);
            toast.classList.add('show');
        }

        document.getElementById('btnAcaoDesfazer').onclick = () => {
            item.cumprido = !isCumprindo;
            if (item.cumprido) item.dataCumprimento = new Date().toISOString(); else delete item.dataCumprimento;
            savePrazosSalvos(); processarCheckCumprido(item.cumprido, true); atualizarEstatisticas();
            if (toast) toast.classList.remove('show');
            if (isBuscaContext) applyFilters();
            else { renderAgenda(); renderCalendar(); }
        };

        clearTimeout(timeoutCumprir);
        timeoutCumprir = setTimeout(() => { if (toast) toast.classList.remove('show'); }, 6000);
    }


    // ==========================================
    // DELEGAÇÃO DE EVENTOS DE CLIQUE
    // ==========================================
    document.addEventListener('click', (e) => {
        if (e.target.closest('#btnShareSalvosLote')) {
            e.preventDefault(); e.stopPropagation();
            const itens = getItensAgendaFiltrados();
            if (itens.length === 0) { showToast("Nenhum prazo encontrado com este filtro para compartilhar.", "⚠️"); return; }
            window.itensParaCompartilhar = itens;
            window.textoParaCompartilhar = gerarTextoCompartilhamento(itens, "Relatórios de prazos");
            window.tituloParaCompartilhar = "Relatórios de prazos DJEN";
            abrirModalCompartilhar('lote'); return;
        }

        if (e.target.closest('#btnCSVSalvosLote')) {
            e.preventDefault(); e.stopPropagation();
            const itens = getItensAgendaFiltrados();
            if (itens.length === 0) { showToast("Nenhum prazo encontrado com este filtro para exportar.", "⚠️"); return; }
            exportarCsvLote(itens);
            return;
        }

        if (e.target.closest('#btnShareBuscaLote')) {
            e.preventDefault(); e.stopPropagation();
            if (resultadosExibidos.length === 0) { showToast("Não há resultados disponíveis para compartilhamento.", "⚠️"); return; }
            window.itensParaCompartilhar = resultadosExibidos;
            window.textoParaCompartilhar = gerarTextoCompartilhamento(resultadosExibidos, "Resultados da Busca");
            window.tituloParaCompartilhar = "Resultados da Busca DJEN";
            abrirModalCompartilhar('lote'); return;
        }

        if (e.target.closest('#btnCopiarBuscaLote')) {
            e.preventDefault(); e.stopPropagation();
            if (resultadosExibidos.length === 0) { showToast("Não há resultados disponíveis para copiar.", "⚠️"); return; }
            exportarTxtLote(resultadosExibidos, "Resultados da Busca");
            return;
        }

        if (e.target.closest('#copyWppFormat')) {
            e.preventDefault(); e.stopPropagation();
            if (!window.textoParaCompartilhar) { showToast("Nenhum item para copiar.", "⚠️"); return; }
            navigator.clipboard.writeText(window.textoParaCompartilhar).then(() => {
                showToast("Copiado com formatação de WhatsApp!", "📎");
            }).catch(() => {
                const ta = document.createElement("textarea"); ta.value = window.textoParaCompartilhar; ta.style.position = "fixed"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
                showToast("Copiado com formatação de WhatsApp!", "📎");
            });
            document.getElementById('shareModal')?.classList.remove('show');
            return;
        }

        if (e.target.closest('#copyCleanFormat')) {
            e.preventDefault(); e.stopPropagation();
            if (!window.textoParaCompartilhar) { showToast("Nenhum item para copiar.", "⚠️"); return; }
            const textoLimpo = limparMarkdownEEmojis(window.textoParaCompartilhar);
            navigator.clipboard.writeText(textoLimpo).then(() => {
                showToast("Texto limpo copiado com sucesso!", "📋");
            }).catch(() => {
                const ta = document.createElement("textarea"); ta.value = textoLimpo; ta.style.position = "fixed"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
                showToast("Texto limpo copiado com sucesso!", "📋");
            });
            document.getElementById('shareModal')?.classList.remove('show');
            return;
        }

        if (e.target.closest('#downloadTxt')) {
            e.preventDefault(); e.stopPropagation();
            if (!window.itensParaCompartilhar || window.itensParaCompartilhar.length === 0) { showToast("Nenhum item para baixar.", "⚠️"); return; }
            baixarTxtLote(window.itensParaCompartilhar, window.tituloParaCompartilhar || "Relatório");
            document.getElementById('shareModal')?.classList.remove('show');
            return;
        }

        if (e.target.closest('#downloadCsv')) {
            e.preventDefault(); e.stopPropagation();
            if (!window.itensParaCompartilhar || window.itensParaCompartilhar.length === 0) { showToast("Nenhum item para exportar.", "⚠️"); return; }
            exportarCsvLote(window.itensParaCompartilhar);
            document.getElementById('shareModal')?.classList.remove('show');
            return;
        }

        if (e.target.closest('#exportGTasksLote')) {
            e.preventDefault(); e.stopPropagation();
            if (!window.itensParaCompartilhar || window.itensParaCompartilhar.length === 0) { showToast("Nenhum item para exportar.", "⚠️"); return; }
            document.getElementById('shareModal')?.classList.remove('show');
            exportarTasksLote(window.itensParaCompartilhar);
            return;
        }

        if (e.target.closest('#shareWpp')) {
            e.preventDefault(); e.stopPropagation();
            let text = window.textoParaCompartilhar;

            if (text.length > 3500) {
                text = text.substring(0, 3500) + "\n\n... [Aviso: O texto é longo demais e foi truncado. Para enviar o conteúdo completo, use o botão de Copiar 📋 da extensão e cole aqui]";
            }

            openWhatsAppWeb(text);
            document.getElementById('shareModal')?.classList.remove('show'); return;
        }

        if (e.target.closest('#btnIndicarColega')) {
            e.preventDefault(); e.stopPropagation();
            const text = "Acompanho meus prazos judiciais usando a extensão do Buscador DJEN. Funciona direto no navegador! Baixe em: https://buscadordjen.com.br/";
            navigator.clipboard.writeText(text).then(() => {
                showToast("Mensagem copiada! Cole no WhatsApp do seu colega.", "↗️");
            }).catch(() => {
                showToast("Erro ao copiar. Seu navegador não permite acesso à área de transferência.", "⚠️");
            });
            return;
        }

        if (e.target.closest('#shareEmail')) {
            e.preventDefault(); e.stopPropagation();
            const subject = encodeURIComponent(window.tituloParaCompartilhar || "Buscador DJEN");
            let body = window.textoParaCompartilhar;

            if (body.length > 1800) {
                body = body.substring(0, 1800) + "\n\n... [Aviso: Texto truncado pelo limite do navegador. Use o botão de Copiar 📋 da extensão para colar o relatório completo]";
            }

            const link = document.createElement("a");
            link.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            document.getElementById('shareModal')?.classList.remove('show'); return;
        }

        if (e.target.closest('#btnPDFCalendario')) {
            e.preventDefault(); e.stopPropagation();

            const year = currentCalDate.getFullYear();
            const month = currentCalDate.getMonth() + 1;
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const mesNome = monthNames[currentCalDate.getMonth()];

            const targetMesAnoStr = `${String(month).padStart(2, '0')}/${year}`;

            const chaves = Object.keys(prazosSalvos).filter(k => {
                const p = prazosSalvos[k];
                return p && p.fatal && p.fatal.endsWith(targetMesAnoStr);
            });

            const itensDoMes = chaves.map(k => prazosSalvos[k]);

            const tituloMes = `${mesNome} de ${year}`;
            gerarPDFMes(tituloMes, itensDoMes);
            return;
        }

        if (e.target.id === 'focusModeOverlay') {
            e.preventDefault(); e.stopPropagation();
            fecharModoFoco();
            return;
        }

        if (e.target.closest('.modal-close') || e.target.classList.contains('modal-overlay')) {
            e.preventDefault(); e.stopPropagation();
            const overlay = e.target.closest('.modal-overlay') || e.target;
            overlay.classList.remove('show');
            return;
        }

        if (!e.target.closest('.card-menu-container') && !e.target.closest('.header-menu-container')) {
            document.querySelectorAll('.card-dropdown.show, #headerDropdown.show').forEach(drop => { drop.classList.remove('show'); });
            document.querySelectorAll('.btn-opcoes-card.active').forEach(btn => { btn.classList.remove('active'); });
        }
        if (!e.target.closest('.intimacao-card') && !e.target.closest('.modal-overlay') && !e.target.closest('.top-bar-fixed') && !e.target.closest('#focusModeOverlay')) {
            const cardsAbertos = document.querySelectorAll('.intimacao-card.aberto');
            if (cardsAbertos.length > 0) {
                cardsAbertos.forEach(card => {
                    card.classList.remove('aberto');
                    const clickArea = card.querySelector('.card-click-area');
                    if (clickArea) clickArea.setAttribute('aria-expanded', 'false');
                });
            }
        }

        if (e.target.closest('#btnHeaderMenu')) {
            if (!e.target.closest('#btnVerNivel')) {
                e.stopPropagation();
                const dropdown = document.getElementById('headerDropdown');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                    if (dropdown.classList.contains('show')) {
                        const searchInput = document.getElementById('menuSearchInput');
                        if (searchInput) {
                            searchInput.value = '';
                            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                            setTimeout(() => searchInput.focus(), 100);
                        }
                    }
                }
            }
            return;
        }

        if (e.target.closest('#btnVerNivel')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            atualizarRelatorioProdutividade(); document.getElementById('rankModal')?.classList.add('show'); return;
        }

        function gerarCSVDados(itensArray, nomeArquivoBase) {
            if (itensArray.length === 0) { showToast("Nenhum dado para exportar.", "⚠️"); return; }
            showToast("Preparando exportação...", "⏳");

            // Preparar dados para o Worker (anexar key se necessário)
            const payloadArray = itensArray.map(p => {
                const key = Object.keys(prazosSalvos).find(k => prazosSalvos[k] === p) || "";
                return { ...p, idSistema: key };
            });

            const workerUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('workers/exportWorker.js') : 'workers/exportWorker.js';
            const worker = new Worker(workerUrl);
            const taskId = Date.now().toString();

            worker.onmessage = function(e) {
                const { error, result, progress } = e.data;
                if (error) {
                    showToast("Erro na exportação: " + error, "❌");
                    worker.terminate();
                } else if (result) {
                    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), result], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
                    link.download = `${nomeArquivoBase}_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
                    showToast("Dados exportados com sucesso!", "📊");
                    worker.terminate();
                } else if (progress) {
                    // console.log(`DJEN Export: ${progress}%`);
                }
            };

            worker.onerror = function(err) {
                showToast("Erro no processamento da exportação.", "❌");
                worker.terminate();
            };

            worker.postMessage({
                action: 'gerarCSVDados',
                payload: { 
                    itensArray: payloadArray, 
                    nomeArquivoBase,
                    branding: {
                        nome: brandingNome,
                        slogan: brandingSlogan,
                        contato: brandingContato
                    }
                },
                taskId
            });
        }

        if (e.target.closest('#btnExportarCSV')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            const itensFiltrados = getItensAgendaFiltrados();
            if (itensFiltrados.length === 0) { showToast("Nenhum prazo para exportar com o filtro atual.", "⚠️"); return; }
            gerarCSVDados(itensFiltrados, "Controle_Tatico_DJEN");
            return;
        }

        if (e.target.closest('#btnExportarJurimetria')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            const todosItens = Object.values(prazosSalvos);
            if (todosItens.length === 0) { showToast("Base de dados vazia.", "⚠️"); return; }
            gerarCSVDados(todosItens, "Base_Jurimetria_DJEN");
            return;
        }

        if (e.target.closest('#btnExportarTarefasLote')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            exportarTodasTarefasLote();
            return;
        }

        
        if (e.target.closest('#btnExportarRelatorioExecutivo')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            
            // Re-fetch branding
            SafeStorage.get(['djen_branding_nome', 'djen_branding_cor', 'djen_branding_logo', 'djen_advogado_nome'], (st) => {
                const adv = st.djen_advogado_nome || "";
                const brand = {
                    nome: st.djen_branding_nome,
                    cor: st.djen_branding_cor,
                    logo: st.djen_branding_logo
                };
                
                const dataFiltroStr = "Exportação de Resultados";
                if(window.gerarRelatorioExecutivo && window.resultadosExibidos) {
                    window.gerarRelatorioExecutivo(window.resultadosExibidos, adv, brand, dataFiltroStr);
                } else {
                    console.error("gerarRelatorioExecutivo ou resultadosExibidos não estão na window.");
                }
            });
            return;
        }
        if (e.target.closest('#btnExportarPDFBase') || e.target.closest('#btnPDFSalvosLote')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            gerarPDFPrazos(); return;
        }
        if (e.target.closest('#btnGerenciarTermos')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            const inputRadar = document.getElementById('inputTermosRadar'); if (inputRadar) inputRadar.value = palavrasUrgentes.join(', ');
            document.getElementById('termosModal')?.classList.add('show'); return;
        }

        if (e.target.closest('#btnSalvarTermos')) {
            e.preventDefault(); e.stopPropagation();
            const inputRadar = document.getElementById('inputTermosRadar');
            if (inputRadar) {
                window.palavrasUrgentes = inputRadar.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                SafeStorage.set({ 'djen_termos_radar': palavrasUrgentes.join(',') });
            }
            document.getElementById('termosModal')?.classList.remove('show');
            showToast("Configurações atualizadas!", "⚙️");
            if (document.getElementById('viewBusca')?.style.display !== 'none') {
                if (resultadosExibidos.length > 0) applyFilters();
            } else { renderAgenda(); renderCalendar(); }
            return;
        }

        if (e.target.closest('#btnAbrirTutorial')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show'); document.getElementById('tutorialModal')?.classList.add('show'); return;
        }

        if (e.target.closest('#btnToggleTheme')) {
            e.preventDefault(); e.stopPropagation();

            const root = document.documentElement;
            const isDark = root.classList.contains('tema-escuro');

            // Define explicitamente o oposto do que está ativo agora
            temaAtual = isDark ? 'claro' : 'escuro';

            SafeStorage.set({ 'djen_theme': temaAtual });
            try {
                localStorage.setItem('djen_theme', temaAtual);
            } catch (err) {}
            aplicarTema(temaAtual);
            showToast(`Tema alterado para ${temaAtual === 'escuro' ? 'Escuro' : 'Claro'}`, "🎨");
            document.getElementById('headerDropdown')?.classList.remove('show');
            return;
        }

        // Abrir o modal de suspensões a partir do menu
        if (e.target.closest('#btnGerenciarSuspensoes')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');
            atualizarListaSuspensoes();
            document.getElementById('suspensoesModal')?.classList.add('show');
            return;
        }

        // Adicionar nova suspensão
        if (e.target.closest('#btnAdicionarSusp')) {
            e.preventDefault(); e.stopPropagation();
            const inputInicio = document.getElementById('inputSuspHoraInicio');
            const inputFim = document.getElementById('inputSuspHoraFim');
            const inputDesc = document.getElementById('inputSuspDesc');

            if (!inputInicio || !inputInicio.value || !inputFim || !inputFim.value) {
                showToast("Preencha as datas de início e fim.", "⚠️");
                return;
            }
            if (inputInicio.value > inputFim.value) {
                showToast("Data de início posterior à data de fim.", "⚠️");
                return;
            }

            const novaSusp = {
                start: inputInicio.value,
                end: inputFim.value,
                desc: (inputDesc ? inputDesc.value.trim() : "") || "Suspensão de Prazo"
            };

            customSuspensions.push(novaSusp);
            customSuspensions.sort((a, b) => a.start.localeCompare(b.start));

            SafeStorage.set({ 'djen_suspensoes_custom': customSuspensions });
            atualizarListaSuspensoes();

            inputInicio.value = "";
            inputFim.value = "";
            if (inputDesc) inputDesc.value = "";

            // #12 — Toast de recalculo automático ao adicionar suspensão
            const toastEl = document.getElementById('toastDesfazer');
            if (toastEl) {
                const msgSpan = toastEl.querySelector('span');
                const btnDesfazer = document.getElementById('btnAcaoDesfazer');
                if (msgSpan) safeSetInnerHTML(msgSpan, 'Suspensão adicionada! Deseja recalcular os prazos?');
                if (btnDesfazer) {
                    const textoOriginalBtn = btnDesfazer.textContent;
                    btnDesfazer.textContent = 'Recalcular';
                    btnDesfazer.onclick = () => {
                        recalcularTodosOsPrazos();
                        toastEl.classList.remove('show');
                        btnDesfazer.textContent = textoOriginalBtn;
                    };
                }
                toastEl.classList.add('show');
                clearTimeout(timeoutDesfazer);
                timeoutDesfazer = setTimeout(() => {
                    toastEl.classList.remove('show');
                    if (btnDesfazer) btnDesfazer.textContent = 'Desfazer';
                }, 7000);
            } else {
                showToast("Suspensão adicionada!", "✨");
            }
            return;

        }

        // Recalcular prazos
        if (e.target.closest('#btnRecalcularPrazos')) {
            e.preventDefault(); e.stopPropagation();
            recalcularTodosOsPrazos();
            document.getElementById('suspensoesModal')?.classList.remove('show');
            return;
        }

        // Fechar suspensões
        if (e.target.closest('#btnFecharSuspensoes')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('suspensoesModal')?.classList.remove('show');
            return;
        }

        // Abrir o modal de notificações/alertas
        if (e.target.closest('#btnConfigurarAlertas')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');

            const checkBg = document.getElementById('toggleNotificarBackground');
            if (checkBg) checkBg.checked = isNotificarBackground;

            document.getElementById('notificacoesModal')?.classList.add('show');
            return;
        }

        // Salvar alertas
        if (e.target.closest('#btnSalvarAlertas')) {
            e.preventDefault(); e.stopPropagation();
            const checkBg = document.getElementById('toggleNotificarBackground');
            if (checkBg) {
                isNotificarBackground = checkBg.checked;
                SafeStorage.set({ 'djen_config_notificar_background_enabled': isNotificarBackground ? 'true' : 'false' });

                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage({
                        action: 'updateBackgroundScan',
                        enabled: isNotificarBackground
                    }, (res) => {
                        console.log("DJEN: Configuração de varredura salva:", res);
                    });
                }
            }
            document.getElementById('notificacoesModal')?.classList.remove('show');
            showToast("Configuração de alertas salva!", "✨");
            return;
        }

        // Abrir modal do DataJud
        if (e.target.closest('#btnConfigurarDataJud')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');
            const inputDataJud = document.getElementById('inputApiKeyDataJud');
            if (inputDataJud) inputDataJud.value = configDataJudApiKey || 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
            document.getElementById('dataJudModal')?.classList.add('show');
            return;
        }

        // Salvar chave DataJud
        if (e.target.closest('#btnSalvarApiKey')) {
            e.preventDefault(); e.stopPropagation();
            const inputDataJud = document.getElementById('inputApiKeyDataJud');
            if (inputDataJud) {
                configDataJudApiKey = inputDataJud.value.trim();
                SafeStorage.set({ 'djen_datajud_api_key': configDataJudApiKey });
                document.getElementById('dataJudModal')?.classList.remove('show');
                showToast("Chave DataJud salva!", "✅");
            }
            return;
        }

        // Abrir o modal de IA a partir do menu
        if (e.target.closest('#btnConfigurarIA')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');

            const providerSelect = document.getElementById('selectIaProvider');
            const apiKeyInput = document.getElementById('inputIaApiKey');
            const modelInput = document.getElementById('inputIaModel');
            const endpointInput = document.getElementById('inputIaEndpoint');

            if (providerSelect) providerSelect.value = iaProvider || 'gemini';
            if (apiKeyInput) apiKeyInput.value = iaApiKey || '';
            if (modelInput) modelInput.value = iaModel || '';
            if (endpointInput) endpointInput.value = iaEndpoint || '';

            atualizarVisibilidadeCamposIA();

            document.getElementById('iaModal')?.classList.add('show');
            return;
        }

        // Abrir modal do Jurisflow
        if (e.target.closest('#btnConfigurarJurisflow')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');
            const checkAtivo = document.getElementById('checkJurisflowAtivo');
            const inputPorta = document.getElementById('inputJurisflowPorta');
            if (checkAtivo) checkAtivo.checked = configJurisflowEnabled;
            if (inputPorta) inputPorta.value = configJurisflowPort;
            const inputToken = document.getElementById('inputJurisflowToken');
            if (inputToken) inputToken.value = configJurisflowToken || 'jf_djen_secret';
            document.getElementById('jurisflowModal')?.classList.add('show');
            return;
        }

        // Salvar as configurações de IA
        if (e.target.closest('#btnSalvarConfigIA')) {
            e.preventDefault(); e.stopPropagation();
            const providerSelect = document.getElementById('selectIaProvider');
            const apiKeyInput = document.getElementById('inputIaApiKey');
            const modelInput = document.getElementById('inputIaModel');
            const endpointInput = document.getElementById('inputIaEndpoint');

            if (providerSelect) iaProvider = providerSelect.value;
            if (apiKeyInput) iaApiKey = apiKeyInput.value.trim();
            if (modelInput) iaModel = modelInput.value.trim();
            if (endpointInput) iaEndpoint = endpointInput.value.trim();

            SafeStorage.set({
                'djen_ia_provider': iaProvider,
                'djen_ia_api_key': iaApiKey,
                'djen_ia_model': iaModel,
                'djen_ia_endpoint': iaEndpoint
            });

            document.getElementById('iaModal')?.classList.remove('show');
            showToast("Configurações de IA salvas com sucesso!", "✨");
            return;
        }

        // Fechar o modal de IA
        if (e.target.closest('#iaModal .modal-close') || (e.target.classList.contains('modal-overlay') && e.target.id === 'iaModal')) {
            document.getElementById('iaModal')?.classList.remove('show');
            return;
        }

        // Abrir o modal da Agenda a partir do menu
        if (e.target.closest('#btnConfigurarAgenda')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');

            // Lê o e-mail do _appCache (fonte: IndexedDB, nunca localStorage)
            const emailSalvo = _appCache.emailGcal;
            const inEmail = document.getElementById('inputEmailGcal');
            if (inEmail && emailSalvo) inEmail.value = emailSalvo;

            const atualizarStatusTasksUI = async () => {
                const badge = document.getElementById('gtasksStatusBadge');
                if (!window.GoogleTasksService || !badge) return;

                const logado = await window.GoogleTasksService.estaConectado();
                if (logado) {
                    badge.textContent = 'Configurado ✓';
                    badge.style.background = 'rgba(16, 185, 129, 0.15)';
                    badge.style.color = '#10b981';
                    badge.style.borderColor = '#10b981';
                } else {
                    badge.textContent = 'Não configurado';
                    badge.style.background = 'var(--bg-body)';
                    badge.style.color = 'var(--text-muted)';
                    badge.style.borderColor = 'var(--border-light)';
                }
                
                const inputUrl = document.getElementById('inputGtasksWebhookUrl');
                const savedUrl = await window.GoogleTasksService.getWebhookUrl();
                if (inputUrl && !inputUrl.value && savedUrl) {
                    inputUrl.value = savedUrl;
                }
            };
            atualizarStatusTasksUI();

            document.getElementById('agendaModal')?.classList.add('show');
            return;
        }

        // Salvar URL do Google Tasks via Webhook
        if (e.target.closest('#btnSalvarGtasks')) {
            e.preventDefault(); e.stopPropagation();
            const inputUrl = document.getElementById('inputGtasksWebhookUrl');
            const webhookUrl = inputUrl ? inputUrl.value.trim() : '';

            if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/macros/s/')) {
                showToast("Por favor, cole uma URL válida gerada no Google Apps Script.", "⚠️");
                if (inputUrl) inputUrl.focus();
                return;
            }

            const btn = e.target.closest('#btnSalvarGtasks');
            const oldText = btn.innerHTML;
            btn.innerHTML = '<span>⏳</span> Testando e Salvando...';
            btn.disabled = true;

            (async () => {
                try {
                    // SALVAR
                    await window.GoogleTasksService.setWebhookUrl(webhookUrl);
                    
                    // FALLBACK FORÇADO NO LOCALSTORAGE
                    try {
                        localStorage.setItem('djen_gtasks_webhook_url', JSON.stringify(webhookUrl));
                    } catch(e) {}

                    showToast("Sucesso! O link foi salvo corretamente.", "✅");
                    
                    const badge = document.getElementById('gtasksStatusBadge');
                    if (badge) {
                        badge.textContent = 'Configurado ✓';
                        badge.style.background = 'rgba(16, 185, 129, 0.15)';
                        badge.style.color = '#10b981';
                        badge.style.borderColor = '#10b981';
                    }
                } catch (err) {
                    console.error('[GoogleTasks] Erro ao salvar:', err);
                    showToast("Erro ao salvar URL.", "❌");
                } finally {
                    btn.innerHTML = oldText;
                    btn.disabled = false;
                }
            })();
            return;
        }

        // Salvar o e-mail digitado e o Client ID se alterado
        if (e.target.closest('#btnSalvarEmailAgenda')) {
            e.preventDefault(); e.stopPropagation();
            const inputEmail = document.getElementById('inputEmailGcal');
            const inputClientId = document.getElementById('inputGtasksClientId');

            if (inputEmail) {
                // Atualiza _appCache + SafeStorage (sem localStorage)
                const emailVal = inputEmail.value.trim();
                _appCache.emailGcal = emailVal;
                AppState.config.emailAgenda = emailVal;
                SafeStorage.set({ 'djen_email_gcal': emailVal });
            }

            if (inputClientId && window.GoogleTasksService) {
                const cId = inputClientId.value.trim();
                window.GoogleTasksService.setClientId(cId);
            }

            document.getElementById('agendaModal')?.classList.remove('show');
            showToast("Configurações atualizadas!", "⚙️");
            return;
        }

        // Fechar o modal da agenda
        if (e.target.closest('#agendaModal .modal-close') || (e.target.classList.contains('modal-overlay') && e.target.id === 'agendaModal')) {
            document.getElementById('agendaModal')?.classList.remove('show');
            return;
        }

        // Ações do Modal de Onboarding Google Tasks
        if (e.target.closest('#btnFecharGtasksOnboarding') || e.target.closest('#btnEntendiGtasksOnboarding') || (e.target.classList.contains('modal-overlay') && e.target.id === 'gtasksOnboardingModal')) {
            document.getElementById('gtasksOnboardingModal')?.classList.remove('show');
            SafeStorage.set({ 'djen_gtasks_onboarding_v5074_v2': true });
            return;
        }

        if (e.target.closest('#btnConfigurarGtasksAgora')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('gtasksOnboardingModal')?.classList.remove('show');
            SafeStorage.set({ 'djen_gtasks_onboarding_v5074_v2': true });
            
            // Abre o modal de Integrações (Agenda & Tasks)
            const btnAbrirAgenda = document.getElementById('btnConfigurarAgendaHeader');
            if (btnAbrirAgenda) {
                btnAbrirAgenda.click();
            } else {
                document.getElementById('agendaModal')?.classList.add('show');
            }
            return;
        }

        // Abrir modal de branding
        if (e.target.closest('#btnConfigurarBranding')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');
            
            const inNome = document.getElementById('inputBrandingNome');
            const inSlogan = document.getElementById('inputBrandingSlogan');
            const inContato = document.getElementById('inputBrandingContato');
            const inLogo = document.getElementById('inputBrandingLogo');
            const inCor = document.getElementById('inputBrandingCor');

            if (inNome) inNome.value = brandingNome;
            if (inSlogan) inSlogan.value = brandingSlogan;
            if (inContato) inContato.value = brandingContato;
            if (inLogo) inLogo.value = brandingLogo;
            if (inCor) inCor.value = brandingCor;

            document.getElementById('brandingModal')?.classList.add('show');
            return;
        }

        // Salvar branding
        if (e.target.closest('#btnSalvarBranding')) {
            e.preventDefault(); e.stopPropagation();
            
            const inNome = document.getElementById('inputBrandingNome');
            const inSlogan = document.getElementById('inputBrandingSlogan');
            const inContato = document.getElementById('inputBrandingContato');
            const inLogo = document.getElementById('inputBrandingLogo');
            const inCor = document.getElementById('inputBrandingCor');

            brandingNome = inNome ? inNome.value.trim() : "";
            brandingSlogan = inSlogan ? inSlogan.value.trim() : "";
            brandingContato = inContato ? inContato.value.trim() : "";
            brandingLogo = inLogo ? inLogo.value.trim() : "";
            brandingCor = inCor ? inCor.value.trim() : "#2e2c2a";

            SafeStorage.set({
                'djen_branding_nome': brandingNome,
                'djen_branding_slogan': brandingSlogan,
                'djen_branding_contato': brandingContato,
                'djen_branding_cor': brandingCor,
                'djen_branding_logo': brandingLogo
            });

            document.getElementById('brandingModal')?.classList.remove('show');
            showToast("Identidade do escritório atualizada!", "✨");
            return;
        }

        // Fechar modal de branding
        if (e.target.closest('#brandingModal .modal-close') || (e.target.classList.contains('modal-overlay') && e.target.id === 'brandingModal')) {
            document.getElementById('brandingModal')?.classList.remove('show');
            return;
        }

        // Fechar o modal da agenda no botão fechar ou fora dele
        if (e.target.closest('#agendaModal .modal-close') || (e.target.classList.contains('modal-overlay') && e.target.id === 'agendaModal')) {
            document.getElementById('agendaModal')?.classList.remove('show');
            return;
        }

        if (e.target.closest('#btnConfigurarBackupAuto')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');
            SafeStorage.get(['djen_config_backup_auto_enabled', 'djen_config_backup_auto_period'], (data) => {
                const enabled = data.djen_config_backup_auto_enabled !== 'false';
                const freq = data.djen_config_backup_auto_period || '24';
                
                const toggle = document.getElementById('toggleBackupAuto');
                const selectFreq = document.getElementById('selectBackupAutoFreq');
                if (toggle) toggle.checked = enabled;
                if (selectFreq) selectFreq.value = freq;
                
                document.getElementById('backupAutoModal')?.classList.add('show');
            });
            return;
        }

        if (e.target.closest('#btnSalvarBackupAuto')) {
            e.preventDefault(); e.stopPropagation();
            const toggle = document.getElementById('toggleBackupAuto');
            const selectFreq = document.getElementById('selectBackupAutoFreq');
            const enabled = toggle ? toggle.checked : true;
            const freq = selectFreq ? selectFreq.value : '24';
            
            SafeStorage.set({
                'djen_config_backup_auto_enabled': enabled ? 'true' : 'false',
                'djen_config_backup_auto_period': freq
            });
            
            const runtimeAPI = (typeof browser !== 'undefined') ? browser : chrome;
            if (runtimeAPI && runtimeAPI.runtime && runtimeAPI.runtime.sendMessage) {
                runtimeAPI.runtime.sendMessage({
                    action: 'updateAutoBackupAlarm',
                    enabled: enabled,
                    periodInMinutes: parseInt(freq, 10) * 60
                }).catch(() => {});
            }
            
            document.getElementById('backupAutoModal')?.classList.remove('show');
            showToast("Configurações de backup automático salvas!", "💾");
            return;
        }

        if (e.target.closest('#btnSalvarBackupMenu')) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');

            if (Object.keys(prazosSalvos).length === 0) {
                showToast("Nenhum prazo registrado na sua agenda.", "⚠️");
                return;
            }

            const pendentes = Object.values(prazosSalvos).filter(p => !p.cumprido && p.fatal).length;
            const cumpridos = Object.values(prazosSalvos).filter(p => p.cumprido).length;
            const total = Object.keys(prazosSalvos).length;
            const oab = document.getElementById('oabNum')?.value.replace(/\D/g, '') || "000000";
            const uf = document.getElementById('oabUf')?.value.trim().toUpperCase() || "SP";
            const dataStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
            const nomeArquivo = `DJEN_Backup_OAB${uf}${oab}_${dataStr}.json`;

            document.getElementById('backupIcon').textContent = '💾';
            document.getElementById('backupTitle').textContent = 'Salvar Backup';
            document.getElementById('backupSubtitle').textContent = 'Seus dados serão salvos no computador';
            safeSetInnerHTML(document.getElementById('backupResumo'), `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">📋 <b>${total}</b> prazos na base</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">⏰ <b>${pendentes}</b> pendentes</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">✅ <b>${cumpridos}</b> cumpridos</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-light);">📄 <span style="font-size: 11px; opacity: 0.7;">${nomeArquivo}</span></div>
        `);;
            document.getElementById('backupAviso').style.display = 'none';
            document.getElementById('btnConfirmarBackup').textContent = '💾 Salvar Backup';
            document.getElementById('btnConfirmarBackup').style.background = 'var(--primary)';
            document.getElementById('btnConfirmarBackup').disabled = false;
            document.getElementById('btnConfirmarBackup').style.opacity = '1';
            document.getElementById('btnConfirmarBackup').style.cursor = 'pointer';

            document.getElementById('btnConfirmarBackup').onclick = () => {
                document.getElementById('backupConfirmModal')?.classList.remove('show');
                executarBackup();
            };

            document.getElementById('backupConfirmModal')?.classList.add('show');
            return;
        }

        if (e.target.closest('#btnImportarCSVMenu')) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');
            const fileInput = document.getElementById('inputImportarCSVFile');
            if (!fileInput) return;
            
            fileInput.value = '';
            fileInput.onchange = function (evt) {
                const file = evt.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (readEvent) => {
                    try {
                        const content = readEvent.target.result;
                        const lines = content.split('\\n');
                        if (lines.length < 2) {
                            showToast("CSV inválido ou vazio.", "❌");
                            return;
                        }

                        let importCount = 0;
                        const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
                        const procIdx = headers.findIndex(h => h.includes('processo'));
                        const apelidoIdx = headers.findIndex(h => h.includes('apelido'));
                        const fatalIdx = headers.findIndex(h => h.includes('fatal') || h.includes('prazo'));
                        
                        if (procIdx === -1) {
                            showToast("Coluna 'Processo' não encontrada no CSV.", "❌");
                            return;
                        }

                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line) continue;
                            const cols = line.split(';');
                            
                            const procVal = cols[procIdx] ? cols[procIdx].trim() : "";
                            const apelidoVal = (apelidoIdx !== -1 && cols[apelidoIdx]) ? cols[apelidoIdx].trim() : "";
                            const fatalVal = (fatalIdx !== -1 && cols[fatalIdx]) ? cols[fatalIdx].trim() : "";
                            
                            if (procVal) {
                                const normalizedProc = procVal.replace(/\D/g, '');
                                if (normalizedProc.length >= 10) { // A valid process has at least some numbers
                                    const procFormatado = formatCNJ(procVal);
                                    const key = "djen_" + normalizedProc + "_" + Date.now() + "_" + i;
                                    
                                    if (!prazosSalvos[key]) {
                                        prazosSalvos[key] = {
                                            processo: procFormatado,
                                            apelido: apelidoVal,
                                            fatal: fatalVal,
                                            data_modificacao: new Date().toISOString()
                                        };
                                        if (apelidoVal) setGlobalApelido(procFormatado, apelidoVal, key);
                                        importCount++;
                                    }
                                }
                            }
                        }
                        savePrazosSalvos();
                        renderAgenda();
                        renderCalendar();
                        showToast(`${importCount} processos importados com sucesso!`, "✅");
                    } catch (err) {
                        console.error(err);
                        showToast("Erro ao processar CSV.", "❌");
                    }
                };
                reader.readAsText(file);
            };
            fileInput.click();
            return;
        }

        if (e.target.closest('#btnRestaurarBackupMenu')) {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');
            const fileInput = document.getElementById('inputRestaurar');
            if (!fileInput) return;
            
            fileInput.value = '';
            fileInput.onchange = function (evt) {
                const file = evt.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (readEvent) => {
                    try {
                        let content = readEvent.target.result;
                        // Remover BOM (Byte Order Mark) se presente
                        if (content.charCodeAt(0) === 0xFEFF) {
                            content = content.slice(1);
                        }
                        const data = JSON.parse(content.trim());
                        if (typeof executarRestauracao === 'function') {
                            executarRestauracao(data);
                        }
                    } catch (err) {
                        console.error("Erro na leitura do JSON:", err);
                        if (typeof showToast === 'function') {
                            showToast(`O sistema não conseguiu processar o arquivo de backup selecionado: ${err.message}`, "❌");
                        }
                    }
                };
                reader.readAsText(file);
            };

            fileInput.click();
            return;
        }



        if (e.target.closest('#btnIndicarColega')) {
            e.preventDefault(); e.stopPropagation(); const msg = "Estou usando a extensão *Buscador DJEN* no navegador para salvar minhas publicações e calcular os prazos automaticamente. A interface é excelente. Recomendo baixar a ferramenta!"; openWhatsAppWeb(msg); document.getElementById('headerDropdown')?.classList.remove('show'); return;
        }

        if (e.target.closest('#btnSincronizarTodosJurisflow')) {
            e.preventDefault(); e.stopPropagation();
            (async () => {
                if (!configJurisflowEnabled) {
                    showToast("Integração Jurisflow desativada. Ative nas configurações.", "⚠️");
                    return;
                }
                const pendentes = getItensAgendaFiltrados().filter(p => !p.jurisflow_synced && (p.status !== 'cumprido' && p.status !== 'espera'));
                if (pendentes.length === 0) {
                    showToast("Nenhum prazo pendente de sincronização para Jurisflow no filtro atual.", "ℹ️");
                    return;
                }
                showToast(`Sincronizando ${pendentes.length} prazos com Jurisflow...`, "🔄");
                
                const port = configJurisflowPort || '18080';
                const token = window.configJurisflowToken || 'jf_djen_secret';
                
                const payloads = pendentes.map(p => {
                    return {
                        processo: p.processo,
                        fatal: p.fatalOriginal || p.fatal,
                        apelido: p.apelido || '',
                        siglaTribunal: p.siglaTribunal || p.sigla || '',
                        anotacao: p.anotacao || '',
                        textoCompleto: p.teor || '',
                        dias: p.dias || 15
                    };
                });

                try {
                    const res = await fetch(`http://127.0.0.1:${port}/api/sync_lote`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payloads)
                    });
                    if (res.ok) {
                        pendentes.forEach(p => p.jurisflow_synced = true);
                        savePrazosSalvos();
                        showToast(`${pendentes.length} prazos sincronizados no Jurisflow!`, "✅");
                    } else {
                        showToast("Erro ao sincronizar lote.", "❌");
                    }
                } catch (err) {
                    console.error("Erro sync lote jurisflow", err);
                    showToast("Falha de conexão com Jurisflow.", "❌");
                }
            })();
            return;
        }

        if (e.target.closest('#btnCopiarSalvosLote')) {
            e.preventDefault(); e.stopPropagation(); 
            const itens = getItensAgendaFiltrados();
            if (itens.length === 0) { showToast("Não há prazos no filtro atual para realizar a cópia.", "⚠️"); return; } 
            exportarTxtLote(itens, "Relatório de Prazos"); return;
        }

        if (e.target.closest('#btnNovoPrazoManual') || e.target.closest('#btnNovoPrazoCal')) {
            e.preventDefault(); e.stopPropagation();
            const isCalBtn = !!e.target.closest('#btnNovoPrazoCal');
            
            const inpP = document.getElementById('inputManualProcesso'); if (inpP) inpP.value = '';
            const inpT = document.getElementById('inputManualTeor'); if (inpT) inpT.replaceChildren();;
            const inpD = document.getElementById('inputManualDataVencimento'); 
            if (inpD) {
                if (isCalBtn && typeof selectedCalDateStr !== 'undefined' && selectedCalDateStr) {
                    inpD.value = selectedCalDateStr;
                } else {
                    inpD.value = '';
                }
            }
            
            const tasksWrapper = document.getElementById('tasksWrapperManual');
            if (tasksWrapper) {
                tasksWrapper.replaceChildren();;
                prazosSalvos['manual_temp_draft'] = { processo: "Rascunho", tarefas: [] };
                const newTasksUI = window.AIChecklist.createTasksWrapperUI('manual_temp_draft', 'Prazo Manual', '', document.getElementById('novoPrazoModal'));
                tasksWrapper.appendChild(newTasksUI);
            }
            
            document.getElementById('novoPrazoModal')?.classList.add('show');
            setTimeout(() => inpP?.focus(), 150);
            
            // Auto-fetch DataJud on blur if not fetched yet
            if (inpP && !inpP.hasAttribute('data-datajud-bound')) {
                inpP.setAttribute('data-datajud-bound', 'true');
                inpP.addEventListener('blur', async () => {
                    const val = inpP.value.trim();
                    if (val.replace(/\D/g, '').length === 20 && configDataJudApiKey) {
                        const originalValue = val;
                        inpP.value = "⏳ Buscando no CNJ...";
                        inpP.disabled = true;
                        const dataJud = await consultarProcessoDataJud(val);
                        inpP.disabled = false;
                        if (dataJud && dataJud.poloAtivo && dataJud.poloPassivo) {
                            const primeiroAtivo = dataJud.poloAtivo.split(' ')[0];
                            const primeiroPassivo = dataJud.poloPassivo.split(' ')[0];
                            inpP.value = `${formatCNJ(val)} - ${primeiroAtivo} x ${primeiroPassivo}`;
                            
                            // Adicionar vinculados temporariamente nas variáveis globais ou no manual draft
                            if (prazosSalvos['manual_temp_draft'] && dataJud.vinculados && dataJud.vinculados.length > 0) {
                                prazosSalvos['manual_temp_draft'].vinculados_datajud = dataJud.vinculados;
                            }
                        } else {
                            inpP.value = formatCNJ(originalValue);
                        }
                    } else if (val.replace(/\D/g, '').length === 20) {
                        inpP.value = formatCNJ(val);
                    }
                });
            }
            return;
        }

        if (e.target.closest('#btnCancelarBackup') || e.target.closest('#btnFecharBackupConfirm')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('backupConfirmModal')?.classList.remove('show');
            return;
        }

        if (e.target.closest('#btnCancelarNovoPrazo')) { 
            e.preventDefault(); e.stopPropagation(); 
            if (prazosSalvos['manual_temp_draft']) {
                delete prazosSalvos['manual_temp_draft'];
                savePrazosSalvos();
            }
            document.getElementById('novoPrazoModal')?.classList.remove('show'); 
            return; 
        }

        if (e.target.closest('#btnEntendiTutorial')) { e.preventDefault(); e.stopPropagation(); document.getElementById('tutorialModal')?.classList.remove('show'); return; }

        if (e.target.closest('#btnCancelarApelido') || e.target.closest('#btnFecharModalApelido')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('apelidoModal')?.classList.remove('show');
            currentApelidoCallback = null;
            return;
        }

        if (e.target.closest('#btnSalvarApelido')) {
            e.preventDefault(); e.stopPropagation();
            const inputVal = document.getElementById('inputApelidoModal')?.value || "";
            const inputReqte = document.getElementById('inputRequerenteModal')?.value || "";
            const inputReqdo = document.getElementById('inputRequeridoModal')?.value || "";
            const inputSistema = document.getElementById('inputSistemaModal')?.value || "";
            const inputClasse = document.getElementById('inputClasseModal')?.value || "";
            
            if (currentApelidoProcesso) {
                setGlobalPartes(currentApelidoProcesso, { requerente: inputReqte.trim(), requerido: inputReqdo.trim() });
                setGlobalSistema(currentApelidoProcesso, inputSistema.trim());
                setGlobalClasse(currentApelidoProcesso, inputClasse.trim());
            }

            if (currentApelidoCallback) currentApelidoCallback(inputVal);
            document.getElementById('apelidoModal')?.classList.remove('show');
            currentApelidoCallback = null;
            currentApelidoProcesso = null;
            return;
        }

        if (e.target.closest('#btnIrParaCalculadora')) {
            e.preventDefault(); e.stopPropagation();
            const procRaw = document.getElementById('inputManualProcesso')?.value.trim();
            let proc = "Prazo Manual"; let apelido = "";
            if (procRaw) {
                const cnjFormatado = formatCNJ(procRaw);
                if (cnjFormatado.includes('-') && cnjFormatado.includes('.')) { proc = cnjFormatado; }
                else if (procRaw.replace(/\D/g, '').length === 20) { proc = formatCNJ(procRaw); }
                else { proc = "Prazo Manual"; apelido = procRaw; }
            }
            let teor = document.getElementById('inputManualTeor')?.innerHTML.trim() || "Aguardando cálculo...";
            
            const itemKey = 'manual_' + Date.now(); 
            const novoItem = { 
                id: itemKey, processo: proc, textoCompleto: teor, anotacao: teor, manual: true, cumprido: false, 
                dias: extrairPrazoSugerido(teor), siglaTribunal: "MANUAL", data_disponibilizacao: new Date().toISOString().split('T')[0] 
            };
            
            if (prazosSalvos['manual_temp_draft'] && prazosSalvos['manual_temp_draft'].tarefas) {
                novoItem.tarefas = prazosSalvos['manual_temp_draft'].tarefas;
                delete prazosSalvos['manual_temp_draft'];
            }
            if (apelido) { novoItem.apelido = apelido; }
            
            prazosSalvos[itemKey] = novoItem;
            savePrazosSalvos();
            
            const inputData = document.getElementById('inputManualDataVencimento');
            const inputTeor = document.getElementById('inputManualTeor');
            const inputProc = document.getElementById('inputManualProcesso');
            if (inputData) inputData.value = '';
            if (inputTeor) inputTeor.replaceChildren();;
            if (inputProc) inputProc.value = '';
            
            document.getElementById('novoPrazoModal')?.classList.remove('show');
            showToast("Calculadora aberta!", "🧮");
            filtroAgendaAtivo = null;
            
            sessionStorage.setItem('djen_auto_open_calc', itemKey);
            document.getElementById('tabSalvos')?.click();
            renderAgenda();
            return;
        }

        if (e.target.closest('#btnSalvarNovoPrazo')) {
            e.preventDefault(); e.stopPropagation();
            const procRaw = document.getElementById('inputManualProcesso')?.value.trim();
            let proc = "Prazo Manual";
            let apelido = "";
            if (procRaw) {
                const parts = procRaw.split(' - ');
                const potentialCnj = parts[0].trim();
                const cnjFormatado = formatCNJ(potentialCnj);
                
                if (cnjFormatado.includes('-') && cnjFormatado.includes('.')) {
                    proc = cnjFormatado;
                    if (parts.length > 1) {
                        apelido = parts.slice(1).join(' - ').trim();
                    }
                } else if (potentialCnj.replace(/\D/g, '').length === 20) {
                    proc = formatCNJ(potentialCnj);
                    if (parts.length > 1) {
                        apelido = parts.slice(1).join(' - ').trim();
                    }
                } else {
                    proc = "Prazo Manual";
                    apelido = procRaw;
                }
            }
            
            const dataVencimento = document.getElementById('inputManualDataVencimento')?.value;
            let teor = document.getElementById('inputManualTeor')?.innerHTML.trim();
            
            if (!dataVencimento) { showToast("Para salvar direto, a Data de Vencimento é obrigatória. Se não tem a data, clique em 'Calcular prazo'.", "⚠️"); return; }
            if (dataVencimento && !teor) { teor = "Prazo adicionado manualmente direto na agenda."; }

            const itemKey = 'manual_' + Date.now(); 
            const novoItem = { 
                id: itemKey, 
                processo: proc, 
                textoCompleto: teor, 
                anotacao: teor, 
                manual: true, 
                cumprido: false, 
                dias: extrairPrazoSugerido(teor), 
                siglaTribunal: "MANUAL", 
                data_disponibilizacao: new Date().toISOString().split('T')[0] 
            };
            
            let vinculadosTemp = null;
            if (prazosSalvos['manual_temp_draft']) {
                if (prazosSalvos['manual_temp_draft'].tarefas) {
                    novoItem.tarefas = prazosSalvos['manual_temp_draft'].tarefas;
                }
                if (prazosSalvos['manual_temp_draft'].vinculados_datajud) {
                    vinculadosTemp = prazosSalvos['manual_temp_draft'].vinculados_datajud;
                }
                delete prazosSalvos['manual_temp_draft'];
            }
            
            if (apelido) { novoItem.apelido = apelido; }
            
            if (dataVencimento) {
                const p = dataVencimento.split('-');
                novoItem.fatal = `${p[2]}/${p[1]}/${p[0]}`;
            }
            
            prazosSalvos[itemKey] = novoItem;
            
            // Processa vinculados se existirem
            if (vinculadosTemp && vinculadosTemp.length > 0) {
                for (const vinc of vinculadosTemp) {
                    adicionarRelacaoProcesso(itemKey, vinc.numeroProcesso, 'vinculado', 'Extraído DataJud', false);
                }
            } else {
                savePrazosSalvos(); 
            }
            
            const inputData = document.getElementById('inputManualDataVencimento');
            const inputTeor = document.getElementById('inputManualTeor');
            const inputProc = document.getElementById('inputManualProcesso');
            if (inputData) inputData.value = '';
            if (inputTeor) inputTeor.replaceChildren();;
            if (inputProc) inputProc.value = '';
            
            document.getElementById('novoPrazoModal')?.classList.remove('show'); 
            showToast("Prazo criado!", "📝"); 
            filtroAgendaAtivo = null; 
            
            document.getElementById('tabSalvos')?.click();
            renderAgenda(); 
            return;
        }

        if (e.target.closest('#btnAvaliarLoja')) {
            e.preventDefault(); e.stopPropagation(); const isFirefox = navigator.userAgent.toLowerCase().includes('firefox'); const linkDestino = isFirefox ? "https://addons.mozilla.org/pt-BR/firefox/addon/SEU_ID_AQUI/reviews/" : "https://chrome.google.com/webstore/detail/SEU_ID_AQUI/reviews"; SafeStorage.set({ 'djen_ja_avaliou': true }); document.getElementById('reviewModal')?.classList.remove('show'); openSafeLink(linkDestino); return;
        }
        
        const btnCmd = e.target.closest('button[data-cmd]');
        if (btnCmd && btnCmd.closest('#novoPrazoModal')) {
            e.preventDefault(); e.stopPropagation();
            document.execCommand(btnCmd.getAttribute('data-cmd'), false, null);
            document.getElementById('inputManualTeor').focus();
            return;
        }
        
        const btnLinkModal = e.target.closest('.btn-add-link');
        if (btnLinkModal && btnLinkModal.closest('#novoPrazoModal')) {
            e.preventDefault(); e.stopPropagation();
            const url = prompt("Cole a URL:");
            if (url) document.execCommand('createLink', false, url);
            document.getElementById('inputManualTeor').focus();
            return;
        }
        if (e.target.closest('#btnAvaliarDepois') || e.target.closest('#btnFecharReview')) { e.preventDefault(); e.stopPropagation(); document.getElementById('reviewModal')?.classList.remove('show'); return; }

        if (e.target.tagName === 'MARK' || e.target.classList.contains('marca-texto')) {
            e.preventDefault(); e.stopPropagation();
            let activeKey = null; const focoOverlay = document.getElementById('focusModeOverlay');
            if (focoOverlay && focoOverlay.classList.contains('show')) activeKey = focoOverlay.getAttribute('data-active-key'); else { const card = e.target.closest('.intimacao-card'); if (card) activeKey = card.getAttribute('data-key'); }
            e.target.replaceWith(...e.target.childNodes);;
            if (activeKey && prazosSalvos[activeKey]) { const novoHtml = focoOverlay.classList.contains('show') ? document.getElementById('focusTeorContent').innerHTML : document.querySelector(`.intimacao-card[data-key="${activeKey}"] .teor-inner-box`).innerHTML; prazosSalvos[activeKey].textoHtml = novoHtml; savePrazosSalvos(); const teorBox = document.querySelector(`.intimacao-card[data-key="${activeKey}"] .teor-inner-box`); if (teorBox && focoOverlay.classList.contains('show')) safeSetInnerHTML(teorBox, novoHtml);; }
            showToast("Marcação apagada!", "🧹"); return;
        }

        const btnOpcoes = e.target.closest('.btn-opcoes-card'); if (btnOpcoes) { e.preventDefault(); e.stopPropagation(); const container = btnOpcoes.closest('.card-menu-container'); if (!container) return; const dropdown = container.querySelector('.card-dropdown'); const isOpen = dropdown.classList.contains('show'); document.querySelectorAll('.card-dropdown.show').forEach(d => d.classList.remove('show')); document.querySelectorAll('.btn-opcoes-card.active').forEach(b => b.classList.remove('active')); if (!isOpen) { dropdown.classList.add('show'); btnOpcoes.classList.add('active'); } return; }

        const btnAcaoDropdown = e.target.closest('.card-dropdown button');
        if (btnAcaoDropdown && btnAcaoDropdown.closest('.intimacao-card')) {
            e.preventDefault(); e.stopPropagation();
            const card = btnAcaoDropdown.closest('.intimacao-card');
            const itemKey = card.getAttribute('data-key');
            const proc = card.getAttribute('data-proc');
            const dropdown = btnAcaoDropdown.closest('.card-dropdown');
            dropdown.classList.remove('show');
            const isBusca = document.getElementById('viewBusca').style.display !== 'none';

            if (btnAcaoDropdown.classList.contains('btn-editar-apelido')) {
                abrirModalApelido(proc, getGlobalApelido(proc), (novoApelido) => { setGlobalApelido(proc, novoApelido.trim(), itemKey); if (isBusca) applyFilters(); else { renderAgenda(); renderCalendar(); } });
            }
            else if (btnAcaoDropdown.classList.contains('btn-recalcular-prazo')) {
                if (!card.classList.contains('aberto')) {
                    const clickArea = card.querySelector('.card-click-area');
                    if (clickArea) clickArea.click();
                }
                setTimeout(() => {
                    const calcPanel = card.querySelector('.calculadora-prazo');
                    const btnCalc = card.querySelector('.btn-recalc');
                    if (calcPanel && btnCalc) {
                        if (!calcPanel.classList.contains('ativa')) {
                            btnCalc.click();
                        }
                        setTimeout(() => {
                            const btnVoltar = calcPanel.querySelector('.btn-voltar-calc');
                            const resultBox = calcPanel.querySelector('.calc-result-box');
                            if (btnVoltar && resultBox && resultBox.style.display !== 'none') {
                                btnVoltar.click();
                            }
                        }, 150);
                    }
                }, 150);
            }
            else if (btnAcaoDropdown.classList.contains('btn-sincronizar-cnj')) {
                if (!configDataJudApiKey) {
                    showToast("Chave da API do DataJud não configurada. Adicione na aba Opções.", "⚠️");
                    return;
                }
                const btnOriginal = btnAcaoDropdown.innerHTML;
                btnAcaoDropdown.innerHTML = "⏳ Sincronizando...";
                consultarProcessoDataJud(proc).then(dataJud => {
                    btnAcaoDropdown.innerHTML = btnOriginal;
                    if (dataJud) {
                        const partesBase = getGlobalPartes(proc) || {};
                        let atualizado = false;
                        if (!partesBase.requerente && dataJud.poloAtivo) { partesBase.requerente = dataJud.poloAtivo; atualizado = true; }
                        if (!partesBase.requerido && dataJud.poloPassivo) { partesBase.requerido = dataJud.poloPassivo; atualizado = true; }
                        if (atualizado) setGlobalPartes(proc, partesBase);
                        
                        let p = prazosSalvos[itemKey];
                        if (p) {
                            if (!p.apelido && dataJud.poloAtivo && dataJud.poloPassivo) {
                                p.apelido = `${dataJud.poloAtivo.split(' ')[0]} x ${dataJud.poloPassivo.split(' ')[0]}`;
                                setGlobalApelido(proc, p.apelido);
                                atualizado = true;
                            }
                            if (dataJud.vinculados && dataJud.vinculados.length > 0) {
                                for (const vinc of dataJud.vinculados) {
                                    adicionarRelacaoProcesso(itemKey, vinc.numeroProcesso, 'vinculado', 'Sincronizado Manualmente (CNJ)', false);
                                }
                                atualizado = true;
                            }
                            if (dataJud.classe || dataJud.orgao || dataJud.sistema) {
                                p.datajud_classe = dataJud.classe || '';
                                p.datajud_orgao = dataJud.orgao || '';
                                p.datajud_sistema = dataJud.sistema || '';
                                atualizado = true;
                            }
                            if (dataJud.assuntos && dataJud.assuntos.length > 0) { p.datajud_assuntos = dataJud.assuntos; atualizado = true; }
                            if (dataJud.grau) { p.datajud_grau = dataJud.grau; atualizado = true; }
                            if (dataJud.dataAjuizamento) { p.datajud_ajuizamento = dataJud.dataAjuizamento; atualizado = true; }
                            if (dataJud.tribunalSigla && !p.siglaTribunal) { p.siglaTribunal = dataJud.tribunalSigla.toUpperCase(); atualizado = true; }
                            if (dataJud.movimentos && dataJud.movimentos.length > 0) { p.datajud_movimentos = dataJud.movimentos; atualizado = true; }
                            if (typeof dataJud.nivelSigilo === 'number') { p.datajud_sigilo = dataJud.nivelSigilo; atualizado = true; }
                            if (atualizado) {
                                adicionarEventoHistorico(itemKey, 'nota', 'Processo sincronizado sob demanda via DataJud.');
                                savePrazosSalvos();
                                if (isBusca) applyFilters(); else { renderAgenda(); renderCalendar(); }
                                showToast("Sincronização com o CNJ concluída!", "✅");
                            } else {
                                showToast("Dados já estão atualizados pelo CNJ.", "👍");
                            }
                        }
                    } else {
                        showToast("Nenhum dado encontrado no CNJ para este processo.", "ℹ️");
                    }
                }).catch(() => {
                    btnAcaoDropdown.innerHTML = btnOriginal;
                    showToast("Erro ao comunicar com DataJud.", "❌");
                });
            }
            else if (btnAcaoDropdown.classList.contains('btn-marcar-naolido')) {
                publicacoesLidas.delete(itemKey); card.classList.remove('lido'); const lidoBdg = card.querySelector('.badge-lido'); if (lidoBdg) lidoBdg.remove(); updateProgressBar(); showToast("Marcado como não lido", "👀");
            }
            else if (btnAcaoDropdown.classList.contains('btn-remover-prazo')) {
                if (prazosSalvos[itemKey]) {
                    prazosSalvos[itemKey].fatal = null; prazosSalvos[itemKey].pubOrig = null; prazosSalvos[itemKey].pub = null; prazosSalvos[itemKey].inicio = null; prazosSalvos[itemKey].disp = null; prazosSalvos[itemKey].timeline = null; prazosSalvos[itemKey].cumprido = false;
                    savePrazosSalvos(); atualizarEstatisticas();

                    if (isBusca) {
                        applyFilters();
                    } else {
                        filtroAgendaAtivo = null;
                        document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
                        renderAgenda(); renderCalendar();
                    }
                    if (typeof showToast === 'function') showToast("Contagem limpa.", "🧹");
                }
            }
            else if (btnAcaoDropdown.classList.contains('btn-remover-busca') || btnAcaoDropdown.classList.contains('btn-remover') || btnAcaoDropdown.classList.contains('btn-remover-card')) {
                removerComDesfazer(itemKey, isBusca, card);
            }
            return;
        }

        const cafeBanner = e.target.closest('.footer-cafe-banner'); if (cafeBanner && !e.target.closest('.pix-copy-row') && !e.target.closest('.modal-qr-white')) { cafeBanner.classList.toggle('expanded'); if (cafeBanner.classList.contains('expanded')) { setTimeout(() => window.scrollBy({ top: 250, behavior: 'smooth' }), 200); } }

        const copyPix = e.target.closest('.pix-btn-copy'); if (copyPix) { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(pixCodeText).then(() => { const originalHTML = copyPix.innerHTML; safeSetInnerHTML(copyPix, `COPIADO`);; copyPix.style.color = "#38A169"; setTimeout(() => { safeSetInnerHTML(copyPix, originalHTML);; copyPix.style.color = ""; }, 2000); }); return; }
    });

    window.addEventListener('scroll', () => {
        const btnTopo = document.getElementById("btnIrTopo");
        if (!btnTopo) return;
        if (window.scrollY > 300 || document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            btnTopo.classList.add('show');
        } else {
            btnTopo.classList.remove('show');
        }
    });
    const btnTopoClick = document.getElementById('btnIrTopo');
    if (btnTopoClick) {
        btnTopoClick.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function processarCheckCumprido(isCumpridoAgora, skipToast = false) {
        if (isCumpridoAgora) {
            window.totalCumpridosHistorico++; SafeStorage.set({ 'djen_cumpridos_total': window.totalCumpridosHistorico });
            SafeStorage.get(['djen_ja_avaliou'], (data) => {
                if (window.totalCumpridosHistorico === 50 && !data.djen_ja_avaliou) {
                    document.getElementById('reviewModal')?.classList.add('show');
                } else {
                    if (!skipToast) showToast("Prazo cumprido!", "✅");
                }
            });
        } else {
            window.totalCumpridosHistorico--; if (window.totalCumpridosHistorico < 0) window.totalCumpridosHistorico = 0;
            SafeStorage.set({ 'djen_cumpridos_total': window.totalCumpridosHistorico });
            if (!skipToast) showToast("Prazo reaberto.", "🔄");
        }
    }

    function atualizarEstatisticas() {
        let hoje = 0, cincoDias = 0, futuros = 0, cumpridos = 0, esperaCount = 0; const hj = new Date(); hj.setHours(12, 0, 0, 0);
        for (let k in prazosSalvos) {
            const p = prazosSalvos[k];
            if (!p) continue;
            if (p.cumprido) { cumpridos++; continue; }
            if (!p.fatal && !p.manual) continue;

            if (p.espera) {
                let diff = 0;
                let temFatal = false;
                if (p.fatal) {
                    const dt = parseDateBR(p.fatal);
                    diff = Math.ceil((dt - hj) / (1000 * 3600 * 24));
                    temFatal = true;
                }
                if (temFatal && diff < 0) {
                    hoje++;
                    continue;
                }
                esperaCount++;
                continue;
            }

            if (p.fatal) {
                const dt = parseDateBR(p.fatal); const diff = Math.ceil((dt - hj) / (1000 * 3600 * 24));
                if (diff <= 0) hoje++; else if (diff > 0 && diff <= 5) cincoDias++; else futuros++;
            }
        }
        const elHoje = document.getElementById('countHoje'); const el7Dias = document.getElementById('count7Dias'); const elTotal = document.getElementById('countTotal'); const elCumpridos = document.getElementById('countCumpridos');

        if (elHoje) {
            elHoje.textContent = hoje.toString().padStart(2, '0');
            el7Dias.textContent = cincoDias.toString().padStart(2, '0');
            elTotal.textContent = futuros.toString().padStart(2, '0');
            elCumpridos.textContent = cumpridos.toString().padStart(2, '0');

            elHoje.closest('.stat-box').classList.toggle('is-zero', hoje === 0);
            el7Dias.closest('.stat-box').classList.toggle('is-zero', cincoDias === 0);
            elTotal.closest('.stat-box').classList.toggle('is-zero', futuros === 0);
            elCumpridos.closest('.stat-box').classList.toggle('is-zero', cumpridos === 0);
        }

        const elEsperaBox = document.getElementById('countEsperaBox');
        if (elEsperaBox) {
            elEsperaBox.textContent = esperaCount.toString().padStart(2, '0');
            elEsperaBox.closest('.stat-box').classList.toggle('is-zero', esperaCount === 0);
        }
    }

    const getLocalDate = (daysToSubtract) => { const d = new Date(); d.setDate(d.getDate() - daysToSubtract); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const setDate = (d) => { const ini = document.getElementById('dataInicio'); if (ini) ini.value = getLocalDate(d); const fim = document.getElementById('dataFim'); if (fim) fim.value = getLocalDate(0); }; setDate(0);

    if(window.SearchEngine) window.SearchEngine.initSearch();
    SafeStorage.get(['djen_theme', 'djen_font_focus', 'djen_prazos_salvos', 'djen_termos_radar', 'djen_notificar', 'djen_oab_numero', 'djen_oab_estado', 'djen_hora_notificacao', 'djen_last_search', 'djen_cumpridos_total', 'djen_last_backup_date', 'djen_total_buscas', 'djen_total_lidos', 'djen_total_salvos', 'djen_ultimo_aviso', 'djen_publicacoes_lidas', 'djen_dias_controle', 'djen_email_gcal', 'djen_gemini_api_key', 'djen_ia_provider', 'djen_ia_api_key', 'djen_ia_model', 'djen_ia_endpoint', 'djen_suspensoes_custom', 'djen_config_notificar_background_enabled', 'djen_branding_nome', 'djen_branding_slogan', 'djen_branding_contato', 'djen_branding_cor', 'djen_branding_logo', 'djen_datajud_api_key', 'djen_jurisflow_enabled', 'djen_jurisflow_port', 'djen_jurisflow_token'], (data) => {
        brandingNome = data.djen_branding_nome || "";
        brandingSlogan = data.djen_branding_slogan || "";
        brandingContato = data.djen_branding_contato || "";
        brandingCor = data.djen_branding_cor || "#2e2c2a";
        brandingLogo = data.djen_branding_logo || "";

        configJurisflowEnabled = data.djen_jurisflow_enabled === 'true';
        configJurisflowPort = data.djen_jurisflow_port || '18080';
        configJurisflowToken = data.djen_jurisflow_token || 'jf_djen_secret';

        if (data.djen_termos_radar) { if (typeof data.djen_termos_radar === 'string') { window.palavrasUrgentes = data.djen_termos_radar.split(',').map(s => s.trim().toLowerCase()).filter(Boolean); } else if (Array.isArray(data.djen_termos_radar)) { window.palavrasUrgentes = data.djen_termos_radar.map(s => String(s).trim().toLowerCase()).filter(Boolean); } }
        if (data.djen_theme) { temaAtual = data.djen_theme; aplicarTema(temaAtual); }
        if (data.djen_font_focus) { fontSizeFocoAtual = parseInt(data.djen_font_focus); }
        document.documentElement.style.setProperty('--font-focus', fontSizeFocoAtual + 'px');

        if (data.djen_suspensoes_custom) {
            try { customSuspensions = safeJSONParse(data.djen_suspensoes_custom, []); } catch(e) { customSuspensions = []; }
        }
        isNotificarBackground = data.djen_config_notificar_background_enabled === 'true';

        if (data.djen_prazos_salvos) {
            try {
                prazosSalvos = safeJSONParse(data.djen_prazos_salvos, {});
                console.log("DJEN: Prazos carregados:", Object.keys(prazosSalvos).length);
            } catch (e) { prazosSalvos = {}; }
        } else { prazosSalvos = {}; }

        window.totalCumpridosHistorico = data.djen_cumpridos_total || 0;
        window.totalBuscas = data.djen_total_buscas || 0;
        window.totalLidos = data.djen_total_lidos || 0;
        window.totalSalvos = data.djen_total_salvos || 0;

        if (data.djen_publicacoes_lidas) {
            try { window.publicacoesLidas = new Set(safeJSONParse(data.djen_publicacoes_lidas, [])); }
            catch (e) { window.publicacoesLidas = new Set(); }
        }

        let precisaSalvar = false; const hojeRef = new Date(); hojeRef.setHours(0, 0, 0, 0);
        for (const key in prazosSalvos) { if (prazosSalvos[key] && prazosSalvos[key].fatal) { const dataFatal = parseDateBR(prazosSalvos[key].fatal); const diffDias = Math.floor((hojeRef.getTime() - dataFatal.getTime()) / (1000 * 3600 * 24)); if (diffDias > 30 && !prazosSalvos[key].cumprido) { delete prazosSalvos[key]; precisaSalvar = true; } } }
        if (precisaSalvar) savePrazosSalvos();
        else atualizarBadgeIcone(prazosSalvos);

        const lastBackup = data.djen_last_backup_date || 0; const daysSinceBackup = (Date.now() - lastBackup) / (1000 * 3600 * 24);
        if (daysSinceBackup > 30 && Object.keys(prazosSalvos).length > 0) { const btnMenu = document.getElementById('btnHeaderMenu'); if (btnMenu) { btnMenu.classList.add('needs-backup'); btnMenu.setAttribute('data-tooltip', 'Opções (Backup Recomendado)'); } const btnBackupMenu = document.getElementById('btnSalvarBackupMenu'); if (btnBackupMenu) { btnBackupMenu.classList.add('btn-backup-pulse'); } }

        if (data.djen_oab_numero) { const onum = document.getElementById('oabNum'); if (onum) onum.value = data.djen_oab_numero; }
        if (data.djen_oab_estado) { const ouf = document.getElementById('oabUf'); if (ouf) ouf.value = data.djen_oab_estado; }

        if (data.djen_email_gcal) {
            // Atualiza _appCache + SafeStorage (sem localStorage)
            _appCache.emailGcal = data.djen_email_gcal;
            AppState.config.emailAgenda = data.djen_email_gcal;
            const inputGcal = document.getElementById('inputEmailGcal');
            if (inputGcal) inputGcal.value = data.djen_email_gcal;
        }

        if (data.djen_datajud_api_key) {
            configDataJudApiKey = data.djen_datajud_api_key;
            // Correção automática caso a chave incorreta ou desatualizada tenha sido salva
            if (configDataJudApiKey.includes('Wl:cVNjQQ==') || configDataJudApiKey.includes('WlxcVNjQQ==')) {
                configDataJudApiKey = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';
                SafeStorage.set({ 'djen_datajud_api_key': configDataJudApiKey });
            }
        }
        const inputDataJud = document.getElementById('inputApiKeyDataJud');
        if (inputDataJud) inputDataJud.value = configDataJudApiKey;

        if (data.djen_ia_provider) iaProvider = data.djen_ia_provider;
        if (data.djen_ia_api_key) iaApiKey = data.djen_ia_api_key;
        if (data.djen_ia_model) iaModel = data.djen_ia_model;
        if (data.djen_ia_endpoint) iaEndpoint = data.djen_ia_endpoint;

        // Migração automática: modelos descontinuados pelo Google
        const modelosDeprecados = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash', 'gemini-2.0-pro'];
        if (modelosDeprecados.includes(iaModel)) {
            console.log(`DJEN: Modelo "${iaModel}" descontinuado. Migrando para gemini-3.6-flash.`);
            iaModel = 'gemini-3.6-flash';
            SafeStorage.set({ 'djen_ia_model': iaModel });
        }

        // Fallback para quem já tinha o Gemini configurado na versão anterior
        if (!iaApiKey && data.djen_gemini_api_key) {
            iaApiKey = data.djen_gemini_api_key;
            iaProvider = 'gemini';
            iaModel = 'gemini-3.6-flash';
        }



        if (data.djen_last_search) { const parsedData = safeJSONParse(data.djen_last_search, []); if (Array.isArray(parsedData) && parsedData.length > 0) { resultadosGlobais = parsedData; const tribs = [...new Set(resultadosGlobais.map(i => i.siglaTribunal))].sort(); const filtro = document.getElementById('filtroTribunal'); if (filtro) { safeSetInnerHTML(filtro, '<option value="">Tribunal</option>');; tribs.forEach(t => { const opt = document.createElement("option"); opt.value = t; opt.textContent = t; filtro.appendChild(opt); }); } const ctFiltro = document.getElementById('containerFiltro'); if (ctFiltro) ctFiltro.style.display = 'none'; const welcome = document.getElementById('welcomeState'); if (welcome) welcome.style.display = 'flex'; } else { SafeStorage.set({ 'djen_last_search': '' }); } }

        SafeStorage.get(['djen_historico_buscas', 'djen_historico_controle'], (d) => {
            if (d.djen_historico_buscas) {
                window.historicoBuscas = safeJSONParse(d.djen_historico_buscas, []);
                renderHistoricoBuscas();

                // Se o campo OAB estiver vazio e houver exatamente uma única OAB pesquisada no histórico, preenche automaticamente.
                const onum = document.getElementById('oabNum');
                const ouf = document.getElementById('oabUf');
                if (onum && ouf && !onum.value.trim()) {
                    const uniqueOabs = [];
                    window.historicoBuscas.forEach(h => {
                        if (h.tipo === 'oab' && h.valor) {
                            const key = `${h.valor.trim()}_${(h.uf || '').trim().toUpperCase()}`;
                            if (!uniqueOabs.some(o => `${o.valor.trim()}_${(o.uf || '').trim().toUpperCase()}` === key)) {
                                uniqueOabs.push(h);
                            }
                        }
                    });
                    if (uniqueOabs.length === 1) {
                        onum.value = uniqueOabs[0].valor;
                        ouf.value = uniqueOabs[0].uf || '';
                        onum.dispatchEvent(new Event('input'));
                        ouf.dispatchEvent(new Event('input'));
                        ouf.dispatchEvent(new Event('change'));

                        // Foco automático no botão de busca para poder dar Enter de imediato
                        const btnBuscar = document.getElementById('btnBuscar');
                        if (btnBuscar) {
                            setTimeout(() => btnBuscar.focus(), 100);
                        }
                    }
                }
            }
            if (d.djen_historico_controle) {
                historicoControle = safeJSONParse(d.djen_historico_controle, []);
            }

            // Pesquisa automática apenas na primeira abertura do dia se OAB e UF preenchidas
            const onum = document.getElementById('oabNum');
            const ouf = document.getElementById('oabUf');
            if (onum && ouf && onum.value.trim() && ouf.value.trim()) {
                const hojeStr = new Date().toISOString().split('T')[0];
                if (d.djen_last_auto_search_date !== hojeStr) {
                    SafeStorage.set({ 'djen_last_auto_search_date': hojeStr });
                    const btnBuscar = document.getElementById('btnBuscar');
                    if (btnBuscar) {
                        setTimeout(() => {
                            btnBuscar.click();
                        }, 100);
                    }
                }
            }
        });


        atualizarEstatisticas(); filtroAgendaAtivo = null; renderAgenda(); renderCalendar(); 
        
        // Inicia enriquecimento dos processos antigos em background
        setTimeout(() => iniciarFilaEnriquecimentoDataJud(), 2000);
    });

    const elNum = document.getElementById('oabNum');
    if (elNum) {
        elNum.addEventListener('input', debounce((e) => SafeStorage.set({ 'djen_oab_numero': e.target.value }), 500));
        elNum.addEventListener('focus', () => elNum.select());
    }
    const elUf = document.getElementById('oabUf');
    if (elUf) {
        elUf.addEventListener('input', debounce((e) => SafeStorage.set({ 'djen_oab_estado': e.target.value.toUpperCase() }), 500));
        elUf.addEventListener('focus', () => elUf.select());
    }

    const procInput = document.getElementById('procNumBusca');
    if (procInput) {
        procInput.addEventListener('input', function (e) {
            let val = e.target.value;
            let v = val.replace(/\D/g, ''); 
            if (v.length > 20) v = v.substring(0, 20);

            const temSeparadores = val.includes('-') || val.includes('.');
            const ehIncompletoCurto = v.length < 20 && temSeparadores;

            if (!ehIncompletoCurto) {
                v = v.replace(/^(\d{7})(\d)/, "$1-$2"); 
                v = v.replace(/-(\d{2})(\d)/, "-$1.$2"); 
                v = v.replace(/\.(\d{4})(\d)/, ".$1.$2"); 
                v = v.replace(/\.(\d)(\d)/, ".$1.$2"); 
                v = v.replace(/\.(\d{2})(\d)/, ".$1.$2"); 
                e.target.value = v;
            }
        });
        procInput.addEventListener('blur', function (e) {
            const normalized = normalizarNumeroCNJ(e.target.value);
            if (normalized && normalized.length === 20) {
                e.target.value = formatCNJ(normalized);
            }
        });
        procInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const btnB = document.getElementById('btnBuscar'); if (btnB) btnB.click(); } });
    }

    const btnOab = document.getElementById('btnSearchTypeOab'); const btnProc = document.getElementById('btnSearchTypeProc');
    const camposOab = document.getElementById('camposOAB'); const camposProc = document.getElementById('camposProcesso');
    if (btnOab && btnProc && camposOab && camposProc) { btnOab.onclick = () => { window.searchMode = 'oab'; btnOab.classList.add('active'); btnProc.classList.remove('active'); camposOab.style.display = 'block'; camposProc.style.display = 'none'; }; btnProc.onclick = () => { window.searchMode = 'proc'; btnProc.classList.add('active'); btnOab.classList.remove('active'); camposOab.style.display = 'none'; camposProc.style.display = 'block'; }; }

    const bfMinus = document.getElementById('btnFontMinus'); if (bfMinus) bfMinus.onclick = (e) => { e.stopPropagation(); atualizarTamanhoFonteFoco(-1); };
    const bfPlus = document.getElementById('btnFontPlus'); if (bfPlus) bfPlus.onclick = (e) => { e.stopPropagation(); atualizarTamanhoFonteFoco(1); };

    const bmTextoF = document.getElementById('btnMarcarTextoFoco');
    if (bmTextoF) {
        bmTextoF.onmousedown = (e) => e.preventDefault();
        bmTextoF.onclick = (e) => { e.stopPropagation(); handleMarcarTexto(); };
    }

    const bcTagF = document.getElementById('btnCriarTagFoco');
    if (bcTagF) {
        bcTagF.onmousedown = (e) => e.preventDefault();
        bcTagF.onclick = (e) => {
            const key = document.getElementById('focusModeOverlay')?.getAttribute('data-active-key');
            if (key) {
                const input = document.querySelector(`.intimacao-card[data-key="${key}"] .nota-input`);
                if (input) handleCriarTag(input);
                else showToast("Para criar a tag, expanda os detalhes da publicação.", "⚠️");
            }
        };
    }

    // Feature B v50.71: Botão "✨ Resumir" no modo foco (texto completo)
    const btnResumirFoco = document.getElementById('btnResumirFoco');
    if (btnResumirFoco) {
        btnResumirFoco.onclick = async (e) => {
            e.stopPropagation();

            const resumoContainer = document.getElementById('focusResumoIAContainer');
            const teorEl = document.getElementById('focusTeorContent');
            if (!resumoContainer || !teorEl) return;

            // Verificar se o módulo está disponível
            if (!globalThis.ResumoProcesso) {
                showToast("Módulo de resumo não disponível. Recarregue a extensão.", "❌");
                return;
            }

            // Se já existe um resumo exibido, toggling (ocultar/mostrar)
            if (resumoContainer.innerHTML && !resumoContainer.innerHTML.includes('resumo-erro')) {
                resumoContainer.style.display = resumoContainer.style.display === 'none' ? 'block' : 'none';
                btnResumirFoco.textContent = resumoContainer.style.display === 'none' ? '✨ Resumir' : '✕ Ocultar Resumo';
                return;
            }

            // Extrair texto do conteúdo exibido
            const texto = teorEl.innerText || teorEl.textContent || '';
            if (!texto || texto.trim().length < 30) {
                showToast("Texto muito curto para resumir.", "⚠️");
                return;
            }

            // Estado de carregamento
            btnResumirFoco.classList.add('carregando');
            btnResumirFoco.innerHTML = `<span class="spinner-ia"></span> Resumindo...`;
            resumoContainer.style.display = 'block';
            resumoContainer.innerHTML = `<div class="resumo-ia-card"><div class="resumo-header"><span class="resumo-titulo">✨ Gerando resumo...</span></div><div class="resumo-corpo"><div class="resumo-linha"><span class="resumo-valor" style="color:var(--text-placeholder)">Aguarde, a IA está lendo a publicação...</span></div></div></div>`;

            try {
                // Tentar obter dados do DataJud para enriquecer o resumo
                const activeKey = document.getElementById('focusModeOverlay')?.getAttribute('data-active-key');
                let dadosDataJud = null;
                if (activeKey && prazosSalvos[activeKey]) {
                    const item = prazosSalvos[activeKey];
                    const numLimpo = String(item.processo || '').replace(/\D/g, '');
                    if (numLimpo.length >= 20 && item.siglaTribunal && globalThis.APIClient) {
                        dadosDataJud = await globalThis.APIClient.consultarProcessoDataJud(
                            item.processo, item.siglaTribunal
                        ).catch(() => null);
                    }
                }

                const resumo = await globalThis.ResumoProcesso.gerarResumo(texto, dadosDataJud);
                const html = globalThis.ResumoProcesso.renderizarHTML(resumo);
                resumoContainer.innerHTML = html;
                btnResumirFoco.innerHTML = '✕ Ocultar Resumo';
                btnResumirFoco.classList.remove('carregando');

                if (resumo.urgente) {
                    showToast("⚠️ Publicação marcada como URGENTE pela IA!", "🚨");
                }

                // 🤖 INJEÇÃO DE TAREFAS VIA IA NO MOTOR NATIVO
                if (resumo.tarefas_sugeridas && Array.isArray(resumo.tarefas_sugeridas) && resumo.tarefas_sugeridas.length > 0) {
                    if (activeKey && prazosSalvos[activeKey]) {
                        const item = prazosSalvos[activeKey];
                        if (!item.tarefas) item.tarefas = [];
                        
                        let novasTarefas = 0;
                        resumo.tarefas_sugeridas.forEach(tStr => {
                            // Evitar duplicidade exata
                            const existe = item.tarefas.some(t => t.texto && t.texto.toLowerCase().trim() === tStr.toLowerCase().trim());
                            if (!existe) {
                                item.tarefas.push({ feita: false, texto: `✨ IA: ${tStr}` });
                                novasTarefas++;
                            }
                        });
                        
                        if (novasTarefas > 0) {
                            savePrazosSalvos();
                            showToast(`🤖 ${novasTarefas} tarefa(s) da IA adicionada(s) à checklist!`, "✨");
                            
                            // Re-renderizar listas em background para atualizar o card
                            if (document.getElementById('viewSalvos').classList.contains('active') && typeof renderSalvos === 'function') {
                                renderSalvos();
                            } else if (document.getElementById('viewBusca').classList.contains('active') && typeof renderBusca === 'function') {
                                renderBusca();
                            }
                        }
                    }
                }

            } catch (err) {
                console.error('[Resumir] Erro:', err);
                resumoContainer.innerHTML = `<div class="resumo-erro">❌ ${err.message}</div>`;
                btnResumirFoco.classList.remove('carregando');
                btnResumirFoco.innerHTML = '✨ Resumir';
            }
        };
    }

    // Limpar o container de resumo ao fechar/abrir o modo foco
    // (para não mostrar o resumo da publicação anterior)
    const _originalFecharModoFoco = window.fecharModoFoco;
    window.fecharModoFoco = function() {
        const resumoContainer = document.getElementById('focusResumoIAContainer');
        if (resumoContainer) { resumoContainer.innerHTML = ''; resumoContainer.style.display = 'block'; }
        const btnR = document.getElementById('btnResumirFoco');
        if (btnR) { btnR.innerHTML = '✨ Resumir'; btnR.classList.remove('carregando'); }
        if (typeof _originalFecharModoFoco === 'function') _originalFecharModoFoco();
    };

    function switchView(v) {
        const vb = document.getElementById('viewBusca');
        const vs = document.getElementById('viewSalvos');
        const vc = document.getElementById('viewControle');
        const vcalc = document.getElementById('viewCalculadora');
        
        // Re-trigger animation
        [vb, vs, vc].forEach(el => {
            if (el && el.style.display !== 'none' && (
                (v === 'busca' && el !== vb) || 
                (v === 'salvos' && el !== vs) || 
                (v === 'controle' && el !== vc)
            )) {
                // If it was visible and now it's hiding, we could add exit animations here, but for now we'll just hide.
            }
        });

        if (vb) { vb.style.display = v === 'busca' ? 'block' : 'none'; if(v === 'busca') { vb.classList.remove('tab-panel-animated'); void vb.offsetWidth; vb.classList.add('tab-panel-animated'); } }
        if (vs) { vs.style.display = v === 'salvos' ? 'block' : 'none'; if(v === 'salvos') { vs.classList.remove('tab-panel-animated'); void vs.offsetWidth; vs.classList.add('tab-panel-animated'); } }
        if (vc) { vc.style.display = v === 'controle' ? 'block' : 'none'; if(v === 'controle') { vc.classList.remove('tab-panel-animated'); void vc.offsetWidth; vc.classList.add('tab-panel-animated'); } }
        // Sempre esconder a calculadora ao trocar para outra aba
        if (vcalc) vcalc.style.display = 'none';
        const tabCalcBtn = document.getElementById('tabCalculadora');
        if (tabCalcBtn) tabCalcBtn.classList.remove('active');
        
        const tabBusca = document.getElementById('tabBusca'); const tabSalvos = document.getElementById('tabSalvos'); const tabCalendario = document.getElementById('tabControle');
        if (tabBusca) { tabBusca.classList.toggle('active', v === 'busca'); tabBusca.setAttribute('aria-selected', v === 'busca'); }
        if (tabSalvos) { tabSalvos.classList.toggle('active', v === 'salvos'); tabSalvos.setAttribute('aria-selected', v === 'salvos'); }
        if (tabCalendario) { tabCalendario.classList.toggle('active', v === 'controle'); tabCalendario.setAttribute('aria-selected', v === 'controle'); }
        
        if (v === 'salvos') { renderAgenda(); } if (v === 'controle') { renderControle(); }
        if (typeof moverLinhaLiquida === 'function') moverLinhaLiquida();
    }

    window.mudarParaAba = switchView;

    if (tabBuscaBtn) tabBuscaBtn.onclick = () => { switchView('busca'); updateProgressBar(); moverLinhaLiquida(); };
    const tsBtn = document.getElementById('tabSalvos');
    if (tsBtn) tsBtn.onclick = () => { filtroAgendaAtivo = null; document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active')); switchView('salvos'); moverLinhaLiquida(); };
    const tcBtn = document.getElementById('tabControle'); if (tcBtn) tcBtn.onclick = () => {  switchView('controle'); moverLinhaLiquida(); };
    const bCloseF = document.getElementById('btnCloseFocus'); if (bCloseF) bCloseF.onclick = () => {
        fecharModoFoco();
    };

    // --- URGENCY SCANNER ---
    function inicializarNovosRecursosFoco() {
        const container = document.getElementById('focusTeorContent');
        if (!container) return;

        // 1. URGENCY SCANNER (Chips de Urgência contextualizados no topo)
        const urgencyBar = document.getElementById('focusUrgencyBar');
        if (urgencyBar) {
            urgencyBar.replaceChildren();;
            urgencyBar.style.display = 'none';

            const marks = container.querySelectorAll('.radar-auto');
            if (marks.length > 0) {
                const groups = {};
                marks.forEach((mark) => {
                    const text = mark.textContent.trim().toLowerCase();
                    if (text) {
                        if (!groups[text]) groups[text] = [];
                        groups[text].push(mark);
                    }
                });

                if (Object.keys(groups).length > 0) {
                    urgencyBar.style.display = 'flex';
                    
                    const label = document.createElement('span');
                    label.style = 'font-size: 11px; font-weight: 700; color: var(--text-muted);  margin-right: 6px; letter-spacing: 0.5px;';
                    safeSetInnerHTML(label, '⚠️ Urgências:');;
                    urgencyBar.appendChild(label);

                    Object.entries(groups).forEach(([word, occurrences]) => {
                        const chip = document.createElement('button');
                        chip.className = 'urgency-chip';
                        safeSetInnerHTML(chip, `<span>${word}</span> <span style="background: rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 50%; font-size: 9px;">${occurrences.length}</span>`);;
                        
                        let clickCount = 0;
                        chip.onclick = (evt) => {
                            evt.stopPropagation();
                            const currentOccur = occurrences[clickCount % occurrences.length];
                            currentOccur.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // Microinteração elástica tátil de flash
                            currentOccur.style.transform = 'scale(1.2)';
                            setTimeout(() => {
                                currentOccur.style.transform = '';
                            }, 400);

                            clickCount++;
                        };
                        urgencyBar.appendChild(chip);
                    });
                }
            }
        }
    }



    const elBtnEditarResumo = document.getElementById('btnEditarResumo');
    if (elBtnEditarResumo) {
        elBtnEditarResumo.addEventListener('click', () => {
            document.getElementById('resumoBusca').style.display = 'none';
            document.getElementById('areaBusca').style.display = 'block';
        });
    }

    const elBtnLimparBusca = document.getElementById('btnLimparBusca');
    if (elBtnLimparBusca) {
        elBtnLimparBusca.addEventListener('click', (e) => {
            e.stopPropagation();
            const inputProc = document.getElementById('procNumBusca');
            if (inputProc) inputProc.value = '';

            document.getElementById('resumoBusca').style.display = 'none';
            document.getElementById('areaBusca').style.display = 'block';
            document.getElementById('resultados').replaceChildren();;

            if (resultadosExibidos.length === 0) {
                safeSetInnerHTML(document.getElementById('resultados'), `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <h3>Nenhuma publicação encontrada</h3>
                <p>A sua busca ou os filtros aplicados<br>não retornaram resultados.</p>
            </div>
        `);;
                return;
            }

            const welcome = document.getElementById('welcomeState');
            if (welcome) welcome.style.display = 'flex';
            document.getElementById('progressWrapper').style.display = 'none';

            const ctFiltro = document.getElementById('containerFiltro');
            if (ctFiltro) ctFiltro.style.display = 'none';

            const acoesLote = document.getElementById('acoesBuscaLote');
            if (acoesLote) acoesLote.style.display = 'none';

            

            const cr = document.getElementById('contadorResultados');
            if (cr) cr.textContent = '';

            SafeStorage.set({ 'djen_last_search': '' });
            window.resultadosExibidos = [];
            resultadosGlobais = [];
        });
    }

    document.querySelectorAll('.stat-box').forEach(box => {
        box.onclick = () => {
            const isAlreadyActive = box.classList.contains('active'); document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
            if (isAlreadyActive) { filtroAgendaAtivo = null; } else { box.classList.add('active'); if (box.classList.contains('stat-hoje')) filtroAgendaAtivo = 'hoje'; if (box.classList.contains('stat-dias')) filtroAgendaAtivo = '5dias'; if (box.classList.contains('stat-pendentes')) filtroAgendaAtivo = 'futuros'; if (box.classList.contains('stat-espera')) filtroAgendaAtivo = 'espera'; if (box.classList.contains('stat-cumpridos')) filtroAgendaAtivo = 'cumpridos'; }

            const btnE = document.getElementById('btnFiltroEspera');
            if (btnE) { btnE.classList.remove('active'); btnE.style.borderColor = 'var(--border-light)'; btnE.style.background = 'var(--bg-card)'; btnE.style.color = 'var(--text-main)'; }

            switchView('salvos');
        };
    });

    const btnFiltroEspera = document.getElementById('btnFiltroEspera');
    if (btnFiltroEspera) {
        btnFiltroEspera.onclick = () => {
            const isActive = btnFiltroEspera.classList.contains('active');
            document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
            filtroAgendaAtivo = null;

            if (isActive) {
                btnFiltroEspera.classList.remove('active');
                btnFiltroEspera.style.borderColor = 'var(--border-light)';
                btnFiltroEspera.style.background = 'var(--bg-card)';
            } else {
                btnFiltroEspera.classList.add('active');
                btnFiltroEspera.style.borderColor = 'var(--border-focus)';
                btnFiltroEspera.style.background = 'var(--primary-light)';
                filtroAgendaAtivo = 'espera';
            }
            switchView('salvos');
        };
    }

    const filtroPrazosEl = document.getElementById('filtroPrazos'); if (filtroPrazosEl) { filtroPrazosEl.addEventListener('input', debounce(renderAgenda, 300)); }

    // === #7 — Filtros Avançados na Aba Prazos ===
    const btnToggleFiltros = document.getElementById('btnToggleFiltrosAvancados');
    const painelFiltros = document.getElementById('painelFiltrosAvancados');
    if (btnToggleFiltros && painelFiltros) {
        btnToggleFiltros.addEventListener('click', () => {
            const isOpen = painelFiltros.style.display !== 'none';
            painelFiltros.style.display = isOpen ? 'none' : 'block';
            btnToggleFiltros.style.background = isOpen ? '' : 'var(--primary)';
            btnToggleFiltros.style.color = isOpen ? '' : 'var(--primary-text)';
        });
    }
    const filtroAvancadoStatus = document.getElementById('filtroAvancadoStatus');
    const filtroAvancadoTribunal = document.getElementById('filtroAvancadoTribunal');
    const filtroAvancadoOrdem = document.getElementById('filtroAvancadoOrdem');
    const filtroAvancadoUF = document.getElementById('filtroAvancadoUF');
    const btnLimparFiltros = document.getElementById('btnLimparFiltrosAvancados');

    if (filtroAvancadoStatus) {
        filtroAvancadoStatus.addEventListener('change', (e) => {
            if (filtroAvancadoOrdem) {
                if (e.target.value === 'cumprido') {
                    filtroAvancadoOrdem.innerHTML = `
                        <option value="cump_desc">Data cumprimento (recente)</option>
                        <option value="cump_asc">Data cumprimento (antiga)</option>
                        <option value="proc_asc">Processo / Apelido (A-Z)</option>
                    `;
                } else {
                    filtroAvancadoOrdem.innerHTML = `
                        <option value="fatal_asc">Data fatal (mais urgente)</option>
                        <option value="fatal_desc">Data fatal (mais distante)</option>
                        <option value="proc_asc">Processo (A-Z)</option>
                        <option value="trib_asc">Tribunal (A-Z)</option>
                    `;
                }
            }
            debounce(renderAgenda, 200)();
        });
    }
    if (filtroAvancadoTribunal) filtroAvancadoTribunal.addEventListener('input', debounce(renderAgenda, 300));
    if (filtroAvancadoOrdem) filtroAvancadoOrdem.addEventListener('change', debounce(renderAgenda, 200));
    if (filtroAvancadoUF) filtroAvancadoUF.addEventListener('input', debounce(renderAgenda, 300));

    if (btnLimparFiltros) {
        btnLimparFiltros.addEventListener('click', () => {
            if (filtroAvancadoStatus) {
                filtroAvancadoStatus.value = '';
                if (filtroAvancadoOrdem) {
                    filtroAvancadoOrdem.innerHTML = `
                        <option value="fatal_asc">Data fatal (mais urgente)</option>
                        <option value="fatal_desc">Data fatal (mais distante)</option>
                        <option value="proc_asc">Processo (A-Z)</option>
                        <option value="trib_asc">Tribunal (A-Z)</option>
                    `;
                }
            }
            if (filtroAvancadoTribunal) filtroAvancadoTribunal.value = '';
            if (filtroAvancadoOrdem) filtroAvancadoOrdem.value = 'fatal_asc';
            if (filtroAvancadoUF) filtroAvancadoUF.value = '';
            renderAgenda();
        });
    }

    // === #5 — Modo Leitura Serena ===
    let modoSereno = localStorage.getItem('djen_modo_sereno') === 'true';
    const focoOverlay = document.getElementById('focusModeOverlay');
    const btnModoSereno = document.getElementById('btnModoSereno');

    function aplicarModoSereno(ativo) {
        if (!focoOverlay) return;
        if (ativo) {
            focoOverlay.style.setProperty('--foco-bg', '#0d0d0d');
            focoOverlay.style.setProperty('--foco-text', '#f0ebe0');
            focoOverlay.style.background = '#0d0d0d';
            focoOverlay.style.color = '#f0ebe0';
            const teorEl = document.getElementById('focusTeorContent');
            if (teorEl) { teorEl.style.color = '#e8e0d0'; teorEl.style.lineHeight = '1.85'; teorEl.style.fontSize = 'calc(var(--font-focus, 16px) + 1px)'; }
            if (btnModoSereno) { btnModoSereno.style.background = 'rgba(240,235,224,0.15)'; }
        } else {
            focoOverlay.style.background = '';
            focoOverlay.style.color = '';
            const teorEl = document.getElementById('focusTeorContent');
            if (teorEl) { teorEl.style.color = ''; teorEl.style.lineHeight = ''; teorEl.style.fontSize = ''; }
            if (btnModoSereno) { btnModoSereno.style.background = ''; }
        }
    }

    if (btnModoSereno) {
        btnModoSereno.addEventListener('click', () => {
            modoSereno = !modoSereno;
            localStorage.setItem('djen_modo_sereno', modoSereno);
            aplicarModoSereno(modoSereno);
        });
    }

    // Aplicar modo sereno ao abrir o foco
    const obsSereno = new MutationObserver(() => {
        if (focoOverlay && focoOverlay.classList.contains('show') && modoSereno) {
            setTimeout(() => aplicarModoSereno(true), 50);
        }
    });
    if (focoOverlay) obsSereno.observe(focoOverlay, { attributes: true, attributeFilter: ['class'] });

    // === #18 — Destaque de Palavras-chave no Modo Foco ===
    function aplicarHighlightFoco() {
        const teorEl = document.getElementById('focusTeorContent');
        if (!teorEl || !palavrasUrgentes || palavrasUrgentes.length === 0) return;
        let html = teorEl.innerHTML;
        // Remover highlights anteriores antes de reaplicar
        html = html.replace(/<mark class="foco-kw[^"]*"[^>]*>(.*?)<\/mark>/gi, '$1');
        const cores = ['#ff6b35', '#e63946', '#f4a261', '#2a9d8f', '#6a0dad'];
        palavrasUrgentes.forEach((palavra, i) => {
            if (!palavra || palavra.trim().length < 2) return;
            const cor = cores[i % cores.length];
            const escaped = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escaped})`, 'gi');
            html = html.replace(regex, `<mark class="foco-kw" style="background:${cor}22;color:${cor};border-radius:3px;padding:0 2px;font-weight:600;">$1</mark>`);
        });
        safeSetInnerHTML(teorEl, html);
    }

    if (focoOverlay) {
        const obsHighlight = new MutationObserver((mutations) => {
            mutations.forEach(m => {
                if (m.type === 'childList' && m.target.id === 'focusTeorContent' && m.addedNodes.length > 0) {
                    setTimeout(aplicarHighlightFoco, 100);
                }
            });
        });
        const teorEl = document.getElementById('focusTeorContent');
        if (teorEl) obsHighlight.observe(teorEl, { childList: true });
    }



    

    function aplicarHighlighterRadar(texto) {
        if (!texto) return "";
        let textoDestacado = texto;

        const regexDispositivo = /(ante o exposto|isto posto|diante do exposto|posto isso|pelo exposto|assim, julgo|com base no exposto|julgo procedente|julgo improcedente)([\s\S]+)/i;
        const matchDispositivo = textoDestacado.match(regexDispositivo);

        if (matchDispositivo) {
            const textoAntes = textoDestacado.substring(0, matchDispositivo.index);
            const textoDecisao = matchDispositivo[0];

            textoDestacado = textoAntes + `<div class="destaque-dispositivo"><span style="font-size: 11px;  font-weight: 700; color: var(--primary); display: block; margin-bottom: 6px; letter-spacing: 0.05em;">⚖️ Dispositivo da Decisão</span>` + textoDecisao + `</div>`;
        }

        const palavrasOrdenadas = [...palavrasUrgentes].sort((a, b) => b.length - a.length);

        palavrasOrdenadas.forEach(palavra => {
            if (palavra.length < 3) return;
            const regex = new RegExp(`\\b(${palavra.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})\\b`, 'gi');
            textoDestacado = textoDestacado.replace(regex, '<mark class="marca-texto radar-auto" data-tooltip="Detectado pelo Radar Automático">$&</mark>');
        });

        return textoDestacado;
    }

    function criarRadarNavigator(teorInnerBox, txt) {
        if (!txt) return null;
        
        const encontrados = [];
        palavrasUrgentes.forEach(palavra => {
            if (palavra.length < 3) return;
            const regex = new RegExp(`\\b${palavra.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'gi');
            const matches = txt.match(regex);
            if (matches && matches.length > 0) {
                encontrados.push({ palavra, count: matches.length });
            }
        });

        if (encontrados.length === 0) return null;

        const navContainer = document.createElement("div");
        navContainer.className = "radar-navigator";
        navContainer.style.cssText = "display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; font-size: 11px; padding: 6px 10px; background: var(--bg-hover); border-radius: 8px; border: 1px solid var(--border-light); align-items: center;";
        
        const label = document.createElement("span");
        label.style.cssText = "font-weight: 600; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; margin-right: 4px;";
        safeSetInnerHTML(label, `🎯 Radar:`);
        navContainer.appendChild(label);

        encontrados.forEach(item => {
            const pill = document.createElement("button");
            pill.className = "radar-pill";
            pill.style.cssText = "cursor: pointer; background: var(--bg-panel); border: 1px solid var(--border-light); border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 500; transition: 0.1s; display: inline-flex; align-items: center; gap: 2px; color: var(--text-main); font-family: 'Inter', -apple-system, sans-serif;";
            pill.onmouseover = () => { pill.style.background = "var(--bg-body)"; pill.style.borderColor = "var(--primary)"; };
            pill.onmouseleave = () => { pill.style.background = "var(--bg-panel)"; pill.style.borderColor = "var(--border-light)"; };
            pill.textContent = `${item.palavra} (${item.count})`;
            
            let currentIdx = 0;
            pill.onclick = (e) => {
                e.stopPropagation();
                const cleanWord = item.palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                const marks = Array.from(teorInnerBox.querySelectorAll('mark.radar-auto, mark.marca-texto, mark.highlight-term')).filter(m => {
                    return m.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === cleanWord;
                });
                
                if (marks.length > 0) {
                    teorInnerBox.querySelectorAll('.radar-focus-mark').forEach(m => m.classList.remove('radar-focus-mark'));
                    
                    const targetMark = marks[currentIdx % marks.length];
                    targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    targetMark.classList.add('radar-focus-mark');
                    
                    currentIdx++;
                }
            };
            navContainer.appendChild(pill);
        });

        return navContainer;
    }


    function obterDataDisponibilizacaoISO(obj) {
        if (!obj) return null;
        if (obj.data_disponibilizacao) {
            return obj.data_disponibilizacao.substring(0, 10);
        }
        if (obj.pubOrig) {
            return obj.pubOrig.substring(0, 10);
        }
        if (obj.disp) {
            const parts = obj.disp.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        if (obj.pub) {
            const parts = obj.pub.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        return null;
    }

    function encontrarPrazoSalvo(dataDisp, processo) {
        if (!processo || !dataDisp) return null;
        const normalizedProc = processo.replace(/\D/g, '');
        const d1 = dataDisp.substring(0, 10);
        for (let k in prazosSalvos) {
            const outro = prazosSalvos[k];
            if (!outro) continue;
            const outroProc = (outro.processo || '').replace(/\D/g, '');
            if (outroProc === normalizedProc) {
                const d2 = obterDataDisponibilizacaoISO(outro);
                if (d2 && d1 === d2) {
                    return { key: k, item: outro };
                }
            }
        }
        return null;
    }

    function obterStatusIntimacaoHTML(savedItem, djenItem, savedKey, preferBusca = false) {
        let trib = '';
        let tipo = 'Intimação';
        let orgao = '';
        let destinatario = '';

        if (savedItem) {
            trib = String(savedItem.siglaTribunal || 'TJ').toUpperCase();
            tipo = savedItem.tipoComunicacao || 'Intimação';
            orgao = savedItem.nomeOrgao || '';
            if (savedItem.destinatarios && savedItem.destinatarios.length > 0) {
                destinatario = savedItem.destinatarios[0].nome || '';
            }
        } else if (djenItem) {
            trib = String(djenItem.siglaTribunal || 'TJ').toUpperCase();
            tipo = djenItem.tipoComunicacao || 'Intimação';
            orgao = djenItem.nomeOrgao || '';
            if (djenItem.destinatarios && djenItem.destinatarios.length > 0) {
                destinatario = djenItem.destinatarios[0].nome || '';
            }
        }

        // Header info
        let headerHTML = `<div class="timeline-card-header">`;
        headerHTML += `<span class="timeline-card-trib">${trib}</span>`;
        headerHTML += `<span class="timeline-card-tipo">${tipo}</span>`;
        if (orgao) {
            headerHTML += `<span class="timeline-card-orgao" title="${orgao}">🏛️ ${orgao.length > 25 ? orgao.substring(0, 22) + '...' : orgao}</span>`;
        }
        headerHTML += `</div>`;

        // Status badge and details
        let statusHTML = '';
        if (savedItem) {
            if (savedItem.fatal) {
                const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
                const dataFatal = parseDateBR(savedItem.fatal);
                const diffDias = Math.ceil((dataFatal - hoje) / (1000 * 3600 * 24));
                let iconStr = savedItem.direcao === 'retroativo' ? '↩️ ' : '';

                if (savedItem.cumprido) {
                    let dataCumpFmt = '';
                    if (savedItem.dataCumprimento) {
                        const dtC = new Date(savedItem.dataCumprimento);
                        dataCumpFmt = ' em ' + dtC.toLocaleDateString('pt-BR');
                    }
                    statusHTML = `<span class="timeline-badge-status s-gray">✅ Cumprido${dataCumpFmt}</span>`;
                } else if (savedItem.espera && diffDias >= 0) {
                    statusHTML = `<span class="timeline-badge-status s-purple">⏳ Outra Parte/Juiz • ${savedItem.fatal}</span>`;
                } else if (diffDias < 0) {
                    statusHTML = `<span class="timeline-badge-status s-hoje">${iconStr}🔴 Atrasado ${Math.abs(diffDias)}d • ${savedItem.fatal}</span>`;
                } else if (diffDias === 0) {
                    statusHTML = `<span class="timeline-badge-status s-hoje">${iconStr}🔥 Hoje • ${savedItem.fatal}</span>`;
                } else if (diffDias === 1) {
                    statusHTML = `<span class="timeline-badge-status s-orange">${iconStr}⏳ Amanhã • ${savedItem.fatal}</span>`;
                } else {
                    const cor = diffDias <= 5 ? "s-orange" : "s-green";
                    statusHTML = `<span class="timeline-badge-status ${cor}">${iconStr}📅 ${diffDias} dias • ${savedItem.fatal}</span>`;
                }
            } else {
                if (savedItem.cumprido) {
                    statusHTML = `<span class="timeline-badge-status s-gray">✅ Cumprido</span>`;
                } else {
                    statusHTML = `<span class="timeline-badge-status s-gray">📌 Salvo (Sem prazo)</span>`;
                }
            }
        } else {
            // Not saved, just a historical communication
            let destLabel = destinatario ? ` • Para: ${destinatario.split(' ')[0]}` : '';
            statusHTML = `<span class="timeline-badge-status s-light">⚖️ Histórico DJEN${destLabel}</span>`;
        }

        let dataAttr = '';
        let hoverClass = '';
        let extraContent = '';
        
        let textoPreterito = null;
        if (djenItem) textoPreterito = djenItem.texto || djenItem.conteudo || djenItem.teor;
        if (savedItem) textoPreterito = savedItem.textoCompleto || savedItem.texto || savedItem.conteudo || savedItem.teor || textoPreterito;

        // Padrão Aba Busca: Sempre expandir inline (preferência do usuário)
        if (textoPreterito || djenItem || savedItem) {
            dataAttr = `data-nav-toggle-conteudo="true"`;
            hoverClass = 'clickable-timeline-item';
            let txt = textoPreterito || "Texto indisponível para esta comunicação.";
            
            let limitConteudo = (savedItem && savedItem.textoHtml) ? savedItem.textoHtml : txt;
            if (!savedItem || !savedItem.textoHtml) {
                limitConteudo = typeof aplicarHighlighterRadar === 'function' ? aplicarHighlighterRadar(limitConteudo) : (typeof cleanText === 'function' ? cleanText(limitConteudo) : limitConteudo);
            }

            let anexosHTML = '';
            if (savedItem) {
                if (savedItem.anotacao) {
                    let anot = savedItem.anotacao;
                    anot = anot.replace(/#([\w\u00C0-\u00FF_]+)/g, '<span class="tag-badge">#$1</span>');
                    if (anot.trim().length > 0) {
                        anexosHTML += `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1);"><span style="font-weight: 600; color: var(--zen-teal);">📝 Notas do Prazo:</span><div style="color: var(--text-color); margin-top: 4px;">${anot}</div></div>`;
                    }
                }
                if (savedItem.tarefas && savedItem.tarefas.length > 0) {
                    anexosHTML += `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1);"><span style="font-weight: 600; color: var(--zen-teal);">🛠️ Tarefas do Prazo:</span><div style="margin-top: 4px;">`;
                    savedItem.tarefas.forEach(t => {
                        anexosHTML += `<div style="display: flex; gap: 4px; align-items: flex-start; margin-top: 4px; color: var(--text-color);"><span style="color: ${t.feita ? 'var(--zen-green)' : 'var(--text-muted)'};">${t.feita ? '☑' : '☐'}</span><span style="${t.feita ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${t.texto}</span></div>`;
                    });
                    anexosHTML += `</div></div>`;
                }
            }

            extraContent = `<div class="timeline-conteudo-wrapper"><div class="timeline-conteudo" style="padding: 8px; background: var(--bg-card-hover, rgba(0,0,0,0.03)); border-left: 2px solid var(--zen-teal); font-size: 11px; white-space: pre-wrap; color: var(--text-color); overflow-y: auto; border-radius: 4px;">${limitConteudo}${anexosHTML}</div></div>`;
        }

        let indicadoresHTML = '';
        if (savedItem) {
            let indicacoes = [];
            if (savedItem.anotacao) {
                const tags = savedItem.anotacao.match(/#[\w\u00C0-\u00FF_]+/g);
                if (tags) indicacoes.push('🏷️ Tags');
                const temTexto = savedItem.anotacao.replace(/#[\w\u00C0-\u00FF_]+/g, '').trim().length > 0;
                if (temTexto) indicacoes.push('📝 Notas');
            }
            if (savedItem.tarefas && savedItem.tarefas.length > 0) {
                const pendentes = savedItem.tarefas.filter(t => !t.feita).length;
                indicacoes.push(`🛠️ ${pendentes > 0 ? pendentes + ' ' : ''}Tarefas`);
            }
            
            if (indicacoes.length > 0) {
                indicadoresHTML = `<span style="font-size: 10px; color: var(--text-muted); background: var(--bg-card-hover, rgba(0,0,0,0.05)); padding: 2px 6px; border-radius: 12px;">${indicacoes.join(' • ')}</span>`;
            }
        }

        return `
            <div class="timeline-card-content ${hoverClass}" ${dataAttr}>
                ${headerHTML}
                <div style="margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${statusHTML}
                    ${indicadoresHTML}
                </div>
                ${extraContent}
            </div>
        `;
    }

    async function renderTimeline(item, wrapper, itemKey, isCockpitContext = false) {
        if (!item) return;
        if (!item.processo) {
            item.processo = getProc(item, item.texto || item.teor || "");
        }
        item.processo = formatCNJ(item.processo);
        let eventos = [];
        if (item.historicoAcoes) {
            eventos = [...item.historicoAcoes];
        } else {
            const dtOrigem = obterDataDisponibilizacaoISO(item) || item.data_disponibilizacao || item.pubOrig || new Date().toISOString();
            eventos.push({ data: dtOrigem, tipo: 'criacao', descricao: 'Processo adicionado ao Controle' });
        }
        
        function obterHtmlPainelRelacoes() {
            const relacoes = obterRelacoesGlobaisProcesso(item.processo);
            let relsListHtml = '';
            
            if (relacoes.length === 0) {
                relsListHtml = `<div style="font-size: 11px; color: var(--text-placeholder); font-style: italic; text-align: center; padding: 8px 0;">Nenhum processo relacionado.</div>`;
            } else {
                relacoes.forEach(rel => {
                    // Normalização do tipo para a classe CSS
                    let cleanTipo = (rel.tipo || 'conexao').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (cleanTipo.includes('incidente')) cleanTipo = 'incidente';
                    else if (cleanTipo.includes('conexao')) cleanTipo = 'conexao';
                    else if (cleanTipo.includes('sucessorio')) cleanTipo = 'sucessorio';
                    else cleanTipo = 'recursal';
                    
                    const badgeClass = `rel-${cleanTipo}`;
                    const relKey = Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === String(rel.processo).replace(/\D/g, ''));
                    const relSaved = relKey ? prazosSalvos[relKey] : null;
                    const apelido = getGlobalApelido(rel.processo) || (relSaved ? (relSaved.apelido || "") : "");
                    
                    let statusBadgeHTML = '';
                    let indicadoresHTML = '';
                    let extraContent = '';
                    let hoverClass = '';
                    let dataAttr = '';

                    if (relSaved) {
                        if (relSaved.fatal) {
                            const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
                            const dataFatal = parseDateBR(relSaved.fatal);
                            const diffDias = Math.ceil((dataFatal - hoje) / (1000 * 3600 * 24));
                            let iconStr = relSaved.direcao === 'retroativo' ? '↩️ ' : '';

                            if (relSaved.cumprido) {
                                statusBadgeHTML = `<span class="timeline-badge-status s-gray">✅ Cumprido</span>`;
                            } else if (relSaved.espera && diffDias >= 0) {
                                statusBadgeHTML = `<span class="timeline-badge-status s-purple">⏳ Aguardando Terceiros • ${relSaved.fatal}</span>`;
                            } else if (diffDias < 0) {
                                statusBadgeHTML = `<span class="timeline-badge-status s-hoje">${iconStr}🔴 Atrasado ${Math.abs(diffDias)}d • ${relSaved.fatal}</span>`;
                            } else if (diffDias === 0) {
                                statusBadgeHTML = `<span class="timeline-badge-status s-hoje">${iconStr}🔥 Hoje • ${relSaved.fatal}</span>`;
                            } else if (diffDias === 1) {
                                statusBadgeHTML = `<span class="timeline-badge-status s-orange">${iconStr}⏳ Amanhã • ${relSaved.fatal}</span>`;
                            } else {
                                const cor = diffDias <= 5 ? "s-orange" : "s-green";
                                statusBadgeHTML = `<span class="timeline-badge-status ${cor}">${iconStr}📅 ${diffDias} dias • ${relSaved.fatal}</span>`;
                            }
                        } else {
                            if (relSaved.cumprido) {
                                statusBadgeHTML = `<span class="timeline-badge-status s-gray">✅ Cumprido</span>`;
                            } else {
                                statusBadgeHTML = `<span class="timeline-badge-status s-gray">📌 Salvo (Sem prazo)</span>`;
                            }
                        }

                        // Indicadores idênticos ao card de histórico normal
                        let indicacoes = [];
                        if (relSaved.anotacao) {
                            const tags = relSaved.anotacao.match(/#[\w\u00C0-\u00FF_]+/g);
                            if (tags) indicacoes.push('🏷️ Tags');
                            const temTexto = relSaved.anotacao.replace(/#[\w\u00C0-\u00FF_]+/g, '').trim().length > 0;
                            if (temTexto) indicacoes.push('📝 Notas');
                        }
                        if (relSaved.tarefas && relSaved.tarefas.length > 0) {
                            const pendentes = relSaved.tarefas.filter(t => !t.feita).length;
                            indicacoes.push(`🛠️ ${pendentes > 0 ? pendentes + ' ' : ''}Tarefas`);
                        }
                        if (indicacoes.length > 0) {
                            indicadoresHTML = `<span style="font-size: 10px; color: var(--text-muted); background: var(--bg-card-hover, rgba(0,0,0,0.05)); padding: 2px 6px; border-radius: 12px; height: 16px; display: inline-flex; align-items: center;">${indicacoes.join(' • ')}</span>`;
                        }

                        // Conteúdo expansível idêntico ao card de histórico normal
                        let textoPreterito = relSaved.textoCompleto || relSaved.texto || relSaved.conteudo || relSaved.teor;
                        if (textoPreterito || relSaved.anotacao || (relSaved.tarefas && relSaved.tarefas.length > 0)) {
                            dataAttr = `data-nav-toggle-conteudo="true"`;
                            hoverClass = 'clickable-timeline-item';
                            let txt = textoPreterito || "Texto indisponível para esta comunicação.";
                            
                            let limitConteudo = relSaved.textoHtml ? relSaved.textoHtml : txt;
                            if (!relSaved.textoHtml) {
                                limitConteudo = typeof aplicarHighlighterRadar === 'function' ? aplicarHighlighterRadar(limitConteudo) : (typeof cleanText === 'function' ? cleanText(limitConteudo) : limitConteudo);
                            }

                            let anexosHTML = '';
                            if (relSaved.anotacao) {
                                let anot = relSaved.anotacao;
                                anot = anot.replace(/#([\w\u00C0-\u00FF_]+)/g, '<span class="tag-badge">#$1</span>');
                                if (anot.trim().length > 0) {
                                    anexosHTML += `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1);"><span style="font-weight: 600; color: var(--zen-teal);">📝 Notas do Prazo:</span><div style="color: var(--text-color); margin-top: 4px;">${anot}</div></div>`;
                                }
                            }
                            if (relSaved.tarefas && relSaved.tarefas.length > 0) {
                                anexosHTML += `<div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1);"><span style="font-weight: 600; color: var(--zen-teal);">🛠️ Tarefas do Prazo:</span><div style="margin-top: 4px;">`;
                                relSaved.tarefas.forEach(t => {
                                    anexosHTML += `<div style="display: flex; gap: 4px; align-items: flex-start; margin-top: 4px; color: var(--text-color);"><span style="color: ${t.feita ? 'var(--zen-green)' : 'var(--text-muted)'};">${t.feita ? '☑' : '☐'}</span><span style="${t.feita ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${t.texto}</span></div>`;
                                });
                                anexosHTML += `</div></div>`;
                            }

                            extraContent = `<div class="timeline-conteudo-wrapper"><div class="timeline-conteudo" style="padding: 8px; background: var(--bg-card-hover, rgba(0,0,0,0.03)); border-left: 2px solid var(--zen-teal); font-size: 11px; white-space: pre-wrap; color: var(--text-color); overflow-y: auto; border-radius: 4px;">${limitConteudo}${anexosHTML}</div></div>`;
                        }
                    } else {
                        statusBadgeHTML = `<span class="timeline-badge-status s-light">⚖️ Processo não cadastrado localmente</span>`;
                    }
                    
                    const cardClass = `timeline-card-content ${hoverClass}`;
                    const cardAttr = `${dataAttr} data-rel-nav-key="${relKey || ''}"`;
                    
                    relsListHtml += `
                        <div class="${cardClass}" ${cardAttr} data-rel-id="${rel.id || rel.processo}" style="margin-top: 4px; padding: 6px 10px; position: relative;">
                            <div class="timeline-card-header" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; cursor: ${relKey ? 'pointer' : 'default'};">
                                <span class="relacao-badge ${badgeClass}" style="padding: 1px 5px; border-radius: 10px; font-size: 8px; font-weight: 600;  letter-spacing: 0.3px;">${rel.subTipo || rel.tipo}</span>
                                <span class="timeline-card-tipo" style="font-weight: 600; font-size: 11px;">${apelido ? apelido : rel.processo}</span>
                                ${apelido ? `<span class="timeline-card-orgao" style="font-family: ui-monospace, monospace; font-size: 9px; color: var(--text-placeholder); margin-left: 4px;">${rel.processo}</span>` : ''}
                            </div>
                            
                            <div style="margin-top: 3px; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                                <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                                    ${statusBadgeHTML}
                                    ${indicadoresHTML}
                                </div>
                                <div class="relacao-acoes" style="display: flex; align-items: center; gap: 10px; z-index: 10;">
                                    ${relKey ? `
                                    <button type="button" class="btn-focar-relacao tooltip-left" data-tooltip="Ir para o Processo" data-nav-key="${relKey}" aria-label="Ir para o Processo" style="background: transparent; border: none; color: var(--zen-blue); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; border-radius: 4px; transition: all 0.2s;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                    </button>
                                    ` : ''}
                                    <label class="espelhar-switch tooltip-left" data-tooltip="${rel.espelhar ? 'Ocultar eventos' : 'Espelhar eventos'}">
                                        <input type="checkbox" class="chk-espelhar" ${rel.espelhar ? 'checked' : ''} data-rel-id="${rel.id || rel.processo}" aria-label="Espelhar eventos na Timeline">
                                        <span class="espelhar-slider"></span>
                                    </label>
                                    <button type="button" class="btn-del-relacao tooltip-left" data-tooltip="Remover Vínculo" data-rel-id="${rel.id || rel.processo}" aria-label="Remover Vínculo">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                            ${extraContent}
                        </div>
                    `;
                });
            }
            
            return `
                <details class="relacoes-container">
                    <summary class="relacoes-header">
                        <span style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--text-main);  letter-spacing: 0.5px;">🔗 Processos Relacionados / Incidentes (${relacoes.length})</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <button type="button" class="btn-toggle-vinculo-form" style="background: transparent; border: none; color: var(--zen-blue); font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: var(--radius-sm);">
                                + Vincular
                            </button>
                            <span class="seta-relacoes">▶</span>
                        </div>
                    </summary>
                    
                    <div class="vinculo-form-inline" style="display: none; margin-top: 10px;">
                        <div class="vinculo-form-row">
                            <div class="vinculo-form-col">
                                <label style="font-size: 9px; font-weight: 700; color: var(--text-muted);  letter-spacing: 0.3px;">Processo Relacionado</label>
                                <input type="text" class="vinculo-input txt-proc-vinculo" placeholder="Buscar por apelido ou CNJ..." autocomplete="off">
                                <div class="vinculo-autocomplete-dropdown" style="display: none;"></div>
                            </div>
                        </div>
                        
                        <div class="vinculo-form-row">
                            <div class="vinculo-form-col">
                                <label style="font-size: 9px; font-weight: 700; color: var(--text-muted);  letter-spacing: 0.3px;">Tipo de Relação</label>
                                <select class="vinculo-select sel-tipo-vinculo">
                                    <option value="Recursal">Recursal</option>
                                    <option value="Incidente">Incidente / Apenso</option>
                                    <option value="Conexão">Conexão / Dependência</option>
                                    <option value="Sucessório">Sucessório</option>
                                </select>
                            </div>
                            <div class="vinculo-form-col">
                                <label style="font-size: 9px; font-weight: 700; color: var(--text-muted);  letter-spacing: 0.3px;">Sub-tipo</label>
                                <select class="vinculo-select sel-subtipo-vinculo"></select>
                            </div>
                        </div>
                        
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                            <label class="custom-checkbox tooltip-bottom" data-tooltip="Mescla as intimações deste processo relacionado com o histórico do principal" style="font-size: 11px; color: var(--text-main); font-weight: 500; cursor: pointer; user-select: none;">
                                <input type="checkbox" class="chk-espelhar-novo">
                                <span class="checkmark" style="top: 0;"></span>
                                Espelhar na Timeline
                            </label>
                            <div class="vinculo-btn-row">
                                <button type="button" class="btn-vinculo-sub cancelar">Cancelar</button>
                                <button type="button" class="btn-vinculo-sub salvar">Vincular</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="relacoes-lista" style="margin-top: 10px;">
                        ${relsListHtml}
                    </div>
                </details>
            `;
        }
        
        const iconeLinhaTempo = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
            <path d="M 4 12 h 16" />
            <path d="M 2 2 h 4 a 1 1 0 0 1 1 1 v 4 a 1 1 0 0 1 -1 1 H 5.2 L 4 10 L 2.8 8 H 2 a 1 1 0 0 1 -1 -1 V 3 a 1 1 0 0 1 1 -1 Z" />
            <path d="M 3.5 4.5 h 1.5" stroke-width="1.2" />
            <path d="M 3.5 6 h 1" stroke-width="1.2" />
            <circle cx="4" cy="12" r="1.5" fill="var(--bg-card, #fff)" stroke="currentColor" stroke-width="1.8" />
            <path d="M 10 16 h 1.2 L 12 14 L 12.8 16 H 14 a 1 1 0 0 1 1 1 v 4 a 1 1 0 0 1 -1 1 H 10 a 1 1 0 0 1 -1 -1 v -4 a 1 1 0 0 1 1 -1 Z" />
            <path d="M 11.5 18.5 h 1.5" stroke-width="1.2" />
            <path d="M 11.5 20 h 1" stroke-width="1.2" />
            <circle cx="12" cy="12" r="1.5" fill="var(--bg-card, #fff)" stroke="currentColor" stroke-width="1.8" />
            <path d="M 18 2 h 4 a 1 1 0 0 1 1 1 v 4 a 1 1 0 0 1 -1 1 H 21.2 L 20 10 L 18.8 8 H 18 a 1 1 0 0 1 -1 -1 V 3 a 1 1 0 0 1 1 -1 Z" />
            <path d="M 19.5 4.5 h 1.5" stroke-width="1.2" />
            <path d="M 19.5 6 h 1" stroke-width="1.2" />
            <circle cx="20" cy="12" r="1.5" fill="var(--bg-card, #fff)" stroke="currentColor" stroke-width="1.8" />
        </svg>`;
        
        let htmlHeader = '';
        if (!isCockpitContext) {
            htmlHeader = `<div class="timeline-header">${iconeLinhaTempo} Histórico do Processo</div>`;
            htmlHeader += obterHtmlPainelRelacoes();
        }
        htmlHeader += `<div class="timeline-container" style="${isCockpitContext ? 'max-height: none; padding: 0; border: none; background: transparent;' : ''}">`;
        
        // Estado de carregamento inicial
        safeSetInnerHTML(wrapper, htmlHeader + `
            <div class="timeline-skeleton" style="display: flex; flex-direction: column; gap: 16px; padding: 4px 0 12px 0;">
                <div style="font-size: 11px; color: var(--text-muted); font-weight: 500; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                    <span class="spinner-mini"></span> Buscando intimações pretéritas no DJEN...
                </div>
                <div class="timeline-item skeleton" style="display: flex; gap: 12px; margin-bottom: 0; opacity: 0.7;">
                    <div class="timeline-badge skeleton-shimmer-circle"></div>
                    <div class="timeline-content" style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                        <div class="skeleton-shimmer-bar short"></div>
                        <div class="skeleton-shimmer-bar long"></div>
                    </div>
                </div>
                <div class="timeline-item skeleton" style="display: flex; gap: 12px; margin-bottom: 0; opacity: 0.4;">
                    <div class="timeline-badge skeleton-shimmer-circle"></div>
                    <div class="timeline-content" style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                        <div class="skeleton-shimmer-bar short"></div>
                        <div class="skeleton-shimmer-bar long"></div>
                    </div>
                </div>
            </div>
        </div>`);

        const numProcStr = item.processo ? item.processo.replace(/\D/g, '') : '';
        const fetchPromises = [];
        const dtFim = new Date().toISOString().split('T')[0];
        
        // 1. Consulta do processo principal
        if (numProcStr && typeof fetchComRetry === 'function') {
            const urlDjen = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${numProcStr}&dataDisponibilizacaoInicio=2020-01-01&dataDisponibilizacaoFim=${dtFim}`;
            fetchPromises.push(
                fetchComRetry(urlDjen, 2).then(apiRes => {
                    if (apiRes && apiRes.items && Array.isArray(apiRes.items)) {
                        apiRes.items.forEach(djenItem => {
                            eventos.push({
                                data: djenItem.data_disponibilizacao,
                                tipo: 'djen',
                                djenItem: djenItem,
                                descricao: `Intimação pretérita disponibilizada: ${djenItem.siglaTribunal || 'Tribunal'}`
                            });
                        });
                    }
                }).catch(e => console.warn('Falha ao buscar intimações pretéritas:', e))
            );
        }

        // 2. Consulta paralela dos processos relacionados com espelhamento ativado
        const relacoesGlobais = obterRelacoesGlobaisProcesso(item.processo);
        if (relacoesGlobais && relacoesGlobais.length > 0) {
            relacoesGlobais.forEach(rel => {
                if (rel.espelhar) {
                    const relNumProcStr = rel.processo.replace(/\D/g, '');
                    if (relNumProcStr && typeof fetchComRetry === 'function') {
                        const urlRelDjen = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${relNumProcStr}&dataDisponibilizacaoInicio=2020-01-01&dataDisponibilizacaoFim=${dtFim}`;
                        fetchPromises.push(
                            fetchComRetry(urlRelDjen, 2).then(apiRes => {
                                if (apiRes && apiRes.items && Array.isArray(apiRes.items)) {
                                    apiRes.items.forEach(djenItem => {
                                        eventos.push({
                                            data: djenItem.data_disponibilizacao,
                                            tipo: 'djen',
                                            djenItem: djenItem,
                                            espelhado: true,
                                            rel: rel,
                                            descricao: `Intimação espelhada: ${djenItem.siglaTribunal || 'Tribunal'}`
                                        });
                                    });
                                }
                            }).catch(e => console.warn(`Falha ao buscar intimações espelhadas do processo ${rel.processo}:`, e))
                        );
                    }
                }
            });
        }

        if (fetchPromises.length > 0) {
            await Promise.allSettled(fetchPromises);
        }

        // 3. Adiciona publicações já salvas locais do processo principal
        for (let k in prazosSalvos) {
            const outro = prazosSalvos[k];
            if (outro && outro.processo && item.processo && outro.processo.replace(/\D/g, '') === item.processo.replace(/\D/g, '')) {
                const dataDispISO = obterDataDisponibilizacaoISO(outro);
                if (dataDispISO) {
                    eventos.push({
                        data: dataDispISO,
                        tipo: 'djen',
                        savedItem: outro,
                        savedKey: k,
                        descricao: `Intimação salva/DJEN: ${outro.siglaTribunal || 'Tribunal'}`
                    });
                }
            }
        }

        // 4. Adiciona publicações e ações locais dos processos espelhados
        if (relacoesGlobais && relacoesGlobais.length > 0) {
            relacoesGlobais.forEach(rel => {
                if (rel.espelhar) {
                    const relKey = Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === String(rel.processo).replace(/\D/g, ''));
                    if (relKey) {
                        const relSaved = prazosSalvos[relKey];
                        
                        // Mesclar ações locais do relacionado
                        if (relSaved.historicoAcoes) {
                            relSaved.historicoAcoes.forEach(act => {
                                if (act.tipo !== 'criacao') {
                                    eventos.push({
                                        data: act.data,
                                        tipo: act.tipo,
                                        espelhado: true,
                                        rel: rel,
                                        savedKey: relKey,
                                        descricao: act.descricao
                                    });
                                }
                            });
                        }
                        
                        // Mesclar publicação principal do relacionado
                        const dataDispISO = obterDataDisponibilizacaoISO(relSaved);
                        if (dataDispISO) {
                            eventos.push({
                                data: dataDispISO,
                                tipo: 'djen',
                                espelhado: true,
                                rel: rel,
                                savedItem: relSaved,
                                savedKey: relKey,
                                descricao: `Intimação salva/DJEN: ${relSaved.siglaTribunal || 'Tribunal'}`
                            });
                        }
                    }
                }
            });
        }
        
        // 5. Adiciona movimentações do DataJud/CNJ (se disponíveis)
        if (item.datajud_movimentos && item.datajud_movimentos.length > 0) {
            item.datajud_movimentos.forEach(mov => {
                if (mov.nome || mov.codigo) {
                    let descMov = mov.nome || `Movimentação #${mov.codigo}`;
                    if (mov.complementos) descMov += ` (${mov.complementos})`;
                    eventos.push({
                        data: mov.dataHora || '',
                        tipo: 'cnj',
                        descricao: descMov,
                        cnjCodigo: mov.codigo
                    });
                }
            });
        }
        // Buscar movimentos também de prazosSalvos se item não tem diretamente
        if (!item.datajud_movimentos) {
            const procNorm = item.processo ? item.processo.replace(/\D/g, '') : '';
            if (procNorm) {
                for (let k in prazosSalvos) {
                    const sp = prazosSalvos[k];
                    if (sp && sp.processo && sp.datajud_movimentos && String(sp.processo).replace(/\D/g, '') === procNorm) {
                        sp.datajud_movimentos.forEach(mov => {
                            if (mov.nome || mov.codigo) {
                                let descMov = mov.nome || `Movimentação #${mov.codigo}`;
                                if (mov.complementos) descMov += ` (${mov.complementos})`;
                                eventos.push({
                                    data: mov.dataHora || '',
                                    tipo: 'cnj',
                                    descricao: descMov,
                                    cnjCodigo: mov.codigo
                                });
                            }
                        });
                        break; // encontrou, não precisa continuar
                    }
                }
            }
        }
        
        // Filtrar apenas intimações (djen) e movimentações CNJ para a timeline
        eventos = eventos.filter(ev => ['djen', 'cnj'].includes(ev.tipo));
        
        // Remover duplicatas de DJEN por data e CNJ — mesclar dados
        const eventosPorData = new Map();
        eventos = eventos.filter(ev => {
            if (ev.tipo === 'djen') {
                const cnjRef = ev.espelhado ? ev.rel.processo : item.processo;
                const dataStr = (ev.data && typeof ev.data === 'string') ? ev.data : '';
                const dateKey = `${formatCNJ(cnjRef)}_${dataStr.substring(0, 10)}`;
                
                if (eventosPorData.has(dateKey)) {
                    const existente = eventosPorData.get(dateKey);
                    if (!existente.savedItem && ev.savedItem) {
                        existente.savedItem = ev.savedItem;
                    }
                    if (!existente.savedKey && ev.savedKey) {
                        existente.savedKey = ev.savedKey;
                    }
                    if (!existente.djenItem && ev.djenItem) {
                        existente.djenItem = ev.djenItem;
                    }
                    return false; // remove duplicata
                }
                eventosPorData.set(dateKey, ev);
            }
            return true;
        });

        eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        let html = htmlHeader;
        if (eventos.length === 0) {
            html += `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px 0;">Nenhum histórico registrado.</div>`;
        } else {
            let dataGrupoAnterior = '';
            const hojeStr = new Date().toLocaleDateString('pt-BR');
            const ontemDt = new Date();
            ontemDt.setDate(ontemDt.getDate() - 1);
            const ontemStr = ontemDt.toLocaleDateString('pt-BR');

            eventos.forEach(ev => {
                const dt = new Date(ev.data);
                const dataStr = dt.toLocaleDateString('pt-BR');
                let rotuloData = dataStr;
                if (dataStr === hojeStr) rotuloData = 'Hoje';
                else if (dataStr === ontemStr) rotuloData = 'Ontem';
                else rotuloData = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: dt.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });

                if (rotuloData !== dataGrupoAnterior) {
                    html += `<div class="timeline-date-group-header">${rotuloData}</div>`;
                    dataGrupoAnterior = rotuloData;
                }

                let badgeClass = 't-gray'; let icon = ''; let textTag = '';
                let descHTML = ev.descricao;
                const isEspelhado = ev.espelhado || false;

                if (ev.tipo === 'criacao') { badgeClass = 't-blue'; textTag = 'Inclusão'; icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>`; }
                else if (ev.tipo === 'calculo') { badgeClass = 't-purple'; textTag = 'Cálculo'; icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>`; }
                else if (ev.tipo === 'tarefa') { badgeClass = 't-gray'; textTag = 'Tarefa'; icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline points="9 11 12 14 22 4"/></svg>`; }
                else if (ev.tipo === 'nota') { badgeClass = 't-orange'; textTag = 'Anotação'; icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`; }
                else if (ev.tipo === 'cumprimento') { badgeClass = 't-green'; textTag = 'Cumprimento'; icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
                else if (ev.tipo === 'vinculo') { badgeClass = 't-blue'; textTag = 'Vínculo'; icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 6v12"/><path d="M6 12a6 6 0 0 0 6 6h3"/></svg>`; }
                else if (ev.tipo === 'djen') { 
                    badgeClass = 't-purple'; textTag = 'Publicação';
                    icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`; 
                    let saved = ev.savedItem || null;
                    let savedKey = ev.savedKey || null;
                    if (!saved && !savedKey) {
                        const targetProc = isEspelhado ? ev.rel.processo : item.processo;
                        const match = encontrarPrazoSalvo(ev.data, targetProc);
                        if (match) { saved = match.item; savedKey = match.key; }
                    }
                    const preferBusca = wrapper.closest('#viewBusca') !== null;
                    descHTML = obterStatusIntimacaoHTML(saved, ev.djenItem, savedKey, preferBusca);
                }
                else if (ev.tipo === 'cnj') {
                    badgeClass = 't-teal'; textTag = 'Mov. CNJ';
                    icon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
                    descHTML = `<span style="font-size: 11px; color: var(--text-main);">${ev.descricao}</span>`;
                }
                
                if (isEspelhado) {
                    const tipoLabel = ev.rel ? (ev.rel.subTipo || ev.rel.tipo) : 'Processo Relacionado';
                    descHTML = `
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <div>${descHTML}</div>
                            <div style="margin-top: 2px; display: flex;"><span class="badge-espelhado" title="Processo: ${ev.rel.processo}">🔄 Espelhado: ${tipoLabel}</span></div>
                        </div>
                    `;
                }
                
                const horaFmt = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const timelineItemClass = isEspelhado ? 'timeline-item espelhado' : 'timeline-item';
                const clickableClass = (isEspelhado && ev.savedKey) ? 'clickable-timeline-item' : '';
                const clickAttr = (isEspelhado && ev.savedKey) ? `data-nav-key="${ev.savedKey}"` : '';
                
                html += `
                    <div class="${timelineItemClass} ${clickableClass}" ${clickAttr}>
                        <div class="timeline-badge ${badgeClass}">${icon}</div>
                        <div class="timeline-content">
                            <div class="timeline-desc"><span class="timeline-tag ${badgeClass}">${textTag}</span>${descHTML}</div>
                            <div class="timeline-date">${horaFmt}</div>
                        </div>
                    </div>
                `;
            });
        }
        html += `</div>`;
        safeSetInnerHTML(wrapper, html);;

        // BINDING DE EVENTOS GERAIS DA TIMELINE
        wrapper.querySelectorAll('.clickable-timeline-item[data-nav-key]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const navKey = el.getAttribute('data-nav-key');
                const preferBusca = el.getAttribute('data-nav-busca') === 'true';
                if (navKey) window.focarCardProcesso(navKey, preferBusca, false, true);
            });
        });
        wrapper.querySelectorAll('.clickable-timeline-item[data-nav-toggle-conteudo]').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.timeline-conteudo')) return;
                e.stopPropagation();
                const wrapper = el.querySelector('.timeline-conteudo-wrapper');
                if (wrapper) wrapper.classList.toggle('expanded');
            });
        });

        // BINDING DE EVENTOS ESPECÍFICOS DE RELAÇÕES ENTRE PROCESSOS
        const relContainer = wrapper.querySelector('.relacoes-container');
        if (relContainer) {
            const btnToggleForm = relContainer.querySelector('.btn-toggle-vinculo-form');
            const formInline = relContainer.querySelector('.vinculo-form-inline');
            const txtInput = relContainer.querySelector('.txt-proc-vinculo');
            const autocompleteDropdown = relContainer.querySelector('.vinculo-autocomplete-dropdown');
            const selTipo = relContainer.querySelector('.sel-tipo-vinculo');
            const selSubTipo = relContainer.querySelector('.sel-subtipo-vinculo');
            const chkEspelharNovo = relContainer.querySelector('.chk-espelhar-novo');
            const btnSalvar = relContainer.querySelector('.btn-vinculo-sub.salvar');
            const btnCancelar = relContainer.querySelector('.btn-vinculo-sub.cancelar');

            const subTiposMap = {
                'Recursal': ['Apelação', 'Agravo de Instrumento', 'Recurso Especial', 'Recurso Extraordinário', 'Agravo Interno', 'Embargos de Declaração', 'Outro Recurso'],
                'Incidente': ['Embargos à Execução', 'Impugnação ao Cumprimento', 'Embargos de Terceiro', 'Incidente de Desconsideração', 'Exceção de Pré-executividade', 'Outro Incidente'],
                'Conexão': ['Ação Conexa', 'Dependência', 'Ações Reunidas', 'Outro Vínculo'],
                'Sucessório': ['Cumprimento de Sentença', 'Execução de Sentença', 'Sucessão Processual', 'Outra Sucessão']
            };

            const populateSubTipos = () => {
                const tipoVal = selTipo.value;
                const subs = subTiposMap[tipoVal] || [];
                selSubTipo.replaceChildren();;
                subs.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s;
                    opt.textContent = s;
                    selSubTipo.appendChild(opt);
                });
            };

            if (selTipo) {
                selTipo.onchange = populateSubTipos;
                populateSubTipos();
            }

            if (btnToggleForm) {
                btnToggleForm.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    relContainer.open = true;
                    const isHidden = formInline.style.display === 'none';
                    formInline.style.display = isHidden ? 'flex' : 'none';
                    if (isHidden && txtInput) txtInput.focus();
                };
            }

            if (btnCancelar) {
                btnCancelar.onclick = (e) => {
                    e.stopPropagation();
                    formInline.style.display = 'none';
                    autocompleteDropdown.classList.remove('show');
                    autocompleteDropdown.style.display = 'none';
                };
            }

            if (txtInput) {
                txtInput.addEventListener('input', (e) => {
                    const query = e.target.value.trim().toLowerCase();
                    
                    const vistos = new Set();
                    const matches = Object.keys(prazosSalvos).filter(k => {
                        if (k === itemKey) return false;
                        const outro = prazosSalvos[k];
                        if (!outro || !outro.processo) return false;
                        
                        const cnjNormalizado = String(outro.processo).replace(/\D/g, '');
                        if (vistos.has(cnjNormalizado)) return false;
                        
                        const apelido = (outro.apelido || "").toLowerCase();
                        const proc = cnjNormalizado;
                        const cleanQuery = query.replace(/\D/g, '');
                        
                        const bateu = (apelido.includes(query) || (cleanQuery && proc.includes(cleanQuery)));
                        if (bateu) {
                            vistos.add(cnjNormalizado);
                            return true;
                        }
                        return false;
                    });

                    if (query && matches.length > 0) {
                        autocompleteDropdown.replaceChildren();;
                        matches.slice(0, 5).forEach(k => {
                            const outro = prazosSalvos[k];
                            const div = document.createElement('div');
                            div.className = 'vinculo-autocomplete-item';
                            const apelidoText = outro.apelido ? `<b>${outro.apelido}</b> - ` : '';
                            safeSetInnerHTML(div, `${apelidoText}${outro.processo}`);;
                            
                            div.onmousedown = (evt) => {
                                evt.preventDefault();
                                txtInput.value = outro.processo;
                                autocompleteDropdown.classList.remove('show');
                                autocompleteDropdown.style.display = 'none';
                            };
                            autocompleteDropdown.appendChild(div);
                        });
                        autocompleteDropdown.classList.add('show');
                        autocompleteDropdown.style.display = 'block';
                    } else {
                        autocompleteDropdown.classList.remove('show');
                        autocompleteDropdown.style.display = 'none';
                        
                        const temSeparadores = e.target.value.includes('-') || e.target.value.includes('.');
                        const ehIncompletoCurto = e.target.value.replace(/\D/g, '').length < 20 && temSeparadores;

                        if (/^[\d.\-\s]+$/.test(e.target.value) && !ehIncompletoCurto) {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 20) v = v.substring(0, 20);
                            if (v.length > 16) v = v.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4}).*/, "$1-$2.$3.$4.$5.$6");
                            else if (v.length > 13) v = v.replace(/^(\d{7})(\d{2})(\d{4})/, "$1-$2.$3.");
                            else if (v.length > 9) v = v.replace(/^(\d{7})(\d{2})/, "$1-$2.");
                            else if (v.length > 7) v = v.replace(/^(\d{7})/, "$1-");
                            e.target.value = v;
                        }
                    }
                });

                txtInput.addEventListener('blur', () => {
                    const normalized = normalizarNumeroCNJ(txtInput.value);
                    if (normalized && normalized.length === 20) {
                        txtInput.value = formatCNJ(normalized);
                    }
                    setTimeout(() => {
                        autocompleteDropdown.classList.remove('show');
                        autocompleteDropdown.style.display = 'none';
                    }, 200);
                });
            }

            if (btnSalvar) {
                btnSalvar.onclick = async (e) => {
                    e.stopPropagation();
                    const cnjVal = txtInput.value.trim();
                    if (!cnjVal) {
                        showToast("Digite o CNJ ou selecione um processo salvo.", "⚠️");
                        return;
                    }

                    const cleanCnj = normalizarNumeroCNJ(cnjVal) || cnjVal.replace(/\D/g, '');
                    if (cleanCnj.length !== 20) {
                        showToast("CNJ inválido. O processo deve ter 20 dígitos.", "⚠️");
                        return;
                    }
                    txtInput.value = formatCNJ(cleanCnj);

                    const tipoVal = selTipo.value;
                    const subTipoVal = selSubTipo.value;
                    const espelharVal = chkEspelharNovo.checked;

                    // Se não estiver em prazosSalvos, criar placeholder (aba busca)
                    if (!prazosSalvos[itemKey]) {
                        const txt = cleanText(item.texto || item.teor || "");
                        const proc = formatCNJ(item.processo || getProc(item, txt));
                        prazosSalvos[itemKey] = {
                            processo: proc,
                            textoCompleto: txt,
                            siglaTribunal: item.siglaTribunal || 'TJ',
                            data_disponibilizacao: item.data_disponibilizacao,
                            apelido: getGlobalApelido(proc) || "",
                            anotacao: "",
                            relacoes: [],
                            historicoAcoes: [{ data: new Date().toISOString(), tipo: 'criacao', descricao: 'Processo adicionado ao Controle por vínculo' }]
                        };
                    }

                    const res = adicionarRelacaoProcesso(itemKey, cnjVal, tipoVal, subTipoVal, espelharVal);
                    if (res) {
                        showToast("Processo vinculado com sucesso!", "🔗");
                        atualizarBadgesCard(itemKey);
                        const keyRelacionada = Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === String(cnjVal).replace(/\D/g, ''));
                        if (keyRelacionada) {
                            atualizarBadgesCard(keyRelacionada);
                        }
                        renderTimeline(prazosSalvos[itemKey], wrapper, itemKey);
                    } else {
                        showToast("Falha ao salvar o vínculo.", "❌");
                    }
                };
            }

            relContainer.querySelectorAll('.chk-espelhar').forEach(chk => {
                chk.onchange = (e) => {
                    e.stopPropagation();
                    const relId = chk.getAttribute('data-rel-id');
                    atualizarEspelhamentoRelacao(itemKey, relId, chk.checked);
                    showToast(chk.checked ? "Espelhamento ativado!" : "Espelhamento desativado!", "🔄");
                    const keyRelacionada = Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === String(relId).replace(/\D/g, ''));
                    if (keyRelacionada) {
                        atualizarBadgesCard(keyRelacionada);
                    }
                    renderTimeline(prazosSalvos[itemKey], wrapper, itemKey);
                };
            });

            relContainer.querySelectorAll('.btn-del-relacao').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const relId = btn.getAttribute('data-rel-id');
                    if (!relId) { console.warn('[DJEN] btn-del-relacao sem data-rel-id'); return; }
                    
                    // Duplo clique para confirmar: primeiro clique marca, segundo executa
                    if (btn.dataset.confirmando === 'true') {
                        const ok = removerRelacaoProcesso(itemKey, relId);
                        if (ok) {
                            showToast("Vínculo removido com sucesso.", "🗑️");
                            atualizarBadgesCard(itemKey);
                            const keyRelacionada = Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === String(relId).replace(/\D/g, ''));
                            if (keyRelacionada) {
                                atualizarBadgesCard(keyRelacionada);
                            }
                            renderTimeline(prazosSalvos[itemKey], wrapper, itemKey);
                        } else {
                            showToast("Falha ao remover — vínculo não encontrado.", "❌");
                        }
                    } else {
                        btn.dataset.confirmando = 'true';
                        btn.style.color = 'var(--zen-red)';
                        btn.style.background = 'hsla(0,70%,50%,0.1)';
                        btn.setAttribute('data-tooltip', 'Clique novamente p/ confirmar');
                        showToast("Clique novamente no 🗑️ para confirmar a remoção.", "⚠️");
                        setTimeout(() => {
                            btn.dataset.confirmando = 'false';
                            btn.style.color = '';
                            btn.style.background = '';
                            btn.setAttribute('data-tooltip', 'Remover Vínculo');
                        }, 4000);
                    }
                };
            });

            // Função auxiliar de navegação que tenta ambas as abas
            const navegarParaProcesso = (navKey) => {
                if (!navKey) return;
                // 1. Tenta encontrar o card no DOM atual (qualquer aba)
                let card = document.querySelector(`.intimacao-card[data-key="${navKey}"]`);
                if (!card) {
                    const targetProcesso = prazosSalvos[navKey]?.processo;
                    if (targetProcesso) {
                        const cleanTarget = targetProcesso.replace(/\D/g, '');
                        document.querySelectorAll('.intimacao-card').forEach(c => {
                            if (!card && (c.getAttribute('data-proc') || '').replace(/\D/g, '') === cleanTarget) card = c;
                        });
                    }
                }
                if (card) {
                    // Card já está renderizado — focar direto
                    window.focarCardProcesso(navKey, card.closest('#viewBusca') !== null, false, true);
                    return;
                }
                // 2. Tenta aba Salvos: garantir card visível + re-render
                const outro = prazosSalvos[navKey];
                if (outro) {
                    window.focarCardProcesso(navKey, false, false, true);
                    return;
                }
                // 3. Fallback: aba Busca com auto-search
                window.focarCardProcesso(navKey, true, false, true);
            };

            // Navegação ao clicar no cabeçalho do cartão de relação
            relContainer.querySelectorAll('.timeline-card-header').forEach(hdr => {
                const card = hdr.closest('.timeline-card-content');
                if (!card) return;
                const navKey = card.getAttribute('data-rel-nav-key');
                if (navKey) {
                    hdr.style.cursor = 'pointer';
                    hdr.onclick = (e) => {
                        e.stopPropagation();
                        navegarParaProcesso(navKey);
                    };
                }
            });

            // Navegação ao clicar no botão "btn-focar-relacao"
            relContainer.querySelectorAll('.btn-focar-relacao').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const navKey = btn.getAttribute('data-nav-key');
                    navegarParaProcesso(navKey);
                };
            });
        }
    }

    function appendCardsToList(chaves, listElement, openKey, emptyMessage, scrollTop = 0) {
        if (chaves.length === 0) {
            if (window.currentVirtualList && window.currentVirtualList.container === listElement) {
                window.currentVirtualList.destroy();
                window.currentVirtualList = null;
            }
            listElement.replaceChildren();
            const zenIcon = `
                <style>
                    @keyframes floatZen {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-6px); }
                    }
                </style>
                <div style="font-size: 48px; margin-bottom: 16px; animation: floatZen 4s ease-in-out infinite;">☕</div>`;
            const tpl = document.getElementById('tpl-empty-agenda').content.cloneNode(true);
            safeSetInnerHTML(tpl.querySelector('.empty-icon-slot'), zenIcon);
            if (emptyMessage) {
                tpl.querySelector('.empty-title').textContent = emptyMessage;
            }
            tpl.querySelector('.btn-empty-novo').onclick = () => document.getElementById('btnNovoPrazoManual')?.click();
            listElement.replaceChildren();;
            listElement.appendChild(tpl);
            return;
        }

        if (window.currentVirtualList) {
            // Bug Fix #8: Usa updateItems() para preservar scroll — só recria se o container mudou
            if (window.currentVirtualList.container === listElement) {
                // If it was detached somehow (e.g. earlier bug), reattach it
                if (!listElement.contains(window.currentVirtualList.scroller)) {
                    listElement.replaceChildren();
                    listElement.appendChild(window.currentVirtualList.scroller);
                }
                window.currentVirtualList.updateItems(chaves);
                return;
            }
            window.currentVirtualList.destroy();
            window.currentVirtualList = null;
        }

        listElement.replaceChildren();
        window.currentVirtualList = new VirtualList(
            listElement,
            chaves,
            (key, index) => {
                const item = prazosSalvos[key]; 
                if (!item) return document.createElement('div');
                const card = document.createElement('div'); card.className = "intimacao-card compact";
                if (item.cumprido) card.classList.add('is-cumprido');
                if (item.espera) card.classList.add('is-espera');
                card.setAttribute('data-key', key); card.setAttribute('data-proc', item.processo);
                if (key === openKey) card.classList.add('aberto');

                const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
                let corSeloClass = "s-gray"; let iconStr = ''; let txtStatus = "Sem prazo";

                if (item.fatal) {
                    const dataFatal = parseDateBR(item.fatal);
                    const diffDias = Math.ceil((dataFatal - hoje) / (1000 * 3600 * 24));
                    iconStr = item.direcao === 'retroativo' ? iconesSVG.retro + ' ' : '';

                    if (item.cumprido) { corSeloClass = "s-gray"; txtStatus = `✅ Cumprido`; }
                    else if (diffDias < 0) { corSeloClass = "s-hoje"; txtStatus = `${iconStr}Atrasado ${Math.abs(diffDias)}d • ${item.fatal.substring(0, 5)}`; }
                    else if (diffDias === 0) { corSeloClass = "s-hoje"; txtStatus = `${iconStr}Hoje • ${item.fatal.substring(0, 5)}`; }
                    else if (diffDias === 1) { corSeloClass = "s-orange"; txtStatus = `${iconStr}Amanhã • ${item.fatal.substring(0, 5)}`; }
                    else { corSeloClass = diffDias <= 5 ? "s-orange" : "s-green"; txtStatus = `${iconStr}${diffDias} dias • ${item.fatal.substring(0, 5)}`; }
                    if (item.espera && !item.cumprido && diffDias >= 0) corSeloClass = "s-purple";
                } else {
                    if (item.cumprido) {
                        corSeloClass = "s-gray"; txtStatus = `✅ Cumprido`;
                    } else {
                        corSeloClass = "s-gray"; txtStatus = `📌 Salvo (Sem prazo)`;
                    }
                }

                const trib = String(item.siglaTribunal || (item.uf ? 'TJ' + item.uf : 'MANUAL')).toUpperCase();
                let dispDate = '--/--/----';
                if (item.disp) dispDate = item.disp; else if (item.data_disponibilizacao) dispDate = item.data_disponibilizacao.split('T')[0].split('-').reverse().join('/'); else if (item.pubOrig) dispDate = item.pubOrig.split('T')[0].split('-').reverse().join('/');

                const apelidoSalvo = getGlobalApelido(item.processo); const anotacaoSalva = item.anotacao || "";
                
                const numRelations = obterRelacoesGlobaisProcesso(item.processo).length;
                const badgeRelHTML = numRelations > 0 ? `<span class="badge-conexao-rapida tooltip-bottom" data-tooltip="Possui ${numRelations} processo(s) vinculado(s)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>${numRelations}</span>` : '';

                const header = document.createElement("div");
                const badgeSTJ = item.temFeriadoMunicipal ? `<span class="icon-status tooltip-bottom" data-tooltip="Atenção STJ: Comprove Feriado Local (Art. 1.003, § 6º CPC)" style="filter: drop-shadow(0 2px 4px rgba(212, 76, 71, 0.4));">🚨</span>` : '';
                
                const dataProcBadge = `
                    <div style="display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 11px; margin-right: 4px; background: rgba(120,120,130,0.06); padding: 2px 6px; border-radius: 6px;">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                        <span>${dispDate}</span>
                    </div>
                `;
                const rightSideBadges = `
                    ${dataProcBadge}
                    ${badgeSTJ}
                    ${item.espera ? '<span class="icon-status tooltip-bottom" data-tooltip="Aguardando Terceiros">⏳</span>' : ''}
                    <span class="badge-salvo ${corSeloClass}">${txtStatus}</span>
                `;

                const optsHeader = {
                    rightSideHTML: rightSideBadges,
                    badgeRelHTML: badgeRelHTML,
                    datajud_classe: item.datajud_classe || '',
                    datajud_orgao: item.datajud_orgao || '',
                    datajud_sistema: item.datajud_sistema || ''
                };

                const tituloDinamicoHTML = getHeaderHTML(item.processo, apelidoSalvo, anotacaoSalva, item.textoCompleto, trib, optsHeader);

                safeSetInnerHTML(header, `
                    <div class="card-click-area" tabindex="0" aria-expanded="false" aria-label="Expandir Processo ${item.processo}">
                        <div class="proc-header">${tituloDinamicoHTML}</div>
                    </div>
                `);;

                const badgeRelEl = header.querySelector('.badge-conexao-rapida');
                if (badgeRelEl) {
                    badgeRelEl.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        const isAberto = card.classList.contains('aberto');
                        if (!isAberto) {
                            const cArea = header.querySelector('.card-click-area');
                            if (cArea) cArea.click();
                        }
                        
                        const btnHist = header.querySelector('.btn-historico-header');
                        if (btnHist) {
                            setTimeout(() => {
                                btnHist.click();
                            }, 50);
                        }
                    };
                }

                const teorWrapper = document.createElement("div"); teorWrapper.className = "teor-wrapper"; const teorInnerOverflow = document.createElement("div"); teorInnerOverflow.className = "teor-inner-overflow";
                
                const teorHeaderActions = document.createElement("div");
                teorHeaderActions.className = "teor-header-actions";
                teorHeaderActions.style.display = "flex";
                teorHeaderActions.style.gap = "8px";
                teorHeaderActions.style.alignItems = "center";
                teorHeaderActions.style.marginBottom = "8px";

                const btnToggleTeor = document.createElement("button"); btnToggleTeor.className = "btn-toggle-teor"; btnToggleTeor.style.marginBottom = "0px"; safeSetInnerHTML(btnToggleTeor, `📄 Ler Teor Completo`);;
                teorHeaderActions.appendChild(btnToggleTeor);

                const teorBoxContainer = document.createElement("div"); teorBoxContainer.className = "teor-box-container"; teorBoxContainer.style.display = 'none';
                const teorInnerBox = document.createElement("div"); teorInnerBox.className = "teor-inner-box"; const fadeOverlay = document.createElement("div"); fadeOverlay.className = "teor-fade-overlay";
     
                if (item.textoHtml) { safeSetInnerHTML(teorInnerBox, item.textoHtml);; } else { safeSetInnerHTML(teorInnerBox, aplicarHighlighterRadar(item.textoCompleto));; }
                teorBoxContainer.appendChild(teorInnerBox); teorBoxContainer.appendChild(fadeOverlay);
                btnToggleTeor.onclick = (e) => { e.stopPropagation(); if (teorBoxContainer.style.display === 'none') { teorBoxContainer.style.display = 'block'; safeSetInnerHTML(btnToggleTeor, `📄 Ocultar Teor`);; } else { teorBoxContainer.style.display = 'none'; safeSetInnerHTML(btnToggleTeor, `📄 Ler Teor Completo`);; } };

                const btnFocoMini = document.createElement("button"); btnFocoMini.className = "btn-foco-mini tooltip-left"; btnFocoMini.setAttribute('data-tooltip', 'Abrir no Modo Foco'); safeSetInnerHTML(btnFocoMini, iconesSVG.foco);; teorBoxContainer.appendChild(btnFocoMini);

                const notionWrapperAgenda = document.createElement("div");
                notionWrapperAgenda.className = "notion-wrapper";
                
                const toolbarAgenda = document.createElement("div");
                toolbarAgenda.className = "wysiwyg-toolbar";
                safeSetInnerHTML(toolbarAgenda, `
                    <div class="wysiwyg-label" style="font-size: 11px; font-weight: 600; color: var(--text-muted);  letter-spacing: 0.5px; margin-right: auto; padding-left: 4px; display: flex; flex-direction: column; gap: 2px;">
                        <span>Anotações (Texto Livre)</span>
                        <span style="font-size: 9px; font-weight: 500; color: var(--text-placeholder); text-transform: none; letter-spacing: 0;">Texto normal é anotação; escrever com <b>#</b> gera tags.</span>
                    </div>
                    <div style="display:flex; gap:4px;">
                        <button type="button" data-cmd="bold" title="Negrito"><b>B</b></button>
                        <button type="button" data-cmd="italic" title="Itálico"><i>I</i></button>
                        <button type="button" class="btn-add-link" title="Inserir Link">🔗</button>
                        <button type="button" data-cmd="insertUnorderedList" title="Lista de Marcadores">•</button>
                    </div>
                `);;

                const txtAreaBusca = document.createElement("div"); 
                txtAreaBusca.className = "nota-input mini-notion"; 
                txtAreaBusca.setAttribute("contenteditable", "true"); 
                txtAreaBusca.setAttribute("placeholder", "Escreva notas, crie #tags ou adicione tarefas..."); 
                
                txtAreaBusca.className = "nota-input mini-notion"; 
                txtAreaBusca.setAttribute("contenteditable", "true"); 
                txtAreaBusca.setAttribute("placeholder", "Escreva anotações livres..."); 
                
                let val = anotacaoSalva || "";
                safeSetInnerHTML(txtAreaBusca, val);;
                txtAreaBusca.setAttribute('aria-label', 'Anotações do Processo');

                toolbarAgenda.querySelectorAll('button').forEach(btn => {
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (btn.classList.contains('btn-add-link')) {
                            const sel = window.getSelection();
                            let range = null;
                            if (sel.rangeCount > 0) range = sel.getRangeAt(0);
                            
                            djenPedirLink((url) => {
                                if (range) {
                                    sel.removeAllRanges();
                                    sel.addRange(range);
                                }
                                
                                if (url) {
                                    if (!sel.toString()) {
                                        document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color: var(--zen-blue); text-decoration: underline;">${url}</a>`);
                                    } else {
                                        document.execCommand('createLink', false, url);
                                    }
                                }
                            });
                        } else {
                            document.execCommand(btn.getAttribute('data-cmd'), false, null);
                        }
                        txtAreaBusca.focus();
                    };
                });

                notionWrapperAgenda.appendChild(toolbarAgenda);
                notionWrapperAgenda.appendChild(txtAreaBusca);
                notionWrapperAgenda.appendChild(window.AIChecklist.createTasksWrapperUI(key, item.processo, item.textoCompleto, header));

                txtAreaBusca.onclick = e => { e.stopPropagation(); };
                txtAreaBusca.onkeydown = e => { e.stopPropagation(); };
                const saveAnotacaoDebounced = debounce((valor) => {
                    item.anotacao = valor;
                    adicionarEventoHistorico(key, 'nota', 'Anotação atualizada');
                    savePrazosSalvos();
                }, 1000);

                txtAreaBusca.oninput = e => { 
                    const valor = e.target.innerHTML;
                    const siglaTrib = item.siglaTribunal || 'TJ';
                    safeSetInnerHTML(header.querySelector('.proc-header'), getHeaderHTML(item.processo, getGlobalApelido(item.processo), valor, item.textoCompleto, siglaTrib));; 
                    
                    const newBadgeRel = header.querySelector('.badge-conexao-rapida');
                    if (newBadgeRel && typeof badgeRelEl !== 'undefined' && badgeRelEl.onclick) newBadgeRel.onclick = badgeRelEl.onclick;
                    const newBtnHist = header.querySelector('.btn-historico-header');
                    if (newBtnHist) {
                        newBtnHist.onclick = (ev) => {
                            ev.stopPropagation();
                            const isOpening = timelineWrapper.style.display !== 'block';
                            if (isOpening) {
                                if (!card.classList.contains('aberto')) { card.classList.add('so-historico'); toggleCard(); }
                                timelineWrapper.style.display = 'block'; newBtnHist.classList.add('active');
                                renderTimeline(item, timelineWrapper, key).then(() => { setTimeout(() => timelineWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150); });
                            } else {
                                timelineWrapper.style.display = 'none'; newBtnHist.classList.remove('active');
                                if (card.classList.contains('so-historico')) { toggleCard(); setTimeout(() => card.classList.remove('so-historico'), 300); }
                            }
                        };
                    }

                    saveAnotacaoDebounced(valor);
                };

                const acoesPills = document.createElement("div"); acoesPills.className = "card-acoes-pills";
                const timelineWrapper = document.createElement("div"); timelineWrapper.className = "timeline-wrapper";
                
                const btnHistoricoHeader = header.querySelector('.btn-historico-header');
                if (btnHistoricoHeader) {
                    btnHistoricoHeader.onclick = (e) => {
                        e.stopPropagation();
                        const isOpening = timelineWrapper.style.display !== 'block';
                        
                        if (isOpening) {
                            if (!card.classList.contains('aberto')) {
                                card.classList.add('so-historico');
                                toggleCard();
                            }
                            timelineWrapper.style.display = 'block';
                            btnHistoricoHeader.classList.add('active');
                            renderTimeline(item, timelineWrapper, key).then(() => {
                                setTimeout(() => {
                                    timelineWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }, 150);
                            });
                        } else {
                            timelineWrapper.style.display = 'none';
                            btnHistoricoHeader.classList.remove('active');
                            if (card.classList.contains('so-historico')) {
                                toggleCard();
                                setTimeout(() => { card.classList.remove('so-historico'); }, 300);
                            }
                        }
                    };
                }

                const btnCalc = document.createElement("button");
                btnCalc.className = `btn-acao-square btn-recalc tooltip-right ${item.fatal ? 'h-green' : 'h-orange'}`;
                const tooltipTextoAppend = item.fatal ? "🔬 Auditoria Completa (Recalcular)" : "🧮 Calcular Prazo Fatal";
                btnCalc.setAttribute('aria-label', tooltipTextoAppend);
                btnCalc.setAttribute('data-tooltip', tooltipTextoAppend);
                safeSetInnerHTML(btnCalc, iconesSVG.calendario);;

                const btnCopiar = document.createElement("button"); btnCopiar.className = "btn-acao-square h-blue btn-copy tooltip-right"; btnCopiar.setAttribute('aria-label', 'Copiar com notas'); btnCopiar.setAttribute('data-tooltip', 'Copiar'); safeSetInnerHTML(btnCopiar, iconesSVG.copiar);
                btnCopiar.onclick = (e) => {
                    e.stopPropagation();
                    const copyText = gerarTextoCompartilhamento([item], "Cópia do DJEN");
                    copyToClipboard(copyText, () => {
                        const originalHTML = btnCopiar.innerHTML;
                        btnCopiar.classList.add("copy-success");
                        setTimeout(() => { btnCopiar.classList.remove("copy-success"); }, 2000);
                    });
                };
                const btnShare = document.createElement("button"); btnShare.className = "btn-acao-square h-blue btn-share-ind tooltip-right"; btnShare.setAttribute('aria-label', 'Compartilhar'); btnShare.setAttribute('data-tooltip', 'Compartilhar'); safeSetInnerHTML(btnShare, iconesSVG.share);
                btnShare.onclick = (e) => {
                    e.stopPropagation();
                    window.tituloParaCompartilhar = "Processo " + item.processo;
                    window.itensParaCompartilhar = [item];
                    window.textoParaCompartilhar = gerarTextoCompartilhamento([item], "Aviso de Publicação");
                    abrirModalCompartilhar('ind');
                };

                const btnIcsExport = document.createElement("button");
                btnIcsExport.className = "btn-acao-square h-blue btn-ics-export tooltip-right";
                btnIcsExport.setAttribute('aria-label', 'Exportar Evento (ICS)');
                btnIcsExport.setAttribute('data-tooltip', 'Exportar ICS');
                safeSetInnerHTML(btnIcsExport, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M12 14v4"></path><path d="M10 16h4"></path></svg>`);
                btnIcsExport.onclick = (e) => {
                    e.stopPropagation();
                    if (item && item.fatal) {
                        exportarIcsPrazo(item);
                    } else {
                        showToast("Prazo fatal não calculado.", "⚠️");
                    }
                };
                const btnIcsTodoExport = document.createElement("button");
                btnIcsTodoExport.className = "btn-acao-square h-blue btn-ics-todo-export tooltip-right";
                btnIcsTodoExport.setAttribute('aria-label', 'Exportar como Tarefa (ICS/VTODO)');
                btnIcsTodoExport.setAttribute('data-tooltip', 'Exportar Tarefa (ICS)');
                safeSetInnerHTML(btnIcsTodoExport, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`);
                btnIcsTodoExport.onclick = (e) => {
                    e.stopPropagation();
                    if (item && item.fatal) {
                        exportarIcsTarefa(item);
                    } else {
                        showToast("Prazo fatal não calculado.", "⚠️");
                    }
                };
                const btnVincularAgenda = document.createElement("button");
                btnVincularAgenda.className = "btn-acao-square h-blue btn-vincular-atalho tooltip-right";
                btnVincularAgenda.setAttribute('aria-label', 'Vincular Processo');
                btnVincularAgenda.setAttribute('data-tooltip', 'Vincular Processo');
                safeSetInnerHTML(btnVincularAgenda, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M6 6v12"></path><path d="M6 12a6 6 0 0 0 6 6h3"></path></svg>`);

                btnVincularAgenda.onclick = (e) => {
                    e.stopPropagation();
                    const btnHist = header.querySelector('.btn-historico-header');
                    if (btnHist && (!timelineWrapper || timelineWrapper.style.display !== 'block')) {
                        btnHist.click();
                        setTimeout(() => {
                            const btnToggle = timelineWrapper.querySelector('.btn-toggle-vinculo-form');
                            if (btnToggle && timelineWrapper.querySelector('.vinculo-form-inline').style.display === 'none') {
                                btnToggle.click();
                            }
                            setTimeout(() => {
                                const inp = timelineWrapper.querySelector('.txt-proc-vinculo');
                                if (inp) inp.focus();
                                timelineWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }, 100);
                        }, 600);
                    } else if (timelineWrapper && timelineWrapper.style.display === 'block') {
                        const btnToggle = timelineWrapper.querySelector('.btn-toggle-vinculo-form');
                        if (btnToggle && timelineWrapper.querySelector('.vinculo-form-inline').style.display === 'none') {
                            btnToggle.click();
                        }
                        setTimeout(() => {
                            const inp = timelineWrapper.querySelector('.txt-proc-vinculo');
                            if (inp) inp.focus();
                            timelineWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 50);
                    }
                };

                const rightActionsSalvos = document.createElement("div"); rightActionsSalvos.style.display = "flex"; rightActionsSalvos.style.alignItems = "center"; rightActionsSalvos.style.gap = "8px"; rightActionsSalvos.style.marginLeft = "auto";

                const btnJurisflow = document.createElement("button");
                if (window.configJurisflowEnabled) {
                    btnJurisflow.className = "btn-acao-square tooltip-left";
                    btnJurisflow.style.backgroundColor = "transparent";
                    btnJurisflow.style.color = "var(--zen-primary)";
                    btnJurisflow.style.border = "1px solid var(--zen-border)";
                    btnJurisflow.innerHTML = `<img src="jurisflow-icon.png" width="16" height="16" alt="Jurisflow">`;
                    btnJurisflow.setAttribute('aria-label', 'Abrir no JurisFlow');
                    btnJurisflow.setAttribute('data-tooltip', 'Abrir no JurisFlow');
                    btnJurisflow.onclick = (e) => {
                        e.stopPropagation();
                        fetch(`http://127.0.0.1:${window.configJurisflowPort || '18080'}/api/open_process`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.configJurisflowToken || 'jf_djen_secret'}` },
                            body: JSON.stringify({ processo: item.processo })
                        }).then(() => showToast('Abrindo no JurisFlow...', '🚀'))
                          .catch(e => showToast('JurisFlow offline', '⚠️'));
                    };
                }
                
                const btnCumprir = document.createElement("button");
                if (item.cumprido) { btnCumprir.className = "btn-cumprir-quadrado is-cumprido tooltip-left"; safeSetInnerHTML(btnCumprir, iconesSVG.retro);; btnCumprir.setAttribute('aria-label', 'Reabrir Prazo'); btnCumprir.setAttribute('data-tooltip', 'Reabrir Prazo'); }
                else { btnCumprir.className = "btn-cumprir-quadrado tooltip-left"; safeSetInnerHTML(btnCumprir, iconesSVG.check);; btnCumprir.setAttribute('aria-label', 'Marcar como Cumprido'); btnCumprir.setAttribute('data-tooltip', 'Marcar como Cumprido'); }
                btnCumprir.onclick = (e) => { e.stopPropagation(); alternarCumprimento(key, card, document.getElementById('viewBusca').style.display !== 'none'); };

                let htmlRemover = '';
                if (item.manual) {
                    if (item.fatal) { htmlRemover = `<button class="btn-remover-prazo" style="color: var(--zen-orange);">${iconesSVG.retro} Excluir prazo</button><button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Remover anotação</button>`; }
                    else { htmlRemover = `<button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Remover anotação</button>`; }
                } else { htmlRemover = `<button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Excluir registro</button>`; }

                const menuContainerSalvos = document.createElement("div"); menuContainerSalvos.className = "card-menu-container"; safeSetInnerHTML(menuContainerSalvos, `<button class="btn-acao-square h-blue btn-opcoes-card tooltip-left" aria-label="Mais opções" data-tooltip="Mais opções">${iconesSVG.maisOpcoes}</button><div class="card-dropdown"><button class="btn-editar-apelido" aria-label="Editar identificação">${iconesSVG.lapis} Editar identificação</button><button class="btn-sincronizar-cnj" aria-label="Sincronizar com DataJud">🔄 Sincronizar com CNJ</button><button class="btn-recalcular-prazo" style="display: ${item.fatal ? 'flex' : 'none'};" aria-label="Recalcular prazo">🧮 Recalcular prazo</button><hr>${htmlRemover}</div>`);;
                rightActionsSalvos.append(...(window.configJurisflowEnabled ? [btnJurisflow] : []), btnCumprir, menuContainerSalvos); acoesPills.append(btnCalc, btnCopiar, btnShare, btnIcsExport, btnIcsTodoExport, btnVincularAgenda, rightActionsSalvos);

                const clickArea = header.querySelector('.card-click-area');
                const toggleCard = () => { 
                    const isOpening = !card.classList.contains('aberto'); 
                    if (isOpening) { 
                        document.querySelectorAll('.intimacao-card.aberto').forEach(c => { 
                            if (c !== card) { 
                                c.classList.remove('aberto'); 
                                c.querySelector('.card-click-area').setAttribute('aria-expanded', 'false'); 
                            } 
                        }); 
                    } 
                    card.classList.toggle('aberto'); 
                    clickArea.setAttribute('aria-expanded', isOpening); 
                    if (isOpening) { 
                        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); 
                        // triggerAutoSincronizarCNJ desativado a pedido
                    } else { 
                        if (window.historicoNavegacaoStack && window.historicoNavegacaoStack.length > 0) {
                            const prev = window.historicoNavegacaoStack.pop();
                            if (prev.aba === 'busca') {
                                if (window.mudarParaAba) window.mudarParaAba('busca');
                            } else {
                                if (window.restaurarFiltroStack) window.restaurarFiltroStack(prev.filtro);
                                if (window.mudarParaAba) window.mudarParaAba('salvos');
                            }
                            setTimeout(() => {
                                window.focarCardProcesso(prev.key, prev.aba === 'busca', true);
                            }, 300);
                            return;
                        }
                        if (document.getElementById('viewSalvos')?.style.display !== 'none') setTimeout(renderAgenda, 350); 
                        if (document.getElementById('viewControle')?.style.display !== 'none') setTimeout(renderControle, 250); 
                    } 
                };

                clickArea.onclick = (e) => {
                    if (card.classList.contains('so-historico')) {
                        card.classList.remove('so-historico');
                        return;
                    }
                    if (e.target.closest('.processo-clicavel-controle')) {
                        e.stopPropagation();
                        const procNav = e.target.closest('.processo-clicavel-controle').getAttribute('data-proc-nav');
                        if (procNav) window.irParaControle(procNav);
                        return;
                    }
                    if (e.target.closest('.hint-apelido-modern') || e.target.closest('.proc-apelido-modern') || e.target.closest('.cnj-wrapper')) {
                        e.stopPropagation();
                        abrirModalApelido(item.processo, apelidoSalvo, (novoApelido) => {
                            setGlobalApelido(item.processo, novoApelido.trim(), key);
                            renderAgenda();
                            renderCalendar();
                        });
                        return;
                    }
                    toggleCard();
            }
            // --- FIM DE DETECÇÃO CNJ ---

            const prazoSugerido = extrairPrazoSugerido(item.textoCompleto || "");
            const calcPanel = montarCalculadoraForm(item, btnCalc, key, item.data_disponibilizacao, item.processo, prazoSugerido, true, null, toggleCard);

            if (btnCalc) {
                btnCalc.onclick = (e) => {
                    e.stopPropagation();

                    const isAtiva = calcPanel.classList.contains('ativa');
                    if (isAtiva) {
                        calcPanel.classList.remove('ativa');
                        return;
                    }

                    let prazo = item.prazoCalculado || item;
                    if (prazo && prazo.timeline) {
                        const cInp = calcPanel.querySelector('.calc-inputs-container'); if (cInp) cInp.style.display = 'none';
                        const dIni = calcPanel.querySelector('.calc-acoes-iniciais'); if (dIni) dIni.style.display = 'none';
                        const cRes = calcPanel.querySelector('.calc-result-box'); if (cRes) cRes.style.display = 'block';

                        const lblDataFatal = calcPanel.querySelector('.resultado-data-fatal');
                        if (lblDataFatal) lblDataFatal.textContent = prazo.fatal || "--/--/----";

                        const containerAlertas = calcPanel.querySelector('.resultado-alertas');
                        if (containerAlertas) {
                            containerAlertas.style.display = 'block';
                            let badgesHtml = "";
                            if (prazo.feriados > 0) badgesHtml += `<span class="badge bg-gray">${prazo.feriados} Feriados/Suspensões</span>`;
                            if (prazo.prorrogado) badgesHtml += `<span class="badge bg-orange">Prorrogado</span>`;
                            let htmlAlertas = badgesHtml ? `<div style="display:flex; gap:4px; justify-content:center; width: 100%; margin-bottom: 12px;">${badgesHtml}</div>` : "";
                            htmlAlertas += `<div style="width: 100%; text-align: center; margin-top: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--primary); cursor: pointer;">🖱️ Clique aqui para ocultar/mostrar a auditoria</div>`;
                            safeSetInnerHTML(containerAlertas, htmlAlertas);
                        }

                        const prev = calcPanel.querySelector('.calc-preview');
                        if (prev) {
                            preencherAuditoriaVisual(prazo.timeline, prev);
                            prev.style.display = 'grid';
                            const btnContainer = calcPanel.querySelector('.container-btn-png');
                            if (btnContainer) btnContainer.style.display = 'block';
                        }

                        const dFin = calcPanel.querySelector('.calc-acoes-finais');
                        if (dFin) {
                            dFin.style.display = 'flex';
                            const bSalvar = dFin.querySelector('.btn-salvar'); if (bSalvar) bSalvar.style.display = 'none';
                            const bVoltar = dFin.querySelector('.btn-voltar-calc'); if (bVoltar) { safeSetInnerHTML(bVoltar, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: -3px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Recalcular prazo`); bVoltar.style.flex = '1'; }
                        }
                        if (typeof atualizarAuditoriaCruzada === 'function') atualizarAuditoriaCruzada();
                        calcPanel.classList.add('ativa');
                    } else {
                        const cInp = calcPanel.querySelector('.calc-inputs-container'); if (cInp) cInp.style.display = 'flex';
                        const dIni = calcPanel.querySelector('.calc-acoes-iniciais'); if (dIni) dIni.style.display = 'flex';
                        const cRes = calcPanel.querySelector('.calc-result-box'); if (cRes) cRes.style.display = 'none';
                        const prev = calcPanel.querySelector('.calc-preview'); if (prev) prev.style.display = 'none';
                        const dFin = calcPanel.querySelector('.calc-acoes-finais'); if (dFin) dFin.style.display = 'none';
                        calcPanel.classList.add('ativa');
                    }
                    setTimeout(() => calcPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
                };
            }

            const radarNav = criarRadarNavigator(teorInnerBox, item.textoCompleto || "");
            if (radarNav) {
                teorInnerOverflow.append(teorHeaderActions, radarNav, teorBoxContainer, notionWrapperAgenda, acoesPills, timelineWrapper, calcPanel);
            } else {
                teorInnerOverflow.append(teorHeaderActions, teorBoxContainer, notionWrapperAgenda, acoesPills, timelineWrapper, calcPanel);
            }
            renderizarSecaoResumoIA(key, item.textoCompleto, teorInnerOverflow, teorHeaderActions);
            teorWrapper.appendChild(teorInnerOverflow); card.append(header, teorWrapper);

            if (sessionStorage.getItem('djen_auto_open_calc') === key) {
                card.classList.add('aberto');
                header.querySelector('.card-click-area').setAttribute('aria-expanded', 'true');
                calcPanel.classList.add('ativa');
                setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }); sessionStorage.removeItem('djen_auto_open_calc'); }, 300);
            }
            return card;
        }, { scrollTop, useWindowScroll: true });
    }

    function getItensAgendaFiltrados() {
        let chaves = Object.keys(prazosSalvos).filter(k => prazosSalvos[k]);

        const termoSalvos = document.getElementById('filtroPrazos')?.value.toLowerCase().trim();
        if (termoSalvos) {
            const removeAcentos = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
            const termos = removeAcentos(termoSalvos).split(/\s+/);
            
            chaves = chaves.filter(k => {
                const p = prazosSalvos[k];
                const searchableText = removeAcentos([
                    p.processo || "",
                    p.apelido || "",
                    p.anotacao || "",
                    p.textoCompleto || "",
                    p.siglaTribunal || ""
                ].join(" "));
                
                return termos.every(termo => searchableText.includes(termo));
            });
        }

        // === #7 — Aplicar filtros avançados ===
        const fStatus = document.getElementById('filtroAvancadoStatus')?.value || '';
        const fTrib = (document.getElementById('filtroAvancadoTribunal')?.value || '').trim().toLowerCase();
        const fUF = (document.getElementById('filtroAvancadoUF')?.value || '').trim().toLowerCase();
        const fOrdem = document.getElementById('filtroAvancadoOrdem')?.value || 'fatal_asc';

        if (fTrib) {
            chaves = chaves.filter(k => (prazosSalvos[k].siglaTribunal || '').toLowerCase().includes(fTrib));
        }
        if (fUF) {
            chaves = chaves.filter(k => (prazosSalvos[k].uf || '').toLowerCase() === fUF);
        }

        const hj = new Date();
        hj.setHours(12, 0, 0, 0);

        if (fStatus) {
            chaves = chaves.filter(k => {
                const p = prazosSalvos[k];
                if (fStatus === 'cumprido') return p.cumprido;
                if (fStatus === 'espera') return p.espera && !p.cumprido;
                if (!p.fatal) return false;
                const diff = Math.ceil((parseDateBR(p.fatal) - hj) / (1000 * 3600 * 24));
                if (fStatus === 'hoje') return diff === 0;
                if (fStatus === 'atrasado') return diff < 0 && !p.cumprido;
                if (fStatus === 'pendente') return !p.cumprido && diff >= 0;
                return true;
            });
        }

        if (!fStatus && filtroAgendaAtivo) {
            chaves = chaves.filter(k => {
                const p = prazosSalvos[k];
                if (filtroAgendaAtivo === 'cumpridos') return p.cumprido;
                if (filtroAgendaAtivo === 'espera') {
                    if (!p.espera || p.cumprido) return false;
                    if (p.fatal) {
                        const dt = parseDateBR(p.fatal);
                        const diff = Math.ceil((dt - hj) / (1000 * 3600 * 24));
                        if (diff < 0) return false;
                    }
                    return true;
                }

                if (p.cumprido || !p.fatal) return false;
                if (p.espera) {
                    const dt = parseDateBR(p.fatal);
                    const diff = Math.ceil((dt - hj) / (1000 * 3600 * 24));
                    if (diff >= 0) return false;
                }

                const dt = parseDateBR(p.fatal);
                const diff = Math.ceil((dt - hj) / (1000 * 3600 * 24));

                if (filtroAgendaAtivo === 'hoje') return diff <= 0;
                if (filtroAgendaAtivo === '5dias') return diff > 0 && diff <= 5;
                if (filtroAgendaAtivo === 'futuros') return diff > 5;
                return true;
            });
        } else if (!fStatus && !filtroAgendaAtivo) {
            chaves = chaves.filter(k => !prazosSalvos[k].cumprido && prazosSalvos[k].fatal);
        }

        // Ordenação customizada (#7)
        chaves.sort((a, b) => {
            const pA = prazosSalvos[a];
            const pB = prazosSalvos[b];

            if (pA.cumprido && pB.cumprido) {
                if (fOrdem === 'proc_asc') {
                    const apelidoA = (pA.apelido || '').trim().toLowerCase();
                    const apelidoB = (pB.apelido || '').trim().toLowerCase();
                    if (apelidoA !== apelidoB) {
                        if (!apelidoA) return 1;
                        if (!apelidoB) return -1;
                        return apelidoA.localeCompare(apelidoB, 'pt-BR');
                    }
                    return (pA.processo || '').localeCompare(pB.processo || '');
                } else if (fOrdem === 'cump_asc') {
                    if (!pA.dataCumprimento && !pB.dataCumprimento) return 0;
                    if (!pA.dataCumprimento) return 1;
                    if (!pB.dataCumprimento) return -1;
                    return new Date(pA.dataCumprimento) - new Date(pB.dataCumprimento);
                } else {
                    if (!pA.dataCumprimento && !pB.dataCumprimento) return 0;
                    if (!pA.dataCumprimento) return 1;
                    if (!pB.dataCumprimento) return -1;
                    return new Date(pB.dataCumprimento) - new Date(pA.dataCumprimento);
                }
            }
            if (pA.cumprido && !pB.cumprido) return 1;
            if (!pA.cumprido && pB.cumprido) return -1;

            if (fOrdem === 'proc_asc') return (pA.processo || '').localeCompare(pB.processo || '');
            if (fOrdem === 'trib_asc') return (pA.siglaTribunal || '').localeCompare(pB.siglaTribunal || '');
            if (fOrdem === 'fatal_desc') {
                if (!pA.fatal && pB.fatal) return 1;
                if (pA.fatal && !pB.fatal) return -1;
                if (!pA.fatal && !pB.fatal) return 0;
                return parseDateBR(pB.fatal).getTime() - parseDateBR(pA.fatal).getTime();
            }
            // fatal_asc (default)
            if (!pA.fatal && pB.fatal) return 1;
            if (pA.fatal && !pB.fatal) return -1;
            if (!pA.fatal && !pB.fatal) return 0;
            return parseDateBR(pA.fatal).getTime() - parseDateBR(pB.fatal).getTime();
        });

        return chaves.map(k => prazosSalvos[k]);
    }

    function renderCalendar() {}

    function renderAgenda(scrollTop = null) {
        const list = document.getElementById('listaSalvos');
        if (!list) return;

        const currentScroll = scrollTop !== null ? scrollTop : (window.currentVirtualList && window.currentVirtualList.useWindowScroll ? window.currentVirtualList.getScrollTop() : list.scrollTop);

        const openCard = document.querySelector('#listaSalvos .intimacao-card.aberto');
        const openKey = openCard ? openCard.getAttribute('data-key') : null;

        const itensFiltrados = getItensAgendaFiltrados();
        const chaves = itensFiltrados.map(p => {
            return Object.keys(prazosSalvos).find(k => prazosSalvos[k] === p);
        });

        appendCardsToList(chaves, list, openKey, "Nenhum prazo localizado para este filtro", currentScroll);
    }

    function adicionarHistoricoControle(key) {
        if (!key) return;
        historicoControle = [key, ...historicoControle.filter(k => k !== key)].slice(0, 5);
        SafeStorage.set({ 'djen_historico_controle': JSON.stringify(historicoControle) });
    }

    function renderControle() {
        const vc = document.getElementById('viewControle');
        if (!vc) return;

        // Limpar container
        vc.replaceChildren();

        // Validar se o processo ativo ainda existe
        if (window.processoControleAtivo && !prazosSalvos[window.processoControleAtivo]) {
            
        }

        if (window.processoControleAtivo) {
            adicionarHistoricoControle(window.processoControleAtivo);
        }

        if (!window.processoControleAtivo) {
            // ==========================================
            // ESTADO INICIAL: SELETOR DE PROCESSOS
            // ==========================================
            const viewInicial = document.createElement('div');
            viewInicial.className = 'cockpit-initial-view';

            // Cabeçalho da aba
            const tituloSeletor = document.createElement('h2');
            tituloSeletor.style.fontSize = '16px';
            tituloSeletor.style.marginTop = '0';
            tituloSeletor.style.marginBottom = '2px';
            tituloSeletor.textContent = 'Controle Processual';
            
            const subSeletor = document.createElement('p');
            subSeletor.style.fontSize = '11.5px';
            subSeletor.style.color = 'var(--text-muted)';
            subSeletor.style.margin = '0 0 10px 0';
            subSeletor.textContent = 'Busque ou selecione um caso cadastrado.';

            // Agrupar por número de processo único para eliminar duplicatas
            const chavesBrutas = Object.keys(prazosSalvos).filter(k => prazosSalvos[k]);
            const chavesUnicas = [];
            const processosVistos = new Set();
            
            chavesBrutas.forEach(k => {
                const p = prazosSalvos[k];
                if (!p || !p.processo) return;
                const procNorm = p.processo.replace(/\D/g, '');
                
                if (!processosVistos.has(procNorm)) {
                    processosVistos.add(procNorm);
                    chavesUnicas.push(k);
                } else {
                    const idxExistente = chavesUnicas.findIndex(exKey => prazosSalvos[exKey].processo.replace(/\D/g, '') === procNorm);
                    if (idxExistente !== -1) {
                        const pExistente = prazosSalvos[chavesUnicas[idxExistente]];
                        // Preferir o card que tem apelido, ou que não está cumprido
                        if (pExistente.cumprido && !p.cumprido) {
                            chavesUnicas[idxExistente] = k;
                        } else if (!pExistente.apelido && p.apelido) {
                            chavesUnicas[idxExistente] = k;
                        }
                    }
                }
            });

            // Constante chaves usada para os filtros
            const chaves = chavesUnicas;

            // Barra de Busca
            const searchBox = document.createElement('div');
            searchBox.className = 'cockpit-search-box';
            
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.placeholder = 'Digite o processo ou apelido para filtrar...';
            searchInput.autocomplete = 'off';
            searchInput.ariaLabel = 'Buscar processo para controle';

            const searchIcon = document.createElement('span');
            searchIcon.className = 'cockpit-search-icon';
            searchIcon.textContent = '🔍';

            // Dropdown de autocomplete para busca
            const autocompleteDropdown = document.createElement('div');
            autocompleteDropdown.className = 'autocomplete-dropdown';

            searchBox.append(searchIcon, searchInput, autocompleteDropdown);

            // Container de Acesso Rápido
            const quickSelect = document.createElement('div');
            quickSelect.className = 'cockpit-quick-select';
            
            const quickHeader = document.createElement('div');
            quickHeader.style.display = 'flex';
            quickHeader.style.justifyContent = 'space-between';
            quickHeader.style.alignItems = 'center';
            quickHeader.style.marginBottom = '2px';

            const quickTitle = document.createElement('div');
            quickTitle.className = 'cockpit-quick-title';
            quickTitle.style.margin = '0';
            quickTitle.textContent = 'Seus Casos Cadastrados';

            const sortContainer = document.createElement('div');
            sortContainer.style.display = 'flex';
            sortContainer.style.alignItems = 'center';
            sortContainer.style.gap = '4px';

            const sortLabel = document.createElement('span');
            sortLabel.style.fontSize = '10px';
            sortLabel.style.color = 'var(--text-muted)';
            sortLabel.textContent = 'Ordenar:';

            const sortBtn = document.createElement('button');
            sortBtn.className = 'cockpit-sort-btn';

            function updateSortBtnLabel(sortVal) {
                if (sortVal === 'modificacao') {
                    sortBtn.innerHTML = '📅 Modificação';
                } else {
                    sortBtn.innerHTML = '🔤 A-Z';
                }
            }

            const currentSort = localStorage.getItem('djen_controle_sort') || 'alfabetica';
            updateSortBtnLabel(currentSort);

            sortBtn.onclick = () => {
                const activeSort = localStorage.getItem('djen_controle_sort') || 'alfabetica';
                const nextSort = activeSort === 'alfabetica' ? 'modificacao' : 'alfabetica';
                localStorage.setItem('djen_controle_sort', nextSort);
                updateSortBtnLabel(nextSort);
                renderListaCasos(searchInput.value.trim());
            };

            sortContainer.append(sortLabel, sortBtn);
            quickHeader.append(quickTitle, sortContainer);

            const quickList = document.createElement('div');
            quickList.className = 'cockpit-quick-list';

            function renderListaCasos(filtro = '') {
                quickList.replaceChildren();

                const chavesFiltradas = chaves.filter(k => {
                    const p = prazosSalvos[k];
                    const num = (p.processo || '').toLowerCase();
                    const apelido = (p.apelido || '').toLowerCase();
                    const term = filtro.toLowerCase();
                    return num.includes(term) || apelido.includes(term);
                });

                if (chavesFiltradas.length === 0) {
                    const vazio = document.createElement('div');
                    vazio.style.textAlign = 'center';
                    vazio.style.padding = '30px 10px';
                    vazio.style.color = 'var(--text-muted)';
                    vazio.style.fontSize = '13.5px';
                    vazio.innerHTML = filtro ? 'Nenhum processo correspondente localizado' : 'Nenhum processo salvo nos Prazos ainda.<br><span style="font-size: 12px; opacity: 0.7;">Faça uma busca ou adicione um prazo manual primeiro!</span>';
                    quickList.appendChild(vazio);
                    return;
                }

                const sortOption = localStorage.getItem('djen_controle_sort') || 'alfabetica';
                if (sortOption === 'modificacao') {
                    const getModTime = (k) => {
                        const p = prazosSalvos[k];
                        if (!p) return 0;
                        if (p.data_modificacao) return new Date(p.data_modificacao).getTime();
                        if (p.historicoAcoes && p.historicoAcoes.length > 0) {
                            return new Date(p.historicoAcoes[0].data).getTime();
                        }
                        if (p.data_disponibilizacao) return new Date(p.data_disponibilizacao).getTime();
                        return 0;
                    };
                    chavesFiltradas.sort((a, b) => getModTime(b) - getModTime(a));
                } else {
                    // Ordenar: ordem alfabética (pelo apelido) e depois pelo número do processo
                    chavesFiltradas.sort((a, b) => {
                        const pA = prazosSalvos[a];
                        const pB = prazosSalvos[b];
                        
                        const apelidoA = (pA.apelido || '').trim().toLowerCase();
                        const apelidoB = (pB.apelido || '').trim().toLowerCase();
                        
                        if (apelidoA !== apelidoB) {
                            if (!apelidoA) return 1; // joga sem apelido para o final
                            if (!apelidoB) return -1;
                            return apelidoA.localeCompare(apelidoB, 'pt-BR');
                        }
                        
                        const procA = (pA.processo || '').replace(/\D/g, '');
                        const procB = (pB.processo || '').replace(/\D/g, '');
                        return procA.localeCompare(procB);
                    });
                }

                chavesFiltradas.forEach((k, index) => {
                    const p = prazosSalvos[k];
                    const card = document.createElement('div');
                    card.className = 'cockpit-quick-card';
                    card.setAttribute('data-key', k);
                    
                    // Efeito de entrada suave staggered
                    card.style.opacity = '0';
                    card.style.animation = 'entraSuave 0.35s var(--ease-out-smooth) forwards';
                    card.style.animationDelay = `${Math.min(index * 0.03, 0.6)}s`;

                    // 1. Stripe de Status
                    const stripe = document.createElement('div');
                    stripe.className = 'cockpit-card-stripe';

                    // 2. Header (Apelido)
                    const header = document.createElement('div');
                    header.className = 'cockpit-card-header';
                    
                    const name = document.createElement('div');
                    name.className = 'cockpit-quick-name';
                    name.innerHTML = highlightText(p.apelido || 'Caso sem Identificação', filtro);

                    // Cor da stripe baseada no prazo (visual scanning, sem badge de status)
                    let stripeColor = 'var(--border-light)';

                    let diff = null;
                    if (p.fatal) {
                        const hoje = new Date();
                        hoje.setHours(12, 0, 0, 0);
                        const dt = parseDateBR(p.fatal);
                        diff = Math.ceil((dt - hoje) / (1000 * 3600 * 24));
                    }

                    if (diff !== null && diff < 0) {
                        stripeColor = 'var(--zen-red)';
                    } else if (p.fatal) {
                        if (diff === 0) {
                            stripeColor = 'var(--zen-orange)';
                        } else if (diff <= 5) {
                            stripeColor = 'var(--stat-5dias-txt)';
                        } else {
                            stripeColor = 'var(--zen-blue)';
                        }
                    }

                    stripe.style.background = stripeColor;

                    if (p.relacoes && p.relacoes.length > 0) {
                        const relBadge = document.createElement('span');
                        relBadge.className = 'badge-conexao-rapida';
                        const count = p.relacoes.length;
                        const relIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
                        relBadge.innerHTML = `${relIcon}${count}`;
                        header.append(name, relBadge);
                    } else {
                        header.append(name);
                    }

                    // 3. Body (CNJ + Badges Tribunais/Conexões)
                    const body = document.createElement('div');
                    body.className = 'cockpit-card-body';
                    
                    const proc = document.createElement('div');
                    proc.className = 'cockpit-quick-proc';
                    let badgeTribHTML = '';
                    const tribStr = (p.siglaTribunal && p.siglaTribunal !== 'MANUAL') ? p.siglaTribunal : obterTribunalDoCNJ(p.processo);
                    if (tribStr) badgeTribHTML += ` <span class="badge-trib-modern">${tribStr}</span>`;
                    
                    const sistemaStr = p.datajud_sistema || inferirSistemaDoProcesso(p.processo, tribStr, p.textoCompleto || p.anotacao);
                    if (sistemaStr) badgeTribHTML += ` <span class="badge-sistema-modern" style="font-size: 10px; font-weight: 500; color: var(--text-muted); background: var(--bg-hover); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${sistemaStr}</span>`;
                    
                    proc.innerHTML = highlightText(formatCNJ(p.processo) || p.processo, filtro) + badgeTribHTML;
                    body.appendChild(proc);
                    
                    let fullClasse = p.datajud_classe || getGlobalClasse(p.processo) || '';
                    if (fullClasse) {
                        const classeDiv = document.createElement('div');
                        classeDiv.style.cssText = "font-size: 10.5px; color: var(--text-muted); width: 100%; display: flex; align-items: center; gap: 4px; line-height: 1.2; margin-top: -2px;";
                        classeDiv.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; opacity: 0.7;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> <span style="font-weight: 500; letter-spacing: 0.2px;">${fullClasse}</span>`;
                        body.appendChild(classeDiv);
                    }

                    // 4. Footer (Notas + Prazo Fatal)
                    const footer = document.createElement('div');
                    footer.className = 'cockpit-card-footer';

                    // Prazo Fatal Badge
                    if (p.fatal && !p.cumprido) {
                        const fatalBadge = document.createElement('span');
                        fatalBadge.style.fontSize = '9px';
                        fatalBadge.style.fontWeight = '700';
                        fatalBadge.style.padding = '1.5px 6px';
                        fatalBadge.style.borderRadius = '4px';
                        fatalBadge.style.display = 'inline-flex';
                        fatalBadge.style.alignItems = 'center';
                        fatalBadge.style.gap = '4px';
                        fatalBadge.style.fontFamily = "'Inter', sans-serif";
                        fatalBadge.style.width = 'fit-content';
                        
                        let fatalColor = 'var(--text-muted)';
                        let fatalBg = 'var(--bg-hover)';
                        let fatalBorder = '1px solid var(--border-light)';
                        
                        if (diff !== null) {
                            if (diff <= 0) {
                                fatalColor = 'var(--stat-hoje-txt)';
                                fatalBg = 'var(--stat-hoje-bg)';
                                fatalBorder = '1px solid var(--stat-hoje-brd)';
                            } else if (diff <= 5) {
                                fatalColor = 'var(--stat-5dias-txt)';
                                fatalBg = 'var(--stat-5dias-bg)';
                                fatalBorder = '1px solid var(--stat-5dias-brd)';
                            } else {
                                fatalColor = 'var(--stat-futuro-txt)';
                                fatalBg = 'var(--stat-futuro-bg)';
                                fatalBorder = '1px solid var(--stat-futuro-brd)';
                            }
                        }
                        
                        fatalBadge.style.color = fatalColor;
                        fatalBadge.style.background = fatalBg;
                        fatalBadge.style.border = fatalBorder;
                        
                        const calIcon = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
                        fatalBadge.innerHTML = `${calIcon} ${p.fatal}`;
                        footer.appendChild(fatalBadge);
                    }

                    // Última movimentação / Anotação
                    let ultimaNota = '';
                    if (p.historicoAcoes && p.historicoAcoes.length > 0) {
                        // Procurar a última ação que não seja apenas criação ou vínculo simples, ou pegar a 0
                        const acao = p.historicoAcoes[0];
                        if (acao.descricao) {
                            let dtAmigavel = '';
                            if (acao.data) {
                                const d = new Date(acao.data);
                                dtAmigavel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                            }
                            ultimaNota = dtAmigavel ? `${dtAmigavel}: ${acao.descricao}` : acao.descricao;
                        }
                    } else if (p.anotacao) {
                        ultimaNota = `Nota: ${p.anotacao}`;
                    }
                    
                    if (ultimaNota) {
                        const noteEl = document.createElement('div');
                        noteEl.className = 'cockpit-quick-note';
                        noteEl.textContent = ultimaNota;
                        noteEl.title = ultimaNota; // tooltip nativo
                        footer.appendChild(noteEl);
                    }

                    // 5. Actions (Sync)
                    const actions = document.createElement('div');
                    actions.className = 'cockpit-card-actions';

                    const btnSyncList = document.createElement('button');
                    btnSyncList.className = 'cockpit-btn-sync tooltip-bottom';
                    btnSyncList.setAttribute('data-tooltip', 'Sincronizar com DataJud');
                    btnSyncList.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.42 5.42"/></svg>`;
                    btnSyncList.style.border = '1px solid var(--border-light)';
                    btnSyncList.style.background = 'var(--bg-body)';
                    btnSyncList.style.color = 'var(--text-muted)';
                    btnSyncList.style.borderRadius = '6px';
                    btnSyncList.style.padding = '4px 6px';
                    btnSyncList.style.cursor = 'pointer';
                    btnSyncList.style.display = 'inline-flex';
                    btnSyncList.style.alignItems = 'center';
                    btnSyncList.style.transition = 'var(--trans-micro)';
                    
                    btnSyncList.onmouseover = () => {
                        btnSyncList.style.borderColor = 'var(--border-focus)';
                        btnSyncList.style.color = 'var(--text-main)';
                    };
                    btnSyncList.onmouseout = () => {
                        btnSyncList.style.borderColor = 'var(--border-light)';
                        btnSyncList.style.color = 'var(--text-muted)';
                    };
                    
                    actions.appendChild(btnSyncList);
                    
                    btnSyncList.onclick = (e) => {
                        e.stopPropagation();
                        if (!configDataJudApiKey) {
                            showToast("Chave da API do DataJud não configurada.", "⚠️");
                            return;
                        }
                        const oldHtml = btnSyncList.innerHTML;
                        btnSyncList.innerHTML = '⏳';
                        consultarProcessoDataJud(p.processo).then(dataJud => {
                            btnSyncList.innerHTML = oldHtml;
                            // Marcar como tentado para evitar re-sync automático
                            const procLimpoSyncList = normalizarNumeroCNJ(p.processo) || String(p.processo).replace(/\D/g, '');
                            processosTentadosCNJ.add(procLimpoSyncList);
                            if (dataJud) {
                                const partesBase = getGlobalPartes(p.processo) || {};
                                let atualizado = false;
                                if (!partesBase.requerente && dataJud.poloAtivo) { partesBase.requerente = dataJud.poloAtivo; atualizado = true; }
                                if (!partesBase.requerido && dataJud.poloPassivo) { partesBase.requerido = dataJud.poloPassivo; atualizado = true; }
                                if (atualizado) setGlobalPartes(p.processo, partesBase);

                                if (!p.apelido && dataJud.poloAtivo && dataJud.poloPassivo) {
                                    p.apelido = `${dataJud.poloAtivo} x ${dataJud.poloPassivo}`;
                                    atualizado = true;
                                }
                                if (dataJud.vinculados && dataJud.vinculados.length > 0) {
                                    const rels = dataJud.vinculados.map(v => formatCNJ(v.numeroProcesso)).filter(v => v);
                                    if (rels.length > 0) { p.relacoes = rels; atualizado = true; }
                                }
                                if (dataJud.classe || dataJud.orgao || dataJud.sistema) {
                                    p.datajud_classe = dataJud.classe || '';
                                    p.datajud_orgao = dataJud.orgao || '';
                                    p.datajud_sistema = dataJud.sistema || '';
                                    atualizado = true;
                                }
                                if (dataJud.assuntos && dataJud.assuntos.length > 0) { p.datajud_assuntos = dataJud.assuntos; atualizado = true; }
                                if (dataJud.grau) { p.datajud_grau = dataJud.grau; atualizado = true; }
                                if (dataJud.dataAjuizamento) { p.datajud_ajuizamento = dataJud.dataAjuizamento; atualizado = true; }
                                if (dataJud.ufJud) { p.datajud_uf = dataJud.ufJud; atualizado = true; }
                                if (dataJud.munJud) { p.datajud_mun = dataJud.munJud; atualizado = true; }
                                if (dataJud.tribunalSigla && !p.siglaTribunal) { p.siglaTribunal = dataJud.tribunalSigla.toUpperCase(); atualizado = true; }
                                if (dataJud.movimentos && dataJud.movimentos.length > 0) { p.datajud_movimentos = dataJud.movimentos; atualizado = true; }
                                if (typeof dataJud.nivelSigilo === 'number') { p.datajud_sigilo = dataJud.nivelSigilo; atualizado = true; }
                                if (atualizado) {
                                    savePrazosSalvos();
                                    showToast("Sincronizado! 🎉", "✨");
                                    renderControle();
                                    renderAgenda();
                                } else {
                                    showToast("Sincronizado! Nenhum dado novo encontrado.", "👍");
                                }
                            } else {
                                showToast("Nenhum dado encontrado no CNJ.", "ℹ️");
                            }
                        }).catch(err => {
                            btnSyncList.innerHTML = oldHtml;
                            showToast(err.message || "Erro ao conectar com CNJ", "❌");
                        });
                    };

                    const footerRow = document.createElement('div');
                    footerRow.className = 'cockpit-card-footer-row';
                    footerRow.append(footer, actions);

                    // Montar card
                    card.append(stripe, header, body, footerRow);

                    card.onclick = () => {
                        window.processoControleAtivo = k;
                        renderControle();
                    };

                    quickList.appendChild(card);
                });
            }

            // Autocomplete premium para a busca da aba Controle
            const mostrarSugestoes = () => {
                const valorDigitado = searchInput.value.trim().toLowerCase();
                const chavesFiltradas = chaves.filter(k => {
                    const p = prazosSalvos[k];
                    return (p.processo || '').toLowerCase().includes(valorDigitado) ||
                           (p.apelido || '').toLowerCase().includes(valorDigitado);
                }).slice(0, 5);

                if (chavesFiltradas.length > 0) {
                    autocompleteDropdown.replaceChildren();
                    chavesFiltradas.forEach(k => {
                        const p = prazosSalvos[k];
                        const divItem = document.createElement('div');
                        divItem.className = 'autocomplete-item';
                        
                        const labelApelido = p.apelido ? `<strong>${highlightText(p.apelido, searchInput.value)}</strong>` : 'Caso sem Identificação';
                        const labelProc = highlightText(formatCNJ(p.processo) || p.processo, searchInput.value);
                        divItem.innerHTML = `📄 ${labelApelido} <span style="font-size: 11px; opacity: 0.7; margin-left: 6px;">(${labelProc})</span>`;

                        divItem.onmousedown = (e) => {
                            e.preventDefault();
                            window.processoControleAtivo = k;
                            renderControle();
                        };
                        autocompleteDropdown.appendChild(divItem);
                    });
                    autocompleteDropdown.classList.add('show');
                } else {
                    autocompleteDropdown.classList.remove('show');
                }
            };

            searchInput.addEventListener('input', () => {
                mostrarSugestoes();
                renderListaCasos(searchInput.value.trim()); // mantém a lista principal filtrando abaixo simultaneamente
            });
            searchInput.addEventListener('focus', mostrarSugestoes);
            searchInput.addEventListener('blur', () => {
                setTimeout(() => {
                    autocompleteDropdown.classList.remove('show');
                }, 200);
            });

            renderListaCasos();
            quickSelect.append(quickHeader, quickList);

            viewInicial.append(tituloSeletor, subSeletor, searchBox, quickSelect);
            vc.appendChild(viewInicial);

        } else {
            // ==========================================
            // FICHA DO COCKPIT TÁTICO INDIVIDUAL
            // ==========================================
            const p = prazosSalvos[window.processoControleAtivo];
            const key = window.processoControleAtivo;

            // Garantir inicialização da linha do tempo local se ainda não foi criada
            if (!p.historicoAcoes) {
                p.historicoAcoes = [];
                const dataOrigem = p.data_disponibilizacao || new Date().toISOString();
                p.historicoAcoes.push({ data: dataOrigem, tipo: 'criacao', descricao: 'Processo adicionado ao Controle' });
                SafeStorage.set({ 'djen_prazos_salvos': JSON.stringify(prazosSalvos) });
            }

            const cockpit = document.createElement('div');
            cockpit.className = 'cockpit-container';

            // 1. Cabeçalho do Cockpit (Apenas botão Voltar)
            const header = document.createElement('div');
            header.className = 'cockpit-header';

            const titleRow = document.createElement('div');
            titleRow.className = 'cockpit-title-row';

            const btnBack = document.createElement('button');
            btnBack.className = 'cockpit-btn-back';
            btnBack.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none; display:block;"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg> Voltar para a lista`;
            btnBack.title = 'Voltar para a Lista';
            btnBack.onclick = () => {
                window.processoControleAtivo = null;
                renderControle();
            };

            titleRow.append(btnBack);
            header.appendChild(titleRow);

            // 1.5 Card de Identificação do Processo
            const cardIdentificacao = document.createElement('div');
            cardIdentificacao.className = 'cockpit-card identificacao-card';
            cardIdentificacao.style.borderTop = '3px solid var(--accent-color)';

            const identHeader = document.createElement('div');
            identHeader.style.display = 'flex';
            identHeader.style.justifyContent = 'space-between';
            identHeader.style.alignItems = 'flex-start';
            identHeader.style.marginBottom = '12px';

            const titleGroup = document.createElement('div');
            titleGroup.className = 'cockpit-header-title-group';
            titleGroup.style.flex = '1';

            const name = document.createElement('div');
            name.className = 'cockpit-header-name';
            name.textContent = p.apelido || 'Caso sem Identificação';
            name.style.fontSize = '15px';
            
            // Permitir edição rápida do apelido
            name.title = 'Clique para renomear este caso';
            name.style.cursor = 'pointer';
            name.onclick = (e) => {
                abrirModalApelido(p.processo, p.apelido || '', (novoApelido) => {
                    setGlobalApelido(p.processo, novoApelido.trim(), key);
                    renderControle();
                    renderAgenda();
                });
            };

            const proc = document.createElement('div');
            proc.className = 'cockpit-header-proc';
            proc.textContent = formatCNJ(p.processo) || p.processo;
            proc.style.fontSize = '12px';
            proc.style.opacity = '0.8';
            proc.style.fontFamily = 'ui-monospace, monospace';
            proc.style.marginTop = '2px';

            titleGroup.append(name, proc);

            const btnSyncCnjControle = document.createElement('button');
            btnSyncCnjControle.className = 'cockpit-btn-sync tooltip-bottom';
            btnSyncCnjControle.style.marginLeft = '12px';
            btnSyncCnjControle.style.border = '1px solid var(--border-light)';
            btnSyncCnjControle.style.background = 'var(--bg-body)';
            btnSyncCnjControle.style.borderRadius = '6px';
            btnSyncCnjControle.style.padding = '4px 8px';
            btnSyncCnjControle.style.display = 'flex';
            btnSyncCnjControle.style.alignItems = 'center';
            btnSyncCnjControle.style.height = 'fit-content';
            btnSyncCnjControle.style.alignSelf = 'center';
            btnSyncCnjControle.style.whiteSpace = 'nowrap';
            btnSyncCnjControle.style.fontSize = '12px';
            
            const DEZ_MINUTOS_MS = 10 * 60 * 1000;
            const agora = new Date();
            let isEmCooldown = false;

            if (p.ultima_sincronizacao_cnj) {
                const ultimaSinc = new Date(p.ultima_sincronizacao_cnj);
                const diffMs = agora - ultimaSinc;
                if (diffMs < DEZ_MINUTOS_MS) {
                    isEmCooldown = true;
                    btnSyncCnjControle.innerHTML = '✅ Atualizado';
                    btnSyncCnjControle.style.color = 'var(--text-muted)';
                    btnSyncCnjControle.style.cursor = 'default';
                    btnSyncCnjControle.style.opacity = '0.7';
                    btnSyncCnjControle.setAttribute('data-tooltip', `Atualizado há ${Math.floor(diffMs / 60000)} min`);
                }
            }

            if (!isEmCooldown) {
                btnSyncCnjControle.innerHTML = '🔄 Sincronizar';
                btnSyncCnjControle.style.cursor = 'pointer';
                btnSyncCnjControle.setAttribute('data-tooltip', 'Sincronizar com DataJud (CNJ)');
            }

            btnSyncCnjControle.onclick = (e) => {
                if (isEmCooldown) return;
                if (!configDataJudApiKey) {
                    showToast("Chave da API do DataJud não configurada.", "⚠️");
                    return;
                }
                const oldHtml = btnSyncCnjControle.innerHTML;
                btnSyncCnjControle.innerHTML = '⏳ Buscando...';
                btnSyncCnjControle.style.opacity = '0.7';
                btnSyncCnjControle.style.cursor = 'wait';
                consultarProcessoDataJud(p.processo).then(dataJud => {
                    btnSyncCnjControle.innerHTML = oldHtml;
                    // Marcar como tentado para evitar loop de re-sync
                    const procLimpoSync = normalizarNumeroCNJ(p.processo) || String(p.processo).replace(/\D/g, '');
                    processosTentadosCNJ.add(procLimpoSync);
                    setCnjTentadoGlobal(procLimpoSync);
                    if (dataJud) {
                        const partesBase = getGlobalPartes(p.processo) || {};
                        let atualizado = false;
                        if (!partesBase.requerente && dataJud.poloAtivo) { partesBase.requerente = dataJud.poloAtivo; atualizado = true; }
                        if (!partesBase.requerido && dataJud.poloPassivo) { partesBase.requerido = dataJud.poloPassivo; atualizado = true; }
                        if (atualizado) setGlobalPartes(p.processo, partesBase);

                        if (!p.apelido && dataJud.poloAtivo && dataJud.poloPassivo) {
                            p.apelido = `${dataJud.poloAtivo} x ${dataJud.poloPassivo}`;
                            atualizado = true;
                        }
                        if (dataJud.vinculados && dataJud.vinculados.length > 0) {
                            const rels = dataJud.vinculados.map(v => formatCNJ(v.numeroProcesso)).filter(v => v);
                            if (rels.length > 0) { p.relacoes = rels; atualizado = true; }
                        }
                        if (dataJud.classe || dataJud.orgao || dataJud.sistema) {
                            p.datajud_classe = dataJud.classe || '';
                            p.datajud_orgao = dataJud.orgao || '';
                            p.datajud_sistema = dataJud.sistema || '';
                            atualizado = true;
                        }
                        if (dataJud.assuntos && dataJud.assuntos.length > 0) { p.datajud_assuntos = dataJud.assuntos; atualizado = true; }
                        if (dataJud.grau) { p.datajud_grau = dataJud.grau; atualizado = true; }
                        if (dataJud.dataAjuizamento) { p.datajud_ajuizamento = dataJud.dataAjuizamento; atualizado = true; }

                        if (dataJud.ufJud) { p.datajud_uf = dataJud.ufJud; atualizado = true; }
                        if (dataJud.munJud) { p.datajud_mun = dataJud.munJud; atualizado = true; }
                        if (dataJud.tribunalSigla && !p.siglaTribunal) { p.siglaTribunal = dataJud.tribunalSigla.toUpperCase(); atualizado = true; }
                        if (dataJud.movimentos && dataJud.movimentos.length > 0) { p.datajud_movimentos = dataJud.movimentos; atualizado = true; }
                        if (typeof dataJud.nivelSigilo === 'number') { p.datajud_sigilo = dataJud.nivelSigilo; atualizado = true; }
                        if (atualizado) {
                            p.ultima_sincronizacao_cnj = new Date().toISOString();
                            savePrazosSalvos();
                            showToast("Processo sincronizado com o CNJ! 🎉", "✨");
                            renderControle();
                            renderAgenda();
                        } else {
                            p.ultima_sincronizacao_cnj = new Date().toISOString();
                            savePrazosSalvos();
                            showToast("Sincronizado! Nenhum dado novo encontrado.", "👍");
                            renderControle();
                        }
                    } else {
                        p.ultima_sincronizacao_cnj = new Date().toISOString();
                        savePrazosSalvos();
                        showToast("Nenhum dado encontrado no CNJ para este processo.", "ℹ️");
                        renderControle();
                    }
                }).catch(err => {
                    btnSyncCnjControle.innerHTML = oldHtml;
                    btnSyncCnjControle.style.opacity = '1';
                    btnSyncCnjControle.style.cursor = 'pointer';
                    showToast(err.message || "Erro ao conectar com CNJ", "❌");
                });
            };

            // Auto-sync automático (Lazy Sync): se estiver vazio OU se a última sinc. for mais antiga que 12h
            const procLimpoAutoSync = normalizarNumeroCNJ(p.processo) || String(p.processo).replace(/\D/g, '');
            const DOZE_HORAS_MS = 12 * 60 * 60 * 1000;
            const precisaSync = (!p.datajud_classe || !p.datajud_uf) || (!p.ultima_sincronizacao_cnj || (new Date() - new Date(p.ultima_sincronizacao_cnj) > DOZE_HORAS_MS));
            
            if (precisaSync && p.processo && configDataJudApiKey && String(p.processo).length > 10
                && !processosTentadosCNJ.has(procLimpoAutoSync)
                && !processosBuscandoCNJ.has(procLimpoAutoSync)
                && !isCnjTentadoGlobal(procLimpoAutoSync)) {
                processosBuscandoCNJ.add(procLimpoAutoSync);
                setTimeout(() => {
                    if (btnSyncCnjControle && !isEmCooldown) btnSyncCnjControle.click();
                    processosBuscandoCNJ.delete(procLimpoAutoSync);
                }, 500);
            }

            identHeader.append(titleGroup, btnSyncCnjControle);

            // Grid de Detalhes
            const identDetails = document.createElement('div');
            identDetails.style.display = 'grid';
            identDetails.style.gridTemplateColumns = '1fr 1fr';
            identDetails.style.gap = '10px 12px';
            identDetails.style.fontSize = '11px';
            identDetails.style.color = 'var(--text-main)';
            identDetails.style.marginBottom = '16px';
            identDetails.style.background = 'var(--bg-body)';
            identDetails.style.padding = '12px';
            identDetails.style.borderRadius = 'var(--radius-sm)';

            const partesBase = getGlobalPartes(p.processo) || {};
            const autorStr = partesBase.requerente || 'Não identificado';
            const reuStr = partesBase.requerido || 'Não identificado';
            
            const mkInput = (label, val, placeholder, onChange) => {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.minWidth = '0';
                
                const span = document.createElement('span');
                span.style.color = 'var(--text-muted)';
                span.style.fontSize = '9.5px';
                span.style.letterSpacing = '0.5px';
                span.style.marginBottom = '2px';
                span.textContent = label;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = val;
                input.placeholder = placeholder;
                input.style.background = 'transparent';
                input.style.border = '1px dashed transparent';
                input.style.color = 'var(--text-main)';
                input.style.fontSize = '11.5px';
                input.style.fontWeight = '500';
                input.style.padding = '0 2px';
                input.style.marginLeft = '-2px';
                input.style.outline = 'none';
                input.style.width = '100%';
                input.style.textOverflow = 'ellipsis';
                input.style.borderRadius = '3px';
                input.style.transition = 'all 0.2s';
                
                input.onfocus = () => {
                    input.style.border = '1px dashed var(--accent-color)';
                    input.style.background = 'var(--bg-card)';
                };
                input.onblur = () => {
                    input.style.border = '1px dashed transparent';
                    input.style.background = 'transparent';
                    if (input.value !== val) {
                        onChange(input.value);
                        val = input.value;
                    }
                };

                wrapper.append(span, input);
                return wrapper;
            };

            const tribunalInfo = (p.siglaTribunal || 'N/A') + (p.datajud_uf ? ` (${p.datajud_uf})` : '');
            const classeInfo = p.datajud_classe || '';
            const sistemaInfo = p.datajud_sistema || '';
            const orgaoInfo = p.datajud_orgao || '';
            const grauMap = { 'G1': '1º Grau', 'G2': '2º Grau', 'JE': 'Juizado Especial', 'SUP': 'Superior', 'REsp': 'Recurso Especial' };
            const grauInfo = grauMap[p.datajud_grau] || p.datajud_grau || '';
            const assuntosInfo = (p.datajud_assuntos || []).map(a => a.nome).join('; ') || '';
            let ajuizamentoInfo = '';
            if (p.datajud_ajuizamento) {
                try {
                    const dtAj = new Date(p.datajud_ajuizamento);
                    ajuizamentoInfo = dtAj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                } catch(e) { ajuizamentoInfo = p.datajud_ajuizamento; }
            }

            // Função especial para campos de polo com badge "Meu Cliente" integrado no label
            const mkInputPolo = (label, val, placeholder, poloValue, onChange) => {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.minWidth = '0';

                const labelRow = document.createElement('div');
                labelRow.style.display = 'flex';
                labelRow.style.alignItems = 'center';
                labelRow.style.gap = '6px';
                labelRow.style.marginBottom = '2px';

                const span = document.createElement('span');
                span.style.color = 'var(--text-muted)';
                span.style.fontSize = '9.5px';
                span.style.letterSpacing = '0.5px';
                span.textContent = label;

                const badge = document.createElement('span');
                badge.style.fontSize = '8.5px';
                badge.style.fontWeight = '700';
                badge.style.padding = '1px 6px';
                badge.style.borderRadius = '10px';
                badge.style.cursor = 'pointer';
                badge.style.transition = 'all 0.2s ease';
                badge.style.userSelect = 'none';
                badge.style.whiteSpace = 'nowrap';
                badge.style.lineHeight = '14px';
                badge.title = 'Clique para marcar como meu cliente';

                const isActive = p.meuPolo === poloValue;
                const applyBadgeStyle = (active) => {
                    if (active) {
                        badge.style.background = 'rgba(234, 179, 8, 0.15)';
                        badge.style.color = '#eab308';
                        badge.style.border = '1px solid rgba(234, 179, 8, 0.3)';
                        badge.textContent = '★ Meu Cliente';
                    } else {
                        badge.style.background = 'transparent';
                        badge.style.color = 'var(--text-placeholder)';
                        badge.style.border = '1px solid transparent';
                        badge.textContent = '☆';
                    }
                };
                applyBadgeStyle(isActive);

                badge.addEventListener('mouseenter', () => {
                    if (p.meuPolo !== poloValue) {
                        badge.style.color = 'rgba(234, 179, 8, 0.6)';
                        badge.textContent = '☆ Meu Cliente?';
                    }
                });
                badge.addEventListener('mouseleave', () => {
                    applyBadgeStyle(p.meuPolo === poloValue);
                });

                badge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const otherPolo = poloValue === 'AT' ? 'PA' : 'AT';
                    if (p.meuPolo === poloValue) {
                        p.meuPolo = '';
                    } else {
                        p.meuPolo = poloValue;
                    }
                    savePrazosSalvos();
                    // Atualizar este badge
                    applyBadgeStyle(p.meuPolo === poloValue);
                    // Atualizar o badge do outro polo (se existir no DOM)
                    const otherBadge = identDetails.querySelector(`[data-polo-badge="${otherPolo}"]`);
                    if (otherBadge) {
                        if (p.meuPolo === otherPolo) {
                            otherBadge.style.background = 'rgba(234, 179, 8, 0.15)';
                            otherBadge.style.color = '#eab308';
                            otherBadge.style.border = '1px solid rgba(234, 179, 8, 0.3)';
                            otherBadge.textContent = '★ Meu Cliente';
                        } else {
                            otherBadge.style.background = 'transparent';
                            otherBadge.style.color = 'var(--text-placeholder)';
                            otherBadge.style.border = '1px solid transparent';
                            otherBadge.textContent = '☆';
                        }
                    }
                    // Atualizar borda do wrapper
                    wrapper.style.borderLeft = p.meuPolo === poloValue ? '2px solid #eab308' : '2px solid transparent';
                    wrapper.style.paddingLeft = p.meuPolo === poloValue ? '6px' : '6px';
                    const otherWrapper = identDetails.querySelector(`[data-polo-wrapper="${otherPolo}"]`);
                    if (otherWrapper) {
                        otherWrapper.style.borderLeft = p.meuPolo === otherPolo ? '2px solid #eab308' : '2px solid transparent';
                    }
                });

                badge.setAttribute('data-polo-badge', poloValue);
                wrapper.setAttribute('data-polo-wrapper', poloValue);

                // Borda sutil no wrapper ativo
                wrapper.style.borderLeft = isActive ? '2px solid #eab308' : '2px solid transparent';
                wrapper.style.paddingLeft = '6px';
                wrapper.style.transition = 'border-color 0.2s ease';

                labelRow.append(span, badge);

                const input = document.createElement('input');
                input.type = 'text';
                input.value = val;
                input.placeholder = placeholder;
                input.style.background = 'transparent';
                input.style.border = '1px dashed transparent';
                input.style.color = 'var(--text-main)';
                input.style.fontSize = '11.5px';
                input.style.fontWeight = '500';
                input.style.padding = '0 2px';
                input.style.marginLeft = '-2px';
                input.style.outline = 'none';
                input.style.width = '100%';
                input.style.textOverflow = 'ellipsis';
                input.style.borderRadius = '3px';
                input.style.transition = 'all 0.2s';
                input.onfocus = () => {
                    input.style.border = '1px dashed var(--accent-color)';
                    input.style.background = 'var(--bg-card)';
                };
                input.onblur = () => {
                    input.style.border = '1px dashed transparent';
                    input.style.background = 'transparent';
                    if (input.value !== val) {
                        onChange(input.value);
                        val = input.value;
                    }
                };

                wrapper.append(labelRow, input);
                return wrapper;
            };

            identDetails.append(
                mkInputPolo('Polo Ativo (Autor)', autorStr, 'Não identificado', 'AT', (v) => {
                    const pb = getGlobalPartes(p.processo) || {}; pb.requerente = v; setGlobalPartes(p.processo, pb);
                    p.apelido = `${pb.requerente || 'Autor'} x ${pb.requerido || 'Réu'}`;
                    savePrazosSalvos();
                    name.textContent = p.apelido;
                }),
                mkInputPolo('Polo Passivo (Réu)', reuStr, 'Não identificado', 'PA', (v) => {
                    const pb = getGlobalPartes(p.processo) || {}; pb.requerido = v; setGlobalPartes(p.processo, pb);
                    p.apelido = `${pb.requerente || 'Autor'} x ${pb.requerido || 'Réu'}`;
                    savePrazosSalvos();
                    name.textContent = p.apelido;
                }),
            );

            identDetails.append(
                mkInput('Tribunal / UF', tribunalInfo, 'N/A', (v) => {
                    if (v.includes('(')) {
                        p.siglaTribunal = v.split('(')[0].trim();
                        p.datajud_uf = v.split('(')[1].replace(')', '').trim();
                    } else {
                        p.siglaTribunal = v.trim();
                    }
                    savePrazosSalvos();
                }),
                mkInput('Sistema', sistemaInfo, 'Ex: PJe, eproc...', (v) => {
                    p.datajud_sistema = v;
                    savePrazosSalvos();
                }),
                mkInput('Órgão Julgador', orgaoInfo, 'Ex: 1ª Vara Cível', (v) => {
                    p.datajud_orgao = v;
                    savePrazosSalvos();
                }),
                mkInput('Classe / Objeto', classeInfo, 'Não classificado', (v) => {
                    p.datajud_classe = v;
                    savePrazosSalvos();
                }),
                mkInput('Grau de Jurisdição', grauInfo, 'Ex: 1º Grau', (v) => {
                    p.datajud_grau = v;
                    savePrazosSalvos();
                })
            );

            // Assuntos — campo que pode ter múltiplos valores, exibido em span completo
            const assuntosWrapper = document.createElement('div');
            assuntosWrapper.style.gridColumn = '1 / -1';
            assuntosWrapper.style.display = 'flex';
            assuntosWrapper.style.flexDirection = 'column';
            assuntosWrapper.style.minWidth = '0';
            
            const assuntosLabel = document.createElement('span');
            assuntosLabel.style.color = 'var(--text-muted)';
            assuntosLabel.style.fontSize = '9.5px';
            assuntosLabel.style.letterSpacing = '0.5px';
            assuntosLabel.style.marginBottom = '2px';
            assuntosLabel.textContent = 'Assuntos (TPU)';

            const assuntosInput = document.createElement('input');
            assuntosInput.type = 'text';
            assuntosInput.value = assuntosInfo;
            assuntosInput.placeholder = 'Não identificado';
            assuntosInput.title = assuntosInfo || 'Assuntos do processo conforme TPU';
            assuntosInput.style.border = '1px dashed transparent';
            assuntosInput.style.background = 'transparent';
            assuntosInput.style.color = 'var(--text-main)';
            assuntosInput.style.fontFamily = 'inherit';
            assuntosInput.style.fontSize = '11px';
            assuntosInput.style.padding = '2px 4px';
            assuntosInput.style.borderRadius = '4px';
            assuntosInput.style.width = '100%';
            assuntosInput.style.outline = 'none';
            assuntosInput.onfocus = () => {
                assuntosInput.style.border = '1px dashed var(--border-focus)';
                assuntosInput.style.background = 'var(--bg-sidebar)';
            };
            assuntosInput.onblur = () => {
                assuntosInput.style.border = '1px dashed transparent';
                assuntosInput.style.background = 'transparent';
                // Salvar como array de objetos se editado manualmente
                if (assuntosInput.value !== assuntosInfo) {
                    p.datajud_assuntos = assuntosInput.value.split(';').map(s => ({ codigo: 0, nome: s.trim() })).filter(a => a.nome);
                    savePrazosSalvos();
                }
            };
            assuntosWrapper.append(assuntosLabel, assuntosInput);
            identDetails.appendChild(assuntosWrapper);

            // Badge de Sigilo
            if (p.datajud_sigilo && p.datajud_sigilo > 0) {
                const sigiloWrapper = document.createElement('div');
                sigiloWrapper.style.gridColumn = '1 / -1';
                sigiloWrapper.style.display = 'flex';
                sigiloWrapper.style.alignItems = 'center';
                sigiloWrapper.style.gap = '6px';
                sigiloWrapper.style.padding = '6px 10px';
                sigiloWrapper.style.background = 'rgba(239, 68, 68, 0.08)';
                sigiloWrapper.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                sigiloWrapper.style.borderRadius = 'var(--radius-sm)';
                sigiloWrapper.style.marginTop = '4px';
                const sigiloIcon = document.createElement('span');
                sigiloIcon.textContent = '🔒';
                sigiloIcon.style.fontSize = '13px';
                const sigiloText = document.createElement('span');
                sigiloText.style.fontSize = '10.5px';
                sigiloText.style.color = 'var(--text-main)';
                sigiloText.style.fontWeight = '500';
                const nivelMap = { 1: 'Segredo de Justiça', 2: 'Sigilo Mínimo', 3: 'Sigilo Médio', 4: 'Sigilo Intenso', 5: 'Sigilo Absoluto' };
                sigiloText.textContent = `Nível de Sigilo: ${p.datajud_sigilo} — ${nivelMap[p.datajud_sigilo] || 'Sigiloso'}`;
                sigiloWrapper.append(sigiloIcon, sigiloText);
                identDetails.appendChild(sigiloWrapper);
            }


            // Painel Relações / Incidentes embutido no grid de identificação
            const relContainer = document.createElement('div');
            relContainer.style.gridColumn = '1 / -1'; // Spans both columns
            relContainer.style.marginTop = '4px';
            relContainer.style.paddingTop = '12px';
            relContainer.style.borderTop = '1px dashed var(--border-light)';
            
            const relationsTitle = document.createElement('div');
            relationsTitle.style.display = 'flex';
            relationsTitle.style.justifyContent = 'space-between';
            relationsTitle.style.alignItems = 'center';
            relationsTitle.style.marginBottom = '8px';
            
            const titleText = document.createElement('span');
            titleText.style.fontWeight = '600';
            titleText.style.color = 'var(--text-main)';
            titleText.style.fontSize = '12px';
            titleText.innerHTML = '🔗 Processos Relacionados / Incidentes';
            
            const btnAddRel = document.createElement('button');
            btnAddRel.className = 'btn-pill';
            btnAddRel.style.fontSize = '10px';
            btnAddRel.style.padding = '3px 8px';
            btnAddRel.style.margin = '0';
            btnAddRel.style.border = '1px solid var(--border-light)';
            btnAddRel.style.background = 'transparent';
            btnAddRel.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M6 6v12"></path><path d="M6 12a6 6 0 0 0 6 6h3"></path></svg> Vincular`;
            
            relationsTitle.append(titleText, btnAddRel);

            const inlineForm = document.createElement('div');
            inlineForm.className = 'vinculo-form-inline';
            inlineForm.style.display = 'none';
            inlineForm.style.flexDirection = 'column';
            inlineForm.style.gap = '8px';
            inlineForm.style.marginTop = '8px';
            inlineForm.style.marginBottom = '12px';
            inlineForm.style.padding = '10px';
            inlineForm.style.background = 'var(--bg-card)';
            inlineForm.style.borderRadius = 'var(--radius-md)';
            inlineForm.style.border = '1px solid var(--border-light)';
            inlineForm.style.width = '100%';
            
            inlineForm.innerHTML = `
                <div class="input-group" style="margin-bottom: 4px; position: relative;">
                    <label style="font-size: 11px; margin-bottom: 2px;">Buscar por Apelido ou CNJ</label>
                    <input type="text" class="txt-proc-vinculo-cockpit" placeholder="Buscar por apelido ou CNJ..." maxlength="50" autocomplete="off" style="padding: 6px 10px; min-height: 32px; font-size: 13px;">
                    <div class="vinculo-autocomplete-dropdown cockpit-vinculo-autocomplete" style="display: none;"></div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                    <div class="input-group" style="flex: 1;">
                        <label style="font-size: 11px; margin-bottom: 2px;">Tipo de Vínculo</label>
                        <select class="sel-tipo-vinculo-cockpit" style="padding: 4px 8px; min-height: 32px; font-size: 13px; padding-right: 28px;">
                            <option value="Incidente">Incidente / Apenso</option>
                            <option value="Recurso">Recurso / Agravo</option>
                            <option value="Execução">Cumprimento / Execução</option>
                            <option value="Ação Principal">Ação Principal</option>
                            <option value="Conexão">Conexão / Prevenção</option>
                        </select>
                    </div>
                </div>
                <div style="display: flex; gap: 6px; justify-content: flex-end; margin-top: 4px; width: 100%;">
                    <button class="btn-cancelar-vinculo-cockpit btn-pill" style="font-size: 11px; padding: 4px 10px; margin: 0;">Cancelar</button>
                    <button class="btn-salvar-vinculo-cockpit btn-main" style="font-size: 11px; padding: 4px 10px; width: auto; min-height: auto; margin: 0;">Salvar</button>
                </div>
            `;
            
            btnAddRel.onclick = (e) => {
                e.stopPropagation();
                inlineForm.style.display = inlineForm.style.display === 'none' ? 'flex' : 'none';
                if (inlineForm.style.display === 'flex') {
                    inlineForm.querySelector('.txt-proc-vinculo-cockpit').focus();
                }
            };
            
            inlineForm.querySelector('.btn-cancelar-vinculo-cockpit').onclick = (e) => {
                e.stopPropagation();
                inlineForm.style.display = 'none';
                const dd = inlineForm.querySelector('.cockpit-vinculo-autocomplete');
                if (dd) { dd.style.display = 'none'; dd.replaceChildren(); }
            };

            // Autocomplete por apelido + CNJ no formulário do cockpit
            const cockpitTxtInput = inlineForm.querySelector('.txt-proc-vinculo-cockpit');
            const cockpitAutocomplete = inlineForm.querySelector('.cockpit-vinculo-autocomplete');
            
            if (cockpitTxtInput && cockpitAutocomplete) {
                cockpitTxtInput.addEventListener('input', (e) => {
                    const query = e.target.value.trim().toLowerCase();
                    
                    const vistos = new Set();
                    const matches = Object.keys(prazosSalvos).filter(k => {
                        if (k === key) return false;
                        const outro = prazosSalvos[k];
                        if (!outro || !outro.processo) return false;
                        
                        const cnjNormalizado = String(outro.processo).replace(/\D/g, '');
                        if (vistos.has(cnjNormalizado)) return false;
                        
                        const apelido = (outro.apelido || "").toLowerCase();
                        const proc = cnjNormalizado;
                        const cleanQuery = query.replace(/\D/g, '');
                        
                        const bateu = (apelido.includes(query) || (cleanQuery && proc.includes(cleanQuery)));
                        if (bateu) {
                            vistos.add(cnjNormalizado);
                            return true;
                        }
                        return false;
                    });

                    if (query && matches.length > 0) {
                        cockpitAutocomplete.replaceChildren();
                        matches.slice(0, 5).forEach(k => {
                            const outro = prazosSalvos[k];
                            const div = document.createElement('div');
                            div.className = 'vinculo-autocomplete-item';
                            const apelidoText = outro.apelido ? `<b>${outro.apelido}</b> - ` : '';
                            safeSetInnerHTML(div, `${apelidoText}${outro.processo}`);
                            
                            div.onmousedown = (evt) => {
                                evt.preventDefault();
                                cockpitTxtInput.value = outro.processo;
                                cockpitAutocomplete.style.display = 'none';
                            };
                            cockpitAutocomplete.appendChild(div);
                        });
                        cockpitAutocomplete.style.display = 'block';
                    } else {
                        cockpitAutocomplete.style.display = 'none';
                    }
                });
                
                cockpitTxtInput.addEventListener('blur', () => {
                    setTimeout(() => { if (cockpitAutocomplete) cockpitAutocomplete.style.display = 'none'; }, 200);
                });
            }

            inlineForm.querySelector('.btn-salvar-vinculo-cockpit').onclick = (e) => {
                e.stopPropagation();
                const procVal = inlineForm.querySelector('.txt-proc-vinculo-cockpit').value.trim();
                const tipoVal = inlineForm.querySelector('.sel-tipo-vinculo-cockpit').value;
                if (!procVal) return;
                
                const formatado = formatCNJ(procVal) || procVal;
                
                if (!p.relacoes) p.relacoes = [];
                if (!p.relacoes.includes(formatado)) {
                    p.relacoes.push(formatado);
                    adicionarEventoHistorico(key, 'vinculo', `Vinculado a: ${formatado} (${tipoVal})`);
                    SafeStorage.set({ 'djen_prazos_salvos': JSON.stringify(prazosSalvos) });
                    showToast('Vínculo adicionado!');
                    renderControle();
                } else {
                    showToast('Processo já está vinculado.', '⚠️');
                }
            };

            const relationsList = document.createElement('div');
            relationsList.className = 'cockpit-relations-list';

            if (p.relacoes && p.relacoes.length > 0) {
                p.relacoes.forEach(rel => {
                    // Tentar achar apelido no DB local
                    const procNum = rel.processo || rel;
                    let labelProc = procNum;
                    const cnjClean = String(procNum).replace(/\D/g, '');
                    let foundKey = Object.keys(prazosSalvos).find(k => {
                        const pr = prazosSalvos[k];
                        return pr && pr.processo && String(pr.processo).replace(/\D/g, '') === cnjClean;
                    });
                    
                    if (foundKey && prazosSalvos[foundKey].apelido) {
                        labelProc = `<strong style="color:var(--zen-blue);">${prazosSalvos[foundKey].apelido}</strong> <span style="font-family:ui-monospace, monospace;font-size:10px;">(${procNum})</span>`;
                    } else {
                        labelProc = `<span style="font-family:ui-monospace, monospace;">${procNum}</span>`;
                    }

                    const relItem = document.createElement('div');
                    relItem.className = 'cockpit-relation-item';
                    
                    // Clique para abrir
                    if (foundKey) {
                        relItem.style.cursor = 'pointer';
                        relItem.onclick = (e) => {
                            if (e.target.tagName !== 'BUTTON') {
                                window.processoControleAtivo = foundKey;
                                renderControle();
                            }
                        };
                    }

                    const spanTipo = document.createElement('span');
                    spanTipo.className = 'cockpit-relation-type';
                    spanTipo.textContent = rel.tipo || 'Vínculo'; 
                    
                    const btnRemover = document.createElement('button');
                    btnRemover.className = 'btn-close-focus';
                    btnRemover.innerHTML = '✖';
                    btnRemover.title = 'Remover Vínculo';
                    btnRemover.onclick = (e) => {
                        e.stopPropagation();
                        // Bug Fix #5: Modal customizado — confirm() nativo é bloqueado em Side Panel MV3
                        confirmarAcaoDJEN(
                            `Deseja remover o vínculo com o Processo ${procNum}?`,
                            () => {
                                p.relacoes = p.relacoes.filter(r => r !== rel);
                                adicionarEventoHistorico(key, 'vinculo', `Vínculo removido: ${procNum}`);
                                SafeStorage.set({ 'djen_prazos_salvos': JSON.stringify(prazosSalvos) });
                                renderControle();
                            },
                            'Remover Vínculo'
                        );
                    };

                    const rightSide = document.createElement('div');
                    rightSide.style.display = 'flex';
                    rightSide.style.alignItems = 'center';
                    rightSide.style.gap = '6px';
                    rightSide.append(spanTipo, btnRemover);

                    const leftSide = document.createElement('span');
                    leftSide.innerHTML = labelProc;

                    relItem.append(leftSide, rightSide);
                    relationsList.appendChild(relItem);
                });
            } else {
                relationsList.innerHTML = `<div style="text-align:center; padding:12px; font-size:11px; color:var(--text-muted);">
                    Nenhuma relação de apenso ou incidente cadastrada.<br>
                    Clique em "➕ Vincular" acima para adicionar!
                </div>`;
            }

            relContainer.append(relationsTitle, inlineForm, relationsList);
            identDetails.append(relContainer);

            cardIdentificacao.append(identHeader, identDetails);

            // Sync button e Status movidos / removidos

            // 2. Alerta de Prazo Secundário (Metadata Bar)
            const deadlineAlert = document.createElement('div');
            deadlineAlert.className = 'cockpit-metadata-bar';

            const alertInfo = document.createElement('div');
            alertInfo.className = 'cockpit-alert-info';
            alertInfo.style.flexDirection = 'row';
            alertInfo.style.gap = '8px';
            alertInfo.style.alignItems = 'center';

            const alertLabel = document.createElement('span');
            alertLabel.className = 'cockpit-alert-label';
            alertLabel.textContent = p.cumprido ? 'Prazo Cumprido:' : 'Prazo Fatal:';

            const alertDate = document.createElement('span');
            alertDate.className = 'cockpit-alert-date';
            alertDate.style.fontSize = '12px';
            alertDate.textContent = p.fatal ? p.fatal : 'Sem prazo registrado';

            const alertCountdown = document.createElement('span');
            alertCountdown.className = 'cockpit-alert-countdown';

            if (p.cumprido) {
                deadlineAlert.classList.add('alert-cumprido');
                alertCountdown.textContent = '✓ Arquivado';
            } else if (p.fatal) {
                const hoje = new Date();
                hoje.setHours(12, 0, 0, 0);
                const dt = parseDateBR(p.fatal);
                const diff = Math.ceil((dt - hoje) / (1000 * 3600 * 24));
                
                if (diff < 0) {
                    deadlineAlert.classList.add('alert-critical');
                    alertCountdown.textContent = `⚠️ Vencido há ${Math.abs(diff)} dias`;
                } else if (diff === 0) {
                    deadlineAlert.classList.add('alert-critical');
                    alertCountdown.textContent = '🚨 Vence hoje!';
                } else if (diff === 1) {
                    deadlineAlert.classList.add('alert-critical');
                    alertCountdown.textContent = '⏳ Vence amanhã!';
                } else {
                    const tipoDias = (p.mat === 'Criminal') ? 'corridos' : 'úteis';
                    alertCountdown.textContent = `⏳ ${diff} dias ${tipoDias}`;
                }
            } else {
                alertCountdown.textContent = '';
            }

            alertInfo.append(alertLabel, alertDate, alertCountdown);
            deadlineAlert.append(alertInfo);


            // 3. Grid de Painéis
            // Painel Bloco de Notas / Anotações
            const cardNotes = document.createElement('div');
            cardNotes.className = 'cockpit-card';

            const notesTitle = document.createElement('div');
            notesTitle.className = 'cockpit-card-title';
            notesTitle.innerHTML = '📝 Anotações do Caso';

            const notesTextarea = document.createElement('textarea');
            notesTextarea.className = 'cockpit-notes-textarea';
            notesTextarea.placeholder = 'Escreva notas livremente sobre a estratégia deste caso...';
            notesTextarea.value = p.anotacao || '';

            const notesSavedInd = document.createElement('div');
            notesSavedInd.className = 'cockpit-notes-saved-indicator';
            notesSavedInd.innerHTML = '<span>✅ Notas salvas</span>';

            // Auto-salvamento imediato ao digitar com fallback de salvamento imediato ao perder o foco (blur)
            let notesTimeout;
            const salvarNotasImediato = () => {
                clearTimeout(notesTimeout);
                if (p.anotacao !== notesTextarea.value) {
                    p.anotacao = notesTextarea.value;
                    adicionarEventoHistorico(key, 'nota', 'Anotações processuais atualizadas');
                    SafeStorage.set({ 'djen_prazos_salvos': JSON.stringify(prazosSalvos) });
                    
                    notesSavedInd.style.display = 'inline-flex';
                    setTimeout(() => {
                        notesSavedInd.style.display = 'none';
                    }, 2000);
                }
            };

            notesTextarea.addEventListener('input', () => {
                clearTimeout(notesTimeout);
                notesTimeout = setTimeout(salvarNotasImediato, 800);
            });

            notesTextarea.addEventListener('blur', salvarNotasImediato);

            cardNotes.append(notesTitle, notesTextarea, notesSavedInd);

            // cardRelations foi movido para dentro do identDetails

            // Painel Histórico de Ações Local (Filtrado apenas para Intimações e Prazos)
            const cardTimeline = document.createElement('div');
            cardTimeline.className = 'cockpit-card';

            const timelineTitle = document.createElement('div');
            timelineTitle.className = 'cockpit-card-title';
            timelineTitle.innerHTML = '🕒 Linha do Tempo e Auditoria do Caso';

            const timelineList = document.createElement('div');
            timelineList.className = 'cockpit-timeline-wrapper';

            cardTimeline.append(timelineTitle, timelineList);

            // Popula assincronamente a timeline unificada no cockpit
            setTimeout(() => {
                renderTimeline(p, timelineList, key, true);
            }, 50);

            // Painel Log de Cálculos (Task 14)
            const cardCalculos = document.createElement('div');
            cardCalculos.className = 'cockpit-card';

            const calcTitle = document.createElement('div');
            calcTitle.className = 'cockpit-card-title';
            calcTitle.innerHTML = '🧮 Histórico de Cálculos';

            const calcList = document.createElement('div');
            calcList.className = 'cockpit-relations-list';

            const normalizedProcesso = String(p.processo).replace(/\D/g, '');
            const allCalculations = [];
            for (let k in prazosSalvos) {
                const sp = prazosSalvos[k];
                if (sp && sp.processo && String(sp.processo).replace(/\D/g, '') === normalizedProcesso) {
                    if (sp.historicoAcoes && Array.isArray(sp.historicoAcoes)) {
                        sp.historicoAcoes.forEach(hist => {
                            if (hist.tipo === 'calculo') {
                                allCalculations.push({
                                    date: new Date(hist.data),
                                    text: hist.descricao,
                                    origin: sp.apelido || 'Prazo',
                                    isManual: sp.manual,
                                    cumprido: sp.cumprido || false,
                                    dataCumprimento: sp.dataCumprimento || null
                                });
                            }
                        });
                    }
                }
            }

            allCalculations.sort((a, b) => b.date - a.date);

            if (allCalculations.length > 0) {
                allCalculations.forEach(calc => {
                    const cItem = document.createElement('div');
                    cItem.className = 'cockpit-relation-item';
                    
                    let cumpridoHTML = '';
                    if (calc.cumprido) {
                        let dataCumpFmt = '';
                        if (calc.dataCumprimento) {
                            const dtC = new Date(calc.dataCumprimento);
                            dataCumpFmt = ' em ' + dtC.toLocaleDateString('pt-BR');
                        }
                        cumpridoHTML = ` <span style="font-size: 10px; color: var(--zen-green); font-weight: 600; background: rgba(93,184,114,0.1); border: 1px solid rgba(93,184,114,0.2); border-radius: 4px; padding: 1px 6px; white-space: nowrap;">✅ Cumprido${dataCumpFmt}</span>`;
                    }
                    
                    cItem.innerHTML = `<span style="font-size: 11px; color: var(--text-muted); min-width: 120px;">${calc.date.toLocaleString()}</span>
                                       <strong style="font-size: 12px; flex: 1; color: var(--text-main);">${calc.text}${cumpridoHTML}</strong>
                                       <span class="badge-trib" style="font-size: 9px;">${calc.origin}</span>`;
                    calcList.appendChild(cItem);
                });
            } else {
                const cEmpty = document.createElement('div');
                cEmpty.style.color = 'var(--text-muted)';
                cEmpty.style.fontSize = '12px';
                cEmpty.style.textAlign = 'center';
                cEmpty.style.padding = '8px';
                cEmpty.textContent = 'Nenhum cálculo registrado para este processo.';
                calcList.appendChild(cEmpty);
            }

            cardCalculos.append(calcTitle, calcList);

            cockpit.append(
                header, 
                cardIdentificacao,
                cardNotes, 
                deadlineAlert, 
                cardTimeline, 
                cardCalculos
            );
            vc.appendChild(cockpit);
        }
    }



    const btnOnt = document.getElementById('btnOntem'); if (btnOnt) btnOnt.onclick = () => { const ontem = getLocalDate(1); const ini = document.getElementById('dataInicio'); if (ini) ini.value = ontem; const fim = document.getElementById('dataFim'); if (fim) fim.value = ontem; const bBuscar = document.getElementById('btnBuscar'); if (bBuscar) bBuscar.click(); };
    const btn7d = document.getElementById('btn7DiasBusca'); if (btn7d) btn7d.onclick = () => { setDate(7); const bBuscar = document.getElementById('btnBuscar'); if (bBuscar) bBuscar.click(); };
    const btn15d = document.getElementById('btn15DiasBusca'); if (btn15d) btn15d.onclick = () => { setDate(15); const bBuscar = document.getElementById('btnBuscar'); if (bBuscar) bBuscar.click(); };
    const nOab = document.getElementById('oabNum'); if (nOab) nOab.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const bBuscar = document.getElementById('btnBuscar'); if (bBuscar) bBuscar.click(); } });
    const ufOab = document.getElementById('oabUf'); if (ufOab) ufOab.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const bBuscar = document.getElementById('btnBuscar'); if (bBuscar) bBuscar.click(); } });

    async function fetchComRetry(url, tentativas = 3) {
        let tempoEspera = 2000;

        const urlLimpa = new URL(url);
        urlLimpa.searchParams.append('_t', Date.now());

        for (let i = 0; i < tentativas; i++) {
            try {
                const r = await fetch(urlLimpa.toString());

                if (!r.ok) {
                    throw new Error(`Erro API CNJ (${r.status})`);
                }
                return await r.json();

            } catch (erro) {
                console.debug(`DJEN: Falha na tentativa ${i + 1} de ${tentativas}. URL: ${urlLimpa.toString()}`);

                if (i === tentativas - 1) {
                    throw new Error(`Falha definitiva após ${tentativas} tentativas. Erro: ${erro.message}`);
                }

                await new Promise(resolve => setTimeout(resolve, tempoEspera));
                tempoEspera *= 1.5;
            }
        }
    }

    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
    }

    function updateProgressBar() {
        const el = document.getElementById('progressWrapper'); if (!el) return;
        if (!resultadosExibidos || resultadosExibidos.length === 0) { el.style.display = 'none'; return; }
        el.style.display = 'block'; let total = resultadosExibidos.length; let processados = 0;
        resultadosExibidos.forEach(i => { const txt = cleanText(i.texto || i.teor); const proc = formatCNJ(getProc(i, txt)); const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, ''); if (publicacoesLidas.has(itemKey) || (prazosSalvos[itemKey] && prazosSalvos[itemKey].fatal)) processados++; });
        const pct = (processados / total) * 100; const pf = document.getElementById('progressFill'); if (pf) pf.style.width = `${pct}%`; const pt = document.getElementById('progressText'); if (pt) pt.textContent = `${processados} de ${total} publicações triadas`;
    }
    // filtroApenasNaoLidos em state_manager


    const filtroRapidoEl = document.getElementById('filtroRapido');
    if (filtroRapidoEl) { filtroRapidoEl.addEventListener('input', debounce(applyFilters, 300)); }

    const fb = document.getElementById('filtroTribunal');
    if (fb) fb.onchange = applyFilters;

    // Toggle "Apenas não lidos" (#6)
    const btnNaoLidos = document.getElementById('btnFiltroApenasNaoLidos');
    if (btnNaoLidos) {
        btnNaoLidos.addEventListener('click', () => {
            window.filtroApenasNaoLidos = !filtroApenasNaoLidos;
            btnNaoLidos.style.background = filtroApenasNaoLidos ? 'var(--primary)' : 'var(--bg-body)';
            btnNaoLidos.style.color = filtroApenasNaoLidos ? 'var(--primary-text)' : 'var(--text-muted)';
            btnNaoLidos.style.borderColor = filtroApenasNaoLidos ? 'var(--primary)' : 'var(--border-light)';
            applyFilters();
        });
    }

    // Welcome tips rotativas + lupa animada (#3)
    (function initWelcomeTips() {
        const tips = [
            'Informe a OAB ou número do processo e clique em buscar.',
            'Você pode colar um número de processo com ou sem pontos — o DJEN formata automaticamente.',
            'Selecione texto dentro de uma publicação para criar uma #tag automática.',
            'Use ESC para fechar painéis e Modo Foco. Use Enter para expandir um card.',
            'A calculadora detecta feriados municipais automaticamente. Informe a comarca para maior precisão.',
            'Vá em Menu › Identidade do Escritório para personalizar seus relatórios PDF.',
            'Use Ctrl+click (ou o botão 📑) para comparar várias publicações do mesmo processo.',
        ];
        let tipIdx = 0;
        const tipEl = document.getElementById('welcomeTipText');
        const btnUltima = document.getElementById('btnWelcomeUltimaBusca');

        if (!tipEl) return;

        // CSS animation para a lupa
        const styleTag = document.createElement('style');
        styleTag.textContent = `@keyframes welcomeLupaFloat { 0%,100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-6px) rotate(5deg); } }`;
        document.head.appendChild(styleTag);

        function showTip(idx) {
            tipEl.style.opacity = '0';
            setTimeout(() => {
                tipEl.textContent = tips[idx % tips.length];
                tipEl.style.opacity = '1';
            }, 400);
        }
        showTip(0);
        setInterval(() => { tipIdx = (tipIdx + 1) % tips.length; showTip(tipIdx); }, 5000);

        // Mostrar botão última busca se houver histórico
        SafeStorage.get(['djen_historico_buscas'], data => {
            try {
                const hist = JSON.parse(data.djen_historico_buscas || '[]');
                if (hist.length > 0 && btnUltima) btnUltima.style.display = 'block';
            } catch(e) {}
        });
    })();

    // ==========================================
    // AUTOCOMPLETE DOS CAMPOS DE BUSCA
    // ==========================================
    function configurarAutocomplete(inputId, dropdownId, tipoBusca) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        input.addEventListener('input', () => {
            const valorDigitado = input.value.trim().toLowerCase();
            if (!valorDigitado) {
                dropdown.classList.remove('show');
                return;
            }

            let sugestoes = [];
            
            if (tipoBusca === 'proc') {
                const deHistorico = window.historicoBuscas.filter(h =>
                    h.tipo === 'proc' && h.valor.toLowerCase().includes(valorDigitado)
                );
                
                const deSalvos = [];
                for (const key in prazosSalvos) {
                    const p = prazosSalvos[key];
                    if (p && p.processo) {
                        const procLimpo = p.processo.toLowerCase();
                        const apelidoLimpo = (p.apelido || '').toLowerCase();
                        if (procLimpo.includes(valorDigitado) || apelidoLimpo.includes(valorDigitado)) {
                            if (!deHistorico.some(h => h.valor === p.processo) && !deSalvos.some(s => s.valor === p.processo)) {
                                deSalvos.push({
                                    tipo: 'proc',
                                    valor: p.processo,
                                    apelido: p.apelido
                                });
                            }
                        }
                    }
                }
                sugestoes = deHistorico.concat(deSalvos).slice(0, 5);
            } else {
                sugestoes = window.historicoBuscas.filter(h =>
                    h.tipo === tipoBusca && h.valor.toLowerCase().includes(valorDigitado)
                ).slice(0, 5);
            }

            if (sugestoes.length > 0) {
                dropdown.replaceChildren();
                sugestoes.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    
                    if (tipoBusca === 'oab' && s.uf) {
                        item.textContent = `${s.valor} (${s.uf.toUpperCase()})`;
                    } else if (tipoBusca === 'proc' && s.apelido) {
                        item.textContent = `${s.apelido} (${formatCNJ(s.valor)})`;
                    } else {
                        item.textContent = formatCNJ(s.valor);
                    }

                    // onmousedown garante que o clique é registado antes do input perder o focus (blur)
                    item.onmousedown = (e) => {
                        e.preventDefault();
                        input.value = formatCNJ(s.valor);
                        if (tipoBusca === 'oab' && s.uf) {
                            const ufInput = document.getElementById('oabUf');
                            if (ufInput) {
                                ufInput.value = s.uf;
                                ufInput.dispatchEvent(new Event('change'));
                            }
                        }
                        dropdown.classList.remove('show');
                        input.dispatchEvent(new Event('input'));
                        input.dispatchEvent(new Event('change'));
                    };
                    dropdown.appendChild(item);
                });
                dropdown.classList.add('show');
            } else {
                dropdown.classList.remove('show');
            }
        });

        // Esconde a lista se o utilizador clicar fora do campo
        input.addEventListener('blur', () => { dropdown.classList.remove('show'); });
        // Reabre a lista se o utilizador voltar a clicar no campo
        input.addEventListener('focus', () => { input.dispatchEvent(new Event('input')); });

        if (inputId === 'oabNum') {
            const preencherUfPorHistorico = () => {
                const val = input.value.trim();
                const match = window.historicoBuscas.find(h => h.tipo === 'oab' && h.valor === val);
                if (match && match.uf) {
                    const ufInput = document.getElementById('oabUf');
                    if (ufInput) {
                        ufInput.value = match.uf;
                        ufInput.dispatchEvent(new Event('change'));
                    }
                }
            };
            input.addEventListener('change', preencherUfPorHistorico);
            input.addEventListener('input', preencherUfPorHistorico);
        }
    }

    configurarAutocomplete('oabNum', 'dropdownOab', 'oab');
    configurarAutocomplete('procNumBusca', 'dropdownProc', 'proc');

    function atualizarVisibilidadeCamposIA() {
        const providerSelect = document.getElementById('selectIaProvider');
        if (!providerSelect) return;
        const val = providerSelect.value;

        const groupKey = document.getElementById('groupIaApiKey');
        const groupEndpoint = document.getElementById('groupIaEndpoint');
        const inputModel = document.getElementById('inputIaModel');

        if (val === 'chrome_ai') {
            if (groupKey) groupKey.style.display = 'none';
            if (groupEndpoint) groupEndpoint.style.display = 'none';
            if (inputModel) inputModel.value = 'Gemini Nano (Built-in)';
        } else if (val === 'gemini') {
            if (groupKey) groupKey.style.display = 'block';
            if (groupEndpoint) groupEndpoint.style.display = 'none';
            if (inputModel && (!inputModel.value.trim() || inputModel.value === 'gpt-4o-mini' || inputModel.value === 'llama3' || inputModel.value === 'Gemini Nano (Built-in)')) inputModel.value = 'gemini-3.6-flash';
        } else if (val === 'openai') {
            if (groupKey) groupKey.style.display = 'block';
            if (groupEndpoint) groupEndpoint.style.display = 'none';
            if (inputModel && (!inputModel.value.trim() || inputModel.value === 'gemini-3.6-flash' || inputModel.value === 'llama3' || inputModel.value === 'Gemini Nano (Built-in)')) inputModel.value = 'gpt-4o-mini';
        } else if (val === 'ollama') {
            if (groupKey) groupKey.style.display = 'none';
            if (groupEndpoint) groupEndpoint.style.display = 'block';
            const endInput = document.getElementById('inputIaEndpoint');
            if (endInput && !endInput.value.trim()) endInput.value = 'http://localhost:11434/v1/chat/completions';
            if (inputModel && (!inputModel.value.trim() || inputModel.value === 'gemini-3.6-flash' || inputModel.value === 'gpt-4o-mini' || inputModel.value === 'Gemini Nano (Built-in)')) inputModel.value = 'llama3';
        } else if (val === 'custom') {
            if (groupKey) groupKey.style.display = 'block';
            if (groupEndpoint) groupEndpoint.style.display = 'block';
            const endInput = document.getElementById('inputIaEndpoint');
            if (endInput && !endInput.value.trim()) endInput.value = 'https://api.openai.com/v1/chat/completions';
        }
    }

    document.addEventListener('change', (e) => {
        if (e.target.id === 'selectIaProvider') {
            atualizarVisibilidadeCamposIA();
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target.id === 'menuSearchInput') {
            const query = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const buttons = document.querySelectorAll('#headerDropdown button');
            const groups = document.querySelectorAll('#headerDropdown .menu-group');

            buttons.forEach(btn => {
                if (btn.id === 'btnToggleTheme') {
                    const txt = (btn.textContent + " " + (btn.getAttribute('aria-label') || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const matches = txt.includes(query);
                    btn.style.display = matches ? 'flex' : 'none';
                    return;
                }
                const text = (btn.textContent + " " + (btn.getAttribute('aria-label') || "")).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const matches = text.includes(query);
                btn.style.display = matches ? 'flex' : 'none';
            });

            groups.forEach(group => {
                const visibleButtons = group.querySelectorAll('button:not([style*="display: none"])');
                if (visibleButtons.length === 0) {
                    group.style.display = 'none';
                } else {
                    group.style.display = 'flex';
                }
            });
        }
    });

    
    function abrirGoogleCalendar(item) {
        if (!item || !item.fatal) { showToast("Prazo fatal não calculado.", "⚠️"); return; }
        const parseBrToDate = (brDateStr) => { const p = brDateStr.split('/'); if(p.length===3) return new Date(p[2], p[1]-1, p[0]); return new Date(); };
        const dataInic = parseBrToDate(item.fatal);
        const dataFim = new Date(dataInic);
        dataFim.setDate(dataFim.getDate() + 1); // Evento de dia inteiro no GCal precisa que o FIM seja no dia seguinte
        
        const pad = (n) => String(n).padStart(2, '0');
        const dateYmdInic = `${dataInic.getFullYear()}${pad(dataInic.getMonth()+1)}${pad(dataInic.getDate())}`;
        const dateYmdFim = `${dataFim.getFullYear()}${pad(dataFim.getMonth()+1)}${pad(dataFim.getDate())}`;

        const processo = item.processo || "Processo s/ número";
        const apelido = item.apelido || (typeof getGlobalApelido === 'function' ? getGlobalApelido(item.processo) : "") || "";
        const anotacao = item.anotacao || "";
        const tribunal = item.siglaTribunal || "";
        const textoCompleto = item.textoCompleto || item.teor || "";
        const sistema = item.datajud_sistema || (typeof inferirSistemaDoProcesso === 'function' ? inferirSistemaDoProcesso(item.processo, tribunal, textoCompleto) : "") || "";

        const summary = `Prazo: ${processo}${apelido ? ' (' + apelido + ')' : ''}`;
        let notasFormatadas = anotacao ? `==== ANOTAÇÕES / TAREFAS ====\n${anotacao}\n\n` : "";
        const cleanDesc = notasFormatadas + `==== DADOS DO PROCESSO ====\nProcesso: ${processo}\n` + (apelido ? `Apelido: ${apelido}\n` : '') + (tribunal ? `Tribunal: ${tribunal}\n` : '') + (sistema ? `Sistema: ${sistema}\n\n` : '\n') + `==== PUBLICAÇÃO ====\n` + (textoCompleto ? textoCompleto : 'Sem texto disponível.');

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(summary)}&dates=${dateYmdInic}/${dateYmdFim}&details=${encodeURIComponent(cleanDesc)}`;
        window.open(url, '_blank');
        showToast("Abrindo no Google Agenda...", "🗓️");
    }
    window.abrirGoogleCalendar = abrirGoogleCalendar;

    function exportarIcsPrazo(item) {
        if (!item || !item.fatal) { showToast("Prazo fatal não calculado.", "⚠️"); return; }
        const parseBrToYmd = (brDateStr) => { const parts = brDateStr.split('/'); if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`; return brDateStr.replace(/\D/g, ''); };
        const dateYmd = parseBrToYmd(item.fatal);
        const uid = 'djen_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const processo = item.processo || "Processo s/ número";
        const apelido = item.apelido || (typeof getGlobalApelido === 'function' ? getGlobalApelido(item.processo) : "") || "";
        const anotacao = item.anotacao || "";
        const tribunal = item.siglaTribunal || "";
        const textoCompleto = item.textoCompleto || item.teor || "";
        const sistema = item.datajud_sistema || (typeof inferirSistemaDoProcesso === 'function' ? inferirSistemaDoProcesso(item.processo, tribunal, textoCompleto) : "") || "";

        const summary = `Prazo: ${processo}${apelido ? ' (' + apelido + ')' : ''}`;
        let notasFormatadas = anotacao ? `==== ANOTAÇÕES / TAREFAS ====\n${anotacao}\n\n` : "";
        const cleanDesc = notasFormatadas + `==== DADOS DO PROCESSO ====\nProcesso: ${processo}\n` + (apelido ? `Apelido: ${apelido}\n` : '') + (tribunal ? `Tribunal: ${tribunal}\n` : '') + (sistema ? `Sistema: ${sistema}\n\n` : '\n') + `==== PUBLICAÇÃO ====\n` + (textoCompleto ? textoCompleto : 'Sem texto disponível.');
        const escapeIcs = (str) => String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').replace(/\r/g, '');

        const icsContent = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Buscador DJEN//Intimacoes e Prazos//PT',
            'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtStamp}`, `DTSTART;VALUE=DATE:${dateYmd}`, `SUMMARY:${escapeIcs(summary)}`, `DESCRIPTION:${escapeIcs(cleanDesc)}`,
            'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:Lembrete: ${escapeIcs(summary)}`, 'END:VALARM',
            'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:Lembrete Urgente: ${escapeIcs(summary)}`, 'END:VALARM',
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Prazo_${processo.replace(/\D/g, '') || 'Evento'}.ics`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
        showToast("Arquivo ICS exportado!", "📅");
    }

    function exportarIcsLote() {
        const parseBrToYmd = (brDateStr) => { const parts = brDateStr.split('/'); if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`; return brDateStr.replace(/\D/g, ''); };
        const escapeIcs = (str) => String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').replace(/\r/g, '');
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        let vEvents = []; let count = 0;

        for (let key in prazosSalvos) {
            const item = prazosSalvos[key];
            if (!item || !item.fatal || item.cumprido) continue;

            const dateYmd = parseBrToYmd(item.fatal);
            const uid = 'djen_lote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + count;
            const processo = item.processo || "Processo s/ número";
            const apelido = item.apelido || (typeof getGlobalApelido === 'function' ? getGlobalApelido(item.processo) : "") || "";
            const anotacao = item.anotacao || "";
            const tribunal = item.siglaTribunal || "";
            const textoCompleto = item.textoCompleto || item.teor || "";
            const sistema = item.datajud_sistema || (typeof inferirSistemaDoProcesso === 'function' ? inferirSistemaDoProcesso(item.processo, tribunal, textoCompleto) : "") || "";

            const summary = `Prazo: ${processo}${apelido ? ' (' + apelido + ')' : ''}`;
            let notasFormatadas = anotacao ? `==== ANOTAÇÕES / TAREFAS ====\n${anotacao}\n\n` : "";
            const cleanDesc = notasFormatadas + `==== DADOS DO PROCESSO ====\nProcesso: ${processo}\n` + (apelido ? `Apelido: ${apelido}\n` : '') + (tribunal ? `Tribunal: ${tribunal}\n` : '') + (sistema ? `Sistema: ${sistema}\n\n` : '\n') + `==== PUBLICAÇÃO ====\n` + (textoCompleto ? textoCompleto : 'Sem texto disponível.');

            vEvents.push(
                'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${dtStamp}`, `DTSTART;VALUE=DATE:${dateYmd}`, `SUMMARY:${escapeIcs(summary)}`, `DESCRIPTION:${escapeIcs(cleanDesc)}`,
                'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:Lembrete: ${escapeIcs(summary)}`, 'END:VALARM',
                'END:VEVENT'
            );
            count++;
        }

        if (count === 0) { showToast("Nenhum prazo ativo calculado para exportar.", "⚠️"); return; }
        const icsContent = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Buscador DJEN//Intimacoes e Prazos//PT', ...vEvents, 'END:VCALENDAR'].join('\r\n');
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Prazos_DJEN_Lote.ics`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        showToast(`Exportados ${count} prazos para o calendário (.ics)!`, "✅");
    }

    function exportarIcsTarefa(item) {
        if (!item || !item.fatal) { showToast("Prazo fatal não calculado.", "⚠️"); return; }
        const parseBrToYmd = (brDateStr) => { const parts = brDateStr.split('/'); if (parts.length === 3) return `${parts[2]}${parts[1]}${parts[0]}`; return brDateStr.replace(/\D/g, ''); };
        const dateYmd = parseBrToYmd(item.fatal);
        const uid = 'djen_todo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const processo = item.processo || "Processo s/ número";
        const apelido = item.apelido || (typeof getGlobalApelido === 'function' ? getGlobalApelido(item.processo) : "") || "";
        const anotacao = item.anotacao || "";
        const tribunal = item.siglaTribunal || "";
        const textoCompleto = item.textoCompleto || item.teor || "";
        const sistema = item.datajud_sistema || (typeof inferirSistemaDoProcesso === 'function' ? inferirSistemaDoProcesso(item.processo, tribunal, textoCompleto) : "") || "";

        const summary = `Tarefa: ${processo}${apelido ? ' (' + apelido + ')' : ''}`;
        let notasFormatadas = anotacao ? `==== ANOTAÇÕES / TAREFAS ====\n${anotacao}\n\n` : "";
        const cleanDesc = notasFormatadas + `==== DADOS DO PROCESSO ====\nProcesso: ${processo}\n` + (apelido ? `Apelido: ${apelido}\n` : '') + (tribunal ? `Tribunal: ${tribunal}\n` : '') + (sistema ? `Sistema: ${sistema}\n\n` : '\n') + `==== PUBLICAÇÃO ====\n` + (textoCompleto ? textoCompleto : 'Sem texto disponível.');
        const escapeIcs = (str) => String(str).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n').replace(/\r/g, '');

        const icsContent = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Buscador DJEN//Intimacoes e Prazos//PT',
            'BEGIN:VTODO', `UID:${uid}`, `DTSTAMP:${dtStamp}`, `DUE;VALUE=DATE:${dateYmd}`, `SUMMARY:${escapeIcs(summary)}`, `DESCRIPTION:${escapeIcs(cleanDesc)}`,
            'STATUS:NEEDS-ACTION', 'PRIORITY:1',
            'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:Tarefa Urgente: ${escapeIcs(summary)}`, 'END:VALARM',
            'END:VTODO', 'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
        const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Tarefa_${processo.replace(/\D/g, '') || 'Evento'}.ics`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
        showToast("Tarefa (VTODO) exportada com sucesso!", "✅");
    }


    function exportarTodasTarefasLote() {
        const itens = Object.values(prazosSalvos).filter(item => item && item.fatal);
        if (itens.length === 0) {
            showToast("Nenhum prazo calculado/salvo para exportar.", "⚠️");
            return;
        }

        const parseBrToYmd = (brDateStr) => {
            const parts = brDateStr.split('/');
            if (parts.length === 3) {
                return `${parts[2]}${parts[1]}${parts[0]}`;
            }
            return brDateStr.replace(/\D/g, '');
        };

        const agora = new Date();
        const dtStamp = agora.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const escapeIcs = (str) => {
            if (!str) return "";
            return String(str).replace(/\\/g, '\\\\')
                              .replace(/;/g, '\\;')
                              .replace(/,/g, '\\,')
                              .replace(/\n/g, '\\n')
                              .replace(/\r/g, '');
        };

        const vtodoBlocks = [];
        itens.forEach((item, index) => {
            const dateYmd = parseBrToYmd(item.fatal);
            const uid = 'djen_todo_lote_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substr(2, 9);
            const processo = item.processo || "Processo s/ número";
            const apelido = item.apelido || getGlobalApelido(item.processo) || "";
            const anotacao = item.anotacao || "";
            const tribunal = item.siglaTribunal || "";
            const textoCompleto = item.textoCompleto || item.teor || "";

            const summary = `Prazo: ${processo}${apelido ? ' (' + apelido + ')' : ''}`;

            const cleanDesc = String(anotacao ? 'Notas: ' + anotacao + '\n\n' : '') +
                              String(tribunal ? 'Tribunal: ' + tribunal + '\n' : '') +
                              String(textoCompleto ? 'Publicação:\n' + textoCompleto : '');

            vtodoBlocks.push(
                'BEGIN:VTODO',
                `UID:${uid}`,
                `DTSTAMP:${dtStamp}`,
                `DUE;VALUE=DATE:${dateYmd}`,
                `SUMMARY:${escapeIcs(summary)}`,
                `DESCRIPTION:${escapeIcs(cleanDesc)}`,
                'STATUS:NEEDS-ACTION',
                'END:VTODO'
            );
        });

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Buscador DJEN//Tarefas Lote//PT',
            ...vtodoBlocks,
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `Prazos_Tarefas_Lote_${agora.toISOString().split('T')[0]}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`${itens.length} tarefas exportadas em lote!`, "✅");
    }

    async function exportarTasksLote(itens) {
        if (!window.GoogleTasksService) {
            showToast("Serviço Google Tasks indisponível.", "❌");
            return;
        }
        // Filtra os itens para ignorar os já concluídos/cumpridos
        const pendentes = itens.filter(item => item && item.fatal && item.cumprido !== true && item.cumprido !== "true");
        if (pendentes.length === 0) {
            showToast("Nenhum prazo pendente (não concluído) encontrado para exportar.", "⚠️");
            return;
        }

        let sucesso = 0;
        let erros = 0;
        
        showToast(`Iniciando exportação de ${pendentes.length} tarefas...`, "⏳");

        for (const item of pendentes) {
            try {
                let prazoParaTasks = Object.assign({}, item.prazoCalculado || item);
                if (item.processo) prazoParaTasks.processo = item.processo;
                if (item.teor && !prazoParaTasks.textoCompleto) prazoParaTasks.textoCompleto = item.teor;
                if (item.anotacao && !prazoParaTasks.anotacao) prazoParaTasks.anotacao = item.anotacao;
                
                await window.GoogleTasksService.exportarPrazoParaTasks(prazoParaTasks);
                sucesso++;
            } catch (err) {
                if (err.message !== 'CONFIG_WEBHOOK_URL_REQUIRED') {
                    console.error("[GoogleTasksLote] Erro ao exportar prazo:", item, err);
                }
                erros++;
                if (err.message === 'CONFIG_WEBHOOK_URL_REQUIRED') {
                    showToast("Informe a URL do Web App nas configurações do Google Tasks.", "⚠️");
                    document.getElementById('agendaModal')?.classList.add('show');
                    return;
                }
                if (err.message.includes("Não autenticado")) {
                    showToast("Por favor, conecte sua conta Google primeiro.", "⚠️");
                    return;
                }
            }
        }

        if (erros > 0) {
            showToast(`${sucesso} exportadas. ${erros} falharam.`, "⚠️");
        } else {
            showToast(`Todas as ${sucesso} tarefas foram exportadas para o Google Tasks!`, "☑️");
        }
    }

    function atualizarListaSuspensoes() {
        const lista = document.getElementById('listaSuspensoes');
        if (!lista) return;
        lista.replaceChildren();
        if (customSuspensions.length === 0) {
            lista.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 12px 0; width: 100%;">Nenhuma suspensão cadastrada.</div>';
            return;
        }

        customSuspensions.forEach((susp, index) => {
            const item = document.createElement('div');
            item.className = 'suspension-item';

            const info = document.createElement('div');
            info.className = 'suspension-info';

            const title = document.createElement('strong');
            title.className = 'suspension-title';
            title.textContent = susp.desc || "Suspensão";

            const dates = document.createElement('span');
            dates.className = 'suspension-dates';

            const formatBr = (dateStr) => {
                const parts = dateStr.split('-');
                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                return dateStr;
            };

            dates.textContent = `${formatBr(susp.start)} a ${formatBr(susp.end)}`;

            info.appendChild(title);
            info.appendChild(dates);

            const btnDel = document.createElement('button');
            btnDel.className = 'btn-clean-summary';
            btnDel.style.fontSize = '16px';
            btnDel.innerHTML = '&times;';
            btnDel.title = 'Excluir suspensão';
            btnDel.onclick = (e) => {
                e.stopPropagation();
                customSuspensions.splice(index, 1);
                SafeStorage.set({ 'djen_suspensoes_custom': customSuspensions });
                atualizarListaSuspensoes();
                showToast("Suspensão removida!", "🗑️");
            };

            item.appendChild(info);
            item.appendChild(btnDel);
            lista.appendChild(item);
        });
    }

    async function recalcularTodosOsPrazos() {
        const keys = Object.keys(prazosSalvos);
        if (keys.length === 0) {
            showToast("Nenhum prazo salvo para recalcular.", "⚠️");
            return;
        }

        showToast("Recalculando prazos...", "⏳");
        let houveAlteracao = false;

        for (const key of keys) {
            const p = prazosSalvos[key];
            if (p && p.pubOrig && p.dias) {
                try {
                    const anoCalculo = new Date(p.pubOrig + 'T15:00:00').getFullYear();
                    const [feriadosTribunal, feriadosMunisDinamicos] = await Promise.all([
                        buscarFeriadosTribunal(p.siglaTribunal),
                        buscarFeriadosMunicipaisAnual(anoCalculo, p.uf, p.mun)
                    ]);

                    const res = MotorDePrazos.calcular({
                        pubEscolhida: p.pubOrig,
                        dias: p.dias,
                        tipo: p.mat === 'Criminal' ? 'cpp' : 'cpc',
                        direcao: p.direcao || 'futuro',
                        ufCalc: p.uf,
                        munCalc: p.mun,
                        feriadosTribunal,
                        feriadosMunisDinamicos,
                        tipoData: p.tipoData || 'dje'
                    });

                    if (p.fatal !== res.fatal) {
                        p.fatal = res.fatal;
                        p.pub = res.pub;
                        p.disp = res.disp;
                        p.inicio = res.inicio;
                        p.timeline = res.timeline;
                        p.feriados = res.feriados;
                        p.prorrogado = res.prorrogado;
                        p.temFeriadoMunicipal = res.temFeriadoMunicipal;
                        houveAlteracao = true;
                        adicionarEventoHistorico(key, 'calculo', `Prazo fatal recalculado devido a suspensões customizadas: ${res.fatal}`);
                    }
                } catch (e) {
                    console.error("Erro ao recalcular prazo:", key, e);
                }
            }
        }

        if (houveAlteracao) {
            savePrazosSalvos();
            renderAgenda();
            renderCalendar();
            showToast("Prazos recalculados e atualizados!", "✨");
        } else {
            showToast("Nenhum prazo foi alterado.", "ℹ️");
        }
    }

    // Expose helpers globally for other modules (like js/export_service.js)
    globalThis.getProc = getProc;
    globalThis.cleanText = cleanText;
    globalThis.formatCNJ = formatCNJ;
    globalThis.parseDateBR = parseDateBR;

});



document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            document.activeElement.blur();
            return;
        }

        let algoFechado = false;

        const focusOverlay = document.getElementById('focusModeOverlay');
        if (focusOverlay && focusOverlay.classList.contains('show')) {
            fecharModoFoco();
            algoFechado = true;
        }

        const overlays = document.querySelectorAll('.modal-overlay.show');
        if (overlays.length > 0) {
            overlays.forEach(o => o.classList.remove('show'));
            algoFechado = true;
        }
        if (algoFechado) return;

        const dropdowns = document.querySelectorAll('.card-dropdown.show, #headerDropdown.show');
        if (dropdowns.length > 0) {
            dropdowns.forEach(d => d.classList.remove('show'));
            algoFechado = true;
        }
        if (algoFechado) return;

        const calcsAbertas = document.querySelectorAll('.calculadora-prazo.ativa');
        if (calcsAbertas.length > 0) {
            calcsAbertas.forEach(calc => {
                calc.classList.remove('ativa');
                calc.querySelectorAll('.calc-acoes-iniciais, .calc-inputs-container').forEach(el => el.style.display = 'flex');
                calc.querySelectorAll('.calc-acoes-finais, .calc-result-box, .calc-preview, .calc-acoes-pos-salvo').forEach(el => el.style.display = 'none');
            });
            algoFechado = true;
        }
        if (algoFechado) return;

        const cardsAbertos = document.querySelectorAll('.intimacao-card.aberto, .intimacao-card.so-historico');
        if (cardsAbertos.length > 0) {
            cardsAbertos.forEach(card => {
                // If closing a so-historico card, make sure to remove the class and hide the wrapper
                if (card.classList.contains('so-historico')) {
                    card.classList.remove('so-historico');
                    const tw = card.querySelector('.timeline-wrapper');
                    if (tw) tw.style.display = 'none';
                    const bh = card.querySelector('.btn-historico-header');
                    if (bh) bh.classList.remove('active');
                }
                const clickArea = card.querySelector('.card-click-area');
                if (clickArea) clickArea.click();
            });
            
            // Pop from history stack if we are navigating back
            if (window.historicoNavegacaoStack && window.historicoNavegacaoStack.length > 0) {
                const prev = window.historicoNavegacaoStack.pop();
                if (prev) {
                    if (prev.aba && typeof window.mudarParaAba === 'function') {
                        window.mudarParaAba(prev.aba);
                    }
                    if (prev.filtro && typeof window.restaurarFiltroStack === 'function') {
                        window.restaurarFiltroStack(prev.filtro);
                    }
                    setTimeout(() => {
                        const preferBusca = prev.aba === 'busca';
                        if (typeof window.focarCardProcesso === 'function') {
                            window.focarCardProcesso(prev.key, preferBusca, true);
                        }
                    }, 50);
                }
            }
            algoFechado = true;
        }
        if (algoFechado) return;

        const threadsAbertas = document.querySelectorAll('.intimacao-card.thread-aberta');
        if (threadsAbertas.length > 0) {
            threadsAbertas.forEach(card => {
                card.classList.remove('thread-aberta');
                const btn = card.querySelector('.thread-toggle-pill');
                if (btn) btn.classList.remove('aberto');
                const container = card.querySelector('.thread-container');
                if (container) container.style.display = 'none';
            });
            algoFechado = true;
        }
    }
});

let filtroAtivoGlobal = null;

function gerarBriefingDiario(items, radarPalavras, fnCleanText) {
    const dashAntigo = document.getElementById('dashboard-matinal');
    if (dashAntigo) dashAntigo.remove();

    if (!items || items.length === 0) return;

    let contagemRadar = {};

    if (radarPalavras && radarPalavras.length > 0) {
        items.forEach(item => {
            let textoBruto = item.prazoCalculado ? (item.prazoCalculado.textoCompleto || item.texto || item.teor) : (item.texto || item.teor);
            let txt = fnCleanText ? fnCleanText(textoBruto).toLowerCase() : String(textoBruto).toLowerCase();
            let palavrasNesteCartao = new Set();

            radarPalavras.forEach(palavra => {
                if (palavra.length < 3) return;
                const txtNorm = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const palNorm = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                if (txtNorm.includes(palNorm)) palavrasNesteCartao.add(palavra);
            });

            palavrasNesteCartao.forEach(p => {
                contagemRadar[p] = (contagemRadar[p] || 0) + 1;
            });
        });
    }

    let topTags = Object.keys(contagemRadar)
        .map(k => ({ palavra: k, total: contagemRadar[k] }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);

    const cr = document.getElementById('contadorResultados');
    if (cr) {
        if (topTags.length === 0) {
            safeSetInnerHTML(cr, `${items.length} resultados <span style="font-size: 11px; color: var(--text-placeholder); margin-left: 8px; font-weight: 500; text-transform: none;">(Lote limpo: sem gatilhos do Radar)</span>`);;
            return;
        } else {
            safeSetInnerHTML(cr, `${items.length} resultados <span class="tooltip-right tooltip-bottom" data-tooltip="Mostrando os 3 termos mais urgentes detectados no lote" style="cursor:help; font-size: 11px; color: var(--zen-blue); margin-left: 8px; font-weight: 500; text-transform: none;">(Filtros: Top 3 do Radar)</span>`);;
        }
    }

    const dashContainer = document.createElement('div');
    dashContainer.id = 'dashboard-matinal';
    dashContainer.className = 'dashboard-briefing';

    dashContainer.style.opacity = '0';
    dashContainer.style.transform = 'translateY(-10px)';
    dashContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    setTimeout(() => {
        dashContainer.style.opacity = '1';
        dashContainer.style.transform = 'translateY(0)';
    }, 10);

    topTags.forEach(tag => {
        let chip = document.createElement('div');
        chip.className = 'chip-filtro';
        chip.title = `Filtrar publicações contendo a palavra "${tag.palavra}"`;
        safeSetInnerHTML(chip, `🏷️ ${tag.palavra.charAt(0).toUpperCase() + tag.palavra.slice(1)} <span style="opacity: 0.6; font-size: 10px;">(${tag.total})</span>`);;

        chip.onclick = () => {
            const termo = tag.palavra.toLowerCase();
            const todosChips = dashContainer.querySelectorAll('.chip-filtro');

            if (filtroAtivoGlobal === termo) {
                filtroAtivoGlobal = null;
                todosChips.forEach(c => c.classList.remove('ativo'));
                aplicarFiltroNosCards(null);
            } else {
                filtroAtivoGlobal = termo;
                todosChips.forEach(c => c.classList.remove('ativo'));
                chip.classList.add('ativo');
                aplicarFiltroNosCards(termo);
            }
        };
        dashContainer.appendChild(chip);
    });

    const esperaCount = items.filter(item => item.prazoCalculado?.espera || item.espera).length;

    if (esperaCount > 0) {
        let chipEspera = document.createElement('div');
        chipEspera.className = 'chip-filtro';
        chipEspera.style.borderColor = 'var(--zen-orange)';
        safeSetInnerHTML(chipEspera, `⏳ Aguardando Terceiros <span style="opacity: 0.6; font-size: 10px;">(${esperaCount})</span>`);;

        chipEspera.onclick = () => {
            const todosChips = dashContainer.querySelectorAll('.chip-filtro');

            if (filtroAtivoGlobal === 'espera') {
                filtroAtivoGlobal = null;
                todosChips.forEach(c => c.classList.remove('ativo'));
                aplicarFiltroNosCards(null);
            } else {
                filtroAtivoGlobal = 'espera';
                todosChips.forEach(c => c.classList.remove('ativo'));
                chipEspera.classList.add('ativo');

                const cards = document.querySelectorAll('.intimacao-card');
                cards.forEach(card => {
                    const key = card.getAttribute('data-key');
                    const isEspera = prazosSalvos[key]?.espera;
                    card.style.display = isEspera ? 'block' : 'none';
                });
            }
        };
        dashContainer.appendChild(chipEspera);
    }

    const containerResultados = document.getElementById('resultados');
    if (containerResultados && containerResultados.parentNode) {
        containerResultados.parentNode.insertBefore(dashContainer, containerResultados);
    }
}

function aplicarFiltroNosCards(termo) {
    const cards = document.querySelectorAll('.intimacao-card');
    const termoNorm = termo ? termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : null;

    cards.forEach(card => {
        if (!termoNorm) {
            card.style.display = 'block';
        } else {
            const textoCard = card.textContent.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            if (textoCard.includes(termoNorm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

// =========================================================
// FUNÇÃO GERADORA DE IMAGEM DA AUDITORIA (CANVAS)
// =========================================================
function gerarImagemAuditoria(cardTarget) {
    if (!cardTarget) return;

    // 1. Coleta de Dados Básicos
    const processo = cardTarget.getAttribute('data-proc') || 'Prazo_Avulso';
    const calcPanel = cardTarget.querySelector('.calculadora-prazo');

    if (!calcPanel) {
        if (typeof showToast === 'function') showToast("Calculadora não encontrada.", "❌");
        return;
    }

    const dataFatal = calcPanel.querySelector('.resultado-data-fatal')?.innerText || '--/--/----';
    const tribInput = calcPanel.querySelector('.c-trib');
    const tribunal = tribInput && tribInput.value ? tribInput.value.toUpperCase() : 'MANUAL';

    const diasNodes = calcPanel.querySelectorAll('.audit-day');
    if (!diasNodes || diasNodes.length === 0) {
        if (typeof showToast === 'function') showToast("A exportação da auditoria requer o cálculo prévio do prazo.", "⚠️");
        return;
    }

    // 2. Configuração do Canvas (Layout e Medidas)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const padding = 32;
    const colWidth = 84;
    const rowHeight = 90;
    const cols = 6; // Quantidade de dias por linha
    const gap = 12;

    const rows = Math.ceil(diasNodes.length / cols);
    canvas.width = (cols * colWidth) + ((cols - 1) * gap) + (padding * 2);
    canvas.height = 140 + (rows * rowHeight) + ((rows - 1) * gap) + padding;

    // 3. Desenho do Fundo e Cabeçalho
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1c1e21';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText('Auditoria de Contagem de Prazo', padding, 45);

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#5c626a';
    ctx.fillText(`Processo: ${processo}  |  Tribunal: ${tribunal}`, padding, 75);

    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#cc785c'; // Cor primary do seu CSS
    ctx.fillText(`Prazo Fatal: ${dataFatal}`, padding, 105);

    // Linha divisória
    ctx.beginPath();
    ctx.moveTo(padding, 120);
    ctx.lineTo(canvas.width - padding, 120);
    ctx.strokeStyle = '#e2e5e9';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Desenho do Grid de Dias
    let x = padding;
    let y = 140;

    diasNodes.forEach((node, index) => {
        const isFatal = node.classList.contains('is-fatal');
        const isPulo = node.classList.contains('is-pulo');

        const icon = node.querySelector('.day-icon')?.innerText || '';
        const num = node.querySelector('.day-num')?.innerText || '';
        const date = node.querySelector('.day-date')?.innerText || '';
        const desc = node.getAttribute('data-tooltip') || '';

        // Cor de Fundo da Célula
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, colWidth, rowHeight, 8);
        } else {
            ctx.rect(x, y, colWidth, rowHeight); // Fallback caso roundRect não suporte
        }

        if (isFatal) {
            ctx.fillStyle = '#fbe4e4'; // Fundo vermelho claro
            ctx.fill();
            ctx.strokeStyle = 'rgba(212, 76, 71, 0.4)';
            ctx.stroke();
        } else if (isPulo) {
            ctx.fillStyle = '#f3f5f8'; // Fundo cinza pulo
            ctx.fill();
            ctx.strokeStyle = 'transparent';
        } else {
            ctx.fillStyle = '#ffffff'; // Fundo branco dia útil
            ctx.fill();
            ctx.strokeStyle = '#cdd3da';
            ctx.stroke();
        }

        // Textos da Célula
        ctx.textAlign = 'center';
        ctx.fillStyle = isFatal ? '#d44c47' : '#1c1e21';

        // Ícone
        ctx.font = '16px Arial';
        ctx.fillText(icon, x + colWidth / 2, y + 24);

        // Número do Dia
        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillText(num, x + colWidth / 2, y + 48);

        // Data (DD/MM)
        ctx.font = '11px "Segoe UI", sans-serif';
        ctx.fillStyle = '#5c626a';
        ctx.fillText(date, x + colWidth / 2, y + 66);

        // Descrição (Truncada para caber)
        ctx.font = '9px "Segoe UI", sans-serif';
        let shortDesc = desc.length > 15 ? desc.substring(0, 13) + '...' : desc;
        ctx.fillText(shortDesc, x + colWidth / 2, y + 80);

        ctx.textAlign = 'left'; // Reseta o alinhamento

        // Controle de quebra de linha do Grid
        x += colWidth + gap;
        if ((index + 1) % cols === 0) {
            x = padding;
            y += rowHeight + gap;
        }
    });

    // 5. Exportação e Download
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Auditoria_${processo.replace(/\D/g, '')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') {
        showToast("Imagem gerada com sucesso!", "📸");
    }
}

// =========================================================
// MOTOR DE EXPORTAÇÃO DE AUDITORIA EM PNG (CANVAS)
// =========================================================

document.addEventListener('click', (e) => {
    const btnPNG = e.target.closest('.btn-exportar-png');
    if (btnPNG) {
        e.preventDefault();
        e.stopPropagation();

        if (btnPNG.closest('#containerCalcAvulsa')) {
            const calcPanel = btnPNG.closest('.calculadora-prazo');
            const inpProc = calcPanel.querySelector('.calc-avulsa-proc');
            const inpApel = calcPanel.querySelector('.calc-avulsa-apelido');

            const fakeCard = {
                querySelector: (sel) => {
                    if (sel === '.calculadora-prazo') return calcPanel;
                    if (sel === '.proc-header') return { textContent: inpApel && inpApel.value ? `— ${inpApel.value}` : '' };
                    return null;
                },
                getAttribute: (attr) => {
                    if (attr === 'data-proc') return inpProc && inpProc.value ? inpProc.value : '00000000000000000000';
                    return '';
                }
            };

            if (typeof gerarImagemAuditoria === 'function') {
                gerarImagemAuditoria(fakeCard);
            }
            return;
        }

        const card = btnPNG.closest('.intimacao-card');
        if (card && typeof gerarImagemAuditoria === 'function') {
            gerarImagemAuditoria(card);
        }
        return;
    }

    const btnPDFAudit = e.target.closest('.btn-exportar-pdf-audit');
    if (btnPDFAudit) {
        e.preventDefault();
        e.stopPropagation();

        const calcPanel = btnPDFAudit.closest('.calculadora-prazo');
        if (!calcPanel) return;

        const card = btnPDFAudit.closest('.intimacao-card');
        const diasNodes = calcPanel.querySelectorAll('.audit-day');
        
        if (!diasNodes || diasNodes.length === 0) {
            if (typeof showToast === 'function') showToast("A exportação da auditoria requer o cálculo prévio do prazo.", "⚠️");
            return;
        }

        let processo = 'Prazo Avulso';
        let apelido = '';
        let tribunal = 'MANUAL';

        if (card) {
            processo = card.getAttribute('data-proc') || processo;
            tribunal = calcPanel.querySelector('.c-trib')?.value || 'TJ';
        } else if (btnPDFAudit.closest('#containerCalcAvulsa')) {
            const inpProc = calcPanel.querySelector('.calc-avulsa-proc');
            const inpApel = calcPanel.querySelector('.calc-avulsa-apelido');
            if (inpProc && inpProc.value) processo = inpProc.value;
            if (inpApel && inpApel.value) apelido = inpApel.value;
            tribunal = calcPanel.querySelector('.c-trib')?.value || 'MANUAL';
        }

        const dataFatal = calcPanel.querySelector('.resultado-data-fatal')?.innerText || '';

        const itemParam = {
            processo: processo,
            apelido: apelido,
            siglaTribunal: tribunal.toUpperCase(),
            fatal: dataFatal
        };

        const timelineArray = [];
        diasNodes.forEach(node => {
            timelineArray.push({
                fatal: node.classList.contains('is-fatal'),
                pulo: node.classList.contains('is-pulo'),
                icon: node.querySelector('.day-icon')?.innerText || '',
                num: node.querySelector('.day-num')?.innerText || '',
                data: node.querySelector('.day-date')?.innerText || '',
                desc: node.getAttribute('data-tooltip') || ''
            });
        });

        const brandingData = {
            nome: typeof brandingNome !== 'undefined' ? brandingNome : '',
            slogan: typeof brandingSlogan !== 'undefined' ? brandingSlogan : '',
            contato: typeof brandingContato !== 'undefined' ? brandingContato : '',
            cor: typeof brandingCor !== 'undefined' ? brandingCor : '',
            logo: typeof brandingLogo !== 'undefined' ? brandingLogo : ''
        };

        if (typeof ExportService !== 'undefined' && typeof ExportService.gerarPDFAuditoria === 'function') {
            ExportService.gerarPDFAuditoria(itemParam, timelineArray, brandingData);
        } else {
            if (typeof showToast === 'function') showToast("Módulo de exportação não carregado.", "❌");
        }
        return;
    }

    // Fechar o modal da agenda no botão fechar ou fora dele
    if (e.target.closest('#agendaModal .modal-close') || (e.target.classList.contains('modal-overlay') && e.target.id === 'agendaModal')) {
        document.getElementById('agendaModal')?.classList.remove('show');
        return;
    }

    // --- CORREÇÃO DO BOTÃO QUE EXIGE DUPLO CLIQUE ---
    const resBox = e.target.closest('.calc-result-box');
    if (resBox) {
        setTimeout(() => {
            const preview = resBox.querySelector('.calc-preview.audit-flow');
            const btnContainer = resBox.querySelector('.container-btn-png');

            if (preview && btnContainer) {
                // O getComputedStyle pega o estado visual real da tela
                const estiloReal = window.getComputedStyle(preview).display;

                if (estiloReal !== 'none' && preview.innerHTML.trim() !== '') {
                    btnContainer.style.display = 'block';
                } else {
                    btnContainer.style.display = 'none';
                }
            }
        }, 150); // O delay de 150ms garante que a animação de abrir tenha começado
    }
}, true);

document.addEventListener('DOMContentLoaded', () => {
    const tabCalculadora = document.getElementById('tabCalculadora');
    const viewCalculadora = document.getElementById('viewCalculadora');
    const tabBusca = document.getElementById('tabBusca');
    const tabSalvos = document.getElementById('tabSalvos');
    const tabCalendario = document.getElementById('tabControle');

    const esconderCalculadoraAvulsa = () => {
        if (viewCalculadora) viewCalculadora.style.display = 'none';
        if (tabCalculadora) tabCalculadora.classList.remove('active');
    };

    if (tabBusca) tabBusca.addEventListener('click', esconderCalculadoraAvulsa);
    if (tabSalvos) tabSalvos.addEventListener('click', esconderCalculadoraAvulsa);
    if (tabCalendario) tabCalendario.addEventListener('click', esconderCalculadoraAvulsa);

    if (tabCalculadora) {
        tabCalculadora.addEventListener('click', () => {
            if (document.getElementById('viewBusca')) document.getElementById('viewBusca').style.display = 'none';
            if (document.getElementById('viewSalvos')) document.getElementById('viewSalvos').style.display = 'none';
            if (document.getElementById('viewControle')) document.getElementById('viewControle').style.display = 'none';

            if (tabBusca) tabBusca.classList.remove('active');
            if (tabSalvos) tabSalvos.classList.remove('active');
            if (tabCalendario) tabCalendario.classList.remove('active');

            tabCalculadora.classList.add('active');
            viewCalculadora.style.display = 'block';

            const containerCalcAvulsa = document.getElementById('containerCalcAvulsa');

            if (containerCalcAvulsa && containerCalcAvulsa.innerHTML.trim() === '') {
                try {
                    const calcNode = window.montarCalculadoraForm({}, null, 'avulsa_' + Date.now(), '', '', 15, false, '', null);

                    if (calcNode) {
                        containerCalcAvulsa.appendChild(calcNode);
                        const painel = containerCalcAvulsa.querySelector('.calculadora-prazo');
                        if (painel) {
                            painel.style.display = 'block';
                            painel.classList.add('ativa');
                        }
                    }
                } catch (e) {
                    console.error("DJEN: Erro ao montar a calculadora avulsa", e);
                }
            }
            moverLinhaLiquida();
        });
    }
});

// Canvas rounding helper
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x + r, y);
        this.lineTo(x + w - r, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r);
        this.lineTo(x + w, y + h - r);
        this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        this.lineTo(x + r, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r);
        this.lineTo(x, y + r);
        this.quadraticCurveTo(x, y, x + r, y);
        return this;
    };
}

// Integração Jurisflow (Backend Local)
globalThis.enviarParaJurisflow = function(prazoData) {
    if (!window.configJurisflowEnabled) return;
    const port = window.configJurisflowPort || '18080';
    const token = window.configJurisflowToken || 'jf_djen_secret';
    fetch(`http://127.0.0.1:${port}/api/sync_prazo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prazoData)
    }).then(res => res.json())
      .then(data => {
          console.log('Sincronizado com Jurisflow:', data);
          showToast("Prazo enviado para Jurisflow!", "✅");
      })
      .catch(err => {
          console.error('Erro ao sincronizar com Jurisflow:', err);
          showToast("Falha ao integrar Jurisflow.", "❌");
      });
};

// Jurisflow Command Poller com Backoff
let jurisflowPollInterval = 2000;
async function pollJurisflow() {
    if (!window.configJurisflowEnabled) {
        setTimeout(pollJurisflow, 5000);
        return;
    }
    const port = window.configJurisflowPort || '18080';
    const token = window.configJurisflowToken || 'jf_djen_secret';
    try {
        const res = await fetch(`http://127.0.0.1:${port}/api/djen_command`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            jurisflowPollInterval = 2000; // Conectado, mantém polling rápido
            const data = await res.json();
            if (data && data.action === 'search' && data.query) {
                console.log('Comando recebido do Jurisflow:', data);
                const inputBusca = document.getElementById('termoBusca');
                const btnBusca = document.getElementById('btnBuscar');
                if (inputBusca && btnBusca) {
                    inputBusca.value = data.query;
                    btnBusca.click();
                    showToast("Busca iniciada via Jurisflow!", "🔍");
                }
            }
        }
    } catch (e) {
        // Ignorar erros de conexão recusada se Jurisflow estiver fechado
        // Aumenta o tempo para 10s para evitar spam no console
        jurisflowPollInterval = 10000; 
    }
    setTimeout(pollJurisflow, jurisflowPollInterval);
}
setTimeout(pollJurisflow, 2000);

function verificarOnboardingGtasks() {
    try {
        SafeStorage.get(['djen_gtasks_onboarding_v5074_v2'], (st) => {
            if (!st.djen_gtasks_onboarding_v5074_v2) {
                setTimeout(() => {
                    document.getElementById('gtasksOnboardingModal')?.classList.add('show');
                }, 600);
            }
        });
    } catch(e) {
        console.error('[Onboarding] Erro:', e);
    }
}
