/**
 * Buscador DJEN v50.1 - Correção da Auditoria
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
        emailAgenda: localStorage.getItem('djen_email_gcal') || '',
        termosRadar: []       // Palavras-chave do radar salvas pelo usuário
    }
};

function safeJSONParse(str, fallback) {
    if (!str) return fallback;
    try {
        return JSON.parse(str);
    } catch (e) {
        console.warn('DJEN: Falha ao decodificar JSON, usando fallback.', e);
        return fallback;
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



document.addEventListener('DOMContentLoaded', () => {
    verificarLembreteBackup();
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
    let resultadosGlobais = []; let resultadosExibidos = []; let prazosSalvos = {};
    let historicoBuscas = [];
    let multiOabSearch = false; let publicacoesLidas = new Set();
    let chartStatusInst = null; let chartTribunaisInst = null;

    function salvarPublicacoesLidas() {
        const arr = Array.from(publicacoesLidas);
        if (arr.length > 2000) publicacoesLidas = new Set(arr.slice(-2000));
        SafeStorage.set({ 'djen_publicacoes_lidas': JSON.stringify(Array.from(publicacoesLidas)) });
    }

    let searchMode = 'oab';
    let currentCalDate = new Date(); let selectedCalDateStr = null;

    let filtroAgendaAtivo = null;
    let totalCumpridosHistorico = 0; let totalBuscas = 0; let totalLidos = 0; let totalSalvos = 0;

    let textoParaCompartilhar = "";
    let tituloParaCompartilhar = "";

    const iconesSVG = {
        calendario: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>`,
        copiar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
        check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        remover: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        foco: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
        retro: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="2" x2="14" y2="2"></line><line x1="12" y1="14" x2="15" y2="11"></line><circle cx="12" cy="14" r="8"></circle></svg>`,
        maisOpcoes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>`,
        lapis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
        eyeOff: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        boxEmpty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 56px; height: 56px; color: var(--border-light); margin-bottom: 16px;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
        tag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
        share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`
    };

    const pixCodeText = "50f781e2-9d94-4624-8f08-a9938bb0c4dc";
    let palavrasUrgentes = ["penhora", "bloqueio", "revelia", "liminar", "audiência", "audiencia"];

    // IndexedDB (Offline, Sem Limite de Cota, Privacy First)

    function savePrazosSalvos() {
        try {
            SafeStorage.set({ 'djen_prazos_salvos': JSON.stringify(prazosSalvos) });
        } catch (e) {
            console.error("Erro ao salvar os prazos:", e);
            showToast("Falha ao salvar o registro. Tente novamente.", "❌");
        }
    }

    function aplicarTema(tema) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const btnText = document.getElementById('themeBtnText');
        const root = document.documentElement;

        root.classList.remove('tema-escuro', 'tema-sepia');

        if (tema === 'escuro' || (tema === 'auto' && isSystemDark)) {
            root.classList.add('tema-escuro');
        }

        if (btnText) {
            // Se estiver no escuro, sugere mudar para claro. Se estiver no claro, sugere escuro.
            if (root.classList.contains('tema-escuro')) {
                btnText.textContent = "Mudar para Modo Claro";
            } else {
                btnText.textContent = "Mudar para Modo Escuro";
            }
        }
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (temaAtual === 'auto') aplicarTema('auto'); });

    function atualizarTamanhoFonteFoco(mudanca) {
        fontSizeFocoAtual += mudanca; if (fontSizeFocoAtual < 12) fontSizeFocoAtual = 12; if (fontSizeFocoAtual > 26) fontSizeFocoAtual = 26;
        document.documentElement.style.setProperty('--font-focus', fontSizeFocoAtual + 'px'); SafeStorage.set({ 'djen_font_focus': fontSizeFocoAtual });
    }

    function showToast(mensagem, icone = "✅") {
        const toast = document.getElementById('toastGenerico');
        if (toast) {
            document.getElementById('toastIcone').textContent = icone; document.getElementById('toastMensagem').textContent = mensagem;
            toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }
    function openSafeLink(url) { if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) { chrome.tabs.create({ url: url }); } else { window.open(url, '_blank'); } }

    function atualizarRelatorioProdutividade() {
        const elTempoGasto = document.getElementById('modalTempoGasto');
        const elStatLidos = document.getElementById('statLidos');
        const elStatCumpridos = document.getElementById('statCumpridos');

        if (elStatLidos) elStatLidos.textContent = totalLidos;
        if (elStatCumpridos) elStatCumpridos.textContent = totalCumpridosHistorico;

        const minutosTotais = (totalBuscas * 5) + (totalLidos * 3) + (totalSalvos * 15);
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
            if (chartStatusInst) chartStatusInst.destroy();
            chartStatusInst = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Cumpridos', 'Pendentes', 'Atrasados', 'Sem Prazo'],
                    datasets: [{
                        data: [countCumprido, countPendente, countAtrasado, countSemPrazo],
                        backgroundColor: ['#0d826e', '#e8a55a', '#d44c47', '#e6dfd8'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { font: { size: 11, family: "'Google Sans', sans-serif" } } }
                    },
                    cutout: '70%'
                }
            });
        }

        // 2. Dados para o Gráfico de Tribunais
        const tribCounts = {};
        todosItens.forEach(p => {
            let t = p.siglaTribunal || (p.manual ? "MANUAL" : "OUTRO");
            tribCounts[t] = (tribCounts[t] || 0) + 1;
        });

        const tribLabels = Object.keys(tribCounts).sort((a, b) => tribCounts[b] - tribCounts[a]);
        const tribData = tribLabels.map(t => tribCounts[t]);

        const ctxTribunais = document.getElementById('chartTribunais');
        if (ctxTribunais) {
            if (chartTribunaisInst) chartTribunaisInst.destroy();
            chartTribunaisInst = new Chart(ctxTribunais, {
                type: 'bar',
                data: {
                    labels: tribLabels,
                    datasets: [{
                        label: 'Processos',
                        data: tribData,
                        backgroundColor: 'rgba(0, 117, 222, 0.7)',
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
                        y: { beginAtZero: true, ticks: { precision: 0 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    function renderHistoricoBuscas() {
        const container = document.getElementById('historicoBusca');
        const chips = document.getElementById('chipsRecentes');
        if (!container || !chips) return;
        if (historicoBuscas.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'block';
        chips.innerHTML = '';
        historicoBuscas.forEach(b => {
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
    function getProc(i, t) { let p = i.numeroProcesso || i.numero || i.processo; if (!p || p === "undefined") { const m = String(t).match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/); p = m ? m[0] : "Processo s/ número"; } return p; }
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
        return new Date(cleanStr);
    }

    function getGlobalApelido(proc) { if (!proc) return ""; let found = ""; for (let key in prazosSalvos) { if (prazosSalvos[key] && prazosSalvos[key].processo === proc && prazosSalvos[key].apelido) { found = prazosSalvos[key].apelido; break; } } return found; }
    function setGlobalApelido(proc, novoApelido, itemKeyBase = null) { let atualizouAlgum = false; for (let k in prazosSalvos) { if (prazosSalvos[k] && prazosSalvos[k].processo === proc) { prazosSalvos[k].apelido = novoApelido; atualizouAlgum = true; } } if (!atualizouAlgum && itemKeyBase) { if (!prazosSalvos[itemKeyBase]) prazosSalvos[itemKeyBase] = { processo: proc }; prazosSalvos[itemKeyBase].apelido = novoApelido; } savePrazosSalvos(); }

    let currentApelidoCallback = null;
    function abrirModalApelido(processo, apelidoAtual, callback) { const modal = document.getElementById('apelidoModal'); const input = document.getElementById('inputApelidoModal'); input.value = apelidoAtual || ''; currentApelidoCallback = callback; modal.classList.add('show'); setTimeout(() => input.focus(), 100); }

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
    function createTasksWrapperUI(itemKey, proc, txtComGatilhos, headerEl) {
        const tasksWrapper = document.createElement("div");
        tasksWrapper.className = "tasks-wrapper";
        tasksWrapper.style.marginTop = "8px";

        function getTarefasLocais() {
            if (prazosSalvos[itemKey] && prazosSalvos[itemKey].tarefas) {
                return prazosSalvos[itemKey].tarefas;
            }
            const geradas = extrairTarefasTexto(txtComGatilhos);
            return geradas || [];
        }

        let localTarefas = getTarefasLocais();
        localTarefas = localTarefas.map(t => {
            if (typeof t === 'string') {
                return { feita: t.includes('[x]'), texto: t.replace("- [ ] ", "").replace("- [x] ", "").trim() };
            }
            return t;
        }).filter(t => t && t.texto);

        function saveTarefasLocais() {
            if (!prazosSalvos[itemKey]) {
                prazosSalvos[itemKey] = { processo: proc, textoCompleto: txtComGatilhos, tarefas: localTarefas };
            } else {
                prazosSalvos[itemKey].tarefas = localTarefas;
            }
            savePrazosSalvos();
            atualizarBadge();
        }

        function atualizarBadge() {
            const badge = headerEl.querySelector('.badge-tarefas');
            if (!badge) return;
            if (localTarefas.length > 0) {
                const completas = localTarefas.filter(t => t.feita).length;
                badge.innerHTML = `☑ ${completas}/${localTarefas.length}`;
                badge.style.display = 'inline-flex';
                if (completas === localTarefas.length) badge.style.color = 'var(--zen-green)';
                else badge.style.color = '';
            } else {
                badge.style.display = 'none';
            }
        }

        function renderTarefasUI() {
            tasksWrapper.innerHTML = '';
            atualizarBadge();
            
            localTarefas.forEach((t, idx) => {
                const row = document.createElement("div");
                row.className = "task-item";
                row.innerHTML = `
                    <label class="custom-checkbox">
                        <input type="checkbox" ${t.feita ? 'checked' : ''}>
                        <span class="checkmark"></span>
                    </label>
                    <span class="task-text ${t.feita ? 'feita' : ''}">${t.texto}</span>
                    <button class="btn-del-task" title="Remover Tarefa">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                row.querySelector('input').onchange = (e) => {
                    localTarefas[idx].feita = e.target.checked;
                    saveTarefasLocais();
                    renderTarefasUI();
                };
                row.querySelector('.btn-del-task').onclick = () => {
                    localTarefas.splice(idx, 1);
                    saveTarefasLocais();
                    renderTarefasUI();
                };
                tasksWrapper.appendChild(row);
            });

            const addRow = document.createElement("div");
            addRow.className = "task-add-row";
            addRow.innerHTML = `<input type="text" placeholder="+ Adicionar tarefa..." autocomplete="off">`;
            addRow.querySelector('input').onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value.trim();
                    if (val) {
                        localTarefas.push({ feita: false, texto: val });
                        saveTarefasLocais();
                        renderTarefasUI();
                    }
                }
            };
            tasksWrapper.appendChild(addRow);
        }
        
        renderTarefasUI();
        return tasksWrapper;
    }


    function getHeaderHTML(processo, apelido, anotacao, textoOriginal) {
        const safeAnotacao = (typeof anotacao === 'string') ? anotacao : "";
        const safeTexto = (typeof textoOriginal === 'string') ? textoOriginal : "";

        const tagsMatch = safeAnotacao.match(/#[\w\u00C0-\u00FF_]+/g);
        const tagsManuais = tagsMatch ? [...new Set(tagsMatch)] : [];

        let tagsHTML = getAutoTagsHTML(safeTexto);

        if (tagsManuais.length > 0) {
            tagsHTML += tagsManuais.map(t => `<span class="tag-pill"><span style="opacity: 0.6;">#</span> ${t.replace('#', '')}</span>`).join('');
        }
        let tagsContainer = tagsHTML ? `<div class="proc-tags">${tagsHTML}</div>` : '';

        let textoAnotacaoLimpo = safeAnotacao.replace(/#[\w\u00C0-\u00FF_]+/g, '').trim();

        let anotacaoContainer = textoAnotacaoLimpo ? `
            <div class="proc-anotacao" style="font-size: 12px; color: var(--text-muted); margin-top: 6px; display: flex; align-items: flex-start; gap: 6px; line-height: 1.4;">
                <span style="font-size: 12px; opacity: 0.8; margin-top: 1px;">📌</span> 
                <span>${textoAnotacaoLimpo}</span>
            </div>` : '';

        let identificadorHTML = '';

        if (apelido && apelido.trim() !== "") {
            identificadorHTML = `
                <div class="proc-apelido" title="Proc: ${processo}">${apelido}</div>
                <div class="proc-numero-secundario" style="font-size: 11px; font-family: ui-monospace, monospace; color: var(--text-placeholder); margin-top: 2px;">${processo}</div>
            `;
        } else {
            identificadorHTML = `
                <div class="proc-numero-principal">${processo}</div>
                <div class="hint-apelido">+ Adicionar Apelido</div>
            `;
        }

        return identificadorHTML + tagsContainer + anotacaoContainer;
    }

    function handleCriarTag(notaInputElement) {
        const selecao = window.getSelection().toString().trim(); if (!selecao) { showToast("A criação da tag requer a seleção prévia de uma palavra no texto.", "⚠️"); return; } if (selecao.length > 50) { showToast("A seleção excede o limite de 50 caracteres para uma tag.", "⚠️"); return; }
        let tagFormatada = selecao.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9À-ÿ_]/g, '').toLowerCase();
        if (tagFormatada.length > 0) { tagFormatada = "#" + tagFormatada; notaInputElement.value = notaInputElement.value ? notaInputElement.value + " " + tagFormatada : tagFormatada; notaInputElement.dispatchEvent(new Event('change')); notaInputElement.dispatchEvent(new Event('input')); showToast(`Tag ${tagFormatada} criada!`, "🔖"); } else { showToast("O formato do texto selecionado não é válido para criar uma tag.", "⚠️"); }
    }

    function handleMarcarTexto() {
        const selection = window.getSelection(); if (!selection.rangeCount || selection.isCollapsed) { showToast("A marcação requer a seleção prévia de um trecho do texto.", "⚠️"); return; }
        const range = selection.getRangeAt(0); const mark = document.createElement('mark'); mark.className = 'marca-texto';
        try { range.surroundContents(mark); selection.removeAllRanges(); showToast("Texto destacado!", "🖌️"); const activeKey = document.getElementById('focusModeOverlay').getAttribute('data-active-key'); if (activeKey && prazosSalvos[activeKey]) { prazosSalvos[activeKey].textoHtml = document.getElementById('focusTeorContent').innerHTML; savePrazosSalvos(); const teorBox = document.querySelector(`.intimacao-card[data-key="${activeKey}"] .teor-inner-box`); if (teorBox) teorBox.innerHTML = prazosSalvos[activeKey].textoHtml; } } catch (e) { showToast("O destaque não suporta seleções de texto muito extensas.", "⚠️"); }
    }

    function getPdfStyles() {
        return `
        @font-face {
            font-family: 'Google Sans Flex';
            src: local('Google Sans Flex'), local('Google Sans');
        }
        body { 
            font-family: 'Google Sans Flex', 'Google Sans', -apple-system, sans-serif; 
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
        .info-title { font-size: 14px; font-weight: 700; color: #0075de; text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 0.5px; }
        .info-date { font-size: 12px; color: #8e8b82; margin: 0; }
        
        .kpi-board { display: flex; gap: 16px; margin-bottom: 32px; }
        .kpi-card { flex: 1; padding: 16px; border-radius: 8px; border: 1px solid #ffffff; background: #e4e4e7; text-align: center; }
        .kpi-val { font-size: 28px; font-weight: 700; letter-spacing: -1px; margin-bottom: 4px; color: #141413; }
        .kpi-label { font-size: 12px; font-weight: 600; color: #6c6a64; text-transform: uppercase; letter-spacing: 0.5px; }

        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; margin-top: 16px; border: 1px solid #e6dfd8; border-radius: 8px; overflow: hidden; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        th { color: #8e8b82; font-weight: 600; text-align: left; padding: 12px 16px; border-bottom: 2px solid #e6dfd8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: #faf9f5; }
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



    function executarBackup() {
        const oab = document.getElementById('oabNum')?.value.replace(/\D/g, '') || "000000";
        const uf = document.getElementById('oabUf')?.value.trim().toUpperCase() || "SP";
        const agora = new Date();
        const dataStr = `${String(agora.getDate()).padStart(2, '0')}-${String(agora.getMonth() + 1).padStart(2, '0')}-${agora.getFullYear()}`;
        const horaStr = `${String(agora.getHours()).padStart(2, '0')}h${String(agora.getMinutes()).padStart(2, '0')}`;
        const nomeArquivo = `DJEN_Backup_OAB${uf}${oab}_${dataStr}_${horaStr}.json`;

        const backupData = {
            versao: 4,
            metadados: { data_geracao: agora.toISOString(), djen_versao_app: "46.0" },
            prazosSalvos: prazosSalvos,
            estatisticas: {
                totalBuscas: totalBuscas,
                totalLidos: totalLidos,
                totalSalvos: totalSalvos,
                totalCumpridosHistorico: totalCumpridosHistorico
            },
            configuracoes: {
                oabNum: document.getElementById('oabNum')?.value || "",
                oabUf: document.getElementById('oabUf')?.value || "SP",
                tema: temaAtual,
                fontFocus: fontSizeFocoAtual,
                termosRadar: palavrasUrgentes,
                emailGcal: document.getElementById('inputEmailGcal')?.value || ""
            },
            prazos_arquivados: safeJSONParse(localStorage.getItem('prazosCumpridosArquivados'), []),
            dicionario_apelidos: safeJSONParse(localStorage.getItem('djen_dicionario_apelidos'), {}),
            historico_buscas: historicoBuscas
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
        for (let key in prazosSalvos) { delete prazosSalvos[key]; }

        if (data.prazosSalvos) Object.assign(prazosSalvos, data.prazosSalvos);
        if (data.configuracoes) {
            const cfg = data.configuracoes;
            if (cfg.oabNum) { document.getElementById('oabNum').value = cfg.oabNum; }
            if (cfg.tema) { temaAtual = cfg.tema; aplicarTema(temaAtual); }
            if (cfg.termosRadar) { palavrasUrgentes = Array.isArray(cfg.termosRadar) ? cfg.termosRadar : String(cfg.termosRadar).split(','); }
            if (cfg.emailGcal) {
                SafeStorage.set({ 'djen_email_gcal': cfg.emailGcal });
                const inputGcal = document.getElementById('inputEmailGcal');
                if (inputGcal) inputGcal.value = cfg.emailGcal;
            }
        }
        if (data.estatisticas) {
            totalBuscas = data.estatisticas.totalBuscas || 0;
            totalLidos = data.estatisticas.totalLidos || 0;
            totalSalvos = data.estatisticas.totalSalvos || 0;
            totalCumpridosHistorico = data.estatisticas.totalCumpridosHistorico || 0;
        }

        if (data.historico_buscas) {
            try {
                const parsedHist = Array.isArray(data.historico_buscas) ? data.historico_buscas : safeJSONParse(data.historico_buscas, []);
                if (Array.isArray(parsedHist)) {
                    historicoBuscas = parsedHist;
                    SafeStorage.set({ 'djen_historico_buscas': JSON.stringify(historicoBuscas) });
                    if (typeof renderHistoricoBuscas === 'function') renderHistoricoBuscas();
                }
            } catch (e) {
                console.error("Erro ao restaurar histórico de buscas:", e);
            }
        }

        localStorage.setItem('djen_ultimo_backup_data', new Date().toISOString());
        SafeStorage.set({ 'djen_total_buscas': totalBuscas, 'djen_total_lidos': totalLidos, 'djen_total_salvos': totalSalvos, 'djen_cumpridos_total': totalCumpridosHistorico });

        savePrazosSalvos();
        atualizarEstatisticas();
        switchView('salvos');

        const total = Object.keys(prazosSalvos).length;
        showToast(`✅ Backup restaurado! ${total} prazos carregados.`, "🔄");
    }

    function gerarPDFPrazos() {
        const todosItens = Object.values(prazosSalvos).filter(p => p.fatal || p.manual);
        if (todosItens.length === 0) { showToast("Sua agenda está vazia.", "⚠️"); return; }

        const dataHoje = new Date();
        const dataFormatada = `${String(dataHoje.getDate()).padStart(2, '0')}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${dataHoje.getFullYear()}`;
        const nomeArquivo = `Relatorio_DJEN_${dataFormatada}`;

        const pendentes = todosItens.filter(p => !p.cumprido);
        const cumpridos = todosItens.filter(p => p.cumprido);
        const total = todosItens.length;
        const eficiencia = total > 0 ? Math.round((cumpridos.length / total) * 100) : 0;

        let taxaCor = eficiencia >= 90 ? '#0d826e' : (eficiencia >= 70 ? '#dd5b00' : '#d44c47');
        let taxaBg = eficiencia >= 90 ? '#eefcfa' : (eficiencia >= 70 ? '#fdf3eb' : '#fbe4e4');
        let taxaBorder = eficiencia >= 90 ? '#c2f0e9' : (eficiencia >= 70 ? '#fad1b1' : '#f5c6c6');

        const dataHj = new Date();
        const dateStr = dataHj.toLocaleDateString('pt-BR');
        const timeStr = dataHj.toLocaleTimeString('pt-BR');
        const hjTime = dataHj.setHours(12, 0, 0, 0);

        let html = `<!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${nomeArquivo}</title>
            <style>${getPdfStyles()}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="brand-area">
                        <div class="logo-box">DJ</div>
                        <div>
                            <h1 class="brand-title">Buscador DJEN</h1>
                            <div class="brand-meta">
                                <span>👤 Advogado: ${document.getElementById('oabNum')?.value || ''}</span>
                                <span>🌐 buscadordjen.com.br</span>
                            </div>
                        </div>
                    </div>
                    <div class="info-area">
                        <h2 class="info-title">RELATÓRIO DE CONTROLE TÁTICO</h2>
                        <p class="info-date">Extração Completa: ${dateStr} às ${timeStr}</p>
                    </div>
                </div>

                <div class="kpi-board">
                    <div class="kpi-card"><div class="kpi-val">${total}</div><div class="kpi-label">Prazos na Base</div></div>
                    <div class="kpi-card"><div class="kpi-val">${pendentes.length}</div><div class="kpi-label">Pendentes</div></div>
                    <div class="kpi-card"><div class="kpi-val">${cumpridos.length}</div><div class="kpi-label">Cumpridos</div></div>
                    <div class="kpi-card" style="background: ${taxaBg}; border-color: ${taxaBorder};">
                        <div class="kpi-val" style="color: ${taxaCor};">${eficiencia}%</div>
                        <div class="kpi-label">Taxa de Eficiência</div>
                        <div class="progress-container">
                            <div class="progress-bar" style="width: ${eficiencia}%; background-color: ${taxaCor};"></div>
                        </div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr><th class="col-num">Nº</th><th>Processo / Identificação</th><th>Tribunal</th><th>Prazo Fatal</th><th>Status</th><th>Anotações e Detalhes</th></tr>
                    </thead>
                    <tbody>
        `;

        let sortedItems = todosItens.sort((a, b) => {
            if (a.cumprido !== b.cumprido) return a.cumprido ? 1 : -1;
            if (!a.fatal) return 1; if (!b.fatal) return -1;
            return parseDateBR(a.fatal).getTime() - parseDateBR(b.fatal).getTime();
        });

        sortedItems.forEach((p, idx) => {
            let statusBadge = "";
            let rowClass = p.cumprido ? "row-cumprido" : "";

            if (p.cumprido) {
                statusBadge = `<span class="badge bg-green">✔ Cumprido</span>`;
            } else if (!p.fatal) {
                statusBadge = `<span class="badge bg-gray">Sem Prazo</span>`;
            } else {
                const dataFatal = parseDateBR(p.fatal);
                const diff = Math.ceil((dataFatal.getTime() - hjTime) / (1000 * 3600 * 24));
                if (diff < 0) statusBadge = `<span class="badge bg-red">Atrasado</span>`;
                else if (diff === 0) statusBadge = `<span class="badge bg-red">Vence Hoje</span>`;
                else statusBadge = `<span class="badge bg-orange">${diff} dias</span>`;
            }

            let tribunal = p.siglaTribunal || p.mat || 'MANUAL';
            let jurisdicao = (p.uf && p.mun) ? `<div style="font-size: 10px; color: #a39e98; margin-top: 6px; font-weight: 500; letter-spacing: 0.2px;">📍 ${p.uf} - ${p.mun}</div>` : '';
            let procBlock = p.apelido ? `<span class="proc-name">${p.apelido}</span><span class="proc-sub">${p.processo}</span>` : `<span class="proc-name">${p.processo}</span>`;

            let anotacaoLimpa = p.anotacao || '';
            let anotacaoComTags = anotacaoLimpa.replace(/#([\wÀ-ÿ_]+)/g, '<span class="tag-badge">#$1</span>');

            let radarTags = [];
            if (p.textoCompleto) {
                const txtLow = p.textoCompleto.toLowerCase();
                palavrasUrgentes.forEach(palavra => {
                    if (txtLow.includes(palavra)) {
                        const palavraFormatada = palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
                        radarTags.push("#" + palavraFormatada);
                    }
                });
            }
            let radarHtml = radarTags.length > 0 ? radarTags.map(t => `<span class="tag-radar">${t}</span>`).join('') : '';



            let tarefasHtml = '';
            if (p.tarefas && p.tarefas.length > 0) {
                tarefasHtml = `<div class="checklist-box"><strong style="color: #6c6a64; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px;">Tarefas:</strong><div style="margin-top: 6px;">` +
                    p.tarefas.map(t => `<div class="checklist-item">${t.feita ? '<span style="color:#0d826e; font-size:14px; line-height:1;">☑</span>' : '<span style="color:#a39e98; font-size:14px; line-height:1;">☐</span>'} <span style="${t.feita ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${t.texto}</span></div>`).join('') +
                    `</div></div>`;
            }

            let blocoAnotacoes = `<div style="color:#615d59; font-size: 11px; margin-bottom: 6px;">${anotacaoComTags || '-'}</div>`;
            if (radarHtml) blocoAnotacoes += `<div>${radarHtml}</div>`;
            if (tarefasHtml) blocoAnotacoes += tarefasHtml;

            const fmtDt = (str) => {
                if (!str) return "";
                if (str.includes('/')) return str;
                const parts = str.split('T')[0].split('-');
                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                return str;
            };

            let fatalBlock = p.fatal ? `<span class="fatal-date">${p.fatal}</span>` : '-';
            if (p.disp || p.pub) {
                fatalBlock += `<span class="datas-secundarias">`;
                if (p.disp) fatalBlock += `Disp: ${fmtDt(p.disp)}<br>`;
                if (p.pub) fatalBlock += `Pub: ${fmtDt(p.pub)}`;
                fatalBlock += `</span>`;
            }

            html += `<tr class="${rowClass}"><td class="col-num">${idx + 1}</td><td>${procBlock}</td><td><span class="badge bg-trib">${tribunal}</span>${jurisdicao}</td><td>${fatalBlock}</td><td>${statusBadge}</td><td>${blocoAnotacoes}</td></tr>`;
        });

        html += `</tbody></table></div>
        <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #a39e98; letter-spacing: 0.2px;">
            Este documento é de uso interno. A contagem de prazos gerada via algoritmo é de caráter referencial.
        </div>
        <script> window.onload = function() { setTimeout(function() { window.print(); }, 500); } </script>
        </body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: url });
        } else {
            window.open(url, '_blank');
        }
        showToast("Relatório Gerencial criado!", "📄");
    }

    function gerarPDFMes(mesAnoStr, itens) {
        if (itens.length === 0) { showToast(`Nenhum prazo registrado em ${mesAnoStr}.`, "⚠️"); return; }

        const dataHoje = new Date();
        const dataFormatada = `${String(dataHoje.getDate()).padStart(2, '0')}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${dataHoje.getFullYear()}`;
        const nomeArquivoMes = `Agenda_DJEN_${mesAnoStr.replace(/[\/\s]/g, '_')}`;

        const dataHj = new Date(); const dateStr = dataHj.toLocaleDateString('pt-BR'); const timeStr = dataHj.toLocaleTimeString('pt-BR'); const hjTime = dataHj.setHours(12, 0, 0, 0);

        let sortedItems = itens.sort((a, b) => {
            if (!a.fatal) return 1; if (!b.fatal) return -1;
            return parseDateBR(a.fatal).getTime() - parseDateBR(b.fatal).getTime();
        });
        
        const total = sortedItems.length;
        const cumpridos = sortedItems.filter(p => p.cumprido).length;
        const pendentes = total - cumpridos;
        const taxaEficiencia = total > 0 ? Math.round((cumpridos / total) * 100) : 0;
        
        let atrasados = 0;
        sortedItems.forEach(p => {
            if (!p.cumprido && p.fatal) {
                const dataFatal = parseDateBR(p.fatal); 
                const diff = Math.ceil((dataFatal.getTime() - hjTime) / (1000 * 3600 * 24));
                if (diff < 0) atrasados++;
            }
        });

        let html = `<!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${nomeArquivoMes}</title>
            <style>${getPdfStyles()}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="brand-area">
                        <div class="logo-box">DJ</div>
                        <div>
                            <h1 class="brand-title">Buscador DJEN</h1>
                            <div class="brand-meta">
                                <span>👤 Advogado: ${document.getElementById('oabNum')?.value || ''}</span>
                                <span>🌐 buscadordjen.com.br</span>
                            </div>
                        </div>
                    </div>
                    <div class="info-area">
                        <h2 class="info-title">AGENDA DO MÊS: ${mesAnoStr.toUpperCase()}</h2>
                        <p class="info-date">Impresso em ${dateStr} às ${timeStr}</p>
                    </div>
                </div>
                
                <div class="kpi-board" style="display: flex; gap: 12px; margin-bottom: 24px;">
                    <div class="kpi-card" style="flex: 1; background: #faf8f5; border: 1px solid #e2ddd9; border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #a39e98; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Total do Mês</div>
                        <div style="font-size: 24px; font-weight: 700; color: #2e2c2a; margin-top: 4px;">${total}</div>
                    </div>
                    <div class="kpi-card" style="flex: 1; background: rgba(56, 161, 105, 0.05); border: 1px solid rgba(56, 161, 105, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #38A169; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Cumpridos</div>
                        <div style="font-size: 24px; font-weight: 700; color: #38A169; margin-top: 4px;">${cumpridos}</div>
                    </div>
                    <div class="kpi-card" style="flex: 1; background: rgba(221, 107, 32, 0.05); border: 1px solid rgba(221, 107, 32, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #DD6B20; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Pendentes</div>
                        <div style="font-size: 24px; font-weight: 700; color: #DD6B20; margin-top: 4px;">${pendentes}</div>
                    </div>
                    <div class="kpi-card" style="flex: 1; background: rgba(212, 76, 71, 0.05); border: 1px solid rgba(212, 76, 71, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #D44C47; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Atrasados</div>
                        <div style="font-size: 24px; font-weight: 700; color: #D44C47; margin-top: 4px;">${atrasados}</div>
                    </div>
                    <div class="kpi-card" style="flex: 1; background: #faf8f5; border: 1px solid #e2ddd9; border-radius: 8px; padding: 12px; text-align: center;">
                        <div style="font-size: 11px; color: #a39e98; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Eficiência</div>
                        <div style="font-size: 24px; font-weight: 700; color: #2e2c2a; margin-top: 4px;">${taxaEficiencia}%</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th class="col-num">Nº</th>
                            <th>Processo / Identificação</th>
                            <th>Tribunal</th>
                            <th>Ciclo do Prazo</th>
                            <th>Prazo Fatal</th>
                            <th>Status</th>
                            <th>Anotações e Tags</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sortedItems.forEach((p, idx) => {
            let statusBadge = "";
            if (p.cumprido) { statusBadge = `<span class="badge bg-green">✔ Cumprido</span>`; }
            else if (!p.fatal) { statusBadge = `<span class="badge bg-gray">Sem Prazo</span>`; }
            else {
                const dataFatal = parseDateBR(p.fatal); const diff = Math.ceil((dataFatal.getTime() - hjTime) / (1000 * 3600 * 24));
                if (diff < 0) statusBadge = `<span class="badge bg-red">Atrasado</span>`; else if (diff === 0) statusBadge = `<span class="badge bg-orange">Vence Hoje</span>`; else statusBadge = `<span class="badge bg-orange">Pendente</span>`;
            }

            let tribunal = p.siglaTribunal || (p.manual ? 'MANUAL' : '-');
            let jurisdicao = (p.uf && p.mun) ? `<div style="font-size: 10px; color: #a39e98; margin-top: 6px; font-weight: 500; letter-spacing: 0.2px;">📍 ${p.uf} - ${p.mun}</div>` : '';
            let procBlock = p.apelido ? `<span class="proc-name">${p.apelido}</span><span class="proc-sub">${p.processo}</span>` : `<span class="proc-name">${p.processo}</span>`;

            let datasCiclo = `<div class="datas-secundarias">Disp: <b>${p.disp || '-'}</b></div><div class="datas-secundarias">Início: <b>${p.inicio || '-'}</b></div>`;

            let anotacaoLimpa = p.anotacao || '';
            let anotacaoComTags = anotacaoLimpa.replace(/#([\wÀ-ÿ_]+)/g, '<span class="tag-badge">#$1</span>');

            let radarTags = [];
            if (p.textoCompleto) {
                const txtLow = p.textoCompleto.toLowerCase();
                palavrasUrgentes.forEach(palavra => {
                    if (txtLow.includes(palavra)) {
                        const palavraFormatada = palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
                        radarTags.push("#" + palavraFormatada);
                    }
                });
            }
            let radarHtml = radarTags.length > 0 ? radarTags.map(t => `<span class="tag-radar">${t}</span>`).join('') : '';
            let tarefasHtml = '';
            if (p.tarefas && p.tarefas.length > 0) {
                tarefasHtml = `<div style="margin-top: 8px; font-size: 11px; border: 1px solid #e2ddd9; padding: 6px; border-radius: 4px; background: #faf8f5;"><strong>Tarefas do Prazo:</strong><br>` +
                    p.tarefas.map(t => `<div style="margin-top:4px; display: flex; align-items: flex-start; gap: 4px;"><span>${t.feita ? '☑' : '☐'}</span><span style="${t.feita ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${t.texto}</span></div>`).join('') +
                    `</div>`;
            }

            let blocoAnotacoes = `<div style="color:#615d59; font-size: 12px; margin-bottom: 6px;">${anotacaoComTags || '-'}</div>`;
            if (radarHtml) blocoAnotacoes += `<div>${radarHtml}</div>`;
            if (tarefasHtml) blocoAnotacoes += tarefasHtml;

            const trClass = p.cumprido ? ' class="row-cumprido" style="opacity: 0.6; background: #fdfdfc;"' : '';
            html += `<tr${trClass}><td class="col-num">${idx + 1}</td><td>${procBlock}</td><td><span class="badge bg-trib">${tribunal}</span>${jurisdicao}</td><td>${datasCiclo}</td><td class="fatal-date">${p.fatal || '-'}</td><td>${statusBadge}</td><td>${blocoAnotacoes}</td></tr>`;
        });

        html += `</tbody></table></div>
        <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #a39e98; letter-spacing: 0.2px;">
            Aviso:Esta contagem é uma previsão. Confirme sempre as suspensões e feriados nos canais oficiais do tribunal.
        </div>
        <script> window.onload = function() { setTimeout(function() { window.print(); }, 500); } </script>
        </body></html>`;

        const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob);
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) { chrome.tabs.create({ url: url }); } else { window.open(url, '_blank'); }
    }

    function gerarLinkGCal(p) {
        if (!p || !p.fatal) return '';
        const partesData = p.fatal.split('/'); const ano = partesData[2]; const mes = partesData[1]; const dia = partesData[0];
        const horaConfig = document.getElementById('horaNotificacao')?.value || "08:30";
        const [h, min] = horaConfig.split(':');
        const dataObj = new Date(ano, mes - 1, dia, parseInt(h), parseInt(min));
        const dataInicio = `${ano}${mes}${dia}T${h}${min}00`;
        dataObj.setHours(dataObj.getHours() + 1);
        const nextAno = dataObj.getFullYear(); const nextMes = String(dataObj.getMonth() + 1).padStart(2, '0'); const nextDia = String(dataObj.getDate()).padStart(2, '0'); const nextH = String(dataObj.getHours()).padStart(2, '0'); const nextMin = String(dataObj.getMinutes()).padStart(2, '0');
        const dataFim = `${nextAno}${nextMes}${nextDia}T${nextH}${nextMin}00`;
        const alias = p.apelido ? `[${p.apelido}] ` : '';
        const title = encodeURIComponent(`🚨 PRAZO FATAL: ${alias}${p.processo}`);

        let descStr = `Processo: ${p.processo}\nDisponibilizado: ${p.disp || p.pub}\nPublicação: ${p.pub}\nInício do Prazo: ${p.inicio}`;

        let tagsAutom = [];
        if (p.textoCompleto) {
            const textoLow = p.textoCompleto.toLowerCase();
            palavrasUrgentes.forEach(palavra => {
                if (textoLow.includes(palavra)) {
                    const palavraFormatada = palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
                    tagsAutom.push("#" + palavraFormatada);
                }
            });
        }

        if (tagsAutom.length > 0) {
            descStr += `\n\n🎯 RADAR AUTOMÁTICO:\n${tagsAutom.join(' ')}`;
        }

        if (p.anotacao) {
            descStr += `\n\n📌 Notas Manuais:\n${p.anotacao}`;
        }

        if (p.feriados > 0 || p.prorrogado) { descStr += `\n\n⚠️ AUDITORIA DO CÁLCULO:`; if (p.feriados > 0) descStr += `\n- ${p.feriados} dias não úteis/feriados desviados.`; if (p.prorrogado) descStr += `\n- O prazo fatal caiu num dia não útil e foi prorrogado para o dia útil seguinte.`; }
        if (p.temFeriadoMunicipal) { descStr += `\n\n🚨 ATENÇÃO SJT:\nPrazo coincide com feriado municipal. Anexe certidão ou decreto local para comprovar a tempestividade (art. 1.003, § 6º, CPC).`; }

        descStr += `\n\n---\n🤖 Calculado pelo Buscador DJEN\n🌐 www.buscadordjen.com.br`;

        if (descStr.length > 1500) { descStr = descStr.substring(0, 1500) + "\n\n... [Texto truncado devido a limite da URL]"; }

        // Modifica a URL para usar a sub-rota do e-mail configurado, se houver
        const emailGcal = document.getElementById('inputEmailGcal')?.value.trim() || localStorage.getItem('djen_email_gcal');
        const urlParams = `text=${title}&dates=${dataInicio}/${dataFim}&details=${encodeURIComponent(descStr)}`;

        // Se não houver, ele abre na conta padrão normalmente, sem risco de erro 404.
        if (emailGcal && emailGcal.trim() !== "") {
            return `https://calendar.google.com/calendar/render?action=TEMPLATE&authuser=${encodeURIComponent(emailGcal.trim())}&${urlParams}`;
        }

        // Se não houver e-mail, mantemos a rota clássica padrão
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&${urlParams}`;
    }

    function gerarTextoCompartilhamento(arr, tituloContexto = "Publicação") {
        let txtBase = `🗓️ *${tituloContexto || 'Controle de Prazos DJEN'}*\n\n`;
        if (!Array.isArray(arr)) arr = [arr];

        const pendentes = arr.filter(p => !p.cumprido);
        const cumpridos = arr.filter(p => p.cumprido);
        const atrasados = pendentes.filter(p => p.fatal && (parseDateBR(p.fatal).getTime() - new Date().setHours(12,0,0,0)) < 0);
        
        txtBase += `📊 *RESUMO:*\n`;
        txtBase += `• Total listados: ${arr.length}\n`;
        txtBase += `• Pendentes: ${pendentes.length} ${atrasados.length > 0 ? `(🚨 ${atrasados.length} Atrasado${atrasados.length > 1 ? 's' : ''})` : ''}\n`;
        txtBase += `• Cumpridos: ${cumpridos.length}\n\n`;
        txtBase += `--------------------------------------------------\n\n`;

        arr.forEach((p, index) => {
            let num = arr.length > 1 ? `*${index + 1}.* ` : "";
            let txtRaw = p.textoCompleto || p.teor || "";
            let proc = getProc(p, cleanText(txtRaw)); if (proc !== "Processo s/ número") proc = formatCNJ(proc);
            let tituloProc = p.apelido ? `*${p.apelido}*\n${proc}` : `*${proc}*`;
            let status = "";
            let objPrazo = p.prazoCalculado || p;

            if (objPrazo.cumprido) status = "✅ Cumprido";
            else if (!objPrazo.fatal) status = "⚠️ Sem prazo";
            else {
                const diff = Math.ceil((parseDateBR(objPrazo.fatal).getTime() - new Date().setHours(12, 0, 0, 0)) / (1000 * 3600 * 24));
                status = diff < 0 ? "🚨 Atrasado" : (diff === 0 ? "⚠️ Vence Hoje" : `⏳ Pendente (${diff} dias)`);
            }

            txtBase += `${num}${tituloProc}\n`;
            txtBase += `🏢 Tribunal: ${p.siglaTribunal || (objPrazo.mat || 'MANUAL')}\n`;
            if (objPrazo.fatal) txtBase += `📅 Prazo Fatal: ${objPrazo.fatal} (${status})\n`;
            else txtBase += `📅 Status: ${status}\n`;

            let tarefas = objPrazo.tarefas || p.tarefas || [];
            if (tarefas && tarefas.length > 0) {
                txtBase += `\n📋 *Tarefas:*\n`;
                tarefas.forEach(t => {
                    txtBase += `${t.feita ? '✅' : '☐'} ${t.texto}\n`;
                });
            }

            if (p.anotacao) {
                let cleanNotes = p.anotacao.replace(/#[\wÀ-ÿ_]+/g, '').trim();
                if (cleanNotes) txtBase += `\n📝 *Anotações:*\n${cleanNotes}\n`;
            }

            if (txtRaw) txtBase += `\n📄 Teor: ${cleanText(txtRaw)}\n`;

            if (arr.length > 1) txtBase += `\n--------------------------------------------------\n\n`;
        });

        txtBase += `---\n🤖 *Buscador DJEN*\n🌐 www.buscadordjen.com.br`;
        return txtBase.trim();
    }

    function exportarTxtLote(arr, titulo) {
        if (!arr || arr.length === 0) { showToast("Nenhum item para copiar.", "⚠️"); return; }
        const txtBase = gerarTextoCompartilhamento(arr, titulo);
        const fallbackCopy = (text) => { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); showToast("Resultados copiados em lote!", "📎"); };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txtBase).then(() => { ; showToast("Resultados copiados em lote!", "📎"); }).catch(() => fallbackCopy(txtBase)); } else { fallbackCopy(txtBase); }
    }

    function abrirModalCompartilhar(tipo) {
        const modal = document.getElementById('shareModal');
        const title = document.getElementById('shareModalTitle');
        if (tipo === 'lote') {
            if (title) title.textContent = "Exportar & Compartilhar Lote";
        } else {
            if (title) title.textContent = "Compartilhar Publicação";
        }
        if (modal) modal.classList.add('show');
    }

    let cacheMunicipios = {};
    let feriadosExtras = {};

    async function carregarMunicipios(uf, datalistId) {
        if (!document.getElementById(datalistId)) { const dl = document.createElement('datalist'); dl.id = datalistId; document.body.appendChild(dl); }
        const datalist = document.getElementById(datalistId);
        if (!cacheMunicipios[uf]) {
            try {
                const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
                const dados = await r.json(); cacheMunicipios[uf] = dados.map(m => m.nome); datalist.innerHTML = "";
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

    // =========================================================
    // MOTOR MATEMÁTICO DE PRAZOS (PURO E ISOLADO) - CORRIGIDO
    // =========================================================
    const MotorDePrazos = {
        calcular: function (params) {
            const { pubEscolhida, dias, tipo, direcao, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos, tipoData = 'dje' } = params;

            let dataAtual = new Date(pubEscolhida + 'T15:00:00');
            let timeline = [];
            let totalFeriados = 0;
            let temFeriadoMun = false;
            let prorrogado = false;

            const f = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            const formatISO = (dObj) => dObj.toISOString().split('T')[0];

            if (tipoData === 'dje') {
                timeline.push({ data: dataAtual.toISOString(), desc: "Disponibilizado", tipo: "info", numero: "Disp." });

                // 1. ACHAR A DATA DE PUBLICAÇÃO
                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                while (true) {
                    let dStr = formatISO(dataAtual);
                    let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                    if (motivo === "Dia Útil") break;
                    if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true;
                    timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                    dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                }
            }

            const dtPub = new Date(dataAtual);
            timeline.push({ data: dtPub.toISOString(), desc: tipoData === 'painel' ? "Leitura / Intimação" : "Publicação", tipo: "info", numero: tipoData === 'painel' ? "Int." : "Pub." });

            // 2. ACHAR O INÍCIO DO PRAZO
            dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
            while (true) {
                let dStr = formatISO(dataAtual);
                let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                if (motivo === "Dia Útil") break;
                if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true;
                timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
            }
            const dtInicio = new Date(dataAtual);

            // 3. LAÇO DE CONTAGEM (CPC ou CPP)
            if (tipo === 'cpc') {
                let diasContados = 1;
                timeline.push({ data: dataAtual.toISOString(), desc: "Dia Útil", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia 1" });
                while (diasContados < dias) {
                    dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                    let dStr = formatISO(dataAtual);
                    let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                    if (motivo === "Dia Útil") {
                        diasContados++;
                        timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: diasContados === dias ? "fatal" : "util", numero: "Dia " + diasContados });
                    } else {
                        totalFeriados++;
                        if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true;
                        timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                    }
                }
            } else { // Regra CPP
                let diasContados = 1;
                timeline.push({ data: dataAtual.toISOString(), desc: "Dia Corrido", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia 1" });
                while (diasContados < dias) {
                    dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                    let dStr = formatISO(dataAtual);
                    let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                    if (motivo !== "Dia Útil") { totalFeriados++; if (motivo.toLowerCase().match(/(municipal|estadual|forense|tribunal|expediente|suspens)/)) temFeriadoMun = true; }
                    diasContados++;
                    timeline.push({ data: dataAtual.toISOString(), desc: motivo !== "Dia Útil" ? motivo : "Dia Corrido", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia " + diasContados });
                }

                // Prorrogação final se cair em dia não-útil
                let dStrFatal = formatISO(dataAtual);
                let motivoFatal = checarMotivoFeriado(dStrFatal, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                while (motivoFatal !== "Dia Útil") {
                    prorrogado = true;
                    timeline[timeline.length - 1].tipo = "pulo";
                    timeline[timeline.length - 1].numero = "Prorrogado";
                    dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                    dStrFatal = formatISO(dataAtual);
                    motivoFatal = checarMotivoFeriado(dStrFatal, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                    timeline.push({ data: dataAtual.toISOString(), desc: motivoFatal === "Dia Útil" ? "Prorrogação" : motivoFatal, tipo: motivoFatal === "Dia Útil" ? "fatal" : "pulo", numero: motivoFatal === "Dia Útil" ? "Dia " + dias : "-" });
                }
            }

            const dtFatal = new Date(dataAtual);

            let diasRecuo = parseInt(window.diasControleInterno);
            if (isNaN(diasRecuo)) diasRecuo = 3;

            let dtControle = new Date(dtFatal);
            dtControle.setDate(dtControle.getDate() - diasRecuo);

            if (dtControle.getDay() === 6) dtControle.setDate(dtControle.getDate() - 1);
            if (dtControle.getDay() === 0) dtControle.setDate(dtControle.getDate() - 2);

            return {
                disp: f(new Date(pubEscolhida + 'T15:00:00')),
                pub: f(dtPub),
                inicio: f(dtInicio),
                fatal: f(dtFatal),
                feriados: totalFeriados,
                temFeriadoMunicipal: temFeriadoMun,
                prorrogado: prorrogado,
                timeline: timeline
            };
        }
    };

    // FUNÇÃO CORRIGIDA: preencherAuditoriaVisual
    function preencherAuditoriaVisual(timeline, container) {
        try {
            if (!container) {
                console.error("DJEN: Container da auditoria não encontrado");
                return;
            }

            if (!timeline || !timeline.length) {
                console.warn("DJEN: Timeline vazia ou inválida");
                container.innerHTML = '<div class="audit-empty" style="text-align:center; padding:20px; color: var(--text-muted);">Nenhuma auditoria disponível para este prazo.</div>';
                return;
            }

            container.innerHTML = "";
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

                dia.innerHTML = `
                    <div class="day-icon" style="font-size: 18px; margin-bottom: 6px;">${icone}</div>
                    <div class="day-num" style="font-size: 16px; font-weight: 700; line-height: 1;">${numeroLimpo}</div>
                    <div class="day-date" style="font-size: 10px; font-weight: 500; color: var(--text-muted); margin-top: 4px;">${dataCurta}</div>
                `;

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
                container.innerHTML = '<div class="audit-error" style="text-align:center; padding:20px; color: var(--zen-red);">Erro ao carregar auditoria. Recalcule o prazo.</div>';
            }
        }
    }

    function extrairPrazoSugerido(textoLimpo) {
        if (!textoLimpo) return 15;
        let txt = textoLimpo.toLowerCase();
        const matchDigito = txt.match(/(\d{1,3})\s*(?:\([^)]+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i);
        if (matchDigito && matchDigito[1]) return parseInt(matchDigito[1], 10);
        const matchExtenso = txt.match(/\b(um|dois|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezassete|dezoito|dezanove|vinte|trinta|quarenta|cinquenta|sessenta)\b\s*(?:\(\d+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i);
        if (matchExtenso && matchExtenso[1]) {
            const mapa = { 'um': 1, 'dois': 2, 'tres': 3, 'três': 3, 'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'catorze': 14, 'quatorze': 14, 'quinze': 15, 'dezesseis': 16, 'vinte': 20, 'trinta': 30 };
            return mapa[matchExtenso[1].toLowerCase().replace('ê', 'e')] || 15;
        }
        return 15;
    }

    function autoPreencherTribunal(sigla, elUf, elMun) {
        const t = sigla ? sigla.toUpperCase().trim() : "";
        let ufDetectada = ""; let munDetectado = "";

        const trtMap = { "TRT1": "RJ", "TRT2": "SP", "TRT3": "MG", "TRT4": "RS", "TRT5": "BA", "TRT6": "PE", "TRT7": "CE", "TRT8": "PA", "TRT9": "PR", "TRT10": "DF", "TRT11": "AM", "TRT12": "SC", "TRT13": "PB", "TRT14": "RO", "TRT15": "SP", "TRT16": "MA", "TRT17": "ES", "TRT18": "GO", "TRT19": "AL", "TRT20": "SE", "TRT21": "RN", "TRT22": "PI", "TRT23": "MT", "TRT24": "MS" };
        const trfMap = { "TRF1": "DF", "TRF2": "RJ", "TRF3": "SP", "TRF4": "RS", "TRF5": "PE", "TRF6": "MG" };
        const capitais = { "AC": "Rio Branco", "AL": "Maceió", "AP": "Macapá", "AM": "Manaus", "BA": "Salvador", "CE": "Fortaleza", "DF": "Brasília", "ES": "Vitória", "GO": "Goiânia", "MA": "São Luís", "MT": "Cuiabá", "MS": "Campo Grande", "MG": "Belo Horizonte", "PA": "Belém", "PB": "João Pessoa", "PR": "Curitiba", "PE": "Recife", "PI": "Teresina", "RJ": "Rio de Janeiro", "RN": "Natal", "RS": "Porto Alegre", "RO": "Porto Velho", "RR": "Boa Vista", "SC": "Florianópolis", "SP": "São Paulo", "SE": "Aracaju", "TO": "Palmas" };

        const matchTRT = t.match(/TRT\s?-?\s?(\d{1,2})/);
        const matchTRF = t.match(/TRF\s?-?\s?(\d{1})/);
        const matchSiglaDireta = t.match(/(?:TJ|TRE|TRF|TRT|SJ)[- ]?([A-Z]{2})\b/i) || t.match(/\b([A-Z]{2})\b/i);

        if (matchTRT && trtMap["TRT" + matchTRT[1]]) {
            ufDetectada = trtMap["TRT" + matchTRT[1]];
            munDetectado = (matchTRT[1] === "15") ? "Campinas" : capitais[ufDetectada];
        } else if (matchTRF && trfMap["TRF" + matchTRF[1]]) {
            ufDetectada = trfMap["TRF" + matchTRF[1]];
            munDetectado = capitais[ufDetectada];
        } else if (matchSiglaDireta) {
            ufDetectada = matchSiglaDireta[1].toUpperCase();
            munDetectado = capitais[ufDetectada] || "";
        }

        if (ufDetectada) {
            const ufAnterior = elUf.value;
            const opt = Array.from(elUf.options).find(o => o.value === ufDetectada);

            if (opt) {
                elUf.value = ufDetectada;

                if (ufAnterior !== ufDetectada || !elMun.value.trim()) {
                    if (munDetectado) elMun.value = munDetectado;
                    else elMun.value = "";
                }
            }
        }
    }

    let timeoutDesfazer;
    function removerComDesfazer(key, isBuscaContext, currentCardNode = null) {
        if (!prazosSalvos[key]) return; const itemSalvoBak = JSON.parse(JSON.stringify(prazosSalvos[key])); delete prazosSalvos[key]; savePrazosSalvos(); atualizarEstatisticas();
        if (currentCardNode) { currentCardNode.classList.remove('aberto'); currentCardNode.style.opacity = '0'; currentCardNode.style.transform = 'scale(0.95)'; setTimeout(() => { currentCardNode.style.display = 'none'; if (!isBuscaContext) { if (Object.keys(prazosSalvos).filter(k => prazosSalvos[k] && (prazosSalvos[k].fatal || prazosSalvos[k].manual)).length === 0) renderAgenda(); } }, 250); }
        if (isBuscaContext) updateProgressBar(); const toast = document.getElementById('toastDesfazer'); if (toast) toast.classList.add('show');
        document.getElementById('btnAcaoDesfazer').onclick = () => { prazosSalvos[key] = itemSalvoBak; savePrazosSalvos(); if (toast) toast.classList.remove('show'); atualizarEstatisticas(); if (isBuscaContext) { if (currentCardNode) { currentCardNode.style.display = 'block'; setTimeout(() => { currentCardNode.style.opacity = '1'; currentCardNode.style.transform = 'none'; }, 50); } else { applyFilters(); } updateProgressBar(); } else { renderAgenda(); renderCalendar(); } };
        clearTimeout(timeoutDesfazer); timeoutDesfazer = setTimeout(() => { if (toast) toast.classList.remove('show'); if (!isBuscaContext) renderCalendar(); }, 6000);
    }

    let timeoutCumprir;
    function alternarCumprimento(key, currentCardNode, isBuscaContext) {
        const item = prazosSalvos[key]; if (!item || !item.fatal) { showToast("É necessário calcular o prazo antes de marcá-lo como cumprido.", "⚠️"); return; }
        const isCumprindo = !item.cumprido; 
        item.cumprido = isCumprindo; 
        if (isCumprindo) item.dataCumprimento = new Date().toISOString(); else delete item.dataCumprimento;
        savePrazosSalvos(); processarCheckCumprido(isCumprindo, true);
        const shouldHide = !isBuscaContext && ((filtroAgendaAtivo !== null && filtroAgendaAtivo !== 'cumpridos' && isCumprindo) || (filtroAgendaAtivo === 'cumpridos' && !isCumprindo));
        if (shouldHide) { currentCardNode.classList.remove('aberto'); currentCardNode.style.opacity = '0'; currentCardNode.style.transform = 'scale(0.95)'; setTimeout(() => { currentCardNode.style.display = 'none'; renderCalendar(); }, 250); } else { if (isBuscaContext) applyFilters(); else { renderAgenda(); renderCalendar(); } }
        atualizarEstatisticas(); const toast = document.getElementById('toastDesfazer'); if (toast) { const msgSpan = toast.querySelector('span'); msgSpan.innerHTML = isCumprindo ? `Prazo cumprido` : `Prazo reaberto`; toast.classList.add('show'); }
        document.getElementById('btnAcaoDesfazer').onclick = () => { 
            item.cumprido = !isCumprindo; 
            if (item.cumprido) item.dataCumprimento = new Date().toISOString(); else delete item.dataCumprimento;
            savePrazosSalvos(); processarCheckCumprido(item.cumprido, true); atualizarEstatisticas(); if (toast) toast.classList.remove('show'); if (shouldHide) { currentCardNode.style.display = 'block'; setTimeout(() => { currentCardNode.style.opacity = '1'; currentCardNode.style.transform = 'none'; }, 50); } else { if (isBuscaContext) applyFilters(); else renderAgenda(); renderCalendar(); } 
        };
        clearTimeout(timeoutCumprir); timeoutCumprir = setTimeout(() => { if (toast) toast.classList.remove('show'); if (shouldHide && document.getElementById('viewSalvos').style.display !== 'none') { renderAgenda(); renderCalendar(); } }, 6000);
    }


    // ==========================================
    // DELEGAÇÃO DE EVENTOS DE CLIQUE
    // ==========================================
    document.addEventListener('click', (e) => {

        if (e.target.closest('#btnShareSalvosLote')) {
            e.preventDefault(); e.stopPropagation();
            const itens = getItensAgendaFiltrados();
            if (itens.length === 0) { showToast("Nenhum prazo encontrado com este filtro para compartilhar.", "⚠️"); return; }
            textoParaCompartilhar = gerarTextoCompartilhamento(itens, "Relatórios de prazos");
            tituloParaCompartilhar = "Relatórios de prazos DJEN";
            abrirModalCompartilhar('lote'); return;
        }

        if (e.target.closest('#btnShareBuscaLote')) {
            e.preventDefault(); e.stopPropagation();
            if (resultadosExibidos.length === 0) { showToast("Não há resultados disponíveis para compartilhamento.", "⚠️"); return; }
            textoParaCompartilhar = gerarTextoCompartilhamento(resultadosExibidos, "Resultados da Busca");
            tituloParaCompartilhar = "Resultados da Busca DJEN";
            abrirModalCompartilhar('lote'); return;
        }

        if (e.target.closest('#shareWpp')) {
            e.preventDefault(); e.stopPropagation();
            let text = textoParaCompartilhar;

            if (text.length > 3500) {
                text = text.substring(0, 3500) + "\n\n... [Aviso: O texto é longo demais e foi truncado. Para enviar o conteúdo completo, use o botão de Copiar 📋 da extensão e cole aqui]";
            }

            openSafeLink(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
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
            const subject = encodeURIComponent(tituloParaCompartilhar || "Buscador DJEN");
            let body = textoParaCompartilhar;

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

        if (e.target.closest('.modal-close') || e.target.classList.contains('modal-overlay') || e.target.id === 'focusModeOverlay') {
            e.preventDefault(); e.stopPropagation();
            const overlay = e.target.closest('.modal-overlay') || e.target;
            overlay.classList.remove('show');
            return;
        }

        if (!e.target.closest('.card-menu-container') && !e.target.closest('.header-menu-container')) {
            document.querySelectorAll('.card-dropdown.show, #headerDropdown.show').forEach(drop => { drop.classList.remove('show'); });
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
            if (!e.target.closest('#btnVerNivel')) { e.stopPropagation(); document.getElementById('headerDropdown')?.classList.toggle('show'); }
            return;
        }

        if (e.target.closest('#btnVerNivel')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            atualizarRelatorioProdutividade(); document.getElementById('rankModal')?.classList.add('show'); return;
        }

        function gerarCSVDados(itensArray, nomeArquivoBase) {
            if (itensArray.length === 0) { showToast("Nenhum dado para exportar.", "⚠️"); return; }
            let csv = "Processo;Apelido;Tribunal;UF;Status;Prazo_Fatal;Tarefas_Pendentes;Tarefas_Concluidas;Anotacoes;Texto_Publicacao;Municipio;Feriados_Detectados;Materia;Tipo_Contagem;Inicio_Prazo;Dias_Prazo;Houve_Prorrogacao;Disponibilizacao;Publicacao;Criacao;ID_Sistema\n";

            itensArray.forEach(p => {
                const key = Object.keys(prazosSalvos).find(k => prazosSalvos[k] === p) || "";

                const limpaCSV = (str) => {
                    if (!str) return "";
                    return String(str).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
                };

                const formataDataStr = (str) => {
                    if (!str) return "";
                    if (str.includes('/')) return str;
                    const parts = str.split('T')[0].split('-');
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    return str;
                };

                const idSistema = key;
                const processo = p.processo || "";
                const apelido = limpaCSV(p.apelido);
                const tribunal = p.siglaTribunal || (p.manual ? "MANUAL" : "");
                const uf = p.uf || "";
                const municipio = limpaCSV(p.mun);
                const materia = p.mat || "";
                const criacao = p.manual ? "Manual" : "Captura Automática";
                const tipoContagem = p.mat === 'Criminal' ? "Dias Corridos" : "Dias Úteis";
                const diasPrazo = p.dias || "";
                const disp = formataDataStr(p.disp);
                const pub = formataDataStr(p.pub);
                const inicio = formataDataStr(p.inicio);
                const fatal = p.fatal || ""; 
                const feriados = p.feriados || 0;
                const prorrogado = p.prorrogado ? "SIM" : "NAO";
                let status = "SEM PRAZO";
                if (p.cumprido) status = "CUMPRIDO";
                else if (p.fatal) {
                    const diff = Math.ceil((parseDateBR(p.fatal).getTime() - new Date().setHours(12, 0, 0, 0)) / (1000 * 3600 * 24));
                    status = diff < 0 ? "ATRASADO" : (diff === 0 ? "VENCE HOJE" : "PENDENTE");
                }
                
                let pendentes = [];
                let concluidas = [];
                if (p.tarefas && Array.isArray(p.tarefas)) {
                    p.tarefas.forEach(t => {
                        if (t.feita) concluidas.push(t.texto);
                        else pendentes.push(t.texto);
                    });
                }
                const tarefasPendentesStr = limpaCSV(pendentes.join(" | "));
                const tarefasConcluidasStr = limpaCSV(concluidas.join(" | "));

                const anotacoes = limpaCSV(p.anotacao);
                const textoPub = limpaCSV(p.textoCompleto || p.teor);

                csv += `"${processo}";"${apelido}";"${tribunal}";"${uf}";"${status}";"${fatal}";"${tarefasPendentesStr}";"${tarefasConcluidasStr}";"${anotacoes}";"${textoPub}";"${municipio}";"${feriados}";"${materia}";"${tipoContagem}";"${inicio}";"${diasPrazo}";"${prorrogado}";"${disp}";"${pub}";"${criacao}";"${idSistema}"\n`;
            });

            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
            link.download = `${nomeArquivoBase}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);

            showToast("Dados exportados com sucesso!", "📊");
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
                palavrasUrgentes = inputRadar.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
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
            aplicarTema(temaAtual);
            document.getElementById('headerDropdown')?.classList.remove('show');
            return;
        }

        // Abrir o modal da Agenda a partir do menu
        if (e.target.closest('#btnConfigurarAgenda')) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('headerDropdown')?.classList.remove('show');

            // Busca o e-mail na memória nativa e preenche o campo
            const emailSalvo = localStorage.getItem('djen_email_gcal');
            const inEmail = document.getElementById('inputEmailGcal');
            if (inEmail && emailSalvo) inEmail.value = emailSalvo;

            document.getElementById('agendaModal')?.classList.add('show');
            return;
        }

        // Salvar o e-mail digitado
        if (e.target.closest('#btnSalvarEmailAgenda')) {
            e.preventDefault(); e.stopPropagation();
            const inputEmail = document.getElementById('inputEmailGcal');

            if (inputEmail) {
                // Salva o e-mail diretamente na memória nativa
                localStorage.setItem('djen_email_gcal', inputEmail.value.trim());
            }

            document.getElementById('agendaModal')?.classList.remove('show');
            showToast("Conta da agenda atualizada!", "⚙️");
            return;
        }

        // Fechar o modal da agenda
        if (e.target.closest('#agendaModal .modal-close') || (e.target.classList.contains('modal-overlay') && e.target.id === 'agendaModal')) {
            document.getElementById('agendaModal')?.classList.remove('show');
            return;
        }

        // Fechar o modal da agenda no botão fechar ou fora dele
        if (e.target.closest('#agendaModal .modal-close') || (e.target.classList.contains('modal-overlay') && e.target.id === 'agendaModal')) {
            document.getElementById('agendaModal')?.classList.remove('show');
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
            document.getElementById('backupResumo').innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">📋 <b>${total}</b> prazos na base</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">⏰ <b>${pendentes}</b> pendentes</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">✅ <b>${cumpridos}</b> cumpridos</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-light);">📄 <span style="font-size: 11px; opacity: 0.7;">${nomeArquivo}</span></div>
        `;
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

        if (e.target.closest('#btnRestaurarBackupMenu')) {
            e.preventDefault(); e.stopPropagation();
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
                        const data = JSON.parse(readEvent.target.result);

                        const totalBackup = data.prazosSalvos ? Object.keys(data.prazosSalvos).length : 0;
                        const pendentesBackup = data.prazosSalvos ? Object.values(data.prazosSalvos).filter(p => !p.cumprido && p.fatal).length : 0;
                        const dataArquivo = data.metadados?.data_geracao ? new Date(data.metadados.data_geracao).toLocaleDateString('pt-BR') : 'Desconhecida';
                        const oabArquivo = data.configuracoes?.oabNum || '---';

                        const totalAtual = Object.keys(prazosSalvos).length;
                        const pendentesAtual = Object.values(prazosSalvos).filter(p => !p.cumprido && p.fatal).length;

                        const dadosIdenticos = (totalBackup === totalAtual && pendentesBackup === pendentesAtual);
                        const icone = dadosIdenticos ? 'ℹ️' : '⚠️';
                        const corAviso = dadosIdenticos ? 'var(--primary)' : 'var(--zen-red)';
                        const bgAviso = dadosIdenticos ? 'var(--primary-light)' : 'var(--zen-red-bg)';
                        const txtAviso = dadosIdenticos ? 'ℹ️ Dados idênticos - O arquivo contém os mesmos ' + totalBackup + ' prazos da sua base atual.' : '⚠️ Esta ação não pode ser desfeita!';
                        const txtBotao = dadosIdenticos ? '🔄 Restaurar' : '⚠️ Restaurar';
                        const corBotao = dadosIdenticos ? 'var(--primary)' : 'var(--zen-red)';

                        document.getElementById('backupIcon').textContent = icone;
                        document.getElementById('backupTitle').textContent = 'Restaurar Backup';
                        document.getElementById('backupSubtitle').textContent = dadosIdenticos ? 'Arquivo idêntico à base atual' : 'Seus dados atuais serão substituídos';
                        document.getElementById('backupResumo').innerHTML = `
            <div style="margin-bottom: 8px; font-weight: 600; color: var(--primary);">📥 CONTEÚDO DO ARQUIVO:</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">📋 <b>${totalBackup}</b> prazos</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">⏰ <b>${pendentesBackup}</b> pendentes</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">👤 OAB: <b>${oabArquivo}</b></div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">📅 Data: <b>${dataArquivo}</b></div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-light); font-weight: 600; color: var(--zen-red);">🗑️ SEUS DADOS ATUAIS:</div>
            <div style="display: flex; align-items: center; gap: 8px;">📋 <b>${totalAtual}</b> prazos serão perdidos</div>
            <div style="display: flex; align-items: center; gap: 8px;">⏰ <b>${pendentesAtual}</b> pendentes</div>
            `;
                        document.getElementById('backupAviso').style.display = 'block';
                        document.getElementById('backupAviso').textContent = txtAviso;
                        document.getElementById('backupAviso').style.setProperty('background', bgAviso, 'important');
                        document.getElementById('backupAviso').style.setProperty('color', corAviso, 'important');
                        document.getElementById('backupAviso').style.color = corAviso;
                        document.getElementById('btnConfirmarBackup').textContent = '⏳ Aguarde 2s...';
                        document.getElementById('btnConfirmarBackup').style.background = corBotao;
                        document.getElementById('btnConfirmarBackup').disabled = true;
                        document.getElementById('btnConfirmarBackup').style.opacity = '0.5';
                        document.getElementById('btnConfirmarBackup').style.cursor = 'not-allowed';

                        let contador = 2;
                        const timer = setInterval(() => {
                            contador--;
                            if (contador <= 0) {
                                clearInterval(timer);
                                document.getElementById('btnConfirmarBackup').disabled = false;
                                document.getElementById('btnConfirmarBackup').style.opacity = '1';
                                document.getElementById('btnConfirmarBackup').style.cursor = 'pointer';
                                document.getElementById('btnConfirmarBackup').textContent = txtBotao;
                            } else {
                                document.getElementById('btnConfirmarBackup').textContent = '⏳ Aguarde ' + contador + 's...';
                            }
                        }, 1000);

                        document.getElementById('btnConfirmarBackup').onclick = () => {
                            clearInterval(timer);
                            document.getElementById('backupConfirmModal')?.classList.remove('show');
                            executarRestauracao(data);
                        };

                        document.getElementById('backupConfirmModal')?.classList.add('show');

                    } catch (err) {
                        console.error("Erro na leitura do JSON:", err);
                        showToast("O sistema não conseguiu processar o arquivo de backup selecionado.", "❌");
                    }
                };
                reader.readAsText(file);
            };

            fileInput.click();
            return;
        }



        if (e.target.closest('#btnIndicarColega')) {
            e.preventDefault(); e.stopPropagation(); const msg = "Estou usando a extensão *Buscador DJEN* no navegador para salvar minhas publicações e calcular os prazos automaticamente. A interface é excelente. Recomendo baixar a ferramenta!"; openSafeLink(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`); document.getElementById('headerDropdown')?.classList.remove('show'); return;
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
            const inpT = document.getElementById('inputManualTeor'); if (inpT) inpT.innerHTML = '';
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
                tasksWrapper.innerHTML = '';
                prazosSalvos['manual_temp_draft'] = { processo: "Rascunho", tarefas: [] };
                const newTasksUI = createTasksWrapperUI('manual_temp_draft', 'Prazo Manual', '', document.getElementById('novoPrazoModal'));
                tasksWrapper.appendChild(newTasksUI);
            }
            
            document.getElementById('novoPrazoModal')?.classList.add('show');
            setTimeout(() => inpP?.focus(), 150);
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
            if (currentApelidoCallback) currentApelidoCallback(inputVal);
            document.getElementById('apelidoModal')?.classList.remove('show');
            currentApelidoCallback = null;
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
            if (inputTeor) inputTeor.innerHTML = '';
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
                const cnjFormatado = formatCNJ(procRaw);
                if (cnjFormatado.includes('-') && cnjFormatado.includes('.')) {
                    proc = cnjFormatado;
                } else if (procRaw.replace(/\D/g, '').length === 20) {
                    proc = formatCNJ(procRaw);
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
            
            if (prazosSalvos['manual_temp_draft'] && prazosSalvos['manual_temp_draft'].tarefas) {
                novoItem.tarefas = prazosSalvos['manual_temp_draft'].tarefas;
                delete prazosSalvos['manual_temp_draft'];
            }
            
            if (apelido) { novoItem.apelido = apelido; }
            
            if (dataVencimento) {
                const p = dataVencimento.split('-');
                novoItem.fatal = `${p[2]}/${p[1]}/${p[0]}`;
            }
            
            prazosSalvos[itemKey] = novoItem;
            savePrazosSalvos(); 
            
            const inputData = document.getElementById('inputManualDataVencimento');
            const inputTeor = document.getElementById('inputManualTeor');
            const inputProc = document.getElementById('inputManualProcesso');
            if (inputData) inputData.value = '';
            if (inputTeor) inputTeor.innerHTML = '';
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
            e.target.outerHTML = e.target.innerHTML;
            if (activeKey && prazosSalvos[activeKey]) { const novoHtml = focoOverlay.classList.contains('show') ? document.getElementById('focusTeorContent').innerHTML : document.querySelector(`.intimacao-card[data-key="${activeKey}"] .teor-inner-box`).innerHTML; prazosSalvos[activeKey].textoHtml = novoHtml; savePrazosSalvos(); const teorBox = document.querySelector(`.intimacao-card[data-key="${activeKey}"] .teor-inner-box`); if (teorBox && focoOverlay.classList.contains('show')) teorBox.innerHTML = novoHtml; }
            showToast("Marcação apagada!", "🧹"); return;
        }

        const btnOpcoes = e.target.closest('.btn-opcoes-card'); if (btnOpcoes) { e.preventDefault(); e.stopPropagation(); const container = btnOpcoes.closest('.card-menu-container'); if (!container) return; const dropdown = container.querySelector('.card-dropdown'); const isOpen = dropdown.classList.contains('show'); document.querySelectorAll('.card-dropdown.show').forEach(d => d.classList.remove('show')); if (!isOpen) { dropdown.classList.add('show'); } return; }

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

        const copyPix = e.target.closest('.pix-btn-copy'); if (copyPix) { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(pixCodeText).then(() => { const originalHTML = copyPix.innerHTML; copyPix.innerHTML = `COPIADO`; copyPix.style.color = "#38A169"; setTimeout(() => { copyPix.innerHTML = originalHTML; copyPix.style.color = ""; }, 2000); }); return; }
    });

    window.onscroll = function () { const btnTopo = document.getElementById("btnIrTopo"); if (!btnTopo) return; if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) { btnTopo.classList.add('show'); } else { btnTopo.classList.remove('show'); } };
    const btnTopoClick = document.getElementById('btnIrTopo'); if (btnTopoClick) btnTopoClick.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    function processarCheckCumprido(isCumpridoAgora, skipToast = false) {
        if (isCumpridoAgora) {
            totalCumpridosHistorico++; SafeStorage.set({ 'djen_cumpridos_total': totalCumpridosHistorico });
            SafeStorage.get(['djen_ja_avaliou'], (data) => {
                if (totalCumpridosHistorico === 50 && !data.djen_ja_avaliou) {
                    document.getElementById('reviewModal')?.classList.add('show');
                } else {
                    if (!skipToast) showToast("Prazo cumprido!", "✅");
                }
            });
        } else {
            totalCumpridosHistorico--; if (totalCumpridosHistorico < 0) totalCumpridosHistorico = 0;
            SafeStorage.set({ 'djen_cumpridos_total': totalCumpridosHistorico });
            if (!skipToast) showToast("Prazo reaberto.", "🔄");
        }
    }

    function atualizarEstatisticas() {
        let hoje = 0, cincoDias = 0, futuros = 0, cumpridos = 0, esperaCount = 0; const hj = new Date(); hj.setHours(12, 0, 0, 0);
        for (let k in prazosSalvos) {
            const p = prazosSalvos[k];
            if (!p || (!p.fatal && !p.manual)) continue;
            if (p.cumprido) { cumpridos++; continue; }

            if (p.espera) {
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

    SafeStorage.get(['djen_theme', 'djen_font_focus', 'djen_prazos_salvos', 'djen_termos_radar', 'djen_notificar', 'djen_oab_numero', 'djen_oab_estado', 'djen_hora_notificacao', 'djen_last_search', 'djen_cumpridos_total', 'djen_last_backup_date', 'djen_total_buscas', 'djen_total_lidos', 'djen_total_salvos', 'djen_ultimo_aviso', 'djen_publicacoes_lidas', 'djen_dias_controle', 'djen_email_gcal'], (data) => {
        if (data.djen_termos_radar) { if (typeof data.djen_termos_radar === 'string') { palavrasUrgentes = data.djen_termos_radar.split(',').map(s => s.trim().toLowerCase()).filter(Boolean); } else if (Array.isArray(data.djen_termos_radar)) { palavrasUrgentes = data.djen_termos_radar.map(s => String(s).trim().toLowerCase()).filter(Boolean); } }
        if (data.djen_theme) { temaAtual = data.djen_theme; aplicarTema(temaAtual); }
        if (data.djen_font_focus) { fontSizeFocoAtual = parseInt(data.djen_font_focus); document.documentElement.style.setProperty('--font-focus', fontSizeFocoAtual + 'px'); }

        if (data.djen_prazos_salvos) {
            try {
                prazosSalvos = safeJSONParse(data.djen_prazos_salvos, {});
                console.log("DJEN: Prazos carregados:", Object.keys(prazosSalvos).length);
            } catch (e) { prazosSalvos = {}; }
        } else { prazosSalvos = {}; }

        totalCumpridosHistorico = data.djen_cumpridos_total || 0;
        totalBuscas = data.djen_total_buscas || 0;
        totalLidos = data.djen_total_lidos || 0;
        totalSalvos = data.djen_total_salvos || 0;

        if (data.djen_publicacoes_lidas) {
            try { publicacoesLidas = new Set(safeJSONParse(data.djen_publicacoes_lidas, [])); }
            catch (e) { publicacoesLidas = new Set(); }
        }

        let precisaSalvar = false; const hojeRef = new Date(); hojeRef.setHours(0, 0, 0, 0);
        for (const key in prazosSalvos) { if (prazosSalvos[key] && prazosSalvos[key].fatal) { const dataFatal = parseDateBR(prazosSalvos[key].fatal); const diffDias = Math.floor((hojeRef.getTime() - dataFatal.getTime()) / (1000 * 3600 * 24)); if (diffDias > 30) { delete prazosSalvos[key]; precisaSalvar = true; } } }
        if (precisaSalvar) savePrazosSalvos();

        const lastBackup = data.djen_last_backup_date || 0; const daysSinceBackup = (Date.now() - lastBackup) / (1000 * 3600 * 24);
        if (daysSinceBackup > 30 && Object.keys(prazosSalvos).length > 0) { const btnMenu = document.getElementById('btnHeaderMenu'); if (btnMenu) { btnMenu.classList.add('needs-backup'); btnMenu.setAttribute('data-tooltip', 'Opções (Backup Recomendado)'); } const btnBackupMenu = document.getElementById('btnSalvarBackupMenu'); if (btnBackupMenu) { btnBackupMenu.classList.add('btn-backup-pulse'); } }

        if (data.djen_oab_numero) { const onum = document.getElementById('oabNum'); if (onum) onum.value = data.djen_oab_numero; }
        if (data.djen_oab_estado) { const ouf = document.getElementById('oabUf'); if (ouf) ouf.value = data.djen_oab_estado; }



        if (data.djen_last_search) { const parsedData = safeJSONParse(data.djen_last_search, []); if (Array.isArray(parsedData) && parsedData.length > 0) { resultadosGlobais = parsedData; const tribs = [...new Set(resultadosGlobais.map(i => i.siglaTribunal))].sort(); const filtro = document.getElementById('filtroTribunal'); if (filtro) { filtro.innerHTML = '<option value="">Tribunal</option>'; tribs.forEach(t => { const opt = document.createElement("option"); opt.value = t; opt.textContent = t; filtro.appendChild(opt); }); } const ctFiltro = document.getElementById('containerFiltro'); if (ctFiltro) ctFiltro.style.display = 'none'; const welcome = document.getElementById('welcomeState'); if (welcome) welcome.style.display = 'flex'; } else { SafeStorage.set({ 'djen_last_search': '' }); } }

        SafeStorage.get(['djen_historico_buscas'], (d) => {
            if (d.djen_historico_buscas) {
                historicoBuscas = safeJSONParse(d.djen_historico_buscas, []);
                renderHistoricoBuscas();
            }


        });


        atualizarEstatisticas(); filtroAgendaAtivo = null; renderAgenda(); renderCalendar();
    });

    const elNum = document.getElementById('oabNum');
    if (elNum) elNum.addEventListener('input', debounce((e) => SafeStorage.set({ 'djen_oab_numero': e.target.value }), 500));
    const elUf = document.getElementById('oabUf');
    if (elUf) elUf.addEventListener('input', debounce((e) => SafeStorage.set({ 'djen_oab_estado': e.target.value.toUpperCase() }), 500));

    const procInput = document.getElementById('procNumBusca');
    if (procInput) {
        procInput.addEventListener('input', function (e) {
            let v = e.target.value.replace(/\D/g, ''); if (v.length > 20) v = v.substring(0, 20);
            v = v.replace(/^(\d{7})(\d)/, "$1-$2"); v = v.replace(/-(\d{2})(\d)/, "-$1.$2"); v = v.replace(/\.(\d{4})(\d)/, ".$1.$2"); v = v.replace(/\.(\d)(\d)/, ".$1.$2"); v = v.replace(/\.(\d{2})(\d)/, ".$1.$2"); e.target.value = v;
        });
        procInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const btnB = document.getElementById('btnBuscar'); if (btnB) btnB.click(); } });
    }

    const btnOab = document.getElementById('btnSearchTypeOab'); const btnProc = document.getElementById('btnSearchTypeProc');
    const camposOab = document.getElementById('camposOAB'); const camposProc = document.getElementById('camposProcesso');
    if (btnOab && btnProc && camposOab && camposProc) { btnOab.onclick = () => { searchMode = 'oab'; btnOab.classList.add('active'); btnProc.classList.remove('active'); camposOab.style.display = 'block'; camposProc.style.display = 'none'; }; btnProc.onclick = () => { searchMode = 'proc'; btnProc.classList.add('active'); btnOab.classList.remove('active'); camposOab.style.display = 'none'; camposProc.style.display = 'block'; }; }

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

    function switchView(v) {
        const vb = document.getElementById('viewBusca'); if (vb) vb.style.display = v === 'busca' ? 'block' : 'none';
        const vs = document.getElementById('viewSalvos'); if (vs) vs.style.display = v === 'salvos' ? 'block' : 'none';
        const vc = document.getElementById('viewCalendario'); if (vc) vc.style.display = v === 'calendario' ? 'block' : 'none';
        const tabBusca = document.getElementById('tabBusca'); const tabSalvos = document.getElementById('tabSalvos'); const tabCalendario = document.getElementById('tabCalendario');
        if (tabBusca) { tabBusca.classList.toggle('active', v === 'busca'); tabBusca.setAttribute('aria-selected', v === 'busca'); }
        if (tabSalvos) { tabSalvos.classList.toggle('active', v === 'salvos'); tabSalvos.setAttribute('aria-selected', v === 'salvos'); }
        if (tabCalendario) { tabCalendario.classList.toggle('active', v === 'calendario'); tabCalendario.setAttribute('aria-selected', v === 'calendario'); }
        if (v === 'salvos') { renderAgenda(); } if (v === 'calendario') { renderCalendar(); }
        if (typeof moverLinhaLiquida === 'function') moverLinhaLiquida();
    }

    if (tabBuscaBtn) tabBuscaBtn.onclick = () => { switchView('busca'); updateProgressBar(); moverLinhaLiquida(); };
    const tsBtn = document.getElementById('tabSalvos');
    if (tsBtn) tsBtn.onclick = () => { filtroAgendaAtivo = null; document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active')); switchView('salvos'); moverLinhaLiquida(); };
    const tcBtn = document.getElementById('tabCalendario'); if (tcBtn) tcBtn.onclick = () => { switchView('calendario'); moverLinhaLiquida(); };
    const bCloseF = document.getElementById('btnCloseFocus'); if (bCloseF) bCloseF.onclick = () => {
        const overlay = document.getElementById('focusModeOverlay');
        if (overlay) {
            overlay.style.animation = 'focusExit 0.3s ease forwards';
            setTimeout(() => {
                overlay.classList.remove('show');
                overlay.style.animation = '';
            }, 300);
        }
    };

    // --- URGENCY SCANNER ---
    function inicializarNovosRecursosFoco() {
        const container = document.getElementById('focusTeorContent');
        if (!container) return;

        // 1. URGENCY SCANNER (Chips de Urgência contextualizados no topo)
        const urgencyBar = document.getElementById('focusUrgencyBar');
        if (urgencyBar) {
            urgencyBar.innerHTML = '';
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
                    label.style = 'font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-right: 6px; letter-spacing: 0.5px;';
                    label.innerHTML = '⚠️ Urgências:';
                    urgencyBar.appendChild(label);

                    Object.entries(groups).forEach(([word, occurrences]) => {
                        const chip = document.createElement('button');
                        chip.className = 'urgency-chip';
                        chip.innerHTML = `<span>${word}</span> <span style="background: rgba(255,255,255,0.25); padding: 1px 5px; border-radius: 50%; font-size: 9px;">${occurrences.length}</span>`;
                        
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
            document.getElementById('resultados').innerHTML = '';

            if (resultadosExibidos.length === 0) {
                document.getElementById('resultados').innerHTML = `
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
        `;
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
            resultadosExibidos = [];
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

    window.montarCalculadoraForm = montarCalculadoraForm;

    function montarCalculadoraForm(i, btnCalc, itemKey, dataDispOriginal, numeroFormatado, prazoSugerido, isBuscaContext, apelidoForcado, toggleCardCallback) {
        try {
            const calcTemplate = document.getElementById('calcTemplate'); if (!calcTemplate) return document.createElement('div');
            const calcNode = calcTemplate.content.cloneNode(true); const calcPanel = calcNode.querySelector('.calculadora-prazo'); if (!calcPanel) return document.createElement('div');

            const calcInputs = calcPanel.querySelector('.calc-inputs-container');
            const calcResultBox = calcPanel.querySelector('.calc-result-box'); const lblDataFatal = calcPanel.querySelector('.resultado-data-fatal'); const containerAlertas = calcPanel.querySelector('.resultado-alertas'); const previewContainer = calcPanel.querySelector('.calc-preview');
            const cUf = calcPanel.querySelector('.c-uf'); const cMun = calcPanel.querySelector('.c-mun'); const cMat = calcPanel.querySelector('.c-mat'); const cData = calcPanel.querySelector('.c-data'); const cDias = calcPanel.querySelector('.c-dias'); const cDir = calcPanel.querySelector('.c-dir');
            const cTrib = calcPanel.querySelector('.c-trib'); const cEspera = calcPanel.querySelector('.c-espera');

            const divIniciais = calcPanel.querySelector('.calc-acoes-iniciais'); const divFinais = calcPanel.querySelector('.calc-acoes-finais'); const divPosSalvo = calcPanel.querySelector('.calc-acoes-pos-salvo');
            const btnExec = calcPanel.querySelector('.btn-exec'); const btnCancelar = calcPanel.querySelector('.btn-cancelar'); const btnVoltarCalc = calcPanel.querySelector('.btn-voltar-calc'); const btnSalvar = calcPanel.querySelector('.btn-salvar'); const btnSalvarGcalPos = calcPanel.querySelector('.btn-salvar-gcal-pos'); const btnFecharCalc = calcPanel.querySelector('.btn-fechar-calc');

            let isCalculated = false;
            let lastResult = null;
            let calcData = (i && i.prazoCalculado) ? i.prazoCalculado : ((i && i.fatal) ? i : null);

            // --- Lógica do Custom Dropdown para Matéria ---
            const customMatWrapper = calcPanel.querySelector('.custom-mat-wrapper');
            if (customMatWrapper) {
                const trigger = customMatWrapper.querySelector('.custom-mat-trigger');
                const dropdown = customMatWrapper.querySelector('.custom-mat-dropdown');
                const valueDisplay = customMatWrapper.querySelector('.custom-mat-value');
                const hiddenInput = customMatWrapper.querySelector('.c-mat');

                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.querySelectorAll('.custom-mat-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('show'); });
                    dropdown.classList.toggle('show');
                });

                dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        hiddenInput.value = item.getAttribute('data-value');
                        valueDisplay.textContent = item.textContent;
                        dropdown.classList.remove('show');
                        hiddenInput.dispatchEvent(new Event('change'));
                        resetCalcState();
                    });
                });

                // Set initial value based on calcData if it exists
                if (calcData && calcData.mat) {
                    const matchItem = dropdown.querySelector(`.autocomplete-item[data-value="${calcData.mat}"]`);
                    if (matchItem) {
                        hiddenInput.value = matchItem.getAttribute('data-value');
                        valueDisplay.textContent = matchItem.textContent;
                    }
                }

                // Global listener to close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!customMatWrapper.contains(e.target)) {
                        dropdown.classList.remove('show');
                    }
                }, { once: false });
                
                // Override the cMat initialization so we update the value display
                Object.defineProperty(hiddenInput, 'value', {
                    get() { return this.getAttribute('value'); },
                    set(val) { 
                        this.setAttribute('value', val); 
                        const m = dropdown.querySelector(`.autocomplete-item[data-value="${val}"]`);
                        if (m && valueDisplay) valueDisplay.textContent = m.textContent;
                    }
                });
            }
            // ----------------------------------------------

            const radioTipoDatas = calcPanel.querySelectorAll('.c-tipo-data');
            const radioContainers = calcPanel.querySelectorAll('.radio-tipo-data');
            radioTipoDatas.forEach(r => {
                r.addEventListener('change', () => {
                    radioContainers.forEach(lbl => {
                        lbl.classList.remove('active');
                        lbl.style.color = 'var(--text-muted)';
                        lbl.style.fontWeight = '500';
                        lbl.style.background = 'transparent';
                        lbl.style.boxShadow = 'none';
                    });
                    const parent = r.closest('.radio-tipo-data');
                    if (parent) {
                        parent.classList.add('active');
                        parent.style.color = 'var(--text-main)';
                        parent.style.fontWeight = '600';
                        parent.style.background = 'var(--bg-body)';
                        parent.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                    }
                    
                    const hintEl = calcPanel.querySelector('.c-data-hint');
                    if (hintEl) {
                        if (r.value === 'dje') {
                            hintEl.innerHTML = "A data acima é a <b>Disponibilização</b>.<br>A Publicação ocorre no dia útil seguinte (D+1).";
                        } else {
                            hintEl.innerHTML = "A data acima é a <b>Leitura / Intimação</b>.<br>A Publicação é considerada no mesmo dia.";
                        }
                    }
                    
                    if (isCalculated) resetCalcState();
                });
            });

            const btnColarMagico = calcPanel.querySelector('.btn-colar-magico');
            if (btnColarMagico) {
                const isManual = (i && i.manual) || (i && i.siglaTribunal === 'MANUAL') || (!i || Object.keys(i).length === 0);
                if (!isManual) {
                    btnColarMagico.style.display = 'none';
                }
                
                btnColarMagico.addEventListener('click', async (e) => {
                    e.preventDefault(); e.stopPropagation();
                    try {
                        const text = await navigator.clipboard.readText();
                        if (!text) { showToast("Área de transferência vazia.", "⚠️"); return; }
                        
                        let preencheuAlgo = false;
                        
                        const procMatch = text.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/);
                        if (procMatch) {
                            const inputProcAvulsa = calcPanel.querySelector('.calc-avulsa-proc');
                            if (inputProcAvulsa) { inputProcAvulsa.value = formatCNJ(procMatch[0]); preencheuAlgo = true; }
                        }
                        
                        const diasMatch = text.match(/prazo de\s+(\d+)\s+dias/i) || text.match(/\b(\d+)\s+dias\b/i);
                        if (diasMatch && cDias) {
                            cDias.value = diasMatch[1];
                            preencheuAlgo = true;
                        }
                        
                        const tribMatch = text.match(/\b(TJ[A-Z]{2}|TRF-?\d|STJ|STF|TST|TRT-?\d+)\b/i);
                        if (tribMatch && cTrib) {
                            const siglaExtraida = tribMatch[1].toUpperCase().replace('-', '');
                            cTrib.value = siglaExtraida;
                            if (cUf && cMun) autoPreencherTribunal(cTrib.value, cUf, cMun);
                            if (cMat && (siglaExtraida.startsWith('TRT') || siglaExtraida === 'TST')) {
                                cMat.value = 'Trabalhista';
                            }
                            preencheuAlgo = true;
                        }
                        
                        if (preencheuAlgo) {
                            showToast("Dados extraídos do texto copiado!", "📋");
                            if (isCalculated) resetCalcState();
                        } else {
                            showToast("Nenhum dado reconhecido no texto copiado.", "⚠️");
                        }
                        
                    } catch(err) {
                        showToast("Erro ao ler área de transferência.", "❌");
                    }
                });
            }

            const verificarBotaoCalcular = () => {
                if (btnExec) {
                    const valTrib = cTrib ? cTrib.value.trim() : "";
                    const valUf = cUf ? cUf.value.trim() : "";
                    const valMun = cMun ? cMun.value.trim() : "";

                    if (!valTrib || !valUf || !valMun) {
                        btnExec.disabled = true; btnExec.style.opacity = '0.4'; btnExec.style.cursor = 'not-allowed'; btnExec.setAttribute('data-tooltip', 'Informe tribunal, UF e município para liberar o calculo');
                    } else {
                        btnExec.disabled = false; btnExec.style.opacity = '1'; btnExec.style.cursor = 'pointer'; btnExec.removeAttribute('data-tooltip');
                    }
                }
            };

            const resetCalcState = () => {
                isCalculated = false;
                if (previewContainer) previewContainer.style.display = 'none';
                if (calcResultBox) calcResultBox.style.display = 'none';
                if (calcInputs) calcInputs.style.display = 'flex';
                if (divIniciais) divIniciais.style.display = 'flex';
                if (divFinais) divFinais.style.display = 'none';
                if (divPosSalvo) divPosSalvo.style.display = 'none';
                const formAvulsa = calcPanel.querySelector('.form-identificacao-avulsa');
                if (formAvulsa) formAvulsa.style.display = 'none';
                verificarBotaoCalcular();
            };

            if (cTrib) {
                if (calcData && calcData.siglaTribunal && calcData.siglaTribunal !== 'MANUAL') { cTrib.value = calcData.siglaTribunal; }
                else if (i.siglaTribunal && i.siglaTribunal !== 'MANUAL') { cTrib.value = i.siglaTribunal; } else { cTrib.value = ""; }
                cTrib.onchange = () => { if (cTrib.value) { autoPreencherTribunal(cTrib.value, cUf, cMun); carregarMunicipios(cUf.value, `dl_${itemKey}`); } resetCalcState(); };
            }

            if (cUf && cMun) {
                if (!calcData) { if (cTrib && cTrib.value) autoPreencherTribunal(cTrib.value, cUf, cMun); else cUf.value = "SP"; }
                const datalistId = `dl_${itemKey}`; cMun.setAttribute('list', datalistId); carregarMunicipios(cUf.value, datalistId);
                if (!calcData && !cMun.value) { SafeStorage.get(['djen_last_mun'], (d) => { if (d.djen_last_mun) cMun.value = d.djen_last_mun; }); }
            }

            if (cData) cData.value = dataDispOriginal;
            if (calcData && calcData.fatal) {
                if (cDias) cDias.value = calcData.dias || prazoSugerido || 15;
                if (cMat) cMat.value = calcData.mat || "Cível";
                if (cUf) cUf.value = calcData.uf || "SP";
                if (cMun) cMun.value = calcData.mun || "";
                if (calcData.pubOrig && cData) cData.value = calcData.pubOrig.split('T')[0];
                if (calcData.direcao && cDir) cDir.value = calcData.direcao; if (cEspera) cEspera.checked = !!calcData.espera;
                if (cUf) carregarMunicipios(cUf.value, `dl_${itemKey}`);
            } else {
                if (cDias) cDias.value = prazoSugerido || 15;
            }

            if (cUf) cUf.onchange = () => { if (cMun) cMun.value = ""; SafeStorage.set({ 'djen_last_mun': "" }); carregarMunicipios(cUf.value, `dl_${itemKey}`); resetCalcState(); };
            if (cMun) cMun.oninput = () => { SafeStorage.set({ 'djen_last_mun': cMun.value }); resetCalcState(); };
            if (cDias) cDias.oninput = resetCalcState; if (cData) cData.onchange = resetCalcState; if (cMat) cMat.onchange = resetCalcState; if (cDir) cDir.onchange = resetCalcState;
            if (btnCancelar) btnCancelar.onclick = (e) => { e.stopPropagation(); calcPanel.classList.remove('ativa'); resetCalcState(); };
            if (btnVoltarCalc) btnVoltarCalc.onclick = (e) => { e.stopPropagation(); resetCalcState(); };

            if (calcResultBox) {
                calcResultBox.removeAttribute('title');
                calcResultBox.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (previewContainer) {
                        // 👉 Captura a caixa onde fica o botão de PNG
                        const btnContainer = calcResultBox.querySelector('.container-btn-png');

                        if (previewContainer.style.display === 'none' || previewContainer.style.display === '') {
                            previewContainer.style.display = 'grid';

                            // 👉 Mostra o botão de PNG quando a auditoria abre
                            if (btnContainer) btnContainer.style.display = 'block';

                            setTimeout(() => {
                                previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 150);

                        } else {
                            previewContainer.style.display = 'none';

                            // 👉 Esconde o botão de PNG quando a auditoria fecha
                            if (btnContainer) btnContainer.style.display = 'none';
                        }
                    }
                };
            }

            verificarBotaoCalcular();

            if (btnExec) {
                btnExec.onclick = async (e) => {
                    e.stopPropagation();
                    const valTrib = cTrib ? cTrib.value.trim() : ""; const valUf = cUf ? cUf.value.trim() : ""; const valMun = cMun ? cMun.value.trim() : "";

                    if (!valTrib) { if (typeof showToast === 'function') showToast("Informe o tribunal para iniciar a contagem.", "🚨"); if (cTrib) { const borderOrig = cTrib.style.border; cTrib.style.border = "1px solid #d44c47"; cTrib.focus(); setTimeout(() => { cTrib.style.border = borderOrig; }, 3500); } return; }
                    if (!valUf) { if (typeof showToast === 'function') showToast("A UF de origem é obrigatória para iniciar a contagem.", "🚨"); if (cUf) { const borderOrig = cUf.style.border; cUf.style.border = "1px solid #d44c47"; cUf.focus(); setTimeout(() => { cUf.style.border = borderOrig; }, 3500); } return; }
                    if (!valMun) { if (typeof showToast === 'function') showToast("Erro: Digite o Município para calcular.", "🚨"); if (cMun) { const borderOrig = cMun.style.border; cMun.style.border = "1px solid #d44c47"; cMun.focus(); setTimeout(() => { cMun.style.border = borderOrig; }, 3500); } return; }

                    if (!cData || !cData.value) {
                        if (typeof showToast === 'function') showToast("A data de disponibilização é necessária para iniciar a contagem.", "🚨");
                        if (cData) {
                            const borderOrig = cData.style.border;
                            cData.style.border = "1px solid #d44c47";
                            cData.focus();
                            setTimeout(() => { cData.style.border = borderOrig; }, 3500);
                        }
                        return;
                    }

                    if (valUf && valMun && cacheMunicipios[valUf]) {
                        const normalizar = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                        const cidadeExiste = cacheMunicipios[valUf].some(m => normalizar(m) === normalizar(valMun));
                        if (!cidadeExiste) {
                            if (typeof showToast === 'function') showToast(`Erro: Cidade '${valMun}' não encontrada no banco do IBGE. Verifique a ortografia e tente novamente.`, "🚨");
                            if (cMun) { const borderOrig = cMun.style.border; cMun.style.border = "1px solid #d44c47"; cMun.focus(); setTimeout(() => { cMun.style.border = borderOrig; }, 3500); }
                            return;
                        }
                    }

                    const textoOriginal = btnExec.innerHTML;
                    btnExec.innerHTML = "Calculando...";
                    btnExec.disabled = true;

                    try {
                        const dias = parseInt(cDias.value) || 1;
                        const pubEscolhida = cData.value;
                        const tipo = cMat.value === 'Criminal' ? 'cpp' : 'cpc';
                        const direcao = cDir ? cDir.value : 'futuro';
                        const siglaTribunal = cTrib ? cTrib.value.trim().toUpperCase() : (i?.siglaTribunal || "");
                        const ufCalc = cUf ? cUf.value : "";
                        const munCalc = cMun ? cMun.value : "";
                        const anoCalculo = new Date(pubEscolhida).getFullYear();
                        
                        const tipoDataEl = calcPanel.querySelector('.c-tipo-data:checked');
                        const tipoData = tipoDataEl ? tipoDataEl.value : 'dje';

                        console.log("DJEN: Iniciando cálculo com params:", { pubEscolhida, dias, tipo, direcao, ufCalc, munCalc, siglaTribunal, tipoData });

                        const [feriadosTribunal, feriadosMunisDinamicos] = await Promise.all([
                            buscarFeriadosTribunal(siglaTribunal),
                            buscarFeriadosMunicipaisAnual(anoCalculo, ufCalc, munCalc)
                        ]);

                        lastResult = MotorDePrazos.calcular({ pubEscolhida, dias, tipo, direcao, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos, tipoData });

                        console.log("DJEN: Resultado do cálculo:", lastResult);

                        isCalculated = true;

                        if (lblDataFatal) {
                            lblDataFatal.textContent = lastResult.fatal;
                            lblDataFatal.classList.remove('animate');
                            void lblDataFatal.offsetWidth;
                            lblDataFatal.classList.add('animate');
                        }

                        if (calcResultBox) {
                            calcResultBox.classList.add('new-result');
                            setTimeout(() => calcResultBox.classList.remove('new-result'), 2000);
                        }

                        if (containerAlertas) {
                            containerAlertas.style.display = 'block';
                            containerAlertas.innerHTML = "";
                            let badgesHtml = "";
                            if (lastResult.feriados > 0) badgesHtml += `<span class="badge bg-gray">${lastResult.feriados} Feriados/Suspensões</span>`;
                            if (lastResult.prorrogado) badgesHtml += `<span class="badge bg-orange">Prorrogado</span>`;
                            if (badgesHtml !== "") { containerAlertas.innerHTML += `<div style="display:flex; gap:4px; justify-content:center; width: 100%; margin-bottom: 12px;">${badgesHtml}</div>`; }
                            if (lastResult.temFeriadoMunicipal) { containerAlertas.innerHTML += `<div style="width: 100%; box-sizing: border-box; background: rgba(212, 76, 71, 0.08); color: #d44c47; padding: 12px; border-radius: 6px; font-size: 11px; text-align: left; border: 1px solid rgba(212, 76, 71, 0.2); line-height: 1.4; margin-bottom: 12px;"><div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px; font-weight: 700; font-size: 12px;">🚨 Alerta de Jurisprudência (STJ)</div>Prazo coincide com <b>Feriado Local, Forense ou Suspensão</b>. Anexe a norma ou certidão do Tribunal para comprovar a tempestividade (art. 1.003, § 6º, CPC).</div>`; }
                            containerAlertas.innerHTML += `<div style="width: 100%; text-align: center; margin-top: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--primary); cursor: pointer;">🖱️ Clique aqui para abrir a auditoria dia a dia</div><div style="width: 100%; text-align: center; margin-bottom: 4px; font-size: 11px; color: var(--text-muted); opacity: 0.85;">Aviso: Esta contagem é uma previsão. Confirme sempre as suspensões e feriados oficiais.</div>`;
                        }

                        if (previewContainer) {
                            preencherAuditoriaVisual(lastResult.timeline, previewContainer);
                            previewContainer.style.display = 'none';
                        }

                        if (calcInputs) calcInputs.style.display = 'none';
                        if (divIniciais) divIniciais.style.display = 'none';
                        if (calcResultBox) calcResultBox.style.display = 'block';

                        if (divFinais) {
                            divFinais.style.display = 'flex';
                            const bSalvar = divFinais.querySelector('.btn-salvar');
                            if (bSalvar) bSalvar.style.display = 'block';
                            const bVoltar = divFinais.querySelector('.btn-voltar-calc');
                            if (bVoltar) {
                                bVoltar.innerHTML = 'Editar';
                                bVoltar.style.flex = '1';
                            }
                        }

                    } catch (err) {
                        console.error("Erro na Calculadora:", err);
                        if (typeof showToast === 'function') showToast("Não foi possível concluir o cálculo: " + err.message, "❌");
                    } finally {
                        btnExec.innerHTML = textoOriginal;
                        btnExec.disabled = false;
                    }
                };
            }

            const efetivarSalvamento = () => {
                if (!cUf || !cUf.value.trim() || !cMun || !cMun.value.trim()) {
                    if (typeof showToast === 'function') showToast("O registro do prazo requer a informação da UF e do Município.", "⚠️");
                    if (cMun && !cMun.value.trim()) { const borderOriginal = cMun.style.border; cMun.style.border = "1px solid #d44c47"; cMun.focus(); setTimeout(() => { cMun.style.border = borderOriginal; }, 2500); }
                    if (cUf && !cUf.value.trim()) { const borderOriginalUf = cUf.style.border; cUf.style.border = "1px solid #d44c47"; setTimeout(() => { cUf.style.border = borderOriginalUf; }, 2500); }
                    return;
                }

                let apelidoAtual = apelidoForcado || getGlobalApelido(numeroFormatado) || i?.apelido || "";
                const txtArea = calcPanel.closest('.teor-wrapper')?.querySelector('.nota-input');
                const anotacaoAtual = txtArea ? txtArea.innerHTML : (prazosSalvos[itemKey] ? prazosSalvos[itemKey].anotacao : "");
                let textoFinal = i.textoCompleto || cleanText(i.texto || i.teor) || "Prazo Adicionado Manualmente";
                const isNovoSalvamento = !(i.prazoCalculado && i.prazoCalculado.fatal) && !(i.fatal);
                const savedSigla = cTrib && cTrib.value.trim() ? cTrib.value.trim().toUpperCase() : (i.siglaTribunal || "MANUAL");

                const novoPrazoCalculado = {
                    processo: numeroFormatado,
                    dias: parseInt(cDias.value) || 1,
                    mat: cMat.value,
                    uf: cUf.value,
                    mun: cMun.value,
                    siglaTribunal: savedSigla,
                    pubOrig: cData.value,
                    pub: lastResult.pub,
                    disp: lastResult.disp,
                    inicio: lastResult.inicio,
                    fatal: lastResult.fatal,
                    timeline: lastResult.timeline,
                    textoHtml: (prazosSalvos[itemKey] && prazosSalvos[itemKey].textoHtml) ? prazosSalvos[itemKey].textoHtml : null,
                    textoCompleto: textoFinal,
                    apelido: apelidoAtual,
                    anotacao: anotacaoAtual,
                    direcao: cDir.value,
                    feriados: lastResult.feriados,
                    prorrogado: lastResult.prorrogado,
                    temFeriadoMunicipal: lastResult.temFeriadoMunicipal,
                    manual: i.manual || false,
                    cumprido: i.cumprido || false,
                    espera: cEspera ? cEspera.checked : false,
                    tarefas: (prazosSalvos[itemKey] && prazosSalvos[itemKey].tarefas) ? prazosSalvos[itemKey].tarefas : []
                };

                if (i.manual) i.siglaTribunal = savedSigla;
                if (isBuscaContext) { i.prazoCalculado = novoPrazoCalculado; prazosSalvos[itemKey] = i.prazoCalculado; }
                else { prazosSalvos[itemKey] = novoPrazoCalculado; Object.assign(i, novoPrazoCalculado); }

                savePrazosSalvos();
                setGlobalApelido(numeroFormatado, apelidoAtual);

                const cardTarget = calcPanel.closest('.intimacao-card');
                if (cardTarget) {
                    const btnCalcTarget = cardTarget.querySelector('.btn-recalc');
                    if (btnCalcTarget) {
                        btnCalcTarget.className = "btn-acao-square h-green btn-recalc tooltip-right";
                        btnCalcTarget.setAttribute('aria-label', 'Prazo Salvo (Recalcular)');
                        btnCalcTarget.setAttribute('data-tooltip', 'Prazo Salvo (Recalcular)');
                    }

                    const header = cardTarget.querySelector('.card-top-info');
                    if (header) {
                        const prazoRef = isBuscaContext ? i.prazoCalculado : i;
                        const dataFatal = parseDateBR(prazoRef.fatal);
                        const hj = new Date();
                        hj.setHours(12, 0, 0, 0);
                        const diffDias = Math.ceil((dataFatal - hj) / (1000 * 3600 * 24));
                        let corSeloClass = diffDias <= 5 ? "s-orange" : "s-green";
                        if (diffDias === 0) corSeloClass = "s-hoje";
                        if (diffDias < 0) corSeloClass = "s-red";
                        if (prazoRef.cumprido) corSeloClass = "s-gray";

                        if (prazoRef.espera && !prazoRef.cumprido) corSeloClass = "s-purple";

                        let iconStr = lastResult.direcao === 'retroativo' ? iconesSVG.retro + ' ' : '';
                        let badgeSalvo = header.querySelector('.badge-salvo');
                        let txtStatus = `📌 Anotado: ${lastResult.fatal.substring(0, 5)}`;
                        if (!isBuscaContext) {
                            if (diffDias < 0) txtStatus = `Atrasado ${Math.abs(diffDias)}d • ${lastResult.fatal.substring(0, 5)}`;
                            else if (diffDias === 0) txtStatus = `Hoje • ${lastResult.fatal.substring(0, 5)}`;
                            else if (diffDias === 1) txtStatus = `Amanhã • ${lastResult.fatal.substring(0, 5)}`;
                            else txtStatus = `${diffDias} DIAS • ${lastResult.fatal.substring(0, 5)}`;
                        }

                        txtStatus = iconStr + txtStatus;

                        let areaDireita = header.querySelector('.status-urgencia') || header.querySelector('.card-info-right');

                        if (!badgeSalvo) {
                            badgeSalvo = document.createElement('span');
                            badgeSalvo.className = 'badge-salvo ' + corSeloClass;
                            if (areaDireita) areaDireita.appendChild(badgeSalvo);
                        } else {
                            badgeSalvo.className = 'badge-salvo ' + corSeloClass;
                            if (areaDireita && !areaDireita.contains(badgeSalvo)) {
                                areaDireita.appendChild(badgeSalvo);
                            }
                        }
                        badgeSalvo.innerHTML = txtStatus;
                    }

                    const btnRemoverTarget = cardTarget.querySelector('.btn-remover-busca');
                    if (btnRemoverTarget) btnRemoverTarget.style.display = 'flex';
                }

                if (isNovoSalvamento) { totalSalvos++; SafeStorage.set({ 'djen_total_salvos': totalSalvos }); }

                atualizarEstatisticas();
                if (isBuscaContext) updateProgressBar();

                if (divFinais) divFinais.style.display = 'none';
                if (divPosSalvo) {
                    divPosSalvo.style.display = 'flex';
                    const bsg = calcPanel.querySelector('.btn-salvar-gcal-pos');
                    if (bsg) {
                        bsg.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: -3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Exportar para Google Agenda`;
                        bsg.classList.remove('c-blue');
                        bsg.classList.add('c-green');
                    }
                }

                setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80);
            };

            const isCalculadoraAvulsa = String(itemKey).startsWith('avulsa_');

            if (btnSalvar) {
                btnSalvar.onclick = (e) => {
                    e.stopPropagation();
                    if (isCalculadoraAvulsa) {
                        if (divFinais) divFinais.style.display = 'none';
                        const formAvulsa = calcPanel.querySelector('.form-identificacao-avulsa');
                        if (formAvulsa) { formAvulsa.style.display = 'block'; setTimeout(() => calcPanel.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100); }
                    } else {
                        efetivarSalvamento();
                    }
                };
            }

            if (isCalculadoraAvulsa) {
                const formAvulsa = calcPanel.querySelector('.form-identificacao-avulsa');
                const inputProcAvulsa = calcPanel.querySelector('.calc-avulsa-proc');
                const inputApelidoAvulsa = calcPanel.querySelector('.calc-avulsa-apelido');

                const blindarBotao = (seletor, acao) => {
                    const btn = calcPanel.querySelector(seletor);
                    if (btn) {
                        btn.addEventListener('click', (e) => {
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            acao(e, btn);
                        }, true);
                    }
                };

                blindarBotao('.btn-voltar-calc', () => {
                    isCalculated = false;
                    if (previewContainer) previewContainer.style.display = 'none';
                    if (calcResultBox) calcResultBox.style.display = 'none';
                    if (calcInputs) calcInputs.style.display = 'flex';
                    if (divIniciais) divIniciais.style.display = 'flex';
                    if (divFinais) divFinais.style.display = 'none';
                    if (divPosSalvo) divPosSalvo.style.display = 'none';
                    if (formAvulsa) formAvulsa.style.display = 'none';
                    if (typeof verificarBotaoCalcular === 'function') verificarBotaoCalcular();
                });

                blindarBotao('.btn-salvar', () => {
                    if (divFinais) divFinais.style.display = 'none';
                    if (formAvulsa) {
                        formAvulsa.style.display = 'block';
                        setTimeout(() => calcPanel.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
                    }
                });

                blindarBotao('.btn-fechar-calc', () => {
                    const containerCalcAvulsa = document.getElementById('containerCalcAvulsa');
                    if (containerCalcAvulsa) {
                        containerCalcAvulsa.innerHTML = '';
                        const calcNode = window.montarCalculadoraForm({ processo: 'Avulso', siglaTribunal: 'MANUAL' }, null, 'avulsa_' + Date.now(), '', '', 15, false, '', null);
                        if (calcNode) {
                            containerCalcAvulsa.appendChild(calcNode);
                            const painel = containerCalcAvulsa.querySelector('.calculadora-prazo');
                            if (painel) {
                                painel.style.display = 'block';
                                painel.classList.add('ativa');
                            }
                        }
                    }
                });

                if (formAvulsa) {
                    blindarBotao('.btn-cancelar-avulsa', () => {
                        formAvulsa.style.display = 'none';
                        if (divFinais) divFinais.style.display = 'flex';
                    });

                    blindarBotao('.btn-salvar-avulsa', () => {
                        const valProc = inputProcAvulsa.value.trim();
                        const valApelido = inputApelidoAvulsa.value.trim();
                        if (!valProc && !valApelido) {
                            if (typeof showToast === 'function') showToast("Informe o Processo ou o Apelido", "⚠️");
                            const borderOrig = inputProcAvulsa.style.border;
                            inputProcAvulsa.style.border = "1px solid #d44c47";
                            inputApelidoAvulsa.style.border = "1px solid #d44c47";
                            setTimeout(() => {
                                inputProcAvulsa.style.border = borderOrig;
                                inputApelidoAvulsa.style.border = borderOrig;
                            }, 2500);
                            return;
                        }

                        const fatalDOM = calcPanel.querySelector('.resultado-data-fatal');
                        const dataFatalTexto = fatalDOM ? fatalDOM.innerText : '--/--/----';
                        const novaChave = 'manual_' + Date.now();
                        const novoPrazo = {
                            processo: valProc || 'Sem Processo',
                            apelido: valApelido,
                            siglaTribunal: calcPanel.querySelector('.c-trib') ? calcPanel.querySelector('.c-trib').value.trim() : 'MANUAL',
                            uf: calcPanel.querySelector('.c-uf') ? calcPanel.querySelector('.c-uf').value : '',
                            mun: calcPanel.querySelector('.c-mun') ? calcPanel.querySelector('.c-mun').value : '',
                            dias: parseInt(calcPanel.querySelector('.c-dias').value) || 15,
                            mat: calcPanel.querySelector('.c-mat') ? calcPanel.querySelector('.c-mat').value : 'Cível',
                            direcao: calcPanel.querySelector('.c-dir') ? calcPanel.querySelector('.c-dir').value : 'futuro',
                            fatal: dataFatalTexto,
                            pub: (typeof lastResult !== 'undefined' && lastResult) ? lastResult.pub : '',
                            disp: (typeof lastResult !== 'undefined' && lastResult) ? lastResult.disp : '',
                            inicio: (typeof lastResult !== 'undefined' && lastResult) ? lastResult.inicio : '',
                            pubOrig: (calcPanel.querySelector('.c-data') ? calcPanel.querySelector('.c-data').value : '') + 'T12:00:00.000Z',
                            dataPubStr: (calcPanel.querySelector('.c-data') ? calcPanel.querySelector('.c-data').value.split('-').reverse().join('/') : ''),
                            manual: true,
                            teor: "Prazo inserido manualmente através da Calculadora Avulsa.",
                            anotacao: "",
                            isCumprido: false,
                            lembreteNotif: false,
                            espera: calcPanel.querySelector('.c-espera') ? calcPanel.querySelector('.c-espera').checked : false,
                            temFeriadoMunicipal: (typeof lastResult !== 'undefined' && lastResult) ? lastResult.temFeriadoMunicipal : false,
                            timeline: (typeof lastResult !== 'undefined' && lastResult) ? lastResult.timeline : null,
                            createdAt: new Date().toISOString()
                        };

                        Object.assign(i, novoPrazo);

                        if (typeof prazosSalvos !== 'undefined') prazosSalvos[novaChave] = novoPrazo;
                        savePrazosSalvos();
                        if (valApelido) setGlobalApelido(novoPrazo.processo, valApelido, novaChave);
                        atualizarEstatisticas();

                        if (document.getElementById('viewSalvos')?.style.display !== 'none') { renderAgenda(); }

                        formAvulsa.style.display = 'none';
                        if (divPosSalvo) divPosSalvo.style.display = 'flex';
                    });

                    if (inputProcAvulsa) {
                        inputProcAvulsa.addEventListener('input', (e) => {
                            if (/^[\d.\-\s]+$/.test(e.target.value)) {
                                let v = e.target.value.replace(/\D/g, '');
                                if (v.length > 20) v = v.substring(0, 20);
                                if (v.length > 16) v = v.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4}).*/, "$1-$2.$3.$4.$5.$6");
                                else if (v.length > 13) v = v.replace(/^(\d{7})(\d{2})(\d{4})/, "$1-$2.$3.");
                                else if (v.length > 9) v = v.replace(/^(\d{7})(\d{2})/, "$1-$2.");
                                else if (v.length > 7) v = v.replace(/^(\d{7})/, "$1-");
                                e.target.value = v;
                            }
                        });
                    }
                }
            }

            if (btnSalvarGcalPos) {
                btnSalvarGcalPos.onclick = (e) => {
                    e.stopPropagation();
                    const txtArea = calcPanel.closest('.teor-wrapper')?.querySelector('.nota-input');
                    const prazoParaAgenda = i.prazoCalculado || i;
                    if (prazoParaAgenda && txtArea) prazoParaAgenda.anotacao = txtArea.innerHTML;
                    window.open(gerarLinkGCal(prazoParaAgenda), '_blank');
                    if (btnSalvarGcalPos) {
                        btnSalvarGcalPos.innerHTML = "✅ Exportado!";
                        btnSalvarGcalPos.classList.remove('c-blue');
                        btnSalvarGcalPos.classList.add('c-green');
                    }
                };
            }

            if (btnFecharCalc) {
                btnFecharCalc.onclick = (e) => {
                    e.stopPropagation();
                    if (toggleCardCallback) toggleCardCallback();
                    if (!isBuscaContext) {
                        setTimeout(() => { renderAgenda(); renderCalendar(); }, 350);
                    }
                };
            }

            return calcPanel;
        } catch (e) {
            console.error("DJEN: Erro fatal ao montar a calculadora", e);
            return document.createElement('div');
        }
    }

    function aplicarHighlighterRadar(texto) {
        if (!texto) return "";
        let textoDestacado = texto;

        const regexDispositivo = /(ante o exposto|isto posto|diante do exposto|posto isso|pelo exposto|assim, julgo|com base no exposto|julgo procedente|julgo improcedente)([\s\S]+)/i;
        const matchDispositivo = textoDestacado.match(regexDispositivo);

        if (matchDispositivo) {
            const textoAntes = textoDestacado.substring(0, matchDispositivo.index);
            const textoDecisao = matchDispositivo[0];

            textoDestacado = textoAntes + `<div class="destaque-dispositivo"><span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--primary); display: block; margin-bottom: 6px; letter-spacing: 0.05em;">⚖️ Dispositivo da Decisão</span>` + textoDecisao + `</div>`;
        }

        const palavrasOrdenadas = [...palavrasUrgentes].sort((a, b) => b.length - a.length);

        palavrasOrdenadas.forEach(palavra => {
            if (palavra.length < 3) return;
            const regex = new RegExp(`\\b(${palavra.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})\\b`, 'gi');
            textoDestacado = textoDestacado.replace(regex, '<mark class="marca-texto radar-auto" data-tooltip="Detectado pelo Radar Automático">$&</mark>');
        });

        return textoDestacado;
    }

    function render(items, term) {
        gerarBriefingDiario(items, palavrasUrgentes, cleanText);

        const res = document.getElementById('resultados');
        if (!res) return;
        res.innerHTML = "";

        const abl = document.getElementById('acoesBuscaLote');
        if (abl) abl.style.display = items.length ? 'flex' : 'none';

        if (!items.length) {
            res.innerHTML = '';
            res.appendChild(document.getElementById('tpl-empty-busca').content.cloneNode(true));
            return;
        }

        const fragment = document.createDocumentFragment();
        let totalRadarEncontrado = 0;

        const criarIntimacaoCard = (i, index) => {
            const txt = cleanText(i.texto || i.teor);
            const proc = formatCNJ(getProc(i, txt));
            const dataProc = new Date(i.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR');
            const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, '');

            const textoBuscaLow = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const caiuNoRadar = palavrasUrgentes.some(p => textoBuscaLow.includes(p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
            if (caiuNoRadar) totalRadarEncontrado++;

            if (prazosSalvos[itemKey]) i.prazoCalculado = prazosSalvos[itemKey];

            const card = document.createElement("div");
            card.className = "intimacao-card";
            card.setAttribute('data-key', itemKey);
            card.setAttribute('data-proc', proc);

            card.style.opacity = '0';
            card.style.animation = 'entraSuave 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards';
            card.style.animationDelay = `${Math.min(index * 0.04, 1)}s`;

            if (publicacoesLidas.has(itemKey)) card.classList.add('lido');

            let seloSalvo = '';
            const isSalvo = i.prazoCalculado && i.prazoCalculado.fatal;
            if (isSalvo) {
                const hj = new Date(); hj.setHours(12, 0, 0, 0);
                const dataFatal = parseDateBR(i.prazoCalculado.fatal);
                const diff = Math.ceil((dataFatal - hj) / (1000 * 3600 * 24));
                let corSeloClass = diff <= 5 ? "s-orange" : "s-green";
                if (diff === 0) corSeloClass = "s-hoje";
                if (diff < 0) corSeloClass = "s-red";
                if (i.prazoCalculado.cumprido) corSeloClass = "s-gray";
                // 1. Aplica a cor roxa se estiver em espera
                if (i.prazoCalculado.espera && !i.prazoCalculado.cumprido) corSeloClass = "s-purple";

                // 2. Aplica o texto minimalista inteligente
                let txtStatus = "";
                const dataFormatada = i.prazoCalculado.fatal ? i.prazoCalculado.fatal.substring(0, 5) : "";

                if (i.prazoCalculado.cumprido) {
                    txtStatus = `✅ Cumprido • <strong>${i.prazoCalculado.fatal}</strong>`;
                } else if (diff < 0) {
                    txtStatus = `Atrasado ${Math.abs(diff)}d • ${dataFormatada}`;
                } else if (diff === 0) {
                    txtStatus = `Hoje • ${dataFormatada}`;
                } else if (diff === 1) {
                    txtStatus = `Amanhã • ${dataFormatada}`;
                } else {
                    txtStatus = `${diff} dias • ${dataFormatada}`;
                }

                // 3. Monta o selo final
                seloSalvo = `<span class="badge-salvo ${corSeloClass}">${txtStatus}</span>`;
            }

            const apelidoSalvo = getGlobalApelido(proc);
            const notaBuscaSalva = i.prazoCalculado?.anotacao || prazosSalvos[itemKey]?.anotacao || "";
            const tituloDinamicoHTML = getHeaderHTML(proc, apelidoSalvo, notaBuscaSalva, txt);
            const lidoTag = publicacoesLidas.has(itemKey) ? `<span class="badge-lido">LIDO</span>` : '';

            const header = document.createElement("div");

            // 1. Variáveis corretas EXCLUSIVAS da aba Busca:
            const badgeSTJBusca = (i.prazoCalculado && i.prazoCalculado.temFeriadoMunicipal) ? `<span class="icon-status tooltip-bottom" data-tooltip="Atenção STJ: Comprove o Feriado Local" style="filter: drop-shadow(0 2px 4px rgba(212, 76, 71, 0.4));">🚨</span>` : ''; const infoOrigem = `${i.siglaTribunal || 'TJ'} ${i.oabBuscada ? '• OAB ' + i.oabBuscada : ''}`;
            const infoData = `• ${dataProc}`;
            let iconeLido = publicacoesLidas.has(itemKey) ? `<span class="badge-lido">Lido</span>` : '';
            let statusDireitaHtml = seloSalvo ? seloSalvo : iconeLido;

            // 2. Montagem do HTML com a nova barra (Origem na Esquerda / Status na Direita)
            header.innerHTML = `
                <div class="card-click-area" tabindex="0" aria-expanded="false" aria-label="Expandir Processo ${proc}">
                    <div class="card-top-info" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 8px; margin-bottom: 12px; font-size: 12px;">
                        <div class="status-origem" style="font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
    <span class="badge-trib">${i.siglaTribunal || 'TJ'}</span>
    ${badgeSTJBusca}
    ${(i.prazoCalculado && i.prazoCalculado.espera) ? '<span class="icon-status tooltip-bottom" data-tooltip="Aguardando Terceiros">⏳</span>' : ''}
</div>
                        <div class="status-urgencia" style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
                            <span class="badge-tarefas" style="display: none; margin-right: 4px;"></span>
                            ${statusDireitaHtml}
                        </div>
                    </div>
                    ${tituloDinamicoHTML}
                </div>
            `;

            const teorWrapper = document.createElement("div");
            teorWrapper.className = "teor-wrapper";

            const teorInnerOverflow = document.createElement("div");
            teorInnerOverflow.className = "teor-inner-overflow";

            const teorBoxContainer = document.createElement("div");
            teorBoxContainer.className = "teor-box-container";

            const teorInnerBox = document.createElement("div");
            teorInnerBox.className = "teor-inner-box";

            const fadeOverlay = document.createElement("div");
            fadeOverlay.className = "teor-fade-overlay";

            const conteudoExibicao = (i.prazoCalculado && i.prazoCalculado.textoHtml) ? i.prazoCalculado.textoHtml : aplicarHighlighterRadar(txt);

            if (term && !i.prazoCalculado?.textoHtml) {
                const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
                const parts = txt.split(regex);
                parts.forEach(p => {
                    if (p.toLowerCase() === term.toLowerCase()) {
                        const m = document.createElement('span');
                        m.className = 'highlight-term';
                        m.textContent = p;
                        teorInnerBox.appendChild(m);
                    } else {
                        teorInnerBox.appendChild(document.createTextNode(p));
                    }
                });
            } else {
                teorInnerBox.innerHTML = conteudoExibicao;
            }

            teorBoxContainer.appendChild(teorInnerBox);
            teorBoxContainer.appendChild(fadeOverlay);

            const btnFocoMini = document.createElement("button");
            btnFocoMini.className = "btn-foco-mini tooltip-left";
            btnFocoMini.setAttribute('data-tooltip', 'Abrir no Modo Foco');
            btnFocoMini.innerHTML = iconesSVG.foco;
            teorBoxContainer.appendChild(btnFocoMini);

            const notionWrapperBusca = document.createElement("div");
            notionWrapperBusca.className = "notion-wrapper";
            
            const toolbarBusca = document.createElement("div");
            toolbarBusca.className = "wysiwyg-toolbar";
            toolbarBusca.innerHTML = `
                <div class="wysiwyg-label" style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-right: auto; padding-left: 4px;">Anotações (Texto Livre)</div>
                <div style="display:flex; gap:4px;">
                    <button type="button" data-cmd="bold" title="Negrito"><b>B</b></button>
                    <button type="button" data-cmd="italic" title="Itálico"><i>I</i></button>
                    <button type="button" class="btn-add-link" title="Inserir Link">🔗</button>
                    <button type="button" data-cmd="insertUnorderedList" title="Lista de Marcadores">•</button>
                </div>
            `;

            const txtAreaBusca = document.createElement("div");
            txtAreaBusca.className = "nota-input mini-notion";
            txtAreaBusca.setAttribute("contenteditable", "true");
            txtAreaBusca.setAttribute("placeholder", "Escreva anotações livres...");
            
            let val = notaBuscaSalva || "";
            txtAreaBusca.innerHTML = val;
            txtAreaBusca.setAttribute("aria-label", "Anotações do Processo");

            toolbarBusca.querySelectorAll('button').forEach(btn => {
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

            notionWrapperBusca.appendChild(toolbarBusca);
            notionWrapperBusca.appendChild(txtAreaBusca);
            notionWrapperBusca.appendChild(createTasksWrapperUI(itemKey, proc, txt, header));

            txtAreaBusca.onclick = e => e.stopPropagation();
            txtAreaBusca.onkeydown = e => e.stopPropagation();
            txtAreaBusca.oninput = e => {
                header.querySelector(".proc-header").innerHTML = getHeaderHTML(proc, getGlobalApelido(proc), e.target.innerHTML, txt);
            };

            const markAsRead = () => {
                if (!publicacoesLidas.has(itemKey)) {
                    publicacoesLidas.add(itemKey);
                    salvarPublicacoesLidas();
                    card.classList.add('lido');
                    const headerInfo = card.querySelector('.card-top-info');
                    if (headerInfo && !headerInfo.querySelector('.badge-lido')) {
                        const seloSalvoEl = headerInfo.querySelector('.badge-salvo');
                        const spanLido = document.createElement('span');
                        spanLido.className = 'badge-lido';
                        spanLido.innerHTML = `Lido`;
                        if (seloSalvoEl) {
                            headerInfo.insertBefore(spanLido, seloSalvoEl);
                        } else {
                            headerInfo.appendChild(spanLido);
                        }
                    }
                    totalLidos++;
                    SafeStorage.set({ 'djen_total_lidos': totalLidos });
                    updateProgressBar();
                }
            };

            txtAreaBusca.oninput = debounce(e => {
                if (typeof i !== 'undefined') {
                    i.anotacao = e.target.value;
                } else if (prazosSalvos[itemKey]) {
                    prazosSalvos[itemKey].anotacao = e.target.value;
                }
                savePrazosSalvos();
            }, 500);

            txtAreaBusca.addEventListener('input', function () {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });

            if (txtAreaBusca.innerHTML.trim() !== '') {
                setTimeout(() => {
                    txtAreaBusca.style.height = 'auto';
                    txtAreaBusca.style.height = (txtAreaBusca.scrollHeight) + 'px';
                }, 50);
            }

            
            const acoesPills = document.createElement("div");
            acoesPills.className = "card-acoes-pills";

            const btnCalc = document.createElement("button");
            btnCalc.className = `btn-acao-square btn-recalc tooltip-right ${(i.prazoCalculado && i.prazoCalculado.fatal) ? 'h-green' : 'h-orange'}`;
            const tooltipTextoRender = (i.prazoCalculado && i.prazoCalculado.fatal) ? "🔬 Auditoria Completa (Recalcular)" : "🧮 Calcular Prazo Fatal";
            btnCalc.setAttribute('aria-label', tooltipTextoRender);
            btnCalc.setAttribute('data-tooltip', tooltipTextoRender);
            btnCalc.innerHTML = iconesSVG.calendario;

            const btnCopiar = document.createElement("button");
            btnCopiar.className = "btn-acao-square h-blue btn-copy tooltip-right";
            btnCopiar.setAttribute('aria-label', 'Copiar com notas');
            btnCopiar.setAttribute('data-tooltip', 'Copiar');
            btnCopiar.innerHTML = iconesSVG.copiar;

            const btnShare = document.createElement("button");
            btnShare.className = "btn-acao-square h-blue btn-share-ind tooltip-right";
            btnShare.setAttribute('aria-label', 'Compartilhar');
            btnShare.setAttribute('data-tooltip', 'Compartilhar');
            btnShare.innerHTML = iconesSVG.share;

            btnShare.onclick = (e) => {
                e.stopPropagation();
                markAsRead();
                if (i.prazoCalculado) i.prazoCalculado.anotacao = txtAreaBusca.innerHTML;
                tituloParaCompartilhar = "Processo " + proc;
                const mockItem = i.prazoCalculado || { processo: proc, textoCompleto: txt, anotacao: txtAreaBusca.innerHTML, siglaTribunal: i.siglaTribunal };
                textoParaCompartilhar = gerarTextoCompartilhamento([mockItem], "Aviso de Publicação");
                abrirModalCompartilhar('ind');
            };

            const rightActionsBusca = document.createElement("div");
            rightActionsBusca.style.display = "flex";
            rightActionsBusca.style.alignItems = "center";
            rightActionsBusca.style.gap = "8px";
            rightActionsBusca.style.marginLeft = "auto";

            const menuContainerBusca = document.createElement("div");
            menuContainerBusca.className = "card-menu-container";
            menuContainerBusca.innerHTML = `<button class="btn-acao-square h-blue btn-opcoes-card tooltip-left" aria-label="Mais opções" data-tooltip="Mais opções">${iconesSVG.maisOpcoes}</button><div class="card-dropdown"><button class="btn-editar-apelido" aria-label="Editar identificação">${iconesSVG.lapis} Editar identificação</button><hr><button class="btn-marcar-naolido" aria-label="Marcar como não lido">${iconesSVG.eyeOff} Marcar como não lido</button><button class="btn-remover-prazo" style="color: var(--zen-orange); display: ${isSalvo ? 'flex' : 'none'};" aria-label="Limpar contagem">${iconesSVG.remover} Limpar contagem</button></div>`;
            rightActionsBusca.appendChild(menuContainerBusca);
            acoesPills.append(btnCalc, btnCopiar, btnShare, rightActionsBusca);

            const clickArea = header.querySelector('.card-click-area');
            let openTimer;

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
                    openTimer = setTimeout(() => { markAsRead(); }, 13000);
                } else {
                    clearTimeout(openTimer);
                }
            };

            clickArea.onclick = (e) => {
                if (e.target.closest('.hint-apelido')) {
                    e.stopPropagation();
                    abrirModalApelido(proc, apelidoSalvo, (novoApelido) => {
                        setGlobalApelido(proc, novoApelido.trim(), itemKey);
                        applyFilters();
                    });
                    return;
                }
                toggleCard();
            };

            clickArea.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    toggleCard();
                }
            };

            btnCopiar.onclick = (e) => {
                e.stopPropagation();
                markAsRead();
                if (i.prazoCalculado) i.prazoCalculado.anotacao = txtAreaBusca.innerHTML;
                const mockItem = i.prazoCalculado || { processo: proc, textoCompleto: txt, anotacao: txtAreaBusca.innerHTML, siglaTribunal: i.siglaTribunal };
                const copyText = gerarTextoCompartilhamento([mockItem], "Cópia do DJEN");
                navigator.clipboard.writeText(copyText).then(() => showToast("Copiado com sucesso!", "📎"));
            };

            btnFocoMini.onclick = (e) => {
                e.stopPropagation();
                markAsRead();
                const ov = document.getElementById('focusModeOverlay');
                if (ov) {
                    ov.setAttribute('data-active-key', itemKey);
                    document.getElementById('focusTribunal').textContent = i.siglaTribunal || 'TJ';
                    document.getElementById('focusProcesso').textContent = proc;
                    document.getElementById('focusApelido').innerHTML = apelidoSalvo;
                    const savedHtml = prazosSalvos[itemKey] && prazosSalvos[itemKey].textoHtml;
                    if (savedHtml) {
                        document.getElementById('focusTeorContent').innerHTML = savedHtml;
                    } else {
                        document.getElementById('focusTeorContent').innerHTML = aplicarHighlighterRadar(txt);
                    }
                    ov.classList.add('show');
                    if (typeof inicializarNovosRecursosFoco === 'function') inicializarNovosRecursosFoco();
                }
            };

            const prazoSugerido = extrairPrazoSugerido(txt);
            const calcPanel = montarCalculadoraForm(i, btnCalc, itemKey, i.data_disponibilizacao, proc, prazoSugerido, true, null, toggleCard);

            if (btnCalc) {
                btnCalc.onclick = (e) => {
                    e.stopPropagation();
                    markAsRead();

                    const isAtiva = calcPanel.classList.contains('ativa');
                    if (isAtiva) {
                        calcPanel.classList.remove('ativa');
                        return;
                    }

                    let prazo = i.prazoCalculado || i;
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
                            containerAlertas.innerHTML = htmlAlertas;
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
                            const bVoltar = dFin.querySelector('.btn-voltar-calc'); if (bVoltar) { bVoltar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: -3px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Recalcular prazo`; bVoltar.style.flex = '1'; }
                        }
                        calcPanel.classList.add('ativa');
                    } else {
                        const cInp = calcPanel.querySelector('.calc-inputs-container'); if (cInp) cInp.style.display = 'flex';
                        const dIni = calcPanel.querySelector('.calc-acoes-iniciais'); if (dIni) dIni.style.display = 'flex';
                        const cRes = calcPanel.querySelector('.calc-result-box'); if (cRes) cRes.style.display = 'none';
                        const prev = calcPanel.querySelector('.calc-preview'); if (prev) prev.style.display = 'none';
                        const dFin = calcPanel.querySelector('.calc-acoes-finais'); if (dFin) dFin.style.display = 'none';
                        calcPanel.classList.add('ativa');
                    }
                    setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150);
                };
            }

            teorInnerOverflow.append(teorBoxContainer, notionWrapperBusca, acoesPills, calcPanel);
            teorWrapper.appendChild(teorInnerOverflow);
            card.append(header, teorWrapper);
            return card;
        };


        const gruposProcessos = {};
        items.forEach(i => {
            const txt = cleanText(i.texto || i.teor);
            const proc = formatCNJ(getProc(i, txt));
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
            const cardPrincipal = criarIntimacaoCard(iPrincipal, cardIndexGlobal++);

            if (grupo.length > 1) {
                cardPrincipal.classList.add('has-thread');
                
                const threadBtn = document.createElement('button');
                threadBtn.className = 'thread-toggle-pill';
                threadBtn.innerHTML = `<span style="display: flex; align-items: center; gap: 4px;">Histórico (${grupo.length - 1}) <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></span>`;
                
                const statusOrigem = cardPrincipal.querySelector('.status-origem');
                if (statusOrigem) {
                    statusOrigem.appendChild(threadBtn);
                }

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
                    const filhoCard = criarIntimacaoCard(grupo[k], cardIndexGlobal++);
                    filhoCard.classList.add('thread-filho');
                    threadContainer.appendChild(filhoCard);
                }

                cardPrincipal.appendChild(threadContainer);
            }

            fragment.appendChild(cardPrincipal);
        });

        res.appendChild(fragment);
        if (totalRadarEncontrado > 0) {
            setTimeout(() => {
                showToast(`Radar detectou termos em ${totalRadarEncontrado} publicação(ões)!`, "🏷️");
            }, 500);
        }
    }

    function appendCardsToList(chaves, listElement, openKey, emptyMessage) {
        listElement.innerHTML = "";
        if (chaves.length === 0) {
            const zenIcon = `
                <style>
                    @keyframes floatZen {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-6px); }
                    }
                </style>
                <div style="font-size: 48px; margin-bottom: 16px; animation: floatZen 4s ease-in-out infinite;">☕</div>`;
            const tpl = document.getElementById('tpl-empty-agenda').content.cloneNode(true);
            tpl.querySelector('.empty-icon-slot').innerHTML = zenIcon;
            if (emptyMessage) {
                tpl.querySelector('.empty-title').textContent = emptyMessage;
            }
            tpl.querySelector('.btn-empty-novo').onclick = () => document.getElementById('btnNovoPrazoManual')?.click();
            listElement.innerHTML = '';
            listElement.appendChild(tpl);
            return;
        }

        const fragment = document.createDocumentFragment();

        chaves.forEach(key => {
            const item = prazosSalvos[key]; const card = document.createElement('div'); card.className = "intimacao-card compact";
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

                if (item.cumprido) { corSeloClass = "s-gray"; txtStatus = `✅ Cumprido • <strong>${item.fatal}</strong>`; }
                else if (diffDias < 0) { corSeloClass = "s-red"; txtStatus = `${iconStr}Atrasado ${Math.abs(diffDias)}d • ${item.fatal.substring(0, 5)}`; }
                else if (diffDias === 0) { corSeloClass = "s-hoje"; txtStatus = `${iconStr}Hoje • ${item.fatal.substring(0, 5)}`; }
                else if (diffDias === 1) { corSeloClass = "s-orange"; txtStatus = `${iconStr}Amanhã • ${item.fatal.substring(0, 5)}`; }
                else { corSeloClass = diffDias <= 5 ? "s-orange" : "s-green"; txtStatus = `${iconStr}${diffDias} dias • ${item.fatal.substring(0, 5)}`; }
                if (item.espera && !item.cumprido) corSeloClass = "s-purple";
            } else {
                corSeloClass = "s-orange"; txtStatus = `⚠️ Calcular prazo`;
            }

            const trib = String(item.siglaTribunal || (item.uf ? 'TJ' + item.uf : 'MANUAL')).toUpperCase();
            let dispDate = '--/--/----';
            if (item.disp) dispDate = item.disp; else if (item.data_disponibilizacao) dispDate = item.data_disponibilizacao.split('T')[0].split('-').reverse().join('/'); else if (item.pubOrig) dispDate = item.pubOrig.split('T')[0].split('-').reverse().join('/');

            const apelidoSalvo = getGlobalApelido(item.processo); const anotacaoSalva = item.anotacao || "";
            const tituloDinamicoHTML = getHeaderHTML(item.processo, apelidoSalvo, anotacaoSalva, item.textoCompleto);

            const header = document.createElement("div");
            const badgeSTJ = item.temFeriadoMunicipal ? `<span class="icon-status tooltip-bottom" data-tooltip="Atenção STJ: Comprove Feriado Local (Art. 1.003, § 6º CPC)" style="filter: drop-shadow(0 2px 4px rgba(212, 76, 71, 0.4));">🚨</span>` : '';
            header.innerHTML = `
                <div class="card-click-area" tabindex="0" aria-expanded="false" aria-label="Expandir Processo ${item.processo}">
                    <div class="card-top-info">
                        <div class="card-info-left" style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
    <span class="badge-trib">${trib}</span>
    ${badgeSTJ}
    ${item.espera ? '<span class="icon-status tooltip-bottom" data-tooltip="Aguardando Terceiros">⏳</span>' : ''}
    <span class="badge-tarefas" style="display: none;"></span>
</div>
                        <div class="card-info-right">
                            <span class="badge-salvo ${corSeloClass}">${txtStatus}</span>
                        </div>
                    </div>
                    ${tituloDinamicoHTML}
                </div>
            `;

            const teorWrapper = document.createElement("div"); teorWrapper.className = "teor-wrapper"; const teorInnerOverflow = document.createElement("div"); teorInnerOverflow.className = "teor-inner-overflow";
            const btnToggleTeor = document.createElement("button"); btnToggleTeor.className = "btn-toggle-teor"; btnToggleTeor.innerHTML = `📄 Ler Teor Completo`;
            const teorBoxContainer = document.createElement("div"); teorBoxContainer.className = "teor-box-container"; teorBoxContainer.style.display = 'none';
            const teorInnerBox = document.createElement("div"); teorInnerBox.className = "teor-inner-box"; const fadeOverlay = document.createElement("div"); fadeOverlay.className = "teor-fade-overlay";

            if (item.textoHtml) { teorInnerBox.innerHTML = item.textoHtml; } else { teorInnerBox.innerHTML = aplicarHighlighterRadar(item.textoCompleto); }
            teorBoxContainer.appendChild(teorInnerBox); teorBoxContainer.appendChild(fadeOverlay);
            btnToggleTeor.onclick = (e) => { e.stopPropagation(); if (teorBoxContainer.style.display === 'none') { teorBoxContainer.style.display = 'block'; btnToggleTeor.innerHTML = `📄 Ocultar Teor`; } else { teorBoxContainer.style.display = 'none'; btnToggleTeor.innerHTML = `📄 Ler Teor Completo`; } };

            const btnFocoMini = document.createElement("button"); btnFocoMini.className = "btn-foco-mini tooltip-left"; btnFocoMini.setAttribute('data-tooltip', 'Abrir no Modo Foco'); btnFocoMini.innerHTML = iconesSVG.foco; teorBoxContainer.appendChild(btnFocoMini);

            const notionWrapperAgenda = document.createElement("div");
            notionWrapperAgenda.className = "notion-wrapper";
            
            const toolbarAgenda = document.createElement("div");
            toolbarAgenda.className = "wysiwyg-toolbar";
            toolbarAgenda.innerHTML = `
                <div class="wysiwyg-label" style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-right: auto; padding-left: 4px;">Anotações (Texto Livre)</div>
                <div style="display:flex; gap:4px;">
                    <button type="button" data-cmd="bold" title="Negrito"><b>B</b></button>
                    <button type="button" data-cmd="italic" title="Itálico"><i>I</i></button>
                    <button type="button" class="btn-add-link" title="Inserir Link">🔗</button>
                    <button type="button" data-cmd="insertUnorderedList" title="Lista de Marcadores">•</button>
                </div>
            `;

            const txtAreaBusca = document.createElement("div"); 
            txtAreaBusca.className = "nota-input mini-notion"; 
            txtAreaBusca.setAttribute("contenteditable", "true"); 
            txtAreaBusca.setAttribute("placeholder", "Escreva notas, crie #tags ou adicione tarefas..."); 
            
            txtAreaBusca.className = "nota-input mini-notion"; 
            txtAreaBusca.setAttribute("contenteditable", "true"); 
            txtAreaBusca.setAttribute("placeholder", "Escreva anotações livres..."); 
            
            let val = anotacaoSalva || "";
            txtAreaBusca.innerHTML = val;
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
            notionWrapperAgenda.appendChild(createTasksWrapperUI(key, item.processo, item.textoCompleto, header));

            txtAreaBusca.onclick = e => { e.stopPropagation(); };
            txtAreaBusca.onkeydown = e => { e.stopPropagation(); };
            txtAreaBusca.oninput = e => { 
                header.querySelector('.proc-header').innerHTML = getHeaderHTML(item.processo, getGlobalApelido(item.processo), e.target.innerHTML, item.textoCompleto); 
                item.anotacao = e.target.innerHTML; 
                savePrazosSalvos(); 
            };

            
            const acoesPills = document.createElement("div"); acoesPills.className = "card-acoes-pills";

            const btnCalc = document.createElement("button");
            btnCalc.className = `btn-acao-square btn-recalc tooltip-right ${item.fatal ? 'h-green' : 'h-orange'}`;
            const tooltipTextoAppend = item.fatal ? "🔬 Auditoria Completa (Recalcular)" : "🧮 Calcular Prazo Fatal";
            btnCalc.setAttribute('aria-label', tooltipTextoAppend);
            btnCalc.setAttribute('data-tooltip', tooltipTextoAppend);
            btnCalc.innerHTML = iconesSVG.calendario;

            const btnCopiar = document.createElement("button"); btnCopiar.className = "btn-acao-square h-blue btn-copy tooltip-right"; btnCopiar.setAttribute('aria-label', 'Copiar com notas'); btnCopiar.setAttribute('data-tooltip', 'Copiar'); btnCopiar.innerHTML = iconesSVG.copiar;
            const btnShare = document.createElement("button"); btnShare.className = "btn-acao-square h-blue btn-share-ind tooltip-right"; btnShare.setAttribute('aria-label', 'Compartilhar'); btnShare.setAttribute('data-tooltip', 'Compartilhar'); btnShare.innerHTML = iconesSVG.share;

            const rightActionsSalvos = document.createElement("div"); rightActionsSalvos.style.display = "flex"; rightActionsSalvos.style.alignItems = "center"; rightActionsSalvos.style.gap = "8px"; rightActionsSalvos.style.marginLeft = "auto";

            const btnCumprir = document.createElement("button");
            if (item.cumprido) { btnCumprir.className = "btn-cumprir-quadrado is-cumprido tooltip-left"; btnCumprir.innerHTML = iconesSVG.retro; btnCumprir.setAttribute('aria-label', 'Reabrir Prazo'); btnCumprir.setAttribute('data-tooltip', 'Reabrir Prazo'); }
            else { btnCumprir.className = "btn-cumprir-quadrado tooltip-left"; btnCumprir.innerHTML = iconesSVG.check; btnCumprir.setAttribute('aria-label', 'Marcar como Cumprido'); btnCumprir.setAttribute('data-tooltip', 'Marcar como Cumprido'); }

            let htmlRemover = '';
            if (item.manual) {
                if (item.fatal) { htmlRemover = `<button class="btn-remover-prazo" style="color: var(--zen-orange);">${iconesSVG.retro} Excluir prazo</button><button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Remover anotação</button>`; }
                else { htmlRemover = `<button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Remover anotação</button>`; }
            } else { htmlRemover = `<button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Excluir registro</button>`; }

            const menuContainerSalvos = document.createElement("div"); menuContainerSalvos.className = "card-menu-container"; menuContainerSalvos.innerHTML = `<button class="btn-acao-square h-blue btn-opcoes-card tooltip-left" aria-label="Mais opções" data-tooltip="Mais opções">${iconesSVG.maisOpcoes}</button><div class="card-dropdown"><button class="btn-editar-apelido" aria-label="Editar identificação">${iconesSVG.lapis} Editar identificação</button><hr>${htmlRemover}</div>`;
            rightActionsSalvos.append(btnCumprir, menuContainerSalvos); acoesPills.append(btnCalc, btnCopiar, btnShare, rightActionsSalvos);

            const clickArea = header.querySelector('.card-click-area');
            const toggleCard = () => { const isOpening = !card.classList.contains('aberto'); if (isOpening) { document.querySelectorAll('.intimacao-card.aberto').forEach(c => { if (c !== card) { c.classList.remove('aberto'); c.querySelector('.card-click-area').setAttribute('aria-expanded', 'false'); } }); } card.classList.toggle('aberto'); clickArea.setAttribute('aria-expanded', isOpening); if (isOpening) { setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); } else { if (document.getElementById('viewSalvos')?.style.display !== 'none') setTimeout(renderAgenda, 350); if (document.getElementById('viewCalendario')?.style.display !== 'none') setTimeout(renderCalendar, 250); } };

            clickArea.onclick = (e) => { if (e.target.closest('.hint-apelido')) { e.stopPropagation(); abrirModalApelido(item.processo, apelidoSalvo, (novoApelido) => { setGlobalApelido(item.processo, novoApelido.trim(), key); renderAgenda(); renderCalendar(); }); return; } toggleCard(); }; clickArea.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); toggleCard(); } };

            btnCumprir.onclick = (e) => { e.stopPropagation(); alternarCumprimento(key, card, false); };
            btnShare.onclick = (e) => { e.stopPropagation(); item.anotacao = txtAreaBusca.innerHTML; tituloParaCompartilhar = "Processo " + item.processo; textoParaCompartilhar = gerarTextoCompartilhamento([item], "Aviso de Prazo"); abrirModalCompartilhar('ind'); };
            btnCopiar.onclick = (e) => { e.stopPropagation(); if (item.prazoCalculado) item.prazoCalculado.anotacao = txtAreaBusca.innerHTML; const copyText = gerarTextoCompartilhamento([item], "Cópia do DJEN"); navigator.clipboard.writeText(copyText).then(() => showToast("Copiado com sucesso!", "📎")); };
            btnFocoMini.onclick = (e) => { e.stopPropagation(); const ov = document.getElementById('focusModeOverlay'); if (ov) { ov.setAttribute('data-active-key', key); document.getElementById('focusTribunal').textContent = trib; document.getElementById('focusProcesso').textContent = item.processo; document.getElementById('focusApelido').innerHTML = getHeaderHTML(item.processo, apelidoSalvo, txtAreaBusca.innerHTML, item.textoCompleto); if (item.textoHtml) { document.getElementById('focusTeorContent').innerHTML = item.textoHtml; } else { document.getElementById('focusTeorContent').innerHTML = aplicarHighlighterRadar(item.textoCompleto); } ov.classList.add('show'); if (typeof inicializarNovosRecursosFoco === 'function') inicializarNovosRecursosFoco(); } };

            const calcPanel = montarCalculadoraForm(item, btnCalc, key, item.pubOrig || item.pub || new Date().toISOString().split('T')[0], item.processo, item.dias, false, null, toggleCard);

            if (btnCalc) {
                btnCalc.onclick = (e) => {
                    e.stopPropagation();

                    const isAtiva = calcPanel.classList.contains('ativa');
                    if (isAtiva) {
                        calcPanel.classList.remove('ativa');
                        return;
                    }

                    if (item && item.timeline) {
                        const cInp = calcPanel.querySelector('.calc-inputs-container'); if (cInp) cInp.style.display = 'none';
                        const dIni = calcPanel.querySelector('.calc-acoes-iniciais'); if (dIni) dIni.style.display = 'none';
                        const cRes = calcPanel.querySelector('.calc-result-box'); if (cRes) cRes.style.display = 'block';

                        const lblDataFatal = calcPanel.querySelector('.resultado-data-fatal');
                        if (lblDataFatal) lblDataFatal.textContent = item.fatal || "--/--/----";

                        const containerAlertas = calcPanel.querySelector('.resultado-alertas');
                        if (containerAlertas) {
                            containerAlertas.style.display = 'block';
                            let badgesHtml = "";
                            if (item.feriados > 0) badgesHtml += `<span class="badge bg-gray">${item.feriados} Feriados/Suspensões</span>`;
                            if (item.prorrogado) badgesHtml += `<span class="badge bg-orange">Prorrogado</span>`;
                            let htmlAlertas = badgesHtml ? `<div style="display:flex; gap:4px; justify-content:center; width: 100%; margin-bottom: 12px;">${badgesHtml}</div>` : "";
                            htmlAlertas += `<div style="width: 100%; text-align: center; margin-top: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--primary); cursor: pointer;">🖱️ Clique aqui para ocultar/mostrar a auditoria</div>`;
                            containerAlertas.innerHTML = htmlAlertas;
                        }

                        const prev = calcPanel.querySelector('.calc-preview');
                        if (prev) {
                            preencherAuditoriaVisual(item.timeline, prev);
                            prev.style.display = 'grid';
                            const btnContainer = calcPanel.querySelector('.container-btn-png');
                            if (btnContainer) btnContainer.style.display = 'block';
                        }

                        const dFin = calcPanel.querySelector('.calc-acoes-finais');
                        if (dFin) {
                            dFin.style.display = 'flex';
                            const bSalvar = dFin.querySelector('.btn-salvar'); if (bSalvar) bSalvar.style.display = 'none';
                            const bVoltar = dFin.querySelector('.btn-voltar-calc'); if (bVoltar) { bVoltar.innerHTML = '⚙️ Recalcular Prazo'; bVoltar.style.flex = '1'; }
                        }
                        calcPanel.classList.add('ativa');
                    } else {
                        const cInp = calcPanel.querySelector('.calc-inputs-container'); if (cInp) cInp.style.display = 'flex';
                        const dIni = calcPanel.querySelector('.calc-acoes-iniciais'); if (dIni) dIni.style.display = 'flex';
                        const cRes = calcPanel.querySelector('.calc-result-box'); if (cRes) cRes.style.display = 'none';
                        const prev = calcPanel.querySelector('.calc-preview'); if (prev) prev.style.display = 'none';
                        const dFin = calcPanel.querySelector('.calc-acoes-finais'); if (dFin) dFin.style.display = 'none';
                        calcPanel.classList.add('ativa');
                    }
                    setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150);
                };
            }

            teorInnerOverflow.append(btnToggleTeor, teorBoxContainer, notionWrapperAgenda, acoesPills, calcPanel);
            teorWrapper.appendChild(teorInnerOverflow); card.append(header, teorWrapper); fragment.appendChild(card);

            if (sessionStorage.getItem('djen_auto_open_calc') === key) {
                card.classList.add('aberto');
                header.querySelector('.card-click-area').setAttribute('aria-expanded', 'true');
                calcPanel.classList.add('ativa');
                setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }); sessionStorage.removeItem('djen_auto_open_calc'); }, 300);
            }
        });

        listElement.appendChild(fragment);
    }

    function getItensAgendaFiltrados() {
        let chaves = Object.keys(prazosSalvos).filter(k =>
            prazosSalvos[k] && (prazosSalvos[k].fatal || prazosSalvos[k].manual)
        );

        const termoSalvos = document.getElementById('filtroPrazos')?.value.toLowerCase().trim();
        if (termoSalvos) {
            chaves = chaves.filter(k => {
                const p = prazosSalvos[k];
                return (p.processo?.toLowerCase().includes(termoSalvos) ||
                    p.apelido?.toLowerCase().includes(termoSalvos) ||
                    p.anotacao?.toLowerCase().includes(termoSalvos));
            });
        }

        const hj = new Date();
        hj.setHours(12, 0, 0, 0);

        if (filtroAgendaAtivo) {
            chaves = chaves.filter(k => {
                const p = prazosSalvos[k];
                if (filtroAgendaAtivo === 'cumpridos') return p.cumprido;
                if (filtroAgendaAtivo === 'espera') return p.espera && !p.cumprido;

                if (p.cumprido || !p.fatal || p.espera) return false;

                const dt = parseDateBR(p.fatal);
                const diff = Math.ceil((dt - hj) / (1000 * 3600 * 24));

                if (filtroAgendaAtivo === 'hoje') return diff <= 0;
                if (filtroAgendaAtivo === '5dias') return diff > 0 && diff <= 5;
                if (filtroAgendaAtivo === 'futuros') return diff > 5;
                return true;
            });
        } else {
            chaves = chaves.filter(k => !prazosSalvos[k].cumprido);
        }

        chaves.sort((a, b) => {
            const pA = prazosSalvos[a];
            const pB = prazosSalvos[b];
            if (!pA.fatal || !pB.fatal) return 0;
            return parseDateBR(pA.fatal).getTime() - parseDateBR(pB.fatal).getTime();
        });

        return chaves.map(k => prazosSalvos[k]);
    }

    function renderAgenda() {
        const list = document.getElementById('listaSalvos');
        if (!list) return;

        const openCard = document.querySelector('#listaSalvos .intimacao-card.aberto');
        const openKey = openCard ? openCard.getAttribute('data-key') : null;

        const itensFiltrados = getItensAgendaFiltrados();
        const chaves = itensFiltrados.map(p => {
            // Re-find the key since we need it for appendCardsToList
            return Object.keys(prazosSalvos).find(k => prazosSalvos[k] === p);
        });

        appendCardsToList(chaves, list, openKey, "Nenhum prazo localizado para este filtro");
    }

    function renderCalendar() {
        const monthYearEl = document.getElementById('calMonthYear'); const daysContainer = document.getElementById('calDaysContainer');
        if (!monthYearEl || !daysContainer) return;

        const year = currentCalDate.getFullYear(); const month = currentCalDate.getMonth();
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        monthYearEl.textContent = `${monthNames[month]} ${year}`;

        daysContainer.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
        const hojeRef = new Date(); hojeRef.setHours(0, 0, 0, 0);
        const todayStr = `${hojeRef.getFullYear()}-${String(hojeRef.getMonth() + 1).padStart(2, '0')}-${String(hojeRef.getDate()).padStart(2, '0')}`;

        if (!selectedCalDateStr) {
            selectedCalDateStr = todayStr;
        }

        const prazoDates = {};
        for (let k in prazosSalvos) {
            const p = prazosSalvos[k];
            if (p && p.fatal) {
                const parts = p.fatal.split('/'); const fStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                if (!prazoDates[fStr]) prazoDates[fStr] = [];
                prazoDates[fStr].push(p);
            }
        }

        for (let i = 0; i < firstDay; i++) { const empty = document.createElement('div'); empty.className = 'cal-cell is-muted'; daysContainer.appendChild(empty); }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const cell = document.createElement('div'); cell.className = 'cal-cell';
            if (dateStr === todayStr) cell.classList.add('is-today');
            if (dateStr === selectedCalDateStr) cell.classList.add('is-selected');
            cell.textContent = d;

            const itemsForDay = prazoDates[dateStr] || [];
            if (itemsForDay.length > 0) {
                const dotsWrap = document.createElement('div'); dotsWrap.className = 'cal-dots';
                itemsForDay.slice(0, 3).forEach(p => {
                    const dot = document.createElement('div'); dot.className = 'cal-dot';
                    if (p.cumprido) { dot.classList.add('d-gray'); }
                    else {
                        const pDate = new Date(year, month, d, 12, 0, 0); const diff = Math.ceil((pDate - hojeRef) / (1000 * 3600 * 24));
                        if (diff <= 0) dot.classList.add('d-red'); else if (diff <= 5) dot.classList.add('d-orange'); else dot.classList.add('d-green');
                    }
                    dotsWrap.appendChild(dot);
                });
                if (itemsForDay.length > 3) { const plus = document.createElement('div'); plus.style.fontSize = "8px"; plus.style.lineHeight = "4px"; plus.style.fontWeight = "bold"; plus.textContent = "+"; dotsWrap.appendChild(plus); }
                cell.appendChild(dotsWrap);
            }

            cell.onclick = () => {
                selectedCalDateStr = dateStr;
                document.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('is-selected'));
                cell.classList.add('is-selected');
                renderSelectedDateItems(dateStr);
            };

            daysContainer.appendChild(cell);
        }

        if (selectedCalDateStr && selectedCalDateStr.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) { renderSelectedDateItems(selectedCalDateStr); }
        else { const pnl = document.getElementById('calSelectedDatePanel'); if (pnl) pnl.style.display = 'none'; }
    }

    function renderSelectedDateItems(dateStr) {
        const panel = document.getElementById('calSelectedDatePanel'); const container = document.getElementById('calSelectedDateItems'); const title = document.getElementById('calSelectedDateTitle');
        if (panel) panel.style.display = 'block'; const parts = dateStr.split('-'); if (title) title.textContent = `Prazos do dia ${parts[2]}/${parts[1]}/${parts[0]}`;

        const openCard = document.querySelector('#calSelectedDateItems .intimacao-card.aberto');
        const openKey = openCard ? openCard.getAttribute('data-key') : null;
        const targetBR = `${parts[2]}/${parts[1]}/${parts[0]}`;
        const chaves = Object.keys(prazosSalvos).filter(k => prazosSalvos[k] && prazosSalvos[k].fatal === targetBR);

        if (container) appendCardsToList(chaves, container, openKey, "Nenhum prazo fatal para este dia");
    }

    const bCPrev = document.getElementById('btnCalPrev'); if (bCPrev) bCPrev.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); renderCalendar(); };
    const bCNext = document.getElementById('btnCalNext'); if (bCNext) bCNext.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); renderCalendar(); };

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
                console.warn(`DJEN: Falha na tentativa ${i + 1} de ${tentativas}. URL: ${urlLimpa.toString()}`);

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
        btnBuscar.onclick = async () => {
            const dtIni = document.getElementById('dataInicio')?.value; const dtFim = document.getElementById('dataFim')?.value;
            if (!dtIni || !dtFim) { showToast("As datas inicial e final são obrigatórias para a busca.", "⚠️"); return; }

            let urlsToFetch = []; let oabContexts = []; let numProcesso = '';

            if (searchMode === 'oab') {
                const n = document.getElementById('oabNum')?.value.trim(); const u = document.getElementById('oabUf')?.value.trim().toUpperCase();
                if (!n || !u) { showToast("A busca por OAB requer o número e a UF.", "⚠️"); return; }
                multiOabSearch = n.includes(',');
                const oabs = n.split(/[\s,;-]+/).filter(Boolean);
                oabs.forEach(oab => {
                    urlsToFetch.push(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${oab}&ufOab=${u}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`);
                    oabContexts.push(oab);
                });
                const textoResumo = document.getElementById('textoResumoBusca'); if (textoResumo) textoResumo.textContent = `OAB ${n} ${u}`;
            } else {
                const rawProc = document.getElementById('procNumBusca')?.value.trim();
                const procApenasNumeros = rawProc.replace(/\D/g, '');

                if (procApenasNumeros.length !== 20) { showToast("O formato exige o número completo do processo (20 dígitos).", "⚠️"); return; }
                multiOabSearch = false;

                urlsToFetch.push(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${procApenasNumeros}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`);
                urlsToFetch.push(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${encodeURIComponent(rawProc)}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`);
                oabContexts.push(null, null);

                const textoResumo = document.getElementById('textoResumoBusca');
                if (textoResumo) textoResumo.textContent = `Processo ${formatCNJ(procApenasNumeros)}`;
            }

            totalBuscas++; SafeStorage.set({ 'djen_total_buscas': totalBuscas });

            let oabUfVal = document.getElementById('oabUf')?.value.trim().toUpperCase() || "SP";
            let novoItem = searchMode === 'oab'
                ? { tipo: 'oab', valor: document.getElementById('oabNum').value.trim(), uf: oabUfVal }
                : { tipo: 'proc', valor: document.getElementById('procNumBusca').value.trim() };
            if (novoItem.valor) {
                historicoBuscas = historicoBuscas.filter(h => h.valor !== novoItem.valor);
                historicoBuscas.unshift(novoItem);
                if (historicoBuscas.length > 5) historicoBuscas.pop();
                SafeStorage.set({ 'djen_historico_buscas': JSON.stringify(historicoBuscas) });
                if (typeof renderHistoricoBuscas === 'function') renderHistoricoBuscas();
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
            const resEl = document.getElementById('resultados'); if (resEl) resEl.innerHTML = ""; const cf = document.getElementById('containerFiltro'); if (cf) cf.style.display = 'none';

            let buscaSucesso = false;
            try {
                const arrays = [];
                for (let idx = 0; idx < urlsToFetch.length; idx++) {
                    const url = urlsToFetch[idx];
                    const d = await fetchComRetry(url, 3);
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
                resultadosGlobais = Array.from(mapIds.values());

                if (resultadosGlobais.length > 0) {
                    const resultadosParaSalvar = resultadosGlobais.length > 500 ? resultadosGlobais.slice(0, 500) : resultadosGlobais;
                    SafeStorage.set({ 'djen_last_search': JSON.stringify(resultadosParaSalvar) });
                }

                const tribs = [...new Set(resultadosGlobais.map(i => i.siglaTribunal))].sort();
                const f = document.getElementById('filtroTribunal'); if (f) { f.innerHTML = '<option value="">Tribunal</option>'; tribs.forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t; f.appendChild(o); }); }
                if (cf) cf.style.display = 'flex';
                buscaSucesso = true;
            } catch (e) {
                console.error("DJEN - Erro de Rede:", e);
                if (resEl) {
                    resEl.innerHTML = '';
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

    function updateProgressBar() {
        const el = document.getElementById('progressWrapper'); if (!el) return;
        if (!resultadosExibidos || resultadosExibidos.length === 0) { el.style.display = 'none'; return; }
        el.style.display = 'block'; let total = resultadosExibidos.length; let processados = 0;
        resultadosExibidos.forEach(i => { const txt = cleanText(i.texto || i.teor); const proc = formatCNJ(getProc(i, txt)); const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, ''); if (publicacoesLidas.has(itemKey) || (prazosSalvos[itemKey] && prazosSalvos[itemKey].fatal)) processados++; });
        const pct = (processados / total) * 100; const pf = document.getElementById('progressFill'); if (pf) pf.style.width = `${pct}%`; const pt = document.getElementById('progressText'); if (pt) pt.textContent = `${processados} de ${total} publicações triadas`;
    }

    function applyFilters() {
        const fR = document.getElementById('filtroRapido'); const term = fR ? fR.value.toLowerCase().trim() : "";
        const fT = document.getElementById('filtroTribunal'); const trib = fT ? fT.value : "";
        resultadosExibidos = resultadosGlobais.filter(i => { const txt = cleanText(i.texto || i.teor).toLowerCase(); const proc = String(getProc(i, txt)).toLowerCase(); return (term === "" || txt.includes(term) || proc.includes(term)) && (trib === "" || i.siglaTribunal === trib); });
        const cr = document.getElementById('contadorResultados'); if (cr) cr.textContent = `${resultadosExibidos.length} RESULTADOS`; render(resultadosExibidos, term); updateProgressBar();
    }

    const filtroRapidoEl = document.getElementById('filtroRapido');
    if (filtroRapidoEl) { filtroRapidoEl.addEventListener('input', debounce(applyFilters, 300)); }

    const fb = document.getElementById('filtroTribunal');
    if (fb) fb.onchange = applyFilters;
    // ==========================================
    // AUTOCOMPLETE DOS CAMPOS DE BUSCA
    // ==========================================
    function configurarAutocomplete(inputId, dropdownId, tipoBusca) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        input.addEventListener('input', () => {
            const valorDigitado = input.value.trim().toLowerCase();

            const sugestoes = historicoBuscas.filter(h =>
                h.tipo === tipoBusca && h.valor.toLowerCase().includes(valorDigitado)
            ).slice(0, 5);

            if (sugestoes.length > 0) {
                dropdown.innerHTML = '';
                sugestoes.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    
                    if (tipoBusca === 'oab' && s.uf) {
                        item.textContent = `${s.valor} (${s.uf.toUpperCase()})`;
                    } else {
                        item.textContent = s.valor;
                    }

                    // onmousedown garante que o clique é registado antes do input perder o focus (blur)
                    item.onmousedown = (e) => {
                        e.preventDefault();
                        input.value = s.valor;
                        if (tipoBusca === 'oab' && s.uf) {
                            const ufInput = document.getElementById('oabUf');
                            if (ufInput) {
                                ufInput.value = s.uf;
                                ufInput.dispatchEvent(new Event('change'));
                            }
                        }
                        dropdown.classList.remove('show');
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
                const match = historicoBuscas.find(h => h.tipo === 'oab' && h.valor === val);
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

});



document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            document.activeElement.blur();
            return;
        }

        let algoFechado = false;

        const overlays = document.querySelectorAll('.modal-overlay.show, #focusModeOverlay.show');
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

        const cardsAbertos = document.querySelectorAll('.intimacao-card.aberto');
        if (cardsAbertos.length > 0) {
            cardsAbertos.forEach(card => {
                card.classList.remove('aberto');
                const clickArea = card.querySelector('.card-click-area');
                if (clickArea) clickArea.setAttribute('aria-expanded', 'false');
            });
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
            cr.innerHTML = `${items.length} RESULTADOS <span style="font-size: 11px; color: var(--text-placeholder); margin-left: 8px; font-weight: 500; text-transform: none;">(Lote limpo: sem gatilhos do Radar)</span>`;
            return;
        } else {
            cr.innerHTML = `${items.length} RESULTADOS <span class="tooltip-right tooltip-bottom" data-tooltip="Mostrando os 3 termos mais urgentes detectados no lote" style="cursor:help; font-size: 11px; color: var(--zen-blue); margin-left: 8px; font-weight: 500; text-transform: none;">(Filtros: Top 3 do Radar)</span>`;
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
        chip.innerHTML = `🏷️ ${tag.palavra.charAt(0).toUpperCase() + tag.palavra.slice(1)} <span style="opacity: 0.6; font-size: 10px;">(${tag.total})</span>`;

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
        chipEspera.innerHTML = `⏳ Aguardando Terceiros <span style="opacity: 0.6; font-size: 10px;">(${esperaCount})</span>`;

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
    const tabCalendario = document.getElementById('tabCalendario');

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
            if (document.getElementById('viewCalendario')) document.getElementById('viewCalendario').style.display = 'none';

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
    // ==========================================
    // AUTOCOMPLETE DOS CAMPOS DE BUSCA
    // ==========================================
    function configurarAutocomplete(inputId, dropdownId, tipoBusca) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        if (!input || !dropdown) return;

        input.addEventListener('input', () => {
            const valorDigitado = input.value.trim().toLowerCase();

            // Filtra o histórico exato pelo tipo (oab ou proc)
            const sugestoes = historicoBuscas.filter(h =>
                h.tipo === tipoBusca && h.valor.toLowerCase().includes(valorDigitado)
            ).slice(0, 5);

            if (sugestoes.length > 0) {
                dropdown.innerHTML = ''; // Limpa a lista
                sugestoes.forEach(s => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    
                    if (tipoBusca === 'oab' && s.uf) {
                        item.textContent = `${s.valor} (${s.uf.toUpperCase()})`;
                    } else {
                        item.textContent = s.valor;
                    }

                    // Usamos mousedown em vez de click para evitar que o "blur" do input mate a lista antes
                    item.onmousedown = (e) => {
                        e.preventDefault();
                        input.value = s.valor;
                        if (tipoBusca === 'oab' && s.uf) {
                            const ufInput = document.getElementById('oabUf');
                            if (ufInput) {
                                ufInput.value = s.uf;
                                ufInput.dispatchEvent(new Event('change'));
                            }
                        }
                        dropdown.classList.remove('show');
                    };
                    dropdown.appendChild(item);
                });
                dropdown.classList.add('show');
            } else {
                dropdown.classList.remove('show');
            }
        });

        // Esconde a lista se clicar fora do campo
        input.addEventListener('blur', () => { dropdown.classList.remove('show'); });

        // Reabre a lista se clicar no campo
        input.addEventListener('focus', () => { input.dispatchEvent(new Event('input')); });

        if (inputId === 'oabNum') {
            const preencherUfPorHistorico = () => {
                const val = input.value.trim();
                const match = historicoBuscas.find(h => h.tipo === 'oab' && h.valor === val);
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

    // Ativa o Autocomplete para os dois campos
    configurarAutocomplete('oabNum', 'dropdownOab', 'oab');
    configurarAutocomplete('procNumBusca', 'dropdownProc', 'proc');
}

