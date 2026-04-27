/**
 * Buscador DJEN v46.4 - Edição Premium Offline (JS)
 * Corrigido: PDF Visual Law em Nova Aba (Print Automático, Sem Botões)
 * Corrigido: Restauração Universal de Backups em Memória
 */

window.addXP = function(pontos) {}; function addXP(pontos) {};

function debounce(func, wait) {
    let timeout;
    return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

try {
    let tema = localStorage.getItem('djen_theme') || 'auto';
    if (tema === 'escuro' || (tema === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.documentElement.classList.add('tema-escuro'); } 
    else if (tema === 'sepia') { document.documentElement.classList.add('tema-sepia'); }
    let fontFocus = localStorage.getItem('djen_font_focus');
    if(fontFocus) { document.documentElement.style.setProperty('--font-focus', fontFocus + 'px'); }
} catch(e) {}

/ --- INICIALIZAÇÃO DO PWA ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('PWA: Service Worker registrado com sucesso!'))
        .catch((erro) => console.log('PWA: Falha no Service Worker', erro));
    }

document.addEventListener('DOMContentLoaded', () => {
    verificarLembreteBackup();

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
    let historicoBuscas = []; // NOVO: Guarda os últimos processos/OABs
    let multiOabSearch = false; let publicacoesLidas = new Set(); 
function salvarPublicacoesLidas() {
    const arr = Array.from(publicacoesLidas);
    if (arr.length > 2000) publicacoesLidas = new Set(arr.slice(-2000));
    SafeStorage.set({'djen_publicacoes_lidas': JSON.stringify(Array.from(publicacoesLidas))});
}
    let searchMode = 'oab'; 
    let currentCalDate = new Date(); let selectedCalDateStr = null;
    
    let filtroAgendaAtivo = null; 
    let userXP = 0; let totalCumpridosHistorico = 0; let totalBuscas = 0; let totalLidos = 0; let totalSalvos = 0;
    
    let textoParaCompartilhar = ""; 
    let tituloParaCompartilhar = "";

    const iconesSVG = {
        calendario: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>`,
        copiar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
        check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
        remover: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
        foco: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
        retro: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="2" x2="14" y2="2"></line><line x1="12" y1="14" x2="15" y2="11"></line><circle cx="12" cy="14" r="8"></circle></svg>`,
        maisOpcoes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>`,
        lapis: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
        eyeOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        boxEmpty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 56px; height: 56px; color: var(--border-light); margin-bottom: 16px;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
        tag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
        share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`
    };


    const pixCodeText = "50f781e2-9d94-4624-8f08-a9938bb0c4dc";
    let palavrasUrgentes = ["penhora", "bloqueio", "revelia", "liminar", "audiência", "audiencia"];

    const SafeStorage = { 
    get: (keys, cb) => { 
        let d = {}; 
        keys.forEach(k => d[k] = localStorage.getItem(k)); 
        cb(d); 
    },
    set: (obj) => { 
        Object.keys(obj).forEach(k => {
            try { localStorage.setItem(k, obj[k]); } 
            catch (e) { console.error("Erro no armazenamento local (Cota excedida):", e); }
        }); 
    }
};
    // Salva os dados
    set: (obj) => { 
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) { 
            // Salva apenas no Chrome Storage para evitar redundância e erros de cota
            chrome.storage.local.set(obj); 
        } else {
            // Fallback para ambiente de desenvolvimento web
            Object.keys(obj).forEach(k => {
                try {
                    localStorage.setItem(k, obj[k]);
                } catch (e) {
                    console.error("Erro de cota no localStorage:", e);
                }
            }); 
        } 
    }
};

    function savePrazosSalvos() {
    try {
        // Agora sim, usando o SafeStorage blindado com a chave correta que o seu sistema já lê na inicialização
        SafeStorage.set({'djen_prazos_salvos': JSON.stringify(prazosSalvos)});
    } catch (e) {
        console.error("Erro ao salvar os prazos:", e);
        showToast("Erro crítico ao salvar o prazo.", "❌");
    }
}

   
    function aplicarTema(tema) {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const btnText = document.getElementById('themeBtnText'); const root = document.documentElement;
        root.classList.remove('tema-escuro', 'tema-sepia');
        if (tema === 'escuro' || (tema === 'auto' && isSystemDark)) root.classList.add('tema-escuro'); 
        else if (tema === 'sepia') root.classList.add('tema-sepia');
        if (btnText) { btnText.textContent = (tema === 'auto') ? "Tema: Automático" : (tema === 'claro') ? "Tema: Claro" : (tema === 'escuro') ? "Tema: Escuro" : "Tema: Sépia (Leitura)"; }
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (temaAtual === 'auto') aplicarTema('auto'); });

    function atualizarTamanhoFonteFoco(mudanca) {
        fontSizeFocoAtual += mudanca; if(fontSizeFocoAtual < 12) fontSizeFocoAtual = 12; if(fontSizeFocoAtual > 26) fontSizeFocoAtual = 26;
        document.documentElement.style.setProperty('--font-focus', fontSizeFocoAtual + 'px'); SafeStorage.set({'djen_font_focus': fontSizeFocoAtual});
    }

    function showToast(mensagem, icone = "✅") {
        const toast = document.getElementById('toastGenerico');
        if (toast) {
            document.getElementById('toastIcone').textContent = icone; document.getElementById('toastMensagem').textContent = mensagem;
            toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3000);
        }
    }
    function openSafeLink(url) { window.open(url, '_blank'); }

    function atualizarPainelGamificacao() {
        const elTempoGasto = document.getElementById('modalTempoGasto');
        const elStatBuscas = document.getElementById('statBuscas'); 
        const elStatLidos = document.getElementById('statLidos'); 
        const elStatSalvos = document.getElementById('statSalvos'); 
        const elStatCumpridos = document.getElementById('statCumpridos'); 
        const elEficiencia = document.getElementById('statEficiencia');
        const elCurrentRank = document.getElementById('modalCurrentRank'); 
        const elTotalXP = document.getElementById('modalTotalXP'); 

        // 1. Preenche os dados de volume
        if(elStatBuscas) elStatBuscas.textContent = totalBuscas; 
        if(elStatLidos) elStatLidos.textContent = totalLidos; 
        if(elStatSalvos) elStatSalvos.textContent = totalSalvos; 
        if(elStatCumpridos) elStatCumpridos.textContent = totalCumpridosHistorico;

        // 2. Calcula o Tempo Poupado (Fórmula Realista de Produtividade)
        // 5 min por busca em Diários Oficiais / 3 min por triagem de pub / 15 min por contagem de prazo com auditoria
        const minutosTotais = (totalBuscas * 5) + (totalLidos * 3) + (totalSalvos * 15); 
        const horas = Math.floor(minutosTotais / 60); 
        const mins = minutosTotais % 60; 
        if(elTempoGasto) { 
            if (horas > 0) elTempoGasto.textContent = `${horas}h ${mins}m`; 
            else elTempoGasto.textContent = `${mins}m`; 
        }

        // 3. Calcula a Eficiência (Win Rate: Cumpridos vs Total Salvos)
        if (elEficiencia) {
            const winRate = totalSalvos > 0 ? Math.round((totalCumpridosHistorico / totalSalvos) * 100) : 0;
            const taxaFinal = Math.min(100, winRate); // Evita passar de 100%
            elEficiencia.textContent = `${taxaFinal}%`;
            
            // Colore a taxa conforme o desempenho
            if (taxaFinal >= 90) elEficiencia.style.color = 'var(--zen-green)';
            else if (taxaFinal >= 70) elEficiencia.style.color = 'var(--zen-orange)';
            else elEficiencia.style.color = 'var(--zen-red)';
        }

               
        // 5. NOVO: Mini-Gráfico de Carga Semanal
        const elGrafico = document.getElementById('graficoCarga');
        if (elGrafico) {
            const hoje = new Date(); hoje.setHours(12,0,0,0);
            let carga = [0, 0, 0, 0, 0, 0, 0]; // Hoje até +6 dias
            let maxCarga = 0;
            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            
            for(let k in prazosSalvos) {
                const p = prazosSalvos[k];
                if (p && p.fatal && !p.cumprido) {
                    const dt = parseDateBR(p.fatal);
                    const diff = Math.ceil((dt.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
                    if (diff >= 0 && diff < 7) {
                        carga[diff]++;
                        if (carga[diff] > maxCarga) maxCarga = carga[diff];
                    }
                }
            }
            
            elGrafico.innerHTML = '';
            for (let i = 0; i < 7; i++) {
                let d = new Date(hoje); d.setDate(d.getDate() + i);
                let labelDia = i === 0 ? 'Hj' : diasSemana[d.getDay()];
                let pct = maxCarga === 0 ? 4 : (carga[i] / maxCarga) * 100;
                if (pct < 4) pct = 4; // Altura mínima visual
                
                let corBarra = i === 0 ? 'var(--zen-orange)' : 'var(--primary)';
                if (carga[i] === 0) corBarra = 'var(--border-light)';
                let corNum = carga[i] === 0 ? 'transparent' : 'var(--text-main)';
                
                elGrafico.innerHTML += `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; height: 100%;">
                        <div style="font-size: 11px; font-weight: 800; color: ${corNum}; line-height: 1;">${carga[i]}</div>
                        <div style="width: 100%; max-width: 20px; background: ${corBarra}; border-radius: 4px; height: ${pct}%; transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1); min-height: 4px;"></div>
                        <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); line-height: 1;">${labelDia}</div>
                    </div>
                `;
            }
        }
    }

    // --- NOVO: Renderiza os Chips de Histórico Rápido ---
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
            btn.textContent = b.tipo === 'proc' ? "📄 " + b.valor.substring(0, 15) + (b.valor.length > 15 ? '...' : '') : "👤 " + b.valor;
            btn.title = "Repetir consulta: " + b.valor;
            btn.onclick = () => {
                if (b.tipo === 'proc') {
                    document.getElementById('btnSearchTypeProc')?.click();
                    document.getElementById('procNumBusca').value = b.valor;
                } else {
                    document.getElementById('btnSearchTypeOab')?.click();
                    document.getElementById('oabNum').value = b.valor;
                }
            };
            chips.appendChild(btn);
        });
    }

    function cleanText(h) { if (!h) return ""; let t = new DOMParser().parseFromString(h, 'text/html').body.textContent || h.replace(/<[^>]*>?/gm, ''); return t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
    function formatCNJ(n) { if(!n) return "Processo s/ número"; let d = String(n).replace(/\D/g, ''); return d.length === 20 ? d.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, "$1-$2.$3.$4.$5.$6") : n; }
    function getProc(i, t) { let p = i.numeroProcesso || i.numero || i.processo; if (!p || p === "undefined") { const m = String(t).match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/); p = m ? m[0] : "Processo s/ número"; } return p; }
    function parseDateBR(dateStr) { 
        if (!dateStr || typeof dateStr !== 'string') return new Date(0); 
        // Remove qualquer parte de tempo (ex: T12:00:00Z) para evitar quebrar o .split('-')
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

    function getGlobalApelido(proc) { if(!proc) return ""; let found = ""; for (let key in prazosSalvos) { if (prazosSalvos[key] && prazosSalvos[key].processo === proc && prazosSalvos[key].apelido) { found = prazosSalvos[key].apelido; break; } } return found; }
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

    function getAutoTagsHTML(txtLimpo) { 
        let h = ''; 
        if(!txtLimpo) return h; 
        
        // Normaliza o texto para ignorar acentos na hora de procurar
        const textoLow = txtLimpo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); 

        palavrasUrgentes.forEach(palavra => { 
            const palavraLow = palavra.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            
            if (textoLow.includes(palavraLow)) { 
                // Usa o emoji 🏷️ e mantém a palavra original do usuário (sem forçar uppercase)
                // Usando a cor azul de destaque (Badge Blue) inspirada no seu Notion UIX
                h += `<span class="tag-pill auto" style="background: var(--zen-blue); color: var(--zen-blue); display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">🏷️ ${palavra}</span>`; 
            } 
        }); 
        return h; 
    }
    function getHeaderHTML(processo, apelido, anotacao, textoOriginal) {
    // 1. Validação "à prova de falhas" (substitui o anotacao = "")
    const safeAnotacao = (typeof anotacao === 'string') ? anotacao : "";
    const safeTexto = (typeof textoOriginal === 'string') ? textoOriginal : "";

    // 2. Extrair Tags Manuais usando Regex mais amigável para o VS Code (\u00C0-\u00FF pega os acentos)
    const tagsMatch = safeAnotacao.match(/#[\w\u00C0-\u00FF_]+/g);
    const tagsManuais = tagsMatch ? [...new Set(tagsMatch)] : [];
    
    // 3. Gerar Tags Automáticas
    let tagsHTML = getAutoTagsHTML(safeTexto); 

    // 4. Juntar as Tags Manuais com as Automáticas no HTML
    if (tagsManuais.length > 0) {
        tagsHTML += tagsManuais.map(t => `<span class="tag-pill"><span style="opacity: 0.6;">#</span> ${t.replace('#', '')}</span>`).join('');
    }
    let tagsContainer = tagsHTML ? `<div class="proc-tags">${tagsHTML}</div>` : '';

    // 5. Preparar a Anotação
    let textoAnotacaoLimpo = safeAnotacao.replace(/#[\w\u00C0-\u00FF_]+/g, '').trim();
    
    let anotacaoContainer = textoAnotacaoLimpo ? `
        <div class="proc-anotacao" style="font-size: 12px; color: var(--text-muted); margin-top: 6px; display: flex; align-items: flex-start; gap: 6px; line-height: 1.4;">
            <span style="font-size: 12px; opacity: 0.8; margin-top: 1px;">📌</span> 
            <span>${textoAnotacaoLimpo}</span>
        </div>` : '';

    // 6. A REGRA DE NEGÓCIO: Apelido vs Número
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

    // 7. Retorna a estrutura final
    return identificadorHTML + tagsContainer + anotacaoContainer;
}

    function handleCriarTag(notaInputElement) {
        const selecao = window.getSelection().toString().trim(); if (!selecao) { showToast("Selecione um trecho do texto para criar a tag.", "⚠️"); return; } if (selecao.length > 50) { showToast("O trecho selecionado é muito longo. O limite é de 50 caracteres."); return; }
        let tagFormatada = selecao.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9À-ÿ_]/g, '').toLowerCase();
        if (tagFormatada.length > 0) { tagFormatada = "#" + tagFormatada; notaInputElement.value = notaInputElement.value ? notaInputElement.value + " " + tagFormatada : tagFormatada; notaInputElement.dispatchEvent(new Event('change')); notaInputElement.dispatchEvent(new Event('input')); showToast(`Tag ${tagFormatada} criada! (+2 XP)`, "🔖"); } else { showToast("Seleção inválida para tag.", "❌"); }
    }

    function handleMarcarTexto() {
        const selection = window.getSelection(); if (!selection.rangeCount || selection.isCollapsed) { showToast("Selecione um texto para destacar.", "⚠️"); return; }
        const range = selection.getRangeAt(0); const mark = document.createElement('mark'); mark.className = 'marca-texto';
        try { range.surroundContents(mark); selection.removeAllRanges(); showToast("Texto destacado!", "🖌️"); const activeKey = document.getElementById('focusModeOverlay').getAttribute('data-active-key'); if (activeKey && prazosSalvos[activeKey]) { prazosSalvos[activeKey].textoHtml = document.getElementById('focusTeorContent').innerHTML; savePrazosSalvos(); const teorBox = document.querySelector(`.intimacao-card[data-key="${activeKey}"] .teor-inner-box`); if(teorBox) teorBox.innerHTML = prazosSalvos[activeKey].textoHtml; } } catch(e) { showToast("Não é possível destacar seleções longas.", "❌"); }
    }

    // --- BASE DE ESTILOS UNIFICADA PARA PDFs (VISUAL LAW / ZEN DESIGN) ---
function getPdfStyles() {
    return `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', -apple-system, sans-serif; background: #ffffff; margin: 0; padding: 40px; color: rgba(0,0,0,0.95); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 24px; margin-bottom: 24px; }
        .brand-area { display: flex; align-items: center; gap: 12px; }
        .logo-box { background: var(--primary, #0075de); color: #ffffff; width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; letter-spacing: -1px; border: 1px solid rgba(0,0,0,0.05); }
        .brand-title { font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.25px; color: rgba(0,0,0,0.95); }
        .brand-meta { font-size: 13px; color: #615d59; display: flex; gap: 12px; align-items: center; margin-top: 4px; }
        .info-area { text-align: right; }
        .info-title { font-size: 14px; font-weight: 700; color: #a39e98; text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 0.5px; }
        .info-date { font-size: 12px; color: #a39e98; margin: 0; }
        
        .kpi-board { display: flex; gap: 16px; margin-bottom: 32px; }
        .kpi-card { flex: 1; padding: 16px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); background: #faf9f8; text-align: center; }
        .kpi-val { font-size: 28px; font-weight: 700; letter-spacing: -1px; margin-bottom: 4px; color: #1a1a1a; }
        .kpi-label { font-size: 12px; font-weight: 600; color: #615d59; text-transform: uppercase; letter-spacing: 0.5px; }

        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { color: #a39e98; font-weight: 600; text-align: left; padding: 12px 8px; border-bottom: 1px solid rgba(0,0,0,0.1); font-size: 11px; text-transform: uppercase; }
        td { padding: 16px 8px; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: top; }
        .col-num { color: #a39e98; width: 30px; font-weight: 500; }
        .proc-name { font-weight: 600; color: rgba(0,0,0,0.95); display: block; margin-bottom: 4px; letter-spacing: -0.125px; }
        .proc-sub { color: #615d59; font-size: 11px; font-family: ui-monospace, monospace; }
        .fatal-date { font-weight: 600; color: rgba(0,0,0,0.95); font-size: 14px; }
        .datas-secundarias { font-size: 11px; color: #615d59; line-height: 1.5; }
        
        .badge { padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; display: inline-block; white-space: nowrap; letter-spacing: 0.125px; }
        .bg-trib { background: #f2f9ff; color: #0075de; border: 1px solid rgba(0, 117, 222, 0.2); }
        .bg-green { background: #ebf5ed; color: #1aae39; }
        .bg-gray { background: #f6f5f4; color: #615d59; }
        .bg-orange { background: #fdf3eb; color: #dd5b00; }
        .bg-red { background: #fbe4e4; color: #d44c47; }

        .tag-badge { background: #f6f5f4; color: #615d59; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; margin-right: 4px; display: inline-block; margin-bottom: 4px; border: 1px solid rgba(0,0,0,0.05); }
        .tag-radar { background: #f2f9ff; color: #0075de; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-right: 4px; display: inline-block; margin-bottom: 4px; border: 1px solid rgba(0,117,222,0.2); }
        
        tr.row-cumprido { opacity: 0.6; background: #fdfdfd; }
    `;
}

    // --- GERADOR DE RELATÓRIOS GERENCIAIS (PDF DASHBOARD) ---
    function gerarPDFPrazos() {
        const todosItens = Object.values(prazosSalvos).filter(p => p.fatal || p.manual);
        if(todosItens.length === 0) { showToast("Sua agenda está vazia.", "⚠️"); return; }

        const dataHoje = new Date();
        const dataFormatada = `${String(dataHoje.getDate()).padStart(2, '0')}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${dataHoje.getFullYear()}`;
        const nomeArquivo = `Relatorio_DJEN_${dataFormatada}`;
        
        // --- CÁLCULO DE KPIs PARA O DASHBOARD ---
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
        const hjTime = dataHj.setHours(12,0,0,0);

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
                    </div>
                </div>

                <table>
                    <thead>
                        <tr><th class="col-num">Nº</th><th>Processo / Identificação</th><th>Tribunal</th><th>Prazo Fatal</th><th>Status</th><th>Anotações e Detalhes</th></tr>
                    </thead>
                    <tbody>
        `;
        // Ordenar: Pendentes primeiro (por urgência), depois Cumpridos (por data)
        let sortedItems = todosItens.sort((a,b) => {
            if(a.cumprido !== b.cumprido) return a.cumprido ? 1 : -1;
            if(!a.fatal) return 1; if(!b.fatal) return -1;
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
            if(p.textoCompleto) {
                const txtLow = p.textoCompleto.toLowerCase();
                palavrasUrgentes.forEach(palavra => { if (txtLow.includes(palavra)) radarTags.push("#" + palavra.toUpperCase()); });
            }
            let radarHtml = radarTags.length > 0 ? radarTags.map(t => `<span class="tag-radar">${t}</span>`).join('') : '';

            let tarefasHtml = '';
            if (p.tarefas && p.tarefas.length > 0) {
                tarefasHtml = `<div style="margin-top: 8px; font-size: 11px;"><strong>Tarefas:</strong><br>` + 
                              p.tarefas.map(t => `<div style="margin-top:2px;">${t.feita ? '✅' : '☐'} <span style="${t.feita ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${t.texto}</span></div>`).join('') + 
                              `</div>`;
            }

            let blocoAnotacoes = `<div style="color:#615d59; font-size: 11px; margin-bottom: 6px;">${anotacaoComTags || '-'}</div>`;
            if (radarHtml) blocoAnotacoes += `<div>${radarHtml}</div>`;
            if (tarefasHtml) blocoAnotacoes += tarefasHtml;

            html += `<tr class="${rowClass}"><td class="col-num">${idx + 1}</td><td>${procBlock}</td><td><span class="badge bg-trib">${tribunal}</span>${jurisdicao}</td><td class="fatal-date">${p.fatal || '-'}</td><td>${statusBadge}</td><td>${blocoAnotacoes}</td></tr>`;
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
        if(itens.length === 0) { showToast(`Nenhum prazo registrado em ${mesAnoStr}.`, "⚠️"); return; }

        const dataHoje = new Date();
    const dataFormatada = `${String(dataHoje.getDate()).padStart(2, '0')}-${String(dataHoje.getMonth() + 1).padStart(2, '0')}-${dataHoje.getFullYear()}`;
    const nomeArquivoMes = `Agenda_DJEN_${mesAnoStr.replace(/[\/\s]/g, '_')}`;
        
        const dataHj = new Date(); const dateStr = dataHj.toLocaleDateString('pt-BR'); const timeStr = dataHj.toLocaleTimeString('pt-BR'); const hjTime = dataHj.setHours(12,0,0,0);

        let sortedItems = itens.sort((a,b) => {
            const getCat = (p) => {
                if (p.cumprido) return 2; 
                if (!p.fatal) return 4; 
                const dataFatal = parseDateBR(p.fatal); const diff = Math.ceil((dataFatal.getTime() - hjTime) / (1000 * 3600 * 24));
                if (diff < 0) return 3; return 1; 
            };
            const catA = getCat(a); const catB = getCat(b);
            if (catA !== catB) return catA - catB;
            if(!a.fatal) return 1; if(!b.fatal) return -1;
            return parseDateBR(a.fatal).getTime() - parseDateBR(b.fatal).getTime();
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
            // INÍCIO DA INJEÇÃO DE JURISDIÇÃO
            let jurisdicao = (p.uf && p.mun) ? `<div style="font-size: 10px; color: #a39e98; margin-top: 6px; font-weight: 500; letter-spacing: 0.2px;">📍 ${p.uf} - ${p.mun}</div>` : '';
            // FIM DA INJEÇÃO DE JURISDIÇÃO
            let procBlock = p.apelido ? `<span class="proc-name">${p.apelido}</span><span class="proc-sub">${p.processo}</span>` : `<span class="proc-name">${p.processo}</span>`;
            
            let datasCiclo = `<div class="datas-secundarias">Disp: <b>${p.disp || '-'}</b></div><div class="datas-secundarias">Início: <b>${p.inicio || '-'}</b></div>`;

            let anotacaoLimpa = p.anotacao || '';
            let anotacaoComTags = anotacaoLimpa.replace(/#([\wÀ-ÿ_]+)/g, '<span class="tag-badge">#$1</span>');
            
            let radarTags = [];
            if(p.textoCompleto) {
                const txtLow = p.textoCompleto.toLowerCase();
                palavrasUrgentes.forEach(palavra => { if (txtLow.includes(palavra)) radarTags.push("#" + palavra.toUpperCase()); });
            }
            let radarHtml = radarTags.length > 0 ? radarTags.map(t => `<span class="tag-radar">${t}</span>`).join('') : '';

            let tarefasHtml = '';
            if (p.tarefas && p.tarefas.length > 0) {
                tarefasHtml = `<div style="margin-top: 8px; font-size: 11px;"><strong>Tarefas:</strong><br>` + 
                              p.tarefas.map(t => `<div style="margin-top:2px;">${t.feita ? '✅' : '☐'} <span style="${t.feita ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${t.texto}</span></div>`).join('') + 
                              `</div>`;
            }

            let blocoAnotacoes = `<div style="color:#615d59; font-size: 12px; margin-bottom: 6px;">${anotacaoComTags || '-'}</div>`;
            if (radarHtml) blocoAnotacoes += `<div>${radarHtml}</div>`;
            if (tarefasHtml) blocoAnotacoes += tarefasHtml;

            html += `<tr><td class="col-num">${idx + 1}</td><td>${procBlock}</td><td><span class="badge bg-trib">${tribunal}</span>${jurisdicao}</td><td>${datasCiclo}</td><td class="fatal-date">${p.fatal || '-'}</td><td>${statusBadge}</td><td>${blocoAnotacoes}</td></tr>`;
        });

        html += `</tbody></table></div>
        <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #a39e98; letter-spacing: 0.2px;">
            Aviso:Esta contagem é uma previsão. Confirme sempre as suspensões e feriados nos canais oficiais do tribunal.
        </div>
        <script> window.onload = function() { setTimeout(function() { window.print(); }, 500); } </script>
        </body></html>`;

        const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    }

    function gerarLinkGCal(p) {
        if(!p || !p.fatal) return ''; 
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
        
        // MÁGICA DO RADAR: Procura as tags automáticas no texto da publicação
        let tagsAutom = [];
        if (p.textoCompleto) {
            const textoLow = p.textoCompleto.toLowerCase();
            palavrasUrgentes.forEach(palavra => {
                if (textoLow.includes(palavra)) tagsAutom.push("#" + palavra.toUpperCase());
            });
        }

        if (tagsAutom.length > 0) {
            descStr += `\n\n🎯 RADAR AUTOMÁTICO:\n${tagsAutom.join(' ')}`;
        }

        if (p.anotacao) { 
            descStr += `\n\n📌 Notas Manuais:\n${p.anotacao}`; 
        }

        if (p.feriados > 0 || p.prorrogado) { descStr += `\n\n⚠️ AUDITORIA DO CÁLCULO:`; if(p.feriados > 0) descStr += `\n- ${p.feriados} dias não úteis/feriados desviados.`; if(p.prorrogado) descStr += `\n- O prazo fatal caiu num dia não útil e foi prorrogado para o dia útil seguinte.`; } 
        if (p.temFeriadoMunicipal) { descStr += `\n\n🚨 ATENÇÃO SJT:\nPrazo coincide com feriado municipal. Anexe certidão ou decreto local para comprovar a tempestividade (art. 1.003, § 6º, CPC).`; }
        
        // ASSINATURA DA EXTENSÃO 
        descStr += `\n\n---\n🤖 Calculado pelo Buscador DJEN\n🌐 www.buscadordjen.com.br`;

        if (descStr.length > 1500) { descStr = descStr.substring(0, 1500) + "\n\n... [Texto truncado devido a limite da URL]"; } 
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dataInicio}/${dataFim}&details=${encodeURIComponent(descStr)}`;
    }

    function gerarTextoCompartilhamento(arr, tituloContexto = "Publicação") {
        let txtBase = `⚖️ *${tituloContexto.toUpperCase()}*\n`; if(!Array.isArray(arr)) arr = [arr]; 
        arr.forEach((item, index) => { 
            let txtRaw = item.textoCompleto || item.texto || item.teor || ""; 
            let proc = getProc(item, cleanText(txtRaw)); if (proc !== "Processo s/ número") proc = formatCNJ(proc); 
            let trib = item.siglaTribunal || (item.prazoCalculado ? item.prazoCalculado.mat : ''); 
            let alias = (item.prazoCalculado && item.prazoCalculado.apelido) ? item.prazoCalculado.apelido : (item.apelido ? item.apelido : getGlobalApelido(proc)); 
            let displayAlias = alias ? ` (${alias})` : ''; 
            
            if(arr.length > 1) txtBase += `\n[${index + 1}] Processo: ${proc}${displayAlias} | Tribunal: ${trib}\n`; 
            else txtBase += `\nProcesso: ${proc}${displayAlias} | Tribunal: ${trib}\n`; 
            
            let objPrazo = item.prazoCalculado || item; 
            if (objPrazo && objPrazo.cumprido) { txtBase += `✅ PRAZO CUMPRIDO\n`; } 
            else if (objPrazo && objPrazo.fatal) { 
                let label = objPrazo.direcao === 'retroativo' ? 'Prazo Regressivo' : 'Prazo'; 
                txtBase += `🚨 ${label}: ${objPrazo.fatal} (${objPrazo.dias} dias)\n`; 
                if (objPrazo.temFeriadoMunicipal) { txtBase += `⚠️ ALERTA: Feriado local na contagem. Anexar comprovação.\n`; } 
            } else if (item.data_disponibilizacao) { 
                const dp = new Date(item.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR'); 
                txtBase += `📅 Disponibilizado em: ${dp}\n`; 
            } 
            
            let notes = objPrazo.anotacao || item.anotacao || ""; 
            let manualTags = notes.match(/#[\wÀ-ÿ_]+/g) || [];
            let cleanNotes = notes.replace(/#[\wÀ-ÿ_]+/g, '').trim();
            
            let radarTags = [];
            const txtLow = txtRaw.toLowerCase();
            palavrasUrgentes.forEach(palavra => { if (txtLow.includes(palavra)) radarTags.push("#" + palavra.toUpperCase()); });
            
            if(radarTags.length > 0) txtBase += `🎯 Radar: ${radarTags.join(' ')}\n`;
            if(manualTags.length > 0) txtBase += `🏷️ Tags: ${manualTags.join(' ')}\n`;
            if(cleanNotes) txtBase += `📌 Notas: ${cleanNotes}\n`; 
            
            let tarefas = objPrazo.tarefas || item.tarefas || [];
            if(tarefas.length > 0) {
                txtBase += `📋 Tarefas:\n`;
                tarefas.forEach(t => { txtBase += `   ${t.feita ? '✅' : '☐'} ${t.texto}\n`; });
            }
            
            txtBase += `📄 Teor: ${cleanText(txtRaw)}\n`; 
            if(arr.length > 1) txtBase += `--------------------------------------------------\n`; 
        }); 
        
        // --- ADIÇÃO DA ASSINATURA DJEN NO FINAL ---
        txtBase += `\n---\n🤖 *Buscador DJEN*\n🌐 www.buscadordjen.com.br`;
        
        return txtBase.trim();
    }
    
    function exportarTxtLote(arr, titulo) { 
        if (!arr || arr.length === 0) { showToast("Nenhum item para copiar.", "⚠️"); return; } 
        const txtBase = gerarTextoCompartilhamento(arr, titulo); 
        const fallbackCopy = (text) => { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); showToast("Resultados copiados em lote! (+3 XP)", "📎"); };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txtBase).then(() => {; showToast("Resultados copiados em lote!", "📎"); }).catch(() => fallbackCopy(txtBase)); } else { fallbackCopy(txtBase); }
    }

    function abrirModalCompartilhar(tipo) { 
        const modal = document.getElementById('shareModal'); 
        const title = document.getElementById('shareModalTitle'); 
        if(tipo === 'lote') { 
            if(title) title.textContent = "Exportar & Compartilhar Lote"; 
        } else { 
            if(title) title.textContent = "Compartilhar Publicação"; 
        } 
        if(modal) modal.classList.add('show'); 
    }
    // =====================================================================
    // MANTIDO: FUNÇÃO DE BUSCA DE CIDADES NO IBGE
    // =====================================================================
    let cacheMunicipiosDetalhado = {};
    let cacheFeriadosMunicipaisAnual = {};
   
        // =====================================================================
    // MOTOR DE FERIADOS 100% GITHUB
    // =====================================================================
    let feriadosExtras = {};
    const cacheMunicipios = {}; 
    let baseDeDadosEmCache = null;

    // IBGE (Mantido)
    async function carregarMunicipios(uf, datalistId) { 
        if (!document.getElementById(datalistId)) { const dl = document.createElement('datalist'); dl.id = datalistId; document.body.appendChild(dl); } 
        const datalist = document.getElementById(datalistId); 
        if (!cacheMunicipios[uf]) { 
            try { 
                const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`); 
                const dados = await r.json(); cacheMunicipios[uf] = dados.map(m => m.nome); datalist.innerHTML = ""; 
                cacheMunicipios[uf].forEach(nome => { const opt = document.createElement('option'); opt.value = nome; datalist.appendChild(opt); }); 
            } catch (e) {} 
        } else if (datalist.children.length === 0) { 
            cacheMunicipios[uf].forEach(nome => { const opt = document.createElement('option'); opt.value = nome; datalist.appendChild(opt); }); 
        } 
    }

   // 1. Tribunal (Lendo o JSON Oficial do GitHub - Arquitetura DJEN/Prazos)
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

            // 1. Coleta a base nacional e pontos comuns
            if (json.feriados_nacionais) regras = regras.concat(json.feriados_nacionais);
            if (json.pontos_facultativos_comuns) regras = regras.concat(json.pontos_facultativos_comuns);

            // 2. Procura a sigla do tribunal pelas grandes categorias do seu JSON
            const categorias = ['tribunais_superiores', 'tribunais_regionais_federais', 'tribunais_regionais_do_trabalho', 'tribunais_de_justica'];
            let tribunalEncontrado = null;

            for (let cat of categorias) {
                if (json[cat] && json[cat][siglaTribunal.toUpperCase()]) {
                    tribunalEncontrado = json[cat][siglaTribunal.toUpperCase()];
                    break;
                }
            }

            // 3. Extrai as listas específicas do tribunal encontrado
            if (tribunalEncontrado) {
                if (tribunalEncontrado.feriados_especificos) regras = regras.concat(tribunalEncontrado.feriados_especificos);
                if (tribunalEncontrado.feriados_toda_regiao) regras = regras.concat(tribunalEncontrado.feriados_toda_regiao);
                if (tribunalEncontrado.suspensoes_por_conveniencia) regras = regras.concat(tribunalEncontrado.suspensoes_por_conveniencia);
                
                // Mapeia o recesso isolado, se existir
                if (tribunalEncontrado.recesso && tribunalEncontrado.recesso.inicio) {
                    regras.push({ data_inicio: tribunalEncontrado.recesso.inicio, data_fim: tribunalEncontrado.recesso.fim, descricao: "Recesso Forense" });
                }
            }

            console.log(`DJEN: Total de regras combinadas lidas para ${siglaTribunal} ->`, regras);
            
            let dicionarioFeriados = {};
            
            // 4. Converte tudo para o dicionário de busca rápida da calculadora
            regras.forEach(regra => {
                let dataIn = regra.data_inicio || regra.data;
                let dataFi = regra.data_fim || regra.data;
                let nomeFeriado = regra.descricao || regra.nome || "Feriado/Suspensão Tribunal";

                if (!dataIn) return;
                
                let dtAtual = new Date(`${dataIn}T12:00:00`);
                let dtFim = new Date(`${dataFi}T12:00:00`);

                while (dtAtual <= dtFim) {
                    // O seu JSON usa o padrão AAAA-MM-DD
                    let chaveData = `${dtAtual.getFullYear()}-${String(dtAtual.getMonth() + 1).padStart(2, '0')}-${String(dtAtual.getDate()).padStart(2, '0')}`;
                    dicionarioFeriados[chaveData] = nomeFeriado;
                    dtAtual.setDate(dtAtual.getDate() + 1);
                }
            });
            
            console.log(`DJEN: Dicionário final mapeado ->`, dicionarioFeriados);
            return dicionarioFeriados; 
        } catch (erro) { 
            console.error("DJEN: Erro fatal ao buscar feriados do GitHub ->", erro);
            return {}; 
        } 
    }

    // 2. Nacional e Estadual (Restauração da base completa)
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
            SafeStorage.set({'djen_feriados_dinamicos': JSON.stringify(feriadosExtras)}); 
        } catch(e) { 
            SafeStorage.get(['djen_feriados_dinamicos'], (d) => { if(d.djen_feriados_dinamicos) feriadosExtras = JSON.parse(d.djen_feriados_dinamicos); }); 
        } 
    }

    // 3. Municipal Dinâmico (Ultra-Resiliente e com Logs)
    async function buscarFeriadosMunicipaisAnual(ano, uf, municipioNome) {
        if (!uf || !municipioNome) return [];

        let codigoIbge = null;
        
        // Verifica se já sabemos o código. Se não, busca no IBGE na hora!
        if (cacheMunicipiosDetalhado[uf] && cacheMunicipiosDetalhado[uf][municipioNome]) {
            codigoIbge = cacheMunicipiosDetalhado[uf][municipioNome];
        } else {
            try {
                const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
                const dados = await r.json();
                if (!cacheMunicipiosDetalhado[uf]) cacheMunicipiosDetalhado[uf] = {};
                dados.forEach(m => cacheMunicipiosDetalhado[uf][m.nome] = m.id);
                codigoIbge = cacheMunicipiosDetalhado[uf][municipioNome];
            } catch(e) {}
        }

        if (!codigoIbge) return []; 

        if (!cacheFeriadosMunicipaisAnual[ano]) {
            try {
                const url = `https://raw.githubusercontent.com/sobeitnow0/feriados-buscador-djen/main/feriados/municipal/json/${ano}.json?v=${Date.now()}`;
                const r = await fetch(url);
                if (r.ok) cacheFeriadosMunicipaisAnual[ano] = await r.json();
                else cacheFeriadosMunicipaisAnual[ano] = [];
            } catch (e) {
                cacheFeriadosMunicipaisAnual[ano] = [];
            }
        }

        const todosFeriadosAno = cacheFeriadosMunicipaisAnual[ano] || [];
        
        // Filtra comparando o IBGE como String, pra não ter erro se um for Número e o outro Texto
        const feriadosDaCidade = todosFeriadosAno.filter(f => String(f.codigo_ibge) === String(codigoIbge));

        return feriadosDaCidade.map(f => {
            const dataStr = String(f.data || f.date).trim();
            const partes = dataStr.split('/'); // ["26", "01", "2026"]
            if (partes.length === 3) return `${partes[2]}-${partes[1]}-${partes[0]}`;
            return dataStr;
        });
    }        
            

    function isRecessoForense(dataObj) { 
        const m = dataObj.getMonth(); const d = dataObj.getDate(); 
        return (m === 11 && d >= 20) || (m === 0 && d <= 20);
    }

    // O Cérebro da Auditoria (Agora com ainda mais formatos de data)
    // O Cérebro da Auditoria (Agora integrado 100% ao JSON do GitHub)
    function checarMotivoFeriado(dStr, dataObj, uf, municipio, feriadosTribunal, feriadosMunisDinamicos) {
        const ds = dataObj.getDay(); 
        if (ds === 0 || ds === 6) return "Fim de Semana"; 
        
        // NOVO: Verifica o Dicionário do Tribunal/Nacional gerado pelo JSON do GitHub
        const mesDiaNovo = `${String(dataObj.getMonth()+1).padStart(2,'0')}-${String(dataObj.getDate()).padStart(2,'0')}`;
        if (feriadosTribunal && typeof feriadosTribunal === 'object') {
            // Se encontrar a data exata ou a data recorrente, devolve o NOME que você cadastrou no JSON
            if (feriadosTribunal[dStr]) return feriadosTribunal[dStr];
            if (feriadosTribunal[mesDiaNovo]) return feriadosTribunal[mesDiaNovo];
        }

        // Regra nativa de segurança para o recesso (Art. 220, CPC)
        if (isRecessoForense(dataObj)) return "Recesso Forense (Art. 220, CPC)"; 

        const ano = dataObj.getFullYear(); 
        
        // Múltiplos formatos para garantir a compatibilidade com bases do IBGE/Legislação
        const mesDia = `${String(dataObj.getMonth()+1).padStart(2,'0')}-${String(dataObj.getDate()).padStart(2,'0')}`;
        const diaMes = `${String(dataObj.getDate()).padStart(2,'0')}/${String(dataObj.getMonth()+1).padStart(2,'0')}`; 
        const diaMesHifen = `${String(dataObj.getDate()).padStart(2,'0')}-${String(dataObj.getMonth()+1).padStart(2,'0')}`; 
        
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

    function gerarMatrizContagem(dataDispStr, diasPrazo, tipoContagem, susp, uf, municipio, direcao = 'futuro', feriadosTribunal = []) {
        const dataObj = new Date(dataDispStr + 'T12:00:00'); let timeline = []; let data = new Date(dataDispStr + 'T12:00:00'); let qtdFeriados = 0; let prorrogado = false;
        const getDStr = (dObj) => `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
        function isDiaUtil(dObj) { const ds = dObj.getDay(); if (ds === 0 || ds === 6) return false; if (isRecessoForense(dObj) && tipoContagem === 'cpc') return false; const dStr = getDStr(dObj); return checarMotivoFeriado(dStr, dObj, uf, municipio, feriadosTribunal) === "Dia Útil"; }

        if (direcao === 'futuro') {
            const strDisp = data.toLocaleDateString('pt-BR'); timeline.push({ data: new Date(data.getTime()).toISOString(), desc: "Disponibilizado", tipo: "info", numero: "Disp." });
            data.setDate(data.getDate() + 1); while (!isDiaUtil(data)) { timeline.push({ data: new Date(data.getTime()).toISOString(), desc: checarMotivoFeriado(getDStr(data), data, uf, municipio, feriadosTribunal), tipo: "pulo", numero: "-" }); qtdFeriados++; data.setDate(data.getDate() + 1); } 
            const strPub = data.toLocaleDateString('pt-BR'); timeline.push({ data: new Date(data.getTime()).toISOString(), desc: "Publicação", tipo: "info", numero: "Pub." });
            data.setDate(data.getDate() + 1); while (!isDiaUtil(data)) { timeline.push({ data: new Date(data.getTime()).toISOString(), desc: checarMotivoFeriado(getDStr(data), data, uf, municipio, feriadosTribunal), tipo: "pulo", numero: "-" }); qtdFeriados++; data.setDate(data.getDate() + 1); }
            const strInicio = data.toLocaleDateString('pt-BR'); let diasContados = 1; let cursor = new Date(data.getTime());
            timeline.push({ data: new Date(cursor.getTime()).toISOString(), desc: "Início do Prazo", tipo: diasContados === diasPrazo ? "fatal" : "util", numero: `Dia ${String(diasContados).padStart(2,'0')}` });
            while (diasContados < diasPrazo) { cursor.setDate(cursor.getDate() + 1); let ehUtil = tipoContagem === 'cpp' ? true : isDiaUtil(cursor); if (ehUtil) { diasContados++; timeline.push({ data: new Date(cursor.getTime()).toISOString(), desc: "Dia Útil", tipo: diasContados === diasPrazo ? "fatal" : "util", numero: `Dia ${String(diasContados).padStart(2,'0')}` }); } else { timeline.push({ data: new Date(cursor.getTime()).toISOString(), desc: checarMotivoFeriado(getDStr(cursor), cursor, uf, municipio, feriadosTribunal), tipo: "pulo", numero: "-" }); if(tipoContagem !== 'cpp') qtdFeriados++; } }
            while (!isDiaUtil(cursor)) { let lastEntry = timeline[timeline.length - 1]; if (lastEntry && lastEntry.tipo === "fatal") { lastEntry.tipo = "pulo"; lastEntry.desc = "FDS/Feriado (Prorrogado)"; } else { timeline.push({ data: new Date(cursor.getTime()).toISOString(), desc: checarMotivoFeriado(getDStr(cursor), cursor, uf, municipio, feriadosTribunal) + " (Prorrogação)", tipo: "pulo", numero: "-" }); } prorrogado = true; qtdFeriados++; cursor.setDate(cursor.getDate() + 1); if (isDiaUtil(cursor)) { timeline.push({ data: new Date(cursor.getTime()).toISOString(), desc: "Prazo Fatal Prorrogado", tipo: "fatal", numero: `Dia ${String(diasPrazo).padStart(2,'0')}` }); } }
            return { disp: strDisp, pub: strPub, inicio: strInicio, fatal: cursor.toLocaleDateString('pt-BR'), timeline: timeline, feriados: qtdFeriados, prorrogado: prorrogado, direcao: direcao };
        } else {
            const strEvento = data.toLocaleDateString('pt-BR'); timeline.push({ data: new Date(data.getTime()).toISOString(), desc: "Data do Evento", tipo: "info", numero: "Disp." }); let diasContados = 0; let cursor = new Date(data.getTime()); cursor.setDate(cursor.getDate() - 1); while (diasContados < diasPrazo) { let ehUtil = tipoContagem === 'cpp' ? true : isDiaUtil(cursor); if (ehUtil) { diasContados++; timeline.push({ data: new Date(cursor.getTime()).toISOString(), desc: "Dia Útil", tipo: diasContados === diasPrazo ? "fatal" : "util", numero: `Dia ${String(diasContados).padStart(2,'0')}` }); } else { timeline.push({ data: new Date(cursor.getTime()).toISOString(), desc: "Feriado/FDS", tipo: "pulo", numero: "Suspenso" }); } if (diasContados < diasPrazo) cursor.setDate(cursor.getDate() - 1); } timeline.reverse(); return { pub: strEvento, inicio: strEvento, fatal: cursor.toLocaleDateString('pt-BR'), timeline: timeline, feriados: 0, prorrogado: false, direcao: direcao };
        }
    }

function preencherAuditoriaVisual(timeline, container) {
        try {
            container.innerHTML = "";
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
                
                const dataCurta = t.data ? String(t.data).split('T')[0].split('-').reverse().slice(0,2).join('/') : "--/--";
                
                let numeroLimpo = t.numero ? String(t.numero).replace('Dia ', '') : "-";
                if (!isNaN(numeroLimpo) && numeroLimpo.trim() !== '') numeroLimpo = String(numeroLimpo).padStart(2, '0');

                dia.innerHTML = `
                    <div class="day-icon">${icone}</div>
                    <div class="day-num">${numeroLimpo}</div>
                    <div class="day-date">${dataCurta}</div>
                `;
                container.appendChild(dia);
            });
            
            container.style.display = 'none'; // Corrigido: Mantém fechado até o clique
        } catch (e) {
            console.error("DJEN: Erro ao desenhar a grade:", e);
        }
    }

    function extrairPrazoSugerido(textoLimpo) { 
        if (!textoLimpo) return 15; 
        let txt = textoLimpo.toLowerCase(); 
        const matchDigito = txt.match(/(\d{1,3})\s*(?:\([^)]+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i); 
        if (matchDigito && matchDigito[1]) return parseInt(matchDigito[1], 10); 
        const matchExtenso = txt.match(/\b(um|dois|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezassete|dezoito|dezanove|vinte|trinta|quarenta|cinquenta|sessenta)\b\s*(?:\(\d+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i); 
        if (matchExtenso && matchExtenso[1]) { 
            const mapa = { 'um':1, 'dois':2, 'tres':3, 'três':3, 'quatro':4, 'cinco':5, 'seis':6, 'sete':7, 'oito':8, 'nove':9, 'dez':10, 'onze':11, 'doze':12, 'treze':13, 'catorze':14, 'quatorze':14, 'quinze':15, 'dezesseis':16, 'vinte':20, 'trinta':30 }; 
            return mapa[matchExtenso[1].toLowerCase().replace('ê', 'e')] || 15; 
        } 
        return 15; 
    }

   function autoPreencherTribunal(sigla, elUf, elMun) { 
        const t = sigla ? sigla.toUpperCase().trim() : ""; 
        let ufDetectada = ""; let munDetectado = "";

        // Mapeamento Regional Inteligente (TRTs, TRFs e Capitais)
        const trtMap = { "TRT1":"RJ", "TRT2":"SP", "TRT3":"MG", "TRT4":"RS", "TRT5":"BA", "TRT6":"PE", "TRT7":"CE", "TRT8":"PA", "TRT9":"PR", "TRT10":"DF", "TRT11":"AM", "TRT12":"SC", "TRT13":"PB", "TRT14":"RO", "TRT15":"SP", "TRT16":"MA", "TRT17":"ES", "TRT18":"GO", "TRT19":"AL", "TRT20":"SE", "TRT21":"RN", "TRT22":"PI", "TRT23":"MT", "TRT24":"MS" };
        const trfMap = { "TRF1":"DF", "TRF2":"RJ", "TRF3":"SP", "TRF4":"RS", "TRF5":"PE", "TRF6":"MG" };
        const capitais = { "AC":"Rio Branco","AL":"Maceió","AP":"Macapá","AM":"Manaus","BA":"Salvador","CE":"Fortaleza","DF":"Brasília","ES":"Vitória","GO":"Goiânia","MA":"São Luís","MT":"Cuiabá","MS":"Campo Grande","MG":"Belo Horizonte","PA":"Belém","PB":"João Pessoa","PR":"Curitiba","PE":"Recife","PI":"Teresina","RJ":"Rio de Janeiro","RN":"Natal","RS":"Porto Alegre","RO":"Porto Velho","RR":"Boa Vista","SC":"Florianópolis","SP":"São Paulo","SE":"Aracaju","TO":"Palmas" };

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
                
                // 🛡️ PROTEÇÃO UIX: Só sobrescreve se o Município estiver vazio OU se o Estado mudou
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
        if (isBuscaContext) updateProgressBar(); const toast = document.getElementById('toastDesfazer'); if(toast) toast.classList.add('show');
        document.getElementById('btnAcaoDesfazer').onclick = () => { prazosSalvos[key] = itemSalvoBak; savePrazosSalvos(); if(toast) toast.classList.remove('show'); atualizarEstatisticas(); if(isBuscaContext) { if(currentCardNode) { currentCardNode.style.display = 'block'; setTimeout(() => { currentCardNode.style.opacity = '1'; currentCardNode.style.transform = 'none'; }, 50); } else { applyFilters(); } updateProgressBar(); } else { renderAgenda(); renderCalendar(); } };
        clearTimeout(timeoutDesfazer); timeoutDesfazer = setTimeout(() => { if(toast) toast.classList.remove('show'); if (!isBuscaContext) renderCalendar(); }, 6000);
    }

    let timeoutCumprir;
    function alternarCumprimento(key, currentCardNode, isBuscaContext) {
        const item = prazosSalvos[key]; if (!item || !item.fatal) { showToast("Calcule o prazo antes de cumprir!", "⚠️"); return; }
        const isCumprindo = !item.cumprido; item.cumprido = isCumprindo; savePrazosSalvos(); processarCheckCumprido(isCumprindo, true); 
        const shouldHide = !isBuscaContext && ((filtroAgendaAtivo !== null && filtroAgendaAtivo !== 'cumpridos' && isCumprindo) || (filtroAgendaAtivo === 'cumpridos' && !isCumprindo));
        if (shouldHide) { currentCardNode.classList.remove('aberto'); currentCardNode.style.opacity = '0'; currentCardNode.style.transform = 'scale(0.95)'; setTimeout(() => { currentCardNode.style.display = 'none'; renderCalendar(); }, 250); } else { if (isBuscaContext) applyFilters(); else { renderAgenda(); renderCalendar(); } }
        atualizarEstatisticas(); const toast = document.getElementById('toastDesfazer'); if(toast) { const msgSpan = toast.querySelector('span'); msgSpan.innerHTML = isCumprindo ? `Prazo cumprido` : `Prazo reaberto`; toast.classList.add('show'); }
        document.getElementById('btnAcaoDesfazer').onclick = () => { item.cumprido = !isCumprindo; savePrazosSalvos(); processarCheckCumprido(item.cumprido, true); atualizarEstatisticas(); if(toast) toast.classList.remove('show'); if (shouldHide) { currentCardNode.style.display = 'block'; setTimeout(() => { currentCardNode.style.opacity = '1'; currentCardNode.style.transform = 'none'; }, 50); } else { if (isBuscaContext) applyFilters(); else renderAgenda(); renderCalendar(); } };
        clearTimeout(timeoutCumprir); timeoutCumprir = setTimeout(() => { if(toast) toast.classList.remove('show'); if (shouldHide && document.getElementById('viewSalvos').style.display !== 'none') { renderAgenda(); renderCalendar(); } }, 6000);
    }

    function criarTodoContainer(itemKey, procFallback, txtFallback, markAsReadCallback) {
        const container = document.createElement("div"); container.className = "todo-container"; container.onclick = e => e.stopPropagation(); container.onkeydown = e => e.stopPropagation();
        const atualizaDom = () => {
            let savedItem = prazosSalvos[itemKey]; let tarefas = (savedItem && savedItem.tarefas) ? savedItem.tarefas : [];
            let concluidas = tarefas.filter(t => t.feita).length; let total = tarefas.length; let todasFeitas = (total > 0 && concluidas === total);
            let counterHtml = total > 0 ? ` <span style="opacity:0.8; font-size:11px; margin-left:4px; font-weight: 900;">(${concluidas}/${total})</span>` : ``;
            let headerIcon = todasFeitas ? iconesSVG.check : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
            let headerColor = todasFeitas ? `color: var(--zen-green);` : `color: var(--text-muted);`;
            if(todasFeitas) { container.style.opacity = '0.5'; container.style.backgroundColor = 'transparent'; container.style.borderColor = 'transparent'; } else { container.style.opacity = '1'; container.style.backgroundColor = 'var(--bg-body)'; container.style.borderColor = 'var(--border-light)'; }
            let html = `<div class="todo-header" style="${headerColor}">${headerIcon} Tarefas do Prazo${counterHtml}</div>`;
            if (total > 0) { html += `<div class="todo-list">`; let tarefasMap = tarefas.map((t, idx) => ({ t, idx })); tarefasMap.sort((a, b) => (a.t.feita === b.t.feita) ? 0 : a.t.feita ? 1 : -1); tarefasMap.forEach(item => { let t = item.t; let idx = item.idx; let styleDone = t.feita ? 'style="opacity: 0.4; transition: 0.3s ease;"' : 'style="transition: 0.3s ease;"'; html += `<div class="todo-item ${t.feita ? 'is-done' : ''}" ${styleDone}><input type="checkbox" data-idx="${idx}" ${t.feita ? 'checked' : ''} aria-label="Marcar tarefa como concluída"><span>${t.texto}</span><button class="btn-del-todo" data-idx="${idx}" aria-label="Excluir Tarefa">&times;</button></div>`; }); html += `</div>`; }
            html += `<div class="todo-input-row"><input type="text" class="new-todo-input" placeholder="+ Adicionar nova tarefa (Pressione Enter)"></div>`; 
            container.innerHTML = html;
            container.querySelectorAll('input[type="checkbox"]').forEach(chk => { chk.onchange = (e) => { let idx = e.target.getAttribute('data-idx'); prazosSalvos[itemKey].tarefas[idx].feita = e.target.checked; savePrazosSalvos(); if(e.target.checked) {; showToast("Tarefa concluída!", "✅"); } atualizaDom(); }; });
            container.querySelectorAll('.btn-del-todo').forEach(btn => { btn.onclick = (e) => { let idx = e.target.getAttribute('data-idx'); prazosSalvos[itemKey].tarefas.splice(idx, 1); savePrazosSalvos(); atualizaDom(); }; });
            const inputTodo = container.querySelector('.new-todo-input'); 
            inputTodo.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const val = e.target.value.trim(); if (val) { if (!prazosSalvos[itemKey]) prazosSalvos[itemKey] = { processo: procFallback, textoCompleto: txtFallback, tarefas: [] }; if (!prazosSalvos[itemKey].tarefas) prazosSalvos[itemKey].tarefas = []; prazosSalvos[itemKey].tarefas.push({ texto: val, feita: false }); savePrazosSalvos(); if(markAsReadCallback) markAsReadCallback(); atualizaDom(); const newInput = container.querySelector('.new-todo-input'); if(newInput) newInput.focus(); } } };
        setTimeout(() => {
                const cardTarget = document.querySelector(`.intimacao-card[data-key="${itemKey}"]`);
                if (cardTarget) {
                    const topInfo = cardTarget.querySelector('.card-top-info');
                    if (topInfo) {
                        let badgeTarefas = topInfo.querySelector('.badge-tarefas-header');
                        if (total > 0) {
                            // Cria o selo se ele ainda não existir
                            if (!badgeTarefas) {
                                badgeTarefas = document.createElement('span');
                                badgeTarefas.className = 'badge-tarefas-header badge-lido';
                                topInfo.appendChild(badgeTarefas);
                            }
                            
                            // Estilo Dinâmico: Verde se concluído, Cinza se pendente
                            if (todasFeitas) {
                                badgeTarefas.style.background = 'var(--zen-green-bg)';
                                badgeTarefas.style.color = 'var(--zen-green)';
                                badgeTarefas.style.border = 'none';
                                badgeTarefas.innerHTML = `✅ ${concluidas}/${total}`;
                            } else {
                                badgeTarefas.style.background = 'transparent';
                                badgeTarefas.style.color = 'var(--text-muted)';
                                badgeTarefas.style.border = '1px solid var(--border-light)';
                                badgeTarefas.innerHTML = `📋 ${concluidas}/${total}`;
                            }
                        } else if (badgeTarefas) {
                            // Se o advogado apagar todas as tarefas, o selo some
                            badgeTarefas.remove();
                        }
                    }
                }
            }, 50);
        };
        atualizaDom(); return container;
    }

    // ==========================================
    // DELEGAÇÃO DE EVENTOS DE CLIQUE
    // ==========================================
    document.addEventListener('click', (e) => { 

      // --- COMPARTILHAMENTO DE LOTES ---
        if (e.target.closest('#btnShareSalvosLote')) {
            e.preventDefault(); e.stopPropagation(); 
            const itens = Object.values(prazosSalvos).filter(p => !p.cumprido);
            if(itens.length === 0) { showToast("Nenhum prazo pendente para compartilhar.", "⚠️"); return; } 
            textoParaCompartilhar = gerarTextoCompartilhamento(itens, "Relatório de Prazos"); 
            tituloParaCompartilhar = "Relatório de Prazos DJEN";
            abrirModalCompartilhar('lote'); return;
        }

        if (e.target.closest('#btnShareBuscaLote')) {
            e.preventDefault(); e.stopPropagation(); 
            if(resultadosExibidos.length === 0) { showToast("Nenhum resultado para compartilhar.", "⚠️"); return; } 
            textoParaCompartilhar = gerarTextoCompartilhamento(resultadosExibidos, "Resultados da Busca"); 
            tituloParaCompartilhar = "Resultados da Busca DJEN";
            abrirModalCompartilhar('lote'); return;
        }
        
       // --- AÇÕES DO MODAL (ENVIAR) ---
        if (e.target.closest('#shareWpp')) {
            e.preventDefault(); e.stopPropagation();
            let text = textoParaCompartilhar;
            
            // Trava de segurança para o WhatsApp não travar a URL
            if(text.length > 3500) {
                text = text.substring(0, 3500) + "\n\n... [Aviso: O texto é longo demais e foi truncado. Para enviar o conteúdo completo, use o botão de Copiar 📋 da extensão e cole aqui]";
            }
            
            openSafeLink(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
            document.getElementById('shareModal')?.classList.remove('show'); return;
        }
        
        if (e.target.closest('#shareEmail')) {
            e.preventDefault(); e.stopPropagation();
            const subject = encodeURIComponent(tituloParaCompartilhar || "Buscador DJEN");
            let body = textoParaCompartilhar;
            
            // Trava de segurança para o E-mail não dar o Erro 400 do Google
            if(body.length > 1800) {
                body = body.substring(0, 1800) + "\n\n... [Aviso: Texto truncado pelo limite do navegador. Use o botão de Copiar 📋 da extensão para colar o relatório completo]";
            }
            
            // O e-mail usa um link oculto para não abrir abas em branco
            const link = document.createElement("a"); 
            link.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link);
            
            document.getElementById('shareModal')?.classList.remove('show'); return;
        }
      
      
        // --- GERAR PDF DO MÊS PELO CALENDÁRIO ---
        if (e.target.closest('#btnPDFCalendario')) {
            e.preventDefault(); e.stopPropagation();
            
            // Pega o mês e ano que o calendário está exibindo atualmente
            const year = currentCalDate.getFullYear();
            const month = currentCalDate.getMonth() + 1; // 1 a 12
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            const mesNome = monthNames[currentCalDate.getMonth()];
            
            // Monta a string no formato MM/AAAA para buscar no final da data fatal (DD/MM/AAAA)
            const targetMesAnoStr = `${String(month).padStart(2, '0')}/${year}`; 
            
            const chaves = Object.keys(prazosSalvos).filter(k => {
                const p = prazosSalvos[k];
                // Pega todos os itens que têm data fatal terminando com o mês/ano do calendário
                return p && p.fatal && p.fatal.endsWith(targetMesAnoStr);
            });
            
            const itensDoMes = chaves.map(k => prazosSalvos[k]);
            
            const tituloMes = `${mesNome} de ${year}`;
            gerarPDFMes(tituloMes, itensDoMes);
            return;
        }
        
        // --- FECHAR MODAIS E MODO FOCO PELO FUNDO ---
        if (e.target.closest('.modal-close') || e.target.classList.contains('modal-overlay') || e.target.id === 'focusModeOverlay') { 
            e.preventDefault(); e.stopPropagation(); 
            const overlay = e.target.closest('.modal-overlay') || e.target; 
            overlay.classList.remove('show'); 
            return; 
        }

        if (!e.target.closest('.card-menu-container') && !e.target.closest('.header-menu-container')) { 
            document.querySelectorAll('.card-dropdown.show, #headerDropdown.show').forEach(drop => { drop.classList.remove('show'); }); 
        }

        if (e.target.closest('#btnHeaderMenu')) { 
            if(!e.target.closest('#btnVerNivel')) { e.stopPropagation(); document.getElementById('headerDropdown')?.classList.toggle('show'); } 
            return;
        }

        if (e.target.closest('#btnVerNivel')) { 
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show'); 
            atualizarPainelGamificacao(); document.getElementById('rankModal')?.classList.add('show'); return; 
        }

        // --- NOVO MOTOR DE EXPORTAÇÃO CSV (JURIMETRIA E CONTROLE INTERNO) ---
        if (e.target.closest('#btnExportarCSV')) {
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show');
            if(Object.keys(prazosSalvos).length === 0) { showToast("Nenhum prazo para exportar.", "⚠️"); return; }
            
            // Cabeçalho exaustivo para BI / Excel
            let csv = "ID_Sistema;Processo;Apelido;Tribunal;UF;Municipio;Materia;Criacao;Tipo_Contagem;Dias_Prazo;Disponibilizacao;Publicacao;Inicio_Prazo;Prazo_Fatal;Feriados_Detectados;Houve_Prorrogacao;Status;Tem_Tarefas;Anotacoes;Texto_Publicacao\n";
            
            Object.keys(prazosSalvos).forEach(key => {
                const p = prazosSalvos[key];
                if (!p) return;

                // Limpeza e tratamento de dados para não quebrar o CSV (remover quebras de linha e aspas duplas)
                const limpaCSV = (str) => {
                    if (!str) return "";
                    return String(str).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
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
                const disp = p.disp || "";
                const pub = p.pub || "";
                const inicio = p.inicio || "";
                const fatal = p.fatal || "";
                const feriados = p.feriados || 0;
                const prorrogado = p.prorrogado ? "SIM" : "NAO";
                let status = "SEM PRAZO";
                if (p.cumprido) status = "CUMPRIDO";
                else if (p.fatal) {
                    const diff = Math.ceil((parseDateBR(p.fatal).getTime() - new Date().setHours(12,0,0,0)) / (1000 * 3600 * 24));
                    status = diff < 0 ? "ATRASADO" : (diff === 0 ? "VENCE HOJE" : "PENDENTE");
                }
                const temTarefas = (p.tarefas && p.tarefas.length > 0) ? "SIM" : "NAO";
                const anotacoes = limpaCSV(p.anotacao);
                const textoPub = limpaCSV(p.textoCompleto || p.teor);

                csv += `"${idSistema}";"${processo}";"${apelido}";"${tribunal}";"${uf}";"${municipio}";"${materia}";"${criacao}";"${tipoContagem}";"${diasPrazo}";"${disp}";"${pub}";"${inicio}";"${fatal}";"${feriados}";"${prorrogado}";"${status}";"${temTarefas}";"${anotacoes}";"${textoPub}"\n`;
            });

            // O BOM (Byte Order Mark) no início [0xEF, 0xBB, 0xBF] força o Excel a ler os acentos em UTF-8 corretamente
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); 
            const link = document.createElement("a"); link.href = URL.createObjectURL(blob); 
            link.download = `Controle_Interno_DJEN_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
            
            showToast("Dados exportados com sucesso!", "📊"); return;
        }
        // ----------------------------------------------------------------------

        // PDF AUTOMÁTICO EM NOVA ABA
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
            if (inputRadar) { palavrasUrgentes = inputRadar.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean); SafeStorage.set({'djen_termos_radar': palavrasUrgentes.join(',')}); document.getElementById('termosModal')?.classList.remove('show'); showToast("Termos do radar atualizados!", "🏷️"); if (document.getElementById('viewBusca')?.style.display !== 'none') { if (resultadosExibidos.length > 0) applyFilters(); } else { renderAgenda(); } } 
            return; 
        }

        if (e.target.closest('#btnAbrirTutorial')) { 
            e.preventDefault(); e.stopPropagation(); document.getElementById('headerDropdown')?.classList.remove('show'); document.getElementById('tutorialModal')?.classList.add('show'); return; 
        }

        if (e.target.closest('#btnToggleTheme')) {
            e.preventDefault(); e.stopPropagation();
            if (temaAtual === 'auto') temaAtual = 'claro'; else if (temaAtual === 'claro') temaAtual = 'escuro'; else if (temaAtual === 'escuro') temaAtual = 'sepia'; else temaAtual = 'auto'; 
            SafeStorage.set({'djen_theme': temaAtual}); aplicarTema(temaAtual); document.getElementById('headerDropdown')?.classList.remove('show'); return;
        }

       // --- EXPORTAÇÃO DE BACKUP COMPLETA (V46) ---
        if (e.target.closest('#btnSalvarBackupMenu')) {
            e.preventDefault(); 
            e.stopPropagation(); 
            document.getElementById('headerDropdown')?.classList.remove('show');
            
            if (Object.keys(prazosSalvos).length === 0) { 
                showToast("Nenhum prazo registrado na sua agenda.", "⚠️"); 
                return; 
            }
            
            // Nomenclatura Inteligente (Data e Hora)
            const oab = document.getElementById('oabNum')?.value.replace(/\D/g, '') || "000000"; 
            const uf = document.getElementById('oabUf')?.value.trim().toUpperCase() || "SP"; 
            const agora = new Date(); 
            const dataStr = `${String(agora.getDate()).padStart(2, '0')}-${String(agora.getMonth() + 1).padStart(2, '0')}-${agora.getFullYear()}`; 
            const horaStr = `${String(agora.getHours()).padStart(2, '0')}h${String(agora.getMinutes()).padStart(2, '0')}`;
            const nomeArquivo = `DJEN_Backup_OAB${uf}${oab}_${dataStr}_${horaStr}.json`;
            
            // A Nova Árvore de Dados (SEM O ERRO DO PONTO E VÍRGULA!)
            const backupData = { 
                versao: 4, 
                metadados: { data_geracao: agora.toISOString(), djen_versao_app: "46.0" },
                prazosSalvos: prazosSalvos, 
                estatisticas: { 
                    userXP: typeof userXP !== 'undefined' ? userXP : 0, 
                    totalBuscas: typeof totalBuscas !== 'undefined' ? totalBuscas : 0, 
                    totalLidos: typeof totalLidos !== 'undefined' ? totalLidos : 0, 
                    totalSalvos: typeof totalSalvos !== 'undefined' ? totalSalvos : 0, 
                    totalCumpridosHistorico: typeof totalCumpridosHistorico !== 'undefined' ? totalCumpridosHistorico : 0 
                }, 
                configuracoes: { 
                    oabNum: document.getElementById('oabNum')?.value || "", 
                    oabUf: document.getElementById('oabUf')?.value || "SP", 
                    notificar: document.getElementById('toggleNotificacoes')?.checked || false, 
                    horaNotificacao: document.getElementById('horaNotificacao')?.value || "08:00", 
                    tema: typeof temaAtual !== 'undefined' ? temaAtual : 'light', 
                    fontFocus: typeof fontSizeFocoAtual !== 'undefined' ? fontSizeFocoAtual : 1, 
                    termosRadar: typeof palavrasUrgentes !== 'undefined' ? palavrasUrgentes : [] // A chave correta do seu Radar!
                },
                prazos_arquivados: JSON.parse(localStorage.getItem('prazosCumpridosArquivados') || "[]"),
                dicionario_apelidos: JSON.parse(localStorage.getItem('djen_dicionario_apelidos') || "{}"),
                historico_buscas: JSON.parse(localStorage.getItem('historicoPesquisas') || "[]")
            };

            // Gera e baixa o arquivo
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' }); 
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nomeArquivo;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // NOVO: CARIMBO DE TEMPO (Reseta o lembrete de 7 dias)
            localStorage.setItem('djen_ultimo_backup_data', agora.toISOString());
            
            // Remove o alerta visual amarelo da tela, caso esteja aparecendo
            const alertaBackup = document.getElementById('djen-backup-alert');
            if (alertaBackup) alertaBackup.remove();
            
            showToast("Backup salvo com sucesso!", "✅");
            return;
        }

        // --- RESTAURAÇÃO DE BACKUP UNIVERSAL (V2, V3 e V46) ---
        if (e.target.closest('#btnRestaurarBackupMenu')) {
            e.preventDefault(); e.stopPropagation(); 
            document.getElementById('headerDropdown')?.classList.remove('show'); 
            
            const fileInput = document.getElementById('inputRestaurar');
            if (!fileInput) return;
            
            fileInput.value = ''; // Reseta o input
            
            fileInput.onchange = function(evt) {
                const file = evt.target.files[0]; 
                if(!file) return;
                
                const reader = new FileReader();
                reader.onload = (readEvent) => {
                    try { 
                        const data = JSON.parse(readEvent.target.result);
                        
                        // 1. Limpa os prazos atuais da memória para não misturar lixo
                        for (let key in prazosSalvos) { delete prazosSalvos[key]; }
                        
                        // Identifica a versão do arquivo
                        const versaoArquivo = data.versao || (data.metadados ? data.metadados.versao_estrutura : 2);

                        // 2. LÓGICA PARA VERSÃO 4 (O Novo Super Backup)
                        if (versaoArquivo === 4) {
                            if (data.prazosSalvos) Object.assign(prazosSalvos, data.prazosSalvos);
                            
                            if (data.configuracoes) {
                                const cfg = data.configuracoes;
                                if (cfg.oabNum) {
                                    const el = document.getElementById('oabNum'); if(el) el.value = cfg.oabNum;
                                    SafeStorage.set({'djen_oab_numero': cfg.oabNum});
                                }
                                if (cfg.tema && cfg.tema !== temaAtual) {
                                    temaAtual = cfg.tema;
                                    SafeStorage.set({'djen_theme': temaAtual}); 
                                    if(typeof aplicarTema === 'function') aplicarTema(temaAtual);
                                }
                                
                                // RESTAURA O RADAR COM A CHAVE EXATA E ATUALIZA A MEMÓRIA
                                if (cfg.termosRadar) {
                                    let arrayTermos = Array.isArray(cfg.termosRadar) ? cfg.termosRadar : String(cfg.termosRadar).split(',');
                                    palavrasUrgentes = arrayTermos.map(s => String(s).trim().toLowerCase()).filter(Boolean);
                                    SafeStorage.set({'djen_termos_radar': palavrasUrgentes.join(',')});
                                }
                            }

                            if (data.estatisticas) {
                                userXP = parseInt(data.estatisticas.userXP) || 0;
                                totalBuscas = parseInt(data.estatisticas.totalBuscas) || 0;
                                totalLidos = parseInt(data.estatisticas.totalLidos) || 0;
                                totalSalvos = parseInt(data.estatisticas.totalSalvos) || 0;
                                totalCumpridosHistorico = parseInt(data.estatisticas.totalCumpridosHistorico) || 0;
                            }

                            // Restaura as novas gavetas (Arquivados, Histórico)
                            if (data.prazos_arquivados) localStorage.setItem('prazosCumpridosArquivados', JSON.stringify(data.prazos_arquivados));
                            if (data.dicionario_apelidos) localStorage.setItem('djen_dicionario_apelidos', JSON.stringify(data.dicionario_apelidos));
                            if (data.historico_buscas) localStorage.setItem('historicoPesquisas', JSON.stringify(data.historico_buscas));

                        } 
                        // 3. LÓGICA PARA VERSÃO 3 (Mantida intacta da sua arquitetura)
                        else if (versaoArquivo === 3 && data.rawStorage) {
                            if (data.rawStorage.djen_prazos_salvos) {
                                const parsedPrazos = JSON.parse(data.rawStorage.djen_prazos_salvos);
                                Object.assign(prazosSalvos, parsedPrazos);
                            }
                            if (data.rawStorage.djen_oab_numero) {
                                const el = document.getElementById('oabNum'); if(el) el.value = data.rawStorage.djen_oab_numero;
                                SafeStorage.set({'djen_oab_numero': data.rawStorage.djen_oab_numero});
                            }
                            if (data.rawStorage.djen_theme && data.rawStorage.djen_theme !== temaAtual) {
                                temaAtual = data.rawStorage.djen_theme;
                                SafeStorage.set({'djen_theme': temaAtual}); aplicarTema(temaAtual);
                            }
                            if (data.rawStorage.djen_user_xp) userXP = parseInt(data.rawStorage.djen_user_xp) || 0;
                            if (data.rawStorage.djen_total_buscas) totalBuscas = parseInt(data.rawStorage.djen_total_buscas) || 0;
                            if (data.rawStorage.djen_total_lidos) totalLidos = parseInt(data.rawStorage.djen_total_lidos) || 0;
                            if (data.rawStorage.djen_total_salvos) totalSalvos = parseInt(data.rawStorage.djen_total_salvos) || 0;
                            if (data.rawStorage.djen_cumpridos_total) totalCumpridosHistorico = parseInt(data.rawStorage.djen_cumpridos_total) || 0;

                            // RECUPERA RADAR DA V3
                            if (data.rawStorage.djen_termos_radar) {
                                palavrasUrgentes = data.rawStorage.djen_termos_radar.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
                                SafeStorage.set({'djen_termos_radar': data.rawStorage.djen_termos_radar});
                            }
                        } 
                        // 4. LÓGICA PARA VERSÃO 2 OU ANTIGAS (Mantida intacta da sua arquitetura)
                        else {
                            let backupPrazos = versaoArquivo === 2 ? data.prazosSalvos : data;
                            if (Array.isArray(backupPrazos)) {
                                backupPrazos.forEach(p => {
                                    let key = p.id || (p.processo + '_' + (p.data_disponibilizacao||'')).replace(/\s/g, '');
                                    prazosSalvos[key] = p;
                                });
                            } else if (typeof backupPrazos === 'object' && backupPrazos !== null) {
                                Object.assign(prazosSalvos, backupPrazos);
                            }

                            if (versaoArquivo === 2 && data.estatisticas) {
                                userXP = Math.max(userXP, data.estatisticas.userXP || 0); 
                                totalBuscas = Math.max(totalBuscas, data.estatisticas.totalBuscas || 0); 
                                totalCumpridosHistorico = Math.max(totalCumpridosHistorico, data.estatisticas.totalCumpridosHistorico || 0);
                            }
                        }
                        
                        // 5. Salva tudo de volta no navegador e atualiza a UI (Com as SUAS funções)
                        SafeStorage.set({ 'djen_total_buscas': totalBuscas, 'djen_total_lidos': totalLidos, 'djen_total_salvos': totalSalvos, 'djen_cumpridos_total': totalCumpridosHistorico });
                        
                        // Reseta o cronômetro do alerta de 7 dias
                        localStorage.setItem('djen_ultimo_backup_data', new Date().toISOString());

                        savePrazosSalvos(); 
                        atualizarEstatisticas(); 
                        switchView('salvos'); 
                        
                        showToast("Backup restaurado com sucesso!", "🔄"); 
                    } catch(err) { 
                        console.error("Erro na leitura do JSON:", err);
                        showToast("Erro ao ler o arquivo de backup. Verifique o formato.", "❌"); 
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
            e.preventDefault(); e.stopPropagation(); const itens = Object.values(prazosSalvos).filter(p => !p.cumprido);
            if(itens.length === 0) { showToast("Nenhum prazo pendente para copiar.", "⚠️"); return; } exportarTxtLote(itens, "Relatório de Prazos"); return;
        }

        if (e.target.closest('#btnNovoPrazoManual')) {
            e.preventDefault(); e.stopPropagation(); 
            const inpP = document.getElementById('inputManualProcesso'); if(inpP) inpP.value = ''; 
            const inpT = document.getElementById('inputManualTeor'); if(inpT) inpT.value = ''; 
            document.getElementById('novoPrazoModal')?.classList.add('show'); 
            setTimeout(() => inpP?.focus(), 150); 
            return;
        }

if (e.target.closest('#btnCancelarNovoPrazo')) { e.preventDefault(); e.stopPropagation(); document.getElementById('novoPrazoModal')?.classList.remove('show'); return; }

        if (e.target.closest('#btnEntendiTutorial')) { e.preventDefault(); e.stopPropagation(); document.getElementById('tutorialModal')?.classList.remove('show'); return; }
        // --- MODAL DE IDENTIFICAÇÃO (APELIDO) ---
        if (e.target.closest('#btnCancelarApelido') || e.target.closest('#btnFecharModalApelido')) { 
            e.preventDefault(); e.stopPropagation(); 
            document.getElementById('apelidoModal')?.classList.remove('show'); 
            currentApelidoCallback = null;
            return; 
        }

        if (e.target.closest('#btnSalvarApelido')) {
            e.preventDefault(); e.stopPropagation();
            const inputVal = document.getElementById('inputApelidoModal')?.value || "";
            // Dispara a função de salvar que foi passada ao abrir o modal
            if (currentApelidoCallback) currentApelidoCallback(inputVal);
            document.getElementById('apelidoModal')?.classList.remove('show');
            currentApelidoCallback = null;
            return;
        }
       
        if (e.target.closest('#btnSalvarNovoPrazo')) {
            e.preventDefault(); e.stopPropagation();
            const procRaw = document.getElementById('inputManualProcesso')?.value.trim(); const proc = formatCNJ(procRaw) !== "Processo s/ número" ? formatCNJ(procRaw) : (procRaw || "Prazo Manual"); const teor = document.getElementById('inputManualTeor')?.value.trim(); 
            if (!teor) { showToast("Preencha o teor/descrição.", "⚠️"); return; } 
            const itemKey = 'manual_' + Date.now(); prazosSalvos[itemKey] = { id: itemKey, processo: proc, textoCompleto: teor, anotacao: "Adicionado manualmente", manual: true, cumprido: false, dias: extrairPrazoSugerido(teor), siglaTribunal: "MANUAL", data_disponibilizacao: new Date().toISOString().split('T')[0] }; 
            savePrazosSalvos(); document.getElementById('novoPrazoModal')?.classList.remove('show'); showToast("Prazo manual criado!", "📝"); filtroAgendaAtivo = null; sessionStorage.setItem('djen_auto_open_calc', itemKey); renderAgenda(); return;
        }

       

        if (e.target.closest('#btnAvaliarLoja')) {
            e.preventDefault(); e.stopPropagation(); const isFirefox = navigator.userAgent.toLowerCase().includes('firefox'); const linkDestino = isFirefox ? "https://addons.mozilla.org/pt-BR/firefox/addon/SEU_ID_AQUI/reviews/" : "https://chrome.google.com/webstore/detail/SEU_ID_AQUI/reviews"; SafeStorage.set({'djen_ja_avaliou': true}); document.getElementById('reviewModal')?.classList.remove('show'); openSafeLink(linkDestino); return;
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
                abrirModalApelido(proc, getGlobalApelido(proc), (novoApelido) => { setGlobalApelido(proc, novoApelido.trim(), itemKey); if(isBusca) applyFilters(); else { renderAgenda(); renderCalendar(); } }); 
            } 
            else if (btnAcaoDropdown.classList.contains('btn-marcar-naolido')) { 
                publicacoesLidas.delete(itemKey); card.classList.remove('lido'); const lidoBdg = card.querySelector('.badge-lido'); if(lidoBdg) lidoBdg.remove(); updateProgressBar(); showToast("Marcado como não lido", "👀"); 
            } 
            // NOVA AÇÃO: Limpar apenas as datas, mantendo o Card Manual
            else if (btnAcaoDropdown.classList.contains('btn-remover-prazo')) {
                if (prazosSalvos[itemKey]) {
                    prazosSalvos[itemKey].fatal = null; prazosSalvos[itemKey].pubOrig = null; prazosSalvos[itemKey].pub = null; prazosSalvos[itemKey].inicio = null; prazosSalvos[itemKey].disp = null; prazosSalvos[itemKey].timeline = null; prazosSalvos[itemKey].cumprido = false;
                    savePrazosSalvos(); atualizarEstatisticas();
                    
                    if (isBusca) {
                        applyFilters(); 
                    } else { 
                        // MÁGICA: Força a remoção dos filtros visuais para o card não sumir da tela!
                        filtroAgendaAtivo = null;
                        document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active'));
                        renderAgenda(); renderCalendar(); 
                    }
                    if (typeof showToast === 'function') showToast("Contagem limpa.", "🧹");
                }
            }
            // AÇÃO ORIGINAL: Deletar o Card inteiro
            else if (btnAcaoDropdown.classList.contains('btn-remover-busca') || btnAcaoDropdown.classList.contains('btn-remover') || btnAcaoDropdown.classList.contains('btn-remover-card')) { 
                removerComDesfazer(itemKey, isBusca, card); 
            } 
            return; 
        }
        const cafeBanner = e.target.closest('.footer-cafe-banner'); if (cafeBanner && !e.target.closest('.pix-copy-row') && !e.target.closest('.modal-qr-white')) { cafeBanner.classList.toggle('expanded'); if (cafeBanner.classList.contains('expanded')) { setTimeout(() => window.scrollBy({ top: 250, behavior: 'smooth' }), 200); } }
        const copyPix = e.target.closest('.pix-btn-copy'); if (copyPix) { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(pixCodeText).then(() => { const originalHTML = copyPix.innerHTML; copyPix.innerHTML = `COPIADO`; copyPix.style.color = "#38A169"; setTimeout(() => { copyPix.innerHTML = originalHTML; copyPix.style.color = ""; }, 2000); }); return; }
    });

    window.onscroll = function() { const btnTopo = document.getElementById("btnIrTopo"); if(!btnTopo) return; if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) { btnTopo.classList.add('show'); } else { btnTopo.classList.remove('show'); } }; 
    const btnTopoClick = document.getElementById('btnIrTopo'); if(btnTopoClick) btnTopoClick.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    
   function processarCheckCumprido(isCumpridoAgora, skipToast = false) {
        if(isCumpridoAgora) { 
            totalCumpridosHistorico++; SafeStorage.set({'djen_cumpridos_total': totalCumpridosHistorico}); 
            SafeStorage.get(['djen_ja_avaliou'], (data) => {
                if (totalCumpridosHistorico === 50 && !data.djen_ja_avaliou) { 
                    document.getElementById('reviewModal')?.classList.add('show'); 
                } else { 
                    if(!skipToast) showToast("Prazo cumprido!", "✅"); 
                }
            });
        } else { 
            totalCumpridosHistorico--; if(totalCumpridosHistorico < 0) totalCumpridosHistorico = 0; 
            SafeStorage.set({'djen_cumpridos_total': totalCumpridosHistorico}); 
            if(!skipToast) showToast("Prazo reaberto.", "🔄"); 
        }
    }

    function atualizarEstatisticas() {
        let hoje = 0, cincoDias = 0, futuros = 0, cumpridos = 0, esperaCount = 0; const hj = new Date(); hj.setHours(12,0,0,0);
        for(let k in prazosSalvos) { 
            const p = prazosSalvos[k]; 
            if (!p || (!p.fatal && !p.manual)) continue; 
            if(p.cumprido) { cumpridos++; continue; } 
            
            // NOVO: Conta as esperas ativas e PARA a leitura aqui (continue)
            if(p.espera) { 
                esperaCount++; 
                continue; // Isto impede que conte duplamente nas caixas de baixo!
            } 
            
            if(p.fatal) { 
                const dt = parseDateBR(p.fatal); const diff = Math.ceil((dt - hj) / (1000 * 3600 * 24)); 
                if (diff <= 0) hoje++; else if (diff > 0 && diff <= 5) cincoDias++; else futuros++; 
            } 
        }
        const elHoje = document.getElementById('countHoje'); const el7Dias = document.getElementById('count7Dias'); const elTotal = document.getElementById('countTotal'); const elCumpridos = document.getElementById('countCumpridos');
        
        if(elHoje) { 
            elHoje.textContent = hoje.toString().padStart(2, '0'); 
            el7Dias.textContent = cincoDias.toString().padStart(2, '0'); 
            elTotal.textContent = futuros.toString().padStart(2, '0'); 
            elCumpridos.textContent = cumpridos.toString().padStart(2, '0'); 
            
            elHoje.closest('.stat-box').classList.toggle('is-zero', hoje === 0); 
            el7Dias.closest('.stat-box').classList.toggle('is-zero', cincoDias === 0); 
            elTotal.closest('.stat-box').classList.toggle('is-zero', futuros === 0); 
            elCumpridos.closest('.stat-box').classList.toggle('is-zero', cumpridos === 0); 
        }
        
        // Atualiza a nova caixa de Espera
        const elEsperaBox = document.getElementById('countEsperaBox');
        if(elEsperaBox) {
            elEsperaBox.textContent = esperaCount.toString().padStart(2, '0');
            elEsperaBox.closest('.stat-box').classList.toggle('is-zero', esperaCount === 0);
        }
    }

    const getLocalDate = (daysToSubtract) => { const d = new Date(); d.setDate(d.getDate() - daysToSubtract); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const setDate = (d) => { const ini = document.getElementById('dataInicio'); if(ini) ini.value = getLocalDate(d); const fim = document.getElementById('dataFim'); if(fim) fim.value = getLocalDate(0); }; setDate(0); 

    SafeStorage.get(['djen_theme', 'djen_font_focus', 'djen_prazos_salvos', 'djen_termos_radar', 'djen_notificar', 'djen_oab_numero', 'djen_oab_estado', 'djen_hora_notificacao', 'djen_last_search', 'djen_cumpridos_total', 'djen_last_backup_date', 'djen_user_xp', 'djen_total_buscas', 'djen_total_lidos', 'djen_total_salvos', 'djen_ultimo_aviso', 'djen_publicacoes_lidas'], (data) => {
        if (data.djen_termos_radar) { if (typeof data.djen_termos_radar === 'string') { palavrasUrgentes = data.djen_termos_radar.split(',').map(s => s.trim().toLowerCase()).filter(Boolean); } else if (Array.isArray(data.djen_termos_radar)) { palavrasUrgentes = data.djen_termos_radar.map(s => String(s).trim().toLowerCase()).filter(Boolean); } }
        if(data.djen_theme) { temaAtual = data.djen_theme; aplicarTema(temaAtual); }
        if(data.djen_font_focus) { fontSizeFocoAtual = parseInt(data.djen_font_focus); document.documentElement.style.setProperty('--font-focus', fontSizeFocoAtual + 'px'); }
        prazosSalvos = data.djen_prazos_salvos ? (JSON.parse(data.djen_prazos_salvos) || {}) : {}; 
        totalCumpridosHistorico = data.djen_cumpridos_total || 0; userXP = data.djen_user_xp || 0; totalBuscas = data.djen_total_buscas || 0; totalLidos = data.djen_total_lidos || 0; totalSalvos = data.djen_total_salvos || 0;
        if (data.djen_publicacoes_lidas) {
            try { publicacoesLidas = new Set(JSON.parse(data.djen_publicacoes_lidas)); } 
            catch(e) { publicacoesLidas = new Set(); }
        }
      
        
        let precisaSalvar = false; const hojeRef = new Date(); hojeRef.setHours(0,0,0,0);
        for (const key in prazosSalvos) { if (prazosSalvos[key] && prazosSalvos[key].fatal) { const dataFatal = parseDateBR(prazosSalvos[key].fatal); const diffDias = Math.floor((hojeRef.getTime() - dataFatal.getTime()) / (1000 * 3600 * 24)); if (diffDias > 30) { delete prazosSalvos[key]; precisaSalvar = true; } } }
        if (precisaSalvar) savePrazosSalvos();

        const lastBackup = data.djen_last_backup_date || 0; const daysSinceBackup = (Date.now() - lastBackup) / (1000 * 3600 * 24);
        if (daysSinceBackup > 30 && Object.keys(prazosSalvos).length > 0) { const btnMenu = document.getElementById('btnHeaderMenu'); if (btnMenu) { btnMenu.classList.add('needs-backup'); btnMenu.setAttribute('data-tooltip', 'Opções (Backup Recomendado)'); } const btnBackupMenu = document.getElementById('btnSalvarBackupMenu'); if (btnBackupMenu) { btnBackupMenu.classList.add('btn-backup-pulse'); } }

        if(data.djen_oab_numero) { const onum = document.getElementById('oabNum'); if(onum) onum.value = data.djen_oab_numero; }
        if(data.djen_oab_estado) { const ouf = document.getElementById('oabUf'); if(ouf) ouf.value = data.djen_oab_estado; }
        
     
        
        if (data.djen_last_search) { try { const parsedData = JSON.parse(data.djen_last_search); if (Array.isArray(parsedData) && parsedData.length > 0) { resultadosGlobais = parsedData; const tribs = [...new Set(resultadosGlobais.map(i => i.siglaTribunal))].sort(); const filtro = document.getElementById('filtroTribunal'); if(filtro) { filtro.innerHTML = '<option value="">Tribunal</option>'; tribs.forEach(t => { const opt = document.createElement("option"); opt.value = t; opt.textContent = t; filtro.appendChild(opt); }); } const ctFiltro = document.getElementById('containerFiltro'); if(ctFiltro) ctFiltro.style.display = 'none'; const welcome = document.getElementById('welcomeState'); if (welcome) welcome.style.display = 'flex'; } } catch(e) { SafeStorage.set({'djen_last_search': ''}); } }
        
        // NOVO: Carrega o Histórico
        SafeStorage.get(['djen_historico_buscas'], (d) => {
            if(d.djen_historico_buscas) { 
                historicoBuscas = JSON.parse(d.djen_historico_buscas); 
                renderHistoricoBuscas(); 
            }
        });

        atualizarEstatisticas(); filtroAgendaAtivo = null; renderAgenda(); renderCalendar();
    });

    const elNum = document.getElementById('oabNum'); 
    if(elNum) elNum.addEventListener('input', debounce((e) => SafeStorage.set({'djen_oab_numero': e.target.value}), 500));
    const elUf = document.getElementById('oabUf'); 
    if(elUf) elUf.addEventListener('input', debounce((e) => SafeStorage.set({'djen_oab_estado': e.target.value.toUpperCase()}), 500));
    

    const procInput = document.getElementById('procNumBusca');
    if (procInput) {
        procInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ''); if (v.length > 20) v = v.substring(0, 20);
            v = v.replace(/^(\d{7})(\d)/, "$1-$2"); v = v.replace(/-(\d{2})(\d)/, "-$1.$2"); v = v.replace(/\.(\d{4})(\d)/, ".$1.$2"); v = v.replace(/\.(\d)(\d)/, ".$1.$2"); v = v.replace(/\.(\d{2})(\d)/, ".$1.$2"); e.target.value = v;
        });
        procInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const btnB = document.getElementById('btnBuscar'); if(btnB) btnB.click(); } });
    }

    const btnOab = document.getElementById('btnSearchTypeOab'); const btnProc = document.getElementById('btnSearchTypeProc');
    const camposOab = document.getElementById('camposOAB'); const camposProc = document.getElementById('camposProcesso');
    if (btnOab && btnProc && camposOab && camposProc) { btnOab.onclick = () => { searchMode = 'oab'; btnOab.classList.add('active'); btnProc.classList.remove('active'); camposOab.style.display = 'block'; camposProc.style.display = 'none'; }; btnProc.onclick = () => { searchMode = 'proc'; btnProc.classList.add('active'); btnOab.classList.remove('active'); camposOab.style.display = 'none'; camposProc.style.display = 'block'; }; }

    const bfMinus = document.getElementById('btnFontMinus'); if(bfMinus) bfMinus.onclick = (e) => { e.stopPropagation(); atualizarTamanhoFonteFoco(-1); }; 
    const bfPlus = document.getElementById('btnFontPlus'); if(bfPlus) bfPlus.onclick = (e) => { e.stopPropagation(); atualizarTamanhoFonteFoco(1); };
    const bmTextoF = document.getElementById('btnMarcarTextoFoco'); 
if(bmTextoF) {
    bmTextoF.onmousedown = (e) => e.preventDefault(); // Impede a perda da seleção
    bmTextoF.onclick = (e) => { e.stopPropagation(); handleMarcarTexto(); };
}

const bcTagF = document.getElementById('btnCriarTagFoco'); 
if(bcTagF) {
    bcTagF.onmousedown = (e) => e.preventDefault(); // Impede a perda da seleção
    bcTagF.onclick = (e) => { 
        const key = document.getElementById('focusModeOverlay')?.getAttribute('data-active-key'); 
        if(key) { 
            const input = document.querySelector(`.intimacao-card[data-key="${key}"] .nota-input`); 
            if(input) handleCriarTag(input); 
            else showToast("Abra o cartão antes de criar a tag.", "⚠️"); 
        } 
    };
}

    function switchView(v) { 
        const vb = document.getElementById('viewBusca'); if(vb) vb.style.display = v === 'busca' ? 'block' : 'none'; 
        const vs = document.getElementById('viewSalvos'); if(vs) vs.style.display = v === 'salvos' ? 'block' : 'none'; 
        const vc = document.getElementById('viewCalendario'); if(vc) vc.style.display = v === 'calendario' ? 'block' : 'none'; 
        const tabBusca = document.getElementById('tabBusca'); const tabSalvos = document.getElementById('tabSalvos'); const tabCalendario = document.getElementById('tabCalendario');
        if(tabBusca) { tabBusca.classList.toggle('active', v === 'busca'); tabBusca.setAttribute('aria-selected', v === 'busca'); }
        if(tabSalvos) { tabSalvos.classList.toggle('active', v === 'salvos'); tabSalvos.setAttribute('aria-selected', v === 'salvos'); }
        if(tabCalendario) { tabCalendario.classList.toggle('active', v === 'calendario'); tabCalendario.setAttribute('aria-selected', v === 'calendario'); }
        if (v === 'salvos') { renderAgenda(); } if (v === 'calendario') { renderCalendar(); }
    }
    
    if(tabBuscaBtn) tabBuscaBtn.onclick = () => { switchView('busca'); updateProgressBar(); }; 
    const tsBtn = document.getElementById('tabSalvos'); if(tsBtn) tsBtn.onclick = () => { filtroAgendaAtivo = null; document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active')); switchView('salvos'); }; 
    const tcBtn = document.getElementById('tabCalendario'); if(tcBtn) tcBtn.onclick = () => { switchView('calendario'); };
    const bCloseF = document.getElementById('btnCloseFocus'); if(bCloseF) bCloseF.onclick = () => document.getElementById('focusModeOverlay')?.classList.remove('show');
    const btnEditarResumo = document.getElementById('btnEditarResumo'); 
    if(btnEditarResumo) { 
        btnEditarResumo.onclick = () => { 
            document.getElementById('resumoBusca').style.display = 'none'; 
            document.getElementById('areaBusca').style.display = 'block'; 
        }; 
    }

    const btnLimparBusca = document.getElementById('btnLimparBusca');
    if(btnLimparBusca) {
        btnLimparBusca.onclick = (e) => {
            e.stopPropagation();
            
            // Limpa os inputs
            const inputProc = document.getElementById('procNumBusca');
            if(inputProc) inputProc.value = '';
            
            // Reseta a tela
            document.getElementById('resumoBusca').style.display = 'none'; 
            document.getElementById('areaBusca').style.display = 'block';
            document.getElementById('resultados').innerHTML = '';
            
            // Volta painéis iniciais
            const welcome = document.getElementById('welcomeState'); 
            if (welcome) welcome.style.display = 'flex';
            document.getElementById('progressWrapper').style.display = 'none';
            
            const ctFiltro = document.getElementById('containerFiltro'); 
            if(ctFiltro) ctFiltro.style.display = 'none';
            const acoesLote = document.getElementById('acoesBuscaLote');
            if(acoesLote) acoesLote.style.display = 'none';
            
            const cr = document.getElementById('contadorResultados'); 
            if(cr) cr.textContent = '';
            
            SafeStorage.set({'djen_last_search': ''});
            resultadosExibidos = [];
            resultadosGlobais = [];
        };
    }
    

    document.querySelectorAll('.stat-box').forEach(box => { 
        box.onclick = () => { 
            const isAlreadyActive = box.classList.contains('active'); document.querySelectorAll('.stat-box').forEach(b => b.classList.remove('active')); 
            if (isAlreadyActive) { filtroAgendaAtivo = null; } else { box.classList.add('active'); if (box.classList.contains('stat-hoje')) filtroAgendaAtivo = 'hoje'; if (box.classList.contains('stat-dias')) filtroAgendaAtivo = '5dias'; if (box.classList.contains('stat-pendentes')) filtroAgendaAtivo = 'futuros'; if (box.classList.contains('stat-espera')) filtroAgendaAtivo = 'espera'; if (box.classList.contains('stat-cumpridos')) filtroAgendaAtivo = 'cumpridos'; } 
            
            // Desliga visualmente a pílula de espera se clicar nas caixas grandes
            const btnE = document.getElementById('btnFiltroEspera');
            if(btnE) { btnE.classList.remove('active'); btnE.style.borderColor = 'var(--border-light)'; btnE.style.background = 'var(--bg-card)'; btnE.style.color = 'var(--text-main)'; }

            switchView('salvos'); 
        }; 
    });

    // NOVO: Clique na pílula de Aguardando
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
            const calcTemplate = document.getElementById('calcTemplate'); if(!calcTemplate) return document.createElement('div');
            const calcNode = calcTemplate.content.cloneNode(true); const calcPanel = calcNode.querySelector('.calculadora-prazo'); if(!calcPanel) return document.createElement('div');
            const calcInputs = calcPanel.querySelector('.calc-inputs-container'); const calcResultBox = calcPanel.querySelector('.calc-result-box'); const lblDataFatal = calcPanel.querySelector('.resultado-data-fatal'); const containerAlertas = calcPanel.querySelector('.resultado-alertas'); const previewContainer = calcPanel.querySelector('.calc-preview'); 
            const cUf = calcPanel.querySelector('.c-uf'); const cMun = calcPanel.querySelector('.c-mun'); const cMat = calcPanel.querySelector('.c-mat'); const cData = calcPanel.querySelector('.c-data'); const cDias = calcPanel.querySelector('.c-dias'); const cDir = calcPanel.querySelector('.c-dir'); 
            const cTrib = calcPanel.querySelector('.c-trib'); const cEspera = calcPanel.querySelector('.c-espera');
            
            const divIniciais = calcPanel.querySelector('.calc-acoes-iniciais'); const divFinais = calcPanel.querySelector('.calc-acoes-finais'); const divPosSalvo = calcPanel.querySelector('.calc-acoes-pos-salvo');

            const btnExec = calcPanel.querySelector('.btn-exec'); const btnCancelar = calcPanel.querySelector('.btn-cancelar'); const btnVoltarCalc = calcPanel.querySelector('.btn-voltar-calc'); const btnSalvar = calcPanel.querySelector('.btn-salvar'); const btnSalvarGcalPos = calcPanel.querySelector('.btn-salvar-gcal-pos'); const btnFecharCalc = calcPanel.querySelector('.btn-fechar-calc');

            // AS VARIÁVEIS QUE SUMIRAM E ESTAVAM A CAUSAR O CRASH INVISÍVEL
            let isCalculated = false; 
            let lastResult = null; 
            let calcData = (i && i.prazoCalculado) ? i.prazoCalculado : ((i && i.fatal) ? i : null);

            const verificarBotaoCalcular = () => {
                if (btnExec) {
                    const valTrib = cTrib ? cTrib.value.trim() : "";
                    const valUf = cUf ? cUf.value.trim() : "";
                    const valMun = cMun ? cMun.value.trim() : "";
                    
                    if (!valTrib || !valUf || !valMun) {
                        btnExec.disabled = true;
                        btnExec.style.opacity = '0.4';
                        btnExec.style.cursor = 'not-allowed';
                        btnExec.setAttribute('data-tooltip', 'Preencha Tribunal, UF e Município para calcular');
                    } else {
                        btnExec.disabled = false;
                        btnExec.style.opacity = '1';
                        btnExec.style.cursor = 'pointer';
                        btnExec.removeAttribute('data-tooltip');
                    }
                }
            };

            const resetCalcState = () => { 
                isCalculated = false; 
                if(previewContainer) previewContainer.style.display = 'none'; 
                if(calcResultBox) calcResultBox.style.display = 'none'; 
                if(calcInputs) calcInputs.style.display = 'flex'; 
                if(divIniciais) divIniciais.style.display = 'flex'; 
                if(divFinais) divFinais.style.display = 'none'; 
                if(divPosSalvo) divPosSalvo.style.display = 'none'; 
                
                // NOVO: Se clicar em editar, esconde também o formulário de identificação avulso
                const formAvulsa = calcPanel.querySelector('.form-identificacao-avulsa');
                if (formAvulsa) formAvulsa.style.display = 'none';
                
                verificarBotaoCalcular(); 
            };

            // Trata o auto-preenchimento do Tribunal/IBGE
            if (cTrib) {
                if (calcData && calcData.siglaTribunal && calcData.siglaTribunal !== 'MANUAL') {
                    cTrib.value = calcData.siglaTribunal;
                } else if (i.siglaTribunal && i.siglaTribunal !== 'MANUAL') {
                    cTrib.value = i.siglaTribunal;
                } else {
                    cTrib.value = ""; // Prazo manual começa vazio pra forçar o usuário a digitar
                }
                cTrib.onchange = () => {
                    if (cTrib.value) {
                        autoPreencherTribunal(cTrib.value, cUf, cMun);
                        carregarMunicipios(cUf.value, `dl_${itemKey}`);
                    }
                    resetCalcState();
                };
            }

            if(cUf && cMun) { 
                if (!calcData) {
                    if (cTrib && cTrib.value) autoPreencherTribunal(cTrib.value, cUf, cMun);
                    else cUf.value = "SP";
                }
                const datalistId = `dl_${itemKey}`; 
                cMun.setAttribute('list', datalistId); 
                carregarMunicipios(cUf.value, datalistId); 
                
                if (!calcData && !cMun.value) { 
                    SafeStorage.get(['djen_last_mun'], (d) => { if (d.djen_last_mun) cMun.value = d.djen_last_mun; }); 
                } 
            }
            
if(cData) cData.value = dataDispOriginal
            if (calcData && calcData.fatal) { 
                if(cDias) cDias.value = calcData.dias || prazoSugerido || 15; 
                if(cMat) cMat.value = calcData.mat || "Cível"; 
                if(cUf) cUf.value = calcData.uf || "SP"; 
                if(cMun) cMun.value = calcData.mun || ""; 
                if(calcData.pubOrig && cData) cData.value = calcData.pubOrig.split('T')[0]; 
                if(calcData.direcao && cDir) cDir.value = calcData.direcao; if(cEspera) cEspera.checked = !!calcData.espera;
                if(cUf) carregarMunicipios(cUf.value, `dl_${itemKey}`); 
            } else { 
                if(cDias) cDias.value = prazoSugerido || 15; 
            }

            if(cUf) cUf.onchange = () => { if(cMun) cMun.value = ""; SafeStorage.set({'djen_last_mun': ""}); carregarMunicipios(cUf.value, `dl_${itemKey}`); resetCalcState(); };
            if(cMun) cMun.oninput = () => { SafeStorage.set({'djen_last_mun': cMun.value}); resetCalcState(); };
            if(cDias) cDias.oninput = resetCalcState; if(cData) cData.onchange = resetCalcState; if(cMat) cMat.onchange = resetCalcState; if(cDir) cDir.onchange = resetCalcState;
            if(btnCancelar) btnCancelar.onclick = (e) => { e.stopPropagation(); calcPanel.classList.remove('ativa'); resetCalcState(); };
            if(btnVoltarCalc) btnVoltarCalc.onclick = (e) => { e.stopPropagation(); resetCalcState(); };
            if(calcResultBox) { 
                calcResultBox.removeAttribute('title');
                calcResultBox.onclick = (e) => { 
                    e.stopPropagation(); 
                    if(previewContainer) {
                        if(previewContainer.style.display === 'none' || previewContainer.style.display === '') {
                            previewContainer.style.display = 'grid'; // Garante que abre em grade
                            
                            // MÁGICA DO SCROLL: Foca no topo do cartão, encaixando-o perfeitamente na tela
                            setTimeout(() => { 
                                const cardTarget = calcPanel.closest('.intimacao-card');
                                if (cardTarget) {
                                    cardTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                } else {
                                    calcPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }, 150);
                        } else {
                            previewContainer.style.display = 'none';
                        }
                    }
                }; 
            }

            verificarBotaoCalcular(); // Garante o bloqueio inicial ao abrir o formulário

            if (btnExec) {
                btnExec.onclick = async (e) => {
                    e.stopPropagation();
            
            

                    // --- INÍCIO DA VALIDAÇÃO (Bloqueia o Cálculo) ---
                    const valTrib = cTrib ? cTrib.value.trim() : "";
                    const valUf = cUf ? cUf.value.trim() : "";
                    const valMun = cMun ? cMun.value.trim() : "";

                    if (!valTrib || !valUf || !valMun) {
                        if (typeof showToast === 'function') showToast("Selecione o Tribunal, UF e Município para habilitar o cálculo.", "⚠️");
                        
                        // Pisca a vermelho o campo que estiver em falta e foca nele
                        if (cTrib && !valTrib) {
                            const borderOrig = cTrib.style.border; cTrib.style.border = "1px solid #d44c47"; cTrib.focus();
                            setTimeout(() => { cTrib.style.border = borderOrig; }, 2500);
                        } else if (cUf && !valUf) {
                            const borderOrig = cUf.style.border; cUf.style.border = "1px solid #d44c47"; cUf.focus();
                            setTimeout(() => { cUf.style.border = borderOrig; }, 2500);
                        } else if (cMun && !valMun) {
                            const borderOrig = cMun.style.border; cMun.style.border = "1px solid #d44c47"; cMun.focus();
                            setTimeout(() => { cMun.style.border = borderOrig; }, 2500);
                        }
                        return; // Bloqueia a execução do cálculo aqui!
                    }
                    // --- FIM DA VALIDAÇÃO ---

                    const textoOriginal = btnExec.innerHTML;
                    btnExec.innerHTML = "Calculando...";
                    btnExec.disabled = true;

                    try {
                        const dias = parseInt(cDias.value) || 1;
                        // ... O resto do código (pubEscolhida, tipo, direcao, etc.) continua igual a partir daqui
                        const pubEscolhida = cData.value;
                        const tipo = cMat.value === 'Criminal' ? 'cpp' : 'cpc';
                        const direcao = cDir ? cDir.value : 'futuro';
                        const siglaTribunal = cTrib ? cTrib.value.trim().toUpperCase() : (i?.siglaTribunal || "");
                        const ufCalc = cUf ? cUf.value : "";
                        const munCalc = cMun ? cMun.value : "";
                        
                        // Pegamos o ano da data escolhida para baixar o JSON correto (ex: 2026.json)
                        const anoCalculo = new Date(pubEscolhida).getFullYear();

                        // Busca feriados no Tribunal e no DB Municipal (USANDO A FUNÇÃO NOVA)
                        const [feriadosTribunal, feriadosMunisDinamicos] = await Promise.all([
                            buscarFeriadosTribunal(siglaTribunal),
                            buscarFeriadosMunicipaisAnual(anoCalculo, ufCalc, munCalc)
                        ]);

                        let dataAtual = new Date(pubEscolhida + 'T15:00:00');
                        let timeline = []; let totalFeriados = 0; let temFeriadoMun = false; let prorrogado = false;
                        const f = (d) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

                        timeline.push({ data: dataAtual.toISOString(), desc: "Disponibilizado", tipo: "info", numero: "Disp." });

                        // 2. ACHAR A PUBLICAÇÃO
                        dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                        while (true) {
                            let dStr = dataAtual.toISOString().split('T')[0];
                            let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                            if (motivo === "Dia Útil") break;
                            if (motivo.includes("Municipal")) temFeriadoMun = true;
                            timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                            dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                        }
                        const dtPub = new Date(dataAtual);
                        timeline.push({ data: dtPub.toISOString(), desc: "Publicação", tipo: "info", numero: "Pub." });

                        // 3. ACHAR O INÍCIO DO PRAZO
                        dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                        while (true) {
                            let dStr = dataAtual.toISOString().split('T')[0];
                            let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                            if (motivo === "Dia Útil") break;
                            if (motivo.includes("Municipal")) temFeriadoMun = true;
                            timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                            dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                        }
                        const dtInicio = new Date(dataAtual);

                        // 4. CONTAGEM
                        if (tipo === 'cpc') { 
                            let diasContados = 1;
                            timeline.push({ data: dataAtual.toISOString(), desc: "Dia Útil", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia 1" });
                            while (diasContados < dias) {
                                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                                let dStr = dataAtual.toISOString().split('T')[0];
                                let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                                if (motivo === "Dia Útil") {
                                    diasContados++;
                                    timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: diasContados === dias ? "fatal" : "util", numero: "Dia " + diasContados });
                                } else {
                                    totalFeriados++;
                                    if (motivo.includes("Municipal")) temFeriadoMun = true;
                                    timeline.push({ data: dataAtual.toISOString(), desc: motivo, tipo: "pulo", numero: "-" });
                                }
                            }
                        } else { 
                            let diasContados = 1;
                            timeline.push({ data: dataAtual.toISOString(), desc: "Dia Corrido", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia 1" });
                            while (diasContados < dias) {
                                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                                let dStr = dataAtual.toISOString().split('T')[0];
                                let motivo = checarMotivoFeriado(dStr, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                                if (motivo !== "Dia Útil") { totalFeriados++; if (motivo.includes("Municipal")) temFeriadoMun = true; }
                                diasContados++;
                                timeline.push({ data: dataAtual.toISOString(), desc: motivo !== "Dia Útil" ? motivo : "Dia Corrido", tipo: diasContados === dias ? "fatal" : "util", numero: "Dia " + diasContados });
                            }
                            
                            let dStrFatal = dataAtual.toISOString().split('T')[0];
                            let motivoFatal = checarMotivoFeriado(dStrFatal, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                            while (motivoFatal !== "Dia Útil") {
                                prorrogado = true;
                                timeline[timeline.length - 1].tipo = "pulo"; timeline[timeline.length - 1].numero = "Prorrogado";
                                dataAtual.setDate(dataAtual.getDate() + (direcao === 'futuro' ? 1 : -1));
                                dStrFatal = dataAtual.toISOString().split('T')[0];
                                motivoFatal = checarMotivoFeriado(dStrFatal, dataAtual, ufCalc, munCalc, feriadosTribunal, feriadosMunisDinamicos);
                                timeline.push({ data: dataAtual.toISOString(), desc: motivoFatal === "Dia Útil" ? "Prorrogação" : motivoFatal, tipo: motivoFatal === "Dia Útil" ? "fatal" : "pulo", numero: motivoFatal === "Dia Útil" ? "Dia " + dias : "-" });
                            }
                        }

                        const dtFatal = new Date(dataAtual);

                        lastResult = {
                            disp: f(new Date(pubEscolhida + 'T15:00:00')), pub: f(dtPub), inicio: f(dtInicio), fatal: f(dtFatal),
                            feriados: totalFeriados, temFeriadoMunicipal: temFeriadoMun, prorrogado: prorrogado, timeline: timeline
                        };

                        isCalculated = true;
                        if(lblDataFatal) lblDataFatal.textContent = f(dtFatal);
                        
                        if(containerAlertas) {
                            containerAlertas.style.display = 'block'; 
                            containerAlertas.innerHTML = "";
                            let badgesHtml = "";
                            
                            // Adiciona as tags normais
                            if (totalFeriados > 0) badgesHtml += `<span class="badge bg-gray">${totalFeriados} Feriados/Suspensões</span>`;
                            if (prorrogado) badgesHtml += `<span class="badge bg-orange">Prorrogado</span>`;
                            
                            // Cria uma linha separada só para as tags
                            if (badgesHtml !== "") {
                                containerAlertas.innerHTML += `<div style="display:flex; gap:4px; justify-content:center; width: 100%; margin-bottom: 12px;">${badgesHtml}</div>`;
                            }

                            // Adiciona a caixa de Alerta de Jurisprudência embaixo, larga e bonita
                            if (temFeriadoMun) {
                                containerAlertas.innerHTML += `
                                    <div style="width: 100%; box-sizing: border-box; background: rgba(212, 76, 71, 0.08); color: #d44c47; padding: 12px; border-radius: 6px; font-size: 11px; text-align: left; border: 1px solid rgba(212, 76, 71, 0.2); line-height: 1.4;">
                                        <div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px; font-weight: 700; font-size: 12px;">
                                            🚨 Alerta de Jurisprudência (STJ)
                                        </div>
                                        Prazo coincide com um <b>Feriado Municipal</b>. Anexe certidão ou decreto local para comprovar a tempestividade (art. 1.003, § 6º, CPC)
                                    </div>
                                `;
                            }

                            containerAlertas.innerHTML += `
                                <div style="width: 100%; text-align: center; margin-top: 16px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--primary);">
                                    🖱️ Clique aqui para abrir a auditoria dia a dia
                                </div>
                                <div style="width: 100%; text-align: center; margin-bottom: 4px; font-size: 11px; color: var(--text-muted); opacity: 0.85;">
                                    Aviso: Esta contagem é uma previsão. Confirme sempre as suspensões e feriados nos canais oficiais do tribunal.
                                </div>
                            `;
                        }

                        if(previewContainer) {
                            preencherAuditoriaVisual(timeline, previewContainer);
                        }

                        if(calcInputs) calcInputs.style.display = 'none';
                        if(divIniciais) divIniciais.style.display = 'none';
                        if(calcResultBox) calcResultBox.style.display = 'block';
                        if(divFinais) divFinais.style.display = 'flex';

                    } catch (err) {
                        console.error("Erro na Calculadora:", err);
                    } finally {
                        btnExec.innerHTML = textoOriginal;
                        btnExec.disabled = false;
                    }
                };
            }
            const efetivarSalvamento = () => {
                if (!cUf || !cUf.value.trim() || !cMun || !cMun.value.trim()) {
                    if (typeof showToast === 'function') showToast("UF e Município são obrigatórios para registar o prazo.", "⚠️");
                    
                    // Pisca a borda de vermelho para chamar a atenção
                    if (cMun && !cMun.value.trim()) {
                        const borderOriginal = cMun.style.border;
                        cMun.style.border = "1px solid #d44c47";
                        cMun.focus();
                        setTimeout(() => { cMun.style.border = borderOriginal; }, 2500);
                    }
                    if (cUf && !cUf.value.trim()) {
                        const borderOriginalUf = cUf.style.border;
                        cUf.style.border = "1px solid #d44c47";
                        setTimeout(() => { cUf.style.border = borderOriginalUf; }, 2500);
                    }
                    return; // Bloqueia o salvamento e sai da função
                }
                
                let apelidoAtual = apelidoForcado || getGlobalApelido(numeroFormatado) || i?.apelido || "";
                const txtArea = calcPanel.closest('.teor-wrapper')?.querySelector('.nota-input'); const anotacaoAtual = txtArea ? txtArea.value : (prazosSalvos[itemKey] ? prazosSalvos[itemKey].anotacao : "");
                let textoFinal = i.textoCompleto || cleanText(i.texto || i.teor) || "Prazo Adicionado Manualmente";
                const isNovoSalvamento = !(i.prazoCalculado && i.prazoCalculado.fatal) && !(i.fatal);

                const savedSigla = cTrib && cTrib.value.trim() ? cTrib.value.trim().toUpperCase() : (i.siglaTribunal || "MANUAL");

                const novoPrazoCalculado = { 
                    processo: numeroFormatado, dias: parseInt(cDias.value) || 1, mat: cMat.value, uf: cUf.value, mun: cMun.value, 
                    siglaTribunal: savedSigla,
                    pubOrig: cData.value, pub: lastResult.pub, disp: lastResult.disp, inicio: lastResult.inicio, fatal: lastResult.fatal, timeline: lastResult.timeline, textoHtml: (prazosSalvos[itemKey] && prazosSalvos[itemKey].textoHtml) ? prazosSalvos[itemKey].textoHtml : null, textoCompleto: textoFinal, apelido: apelidoAtual, anotacao: anotacaoAtual, direcao: cDir.value, feriados: lastResult.feriados, prorrogado: lastResult.prorrogado, temFeriadoMunicipal: lastResult.temFeriadoMunicipal, manual: i.manual || false, cumprido: i.cumprido || false, espera: cEspera ? cEspera.checked : false, tarefas: (prazosSalvos[itemKey] && prazosSalvos[itemKey].tarefas) ? prazosSalvos[itemKey].tarefas : [] 
                };

                // Atualiza o item original se for card manual para a sigla refletir visualmente
                if (i.manual) i.siglaTribunal = savedSigla;

                if (isBuscaContext) { i.prazoCalculado = novoPrazoCalculado; prazosSalvos[itemKey] = i.prazoCalculado; } else { prazosSalvos[itemKey] = novoPrazoCalculado; Object.assign(i, novoPrazoCalculado); }
                savePrazosSalvos(); setGlobalApelido(numeroFormatado, apelidoAtual);

                const cardTarget = calcPanel.closest('.intimacao-card');
                if (cardTarget) {
                    const btnCalcTarget = cardTarget.querySelector('.btn-recalc'); if (btnCalcTarget) { btnCalcTarget.className = "btn-acao-square h-green btn-recalc tooltip-right"; btnCalcTarget.setAttribute('aria-label', 'Prazo Salvo (Recalcular)'); btnCalcTarget.setAttribute('data-tooltip', 'Prazo Salvo (Recalcular)'); }
                    const header = cardTarget.querySelector('.card-top-info');
                    if (header) {
                        const dataFatal = parseDateBR(lastResult.fatal); const hj = new Date(); hj.setHours(12, 0, 0, 0); const diffDias = Math.ceil((dataFatal.getTime() - hj.getTime()) / (1000 * 3600 * 24));
                        let corSeloClass = diffDias <= 5 ? "s-orange" : "s-green"; if(diffDias < 0) corSeloClass = "s-red";
                        let iconStr = lastResult.direcao === 'retroativo' ? iconesSVG.retro + ' ' : ''; let badgeSalvo = header.querySelector('.badge-salvo');
                        let txtStatus = `SALVO (${lastResult.fatal})`; if (!isBuscaContext) { if (diffDias < 0) txtStatus = `ATRASADO (${lastResult.fatal})`; else if (diffDias === 0) txtStatus = `VENCE HOJE (${lastResult.fatal})`; else if (diffDias === 1) txtStatus = `VENCE AMANHÃ (${lastResult.fatal})`; else txtStatus = `FALTAM ${diffDias} DIAS (${lastResult.fatal})`; } txtStatus = iconStr + txtStatus;
                        if (!badgeSalvo) { badgeSalvo = document.createElement('span'); badgeSalvo.className = 'badge-salvo ' + corSeloClass; header.prepend(badgeSalvo); } else { badgeSalvo.className = 'badge-salvo ' + corSeloClass; header.prepend(badgeSalvo); } badgeSalvo.innerHTML = txtStatus;
                    }
                    const btnRemoverTarget = cardTarget.querySelector('.btn-remover-busca'); if (btnRemoverTarget) btnRemoverTarget.style.display = 'flex';
                }
                
                ; if(isNovoSalvamento) { totalSalvos++; SafeStorage.set({'djen_total_salvos': totalSalvos}); } atualizarEstatisticas(); if(isBuscaContext) updateProgressBar();
                if(divFinais) divFinais.style.display = 'none'; if(divPosSalvo) { divPosSalvo.style.display = 'flex'; const bsg = calcPanel.querySelector('.btn-salvar-gcal-pos'); if(bsg) { bsg.innerHTML = "📅 Exportar para Google Agenda"; bsg.classList.remove('c-blue'); bsg.classList.add('c-green'); } }
                setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 80);
            };

        // --- INÍCIO DO BLOCO DE REGISTO E AVULSA ---
            // Captura os elementos do novo Formulário Avulso
            const formAvulsa = calcPanel.querySelector('.form-identificacao-avulsa');
            const btnSalvarAvulsa = calcPanel.querySelector('.btn-salvar-avulsa');
            const btnCancelarAvulsa = calcPanel.querySelector('.btn-cancelar-avulsa');
            const inputProcAvulsa = calcPanel.querySelector('.calc-avulsa-proc');
            const inputApelidoAvulsa = calcPanel.querySelector('.calc-avulsa-apelido');

            // MUDANÇA CRUCIAL: Agora ele sabe que é a Avulsa pela chave única!
            const isCalculadoraAvulsa = String(itemKey).startsWith('avulsa_');

            if (btnSalvar) {
                btnSalvar.onclick = (e) => {
                    e.stopPropagation();
                    if (isCalculadoraAvulsa) {
                        // Esconde os botões finais normais e abre o formulário de identificação
                        if (divFinais) divFinais.style.display = 'none';
                        if (formAvulsa) {
                            formAvulsa.style.display = 'block';
                            setTimeout(() => calcPanel.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
                        }
                    } else {
                        // Salva normalmente se for um card existente
                        efetivarSalvamento();
                    }
                };
            }

            // --- INÍCIO DO ESCUDO DE BOTÕES (Calculadora Avulsa) ---
            if (String(itemKey).startsWith('avulsa_')) {
                const formAvulsa = calcPanel.querySelector('.form-identificacao-avulsa');
                const inputProcAvulsa = calcPanel.querySelector('.calc-avulsa-proc');
                const inputApelidoAvulsa = calcPanel.querySelector('.calc-avulsa-apelido');

                // Função ninja que "sequestra" o clique antes do código original agir
                const blindarBotao = (seletor, acao) => {
                    const btn = calcPanel.querySelector(seletor);
                    if (btn) {
                        btn.addEventListener('click', (e) => {
                            e.stopImmediatePropagation();
                            e.preventDefault();
                            acao(e, btn);
                        }, true); // 'true' = Fase de Captura (prioridade máxima)
                    }
                };

                // 1. Blindar botão EDITAR
                blindarBotao('.btn-voltar-calc', () => {
                    isCalculated = false;
                    if(previewContainer) previewContainer.style.display = 'none'; 
                    if(calcResultBox) calcResultBox.style.display = 'none'; 
                    if(calcInputs) calcInputs.style.display = 'flex'; 
                    if(divIniciais) divIniciais.style.display = 'flex'; 
                    if(divFinais) divFinais.style.display = 'none'; 
                    if(divPosSalvo) divPosSalvo.style.display = 'none'; 
                    if(formAvulsa) formAvulsa.style.display = 'none';
                    if (typeof verificarBotaoCalcular === 'function') verificarBotaoCalcular();
                });

                // 2. Blindar botão REGISTAR (Bloqueia o salvamento fantasma)
                blindarBotao('.btn-salvar', () => {
                    if (divFinais) divFinais.style.display = 'none';
                    if (formAvulsa) {
                        formAvulsa.style.display = 'block';
                        setTimeout(() => calcPanel.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
                    }
                });

                // 3. Blindar botão de FECHAR E CONTINUAR (Reseta a aba)
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

               
                // 5. Funções Internas do Formulário Avulso
                if (formAvulsa) {
                    blindarBotao('.btn-cancelar-avulsa', () => {
                        formAvulsa.style.display = 'none';
                        if (divFinais) divFinais.style.display = 'flex';
                    });

                    blindarBotao('.btn-salvar-avulsa', () => {
                        const valProc = inputProcAvulsa.value.trim();
                        const valApelido = inputApelidoAvulsa.value.trim();

                        if (!valProc && !valApelido) {
                            if (typeof showToast === 'function') showToast("Preencha o Processo ou o Apelido", "⚠️");
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
                            pubOrig: (calcPanel.querySelector('.c-data') ? calcPanel.querySelector('.c-data').value : '') + 'T12:00:00.000Z',
                            dataPubStr: (calcPanel.querySelector('.c-data') ? calcPanel.querySelector('.c-data').value.split('-').reverse().join('/') : ''),
                            manual: true,
                            teor: "Prazo inserido manualmente através da Calculadora Avulsa.",
                            anotacao: "",
                            isCumprido: false,
                            lembreteNotif: false,
                            espera: calcPanel.querySelector('.c-espera') ? calcPanel.querySelector('.c-espera').checked : false,
                            createdAt: new Date().toISOString()
                        };

                        if (typeof prazosSalvos !== 'undefined') prazosSalvos[novaChave] = novoPrazo;
                        if (typeof salvarPrazosLocalStorage === 'function') salvarPrazosLocalStorage();
                        if (typeof renderListaSalvos === 'function') renderListaSalvos();

                        formAvulsa.style.display = 'none';
                        if (divPosSalvo) divPosSalvo.style.display = 'flex';
                    });

                    // Máscara CNJ visual
                    if (inputProcAvulsa) {
                        inputProcAvulsa.addEventListener('input', (e) => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 20) v = v.substring(0, 20);
                            if (v.length > 16) v = v.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4}).*/, "$1-$2.$3.$4.$5.$6");
                            else if (v.length > 13) v = v.replace(/^(\d{7})(\d{2})(\d{4})/, "$1-$2.$3.");
                            else if (v.length > 9) v = v.replace(/^(\d{7})(\d{2})/, "$1-$2.");
                            else if (v.length > 7) v = v.replace(/^(\d{7})/, "$1-");
                            e.target.value = v;
                        });
                    }
                }
            }
            // --- FIM DO ESCUDO DE BOTÕES ---
            // --- FIM DO BLOCO DE REGISTO E AVULSA ---
            if (btnSalvarGcalPos) { 
                btnSalvarGcalPos.onclick = (e) => { 
                    e.stopPropagation(); 
                    const txtArea = calcPanel.closest('.teor-wrapper')?.querySelector('.nota-input'); 
                    
                    // A MÁGICA AQUI: Funciona tanto na aba Busca quanto na aba Prazos
                    const prazoParaAgenda = i.prazoCalculado || i; 
                    
                    if(prazoParaAgenda && txtArea) prazoParaAgenda.anotacao = txtArea.value; 
                    window.open(gerarLinkGCal(prazoParaAgenda), '_blank'); 
                    
                    if(btnSalvarGcalPos) { 
                        btnSalvarGcalPos.innerHTML = "✅ Exportado!"; 
                        btnSalvarGcalPos.classList.remove('c-blue'); 
                        btnSalvarGcalPos.classList.add('c-green'); 
                    } 
                }; 
            }
            if (btnFecharCalc) { btnFecharCalc.onclick = (e) => { e.stopPropagation(); if(toggleCardCallback) toggleCardCallback(); if (!isBuscaContext) { setTimeout(() => { renderAgenda(); renderCalendar(); }, 350); } }; }

            return calcPanel;
        } catch(e) { 
            console.error("DJEN: Erro fatal ao montar a calculadora", e);
            return document.createElement('div'); 
        }
    }

    // --- HIGHLIGHTER AUTOMÁTICO DO RADAR ---
    function aplicarHighlighterRadar(texto) {
        if (!texto) return "";
        let textoDestacado = texto;
        
        const palavrasOrdenadas = [...palavrasUrgentes].sort((a, b) => b.length - a.length);
        
        palavrasOrdenadas.forEach(palavra => {
            if (palavra.length < 3) return; 
            const regex = new RegExp(`\\b(${palavra.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})\\b`, 'gi');
            textoDestacado = textoDestacado.replace(regex, '<mark class="marca-texto radar-auto" data-tooltip="Detectado pelo Radar Automático">$&</mark>');
        });
        
        return textoDestacado;
    }

    function render(items, term) {
        const res = document.getElementById('resultados'); if(!res) return; res.innerHTML = ""; const abl = document.getElementById('acoesBuscaLote'); if(abl) abl.style.display = items.length ? 'flex' : 'none';
        if (!items.length) { res.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center;"><div style="font-size: 32px; margin-bottom: 16px;">☕</div><div style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Tudo tranquilo por aqui!</div><div style="font-size: 13px; color: var(--text-muted); max-width: 280px; line-height: 1.5;">Não encontramos novos prazos ou publicações com estes filtros. Aproveite para focar no que importa.</div></div>`; return; }
        
       
        const fragment = document.createDocumentFragment();
        let totalRadarEncontrado = 0;

        items.forEach(i => {
            const txt = cleanText(i.texto || i.teor); 
            const proc = formatCNJ(getProc(i, txt)); 
            const dataProc = new Date(i.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR'); 
            const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, ''); 
            
            // Lógica limpa para contar se a publicação caiu no radar
            const textoBuscaLow = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const caiuNoRadar = palavrasUrgentes.some(p => textoBuscaLow.includes(p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
            if (caiuNoRadar) totalRadarEncontrado++;

            if (prazosSalvos[itemKey]) i.prazoCalculado = prazosSalvos[itemKey];

            const card = document.createElement("div"); card.className = "intimacao-card"; card.setAttribute('data-key', itemKey); card.setAttribute('data-proc', proc);
            if (publicacoesLidas.has(itemKey)) card.classList.add('lido');
            
            let seloSalvo = ''; const isSalvo = i.prazoCalculado && i.prazoCalculado.fatal;
            if (isSalvo) { const hj = new Date(); hj.setHours(12, 0, 0, 0); const dataFatal = parseDateBR(i.prazoCalculado.fatal); const diff = Math.ceil((dataFatal - hj) / (1000 * 3600 * 24)); let corSeloClass = diff <= 5 ? "s-orange" : "s-green"; if(diff < 0) corSeloClass = "s-red"; if(i.prazoCalculado.cumprido) corSeloClass = "s-gray"; let txtStatus = i.prazoCalculado.cumprido ? `CUMPRIDO` : (i.prazoCalculado.direcao === 'retroativo' ? `RETROATIVO` : `SALVO`); seloSalvo = `<span class="badge-salvo ${corSeloClass}">${txtStatus}</span>`; }

            const apelidoSalvo = getGlobalApelido(proc); const notaBuscaSalva = i.prazoCalculado?.anotacao || prazosSalvos[itemKey]?.anotacao || "";
            const tituloDinamicoHTML = getHeaderHTML(proc, apelidoSalvo, notaBuscaSalva, txt); const lidoTag = publicacoesLidas.has(itemKey) ? `<span class="badge-lido">LIDO</span>` : '';

            const header = document.createElement("div"); 
            header.innerHTML = `
                <div class="card-click-area" tabindex="0" aria-expanded="false" aria-label="Expandir Processo ${proc}">
                    <div class="card-top-info">
                        ${seloSalvo}
                        ${(i.prazoCalculado && i.prazoCalculado.espera) ? `<span style="cursor:help; font-size:14px; margin-left:-2px; margin-right:6px;" class="tooltip-bottom" data-tooltip="Aguardando Parte/Juízo">⏳</span>` : ''}
                        ${(searchMode === 'oab' && i.oabBuscada) ? `<span class="badge-oab">OAB ${i.oabBuscada}</span>` : ''}
                        <span class="badge-trib">${i.siglaTribunal || 'TJ'}</span> • <span>${dataProc}</span> ${lidoTag}
                    </div>
                    ${tituloDinamicoHTML}
                </div>
            `;

            const teorWrapper = document.createElement("div"); teorWrapper.className = "teor-wrapper"; const teorInnerOverflow = document.createElement("div"); teorInnerOverflow.className = "teor-inner-overflow"; 
            const teorBoxContainer = document.createElement("div"); teorBoxContainer.className = "teor-box-container";
            const teorInnerBox = document.createElement("div"); teorInnerBox.className = "teor-inner-box"; 
            const fadeOverlay = document.createElement("div"); fadeOverlay.className = "teor-fade-overlay";

            const conteudoExibicao = (i.prazoCalculado && i.prazoCalculado.textoHtml) ? i.prazoCalculado.textoHtml : aplicarHighlighterRadar(txt);
            if (term && !i.prazoCalculado?.textoHtml) { const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'); const parts = txt.split(regex); parts.forEach(p => { if (p.toLowerCase() === term.toLowerCase()) { const m = document.createElement('span'); m.className = 'highlight-term'; m.textContent = p; teorInnerBox.appendChild(m); } else { teorInnerBox.appendChild(document.createTextNode(p)); } }); } else { teorInnerBox.innerHTML = conteudoExibicao; }
            
            teorBoxContainer.appendChild(teorInnerBox); teorBoxContainer.appendChild(fadeOverlay);
            const btnFocoMini = document.createElement("button"); btnFocoMini.className = "btn-foco-mini tooltip-left"; btnFocoMini.setAttribute('data-tooltip', 'Abrir no Modo Foco'); btnFocoMini.innerHTML = iconesSVG.foco; teorBoxContainer.appendChild(btnFocoMini);
            
            const txtAreaBusca = document.createElement("textarea"); txtAreaBusca.className = "nota-input"; txtAreaBusca.placeholder = "Notas do caso (use # para tags)..."; txtAreaBusca.value = notaBuscaSalva; txtAreaBusca.setAttribute('aria-label', 'Anotações do Processo');
            txtAreaBusca.onclick = e => e.stopPropagation(); txtAreaBusca.onkeydown = e => { e.stopPropagation(); };
            txtAreaBusca.oninput = e => { header.querySelector('.proc-header').innerHTML = getHeaderHTML(proc, getGlobalApelido(proc), e.target.value, txt); };
            
            const markAsRead = () => { 
    if (!publicacoesLidas.has(itemKey)) { 
        publicacoesLidas.add(itemKey); 
        salvarPublicacoesLidas(); 
        card.classList.add('lido'); 
        const headerInfo = card.querySelector('.card-top-info'); 
        if(headerInfo && !headerInfo.querySelector('.badge-lido')) { 
            const seloSalvoEl = headerInfo.querySelector('.badge-salvo'); 
            const spanLido = document.createElement('span'); 
            spanLido.className = 'badge-lido'; spanLido.textContent = 'LIDO'; 
            if(seloSalvoEl) { headerInfo.insertBefore(spanLido, seloSalvoEl); } else { headerInfo.appendChild(spanLido); } 
        } 
        totalLidos++; SafeStorage.set({'djen_total_lidos': totalLidos}); updateProgressBar(); 
    } 
};
            
            txtAreaBusca.oninput = debounce(e => { 
    if (typeof i !== 'undefined') { i.anotacao = e.target.value; } 
    else if (prazosSalvos[itemKey]) { prazosSalvos[itemKey].anotacao = e.target.value; }
    savePrazosSalvos(); 
}, 500);

txtAreaBusca.addEventListener('input', function() {
    this.style.height = 'auto'; 
    this.style.height = (this.scrollHeight) + 'px'; 
});

// Ajusta a altura automaticamente assim que o cartão é carregado na tela, 
// caso já exista uma anotação grande salva.
if (txtAreaBusca.value.trim() !== '') {
    setTimeout(() => {
        txtAreaBusca.style.height = 'auto';
        txtAreaBusca.style.height = (txtAreaBusca.scrollHeight) + 'px';
    }, 50);
}

// Salva automaticamente 500ms após você parar de digitar
            const todoBox = criarTodoContainer(itemKey, proc, txt, markAsRead);
            const acoesPills = document.createElement("div"); acoesPills.className = "card-acoes-pills"; 
            
            const btnCalc = document.createElement("button"); btnCalc.className = `btn-acao-square btn-recalc tooltip-right ${(i.prazoCalculado && i.prazoCalculado.fatal) ? 'h-green' : 'h-orange'}`; btnCalc.setAttribute('aria-label', (i.prazoCalculado && i.prazoCalculado.fatal) ? 'Prazo Salvo (Recalcular)' : 'Calcular Prazo'); btnCalc.setAttribute('data-tooltip', (i.prazoCalculado && i.prazoCalculado.fatal) ? 'Prazo Salvo (Recalcular)' : 'Calcular Prazo'); btnCalc.innerHTML = iconesSVG.calendario; 
            const btnTag = document.createElement("button"); btnTag.className = "btn-acao-square h-blue btn-tag tooltip-right"; btnTag.setAttribute('aria-label', 'Extrair Tag'); btnTag.setAttribute('data-tooltip', 'Criar #Tag (Selecione o texto)'); btnTag.innerHTML = iconesSVG.tag;
            const btnCopiar = document.createElement("button"); btnCopiar.className = "btn-acao-square h-blue btn-copy tooltip-right"; btnCopiar.setAttribute('aria-label', 'Copiar com notas'); btnCopiar.setAttribute('data-tooltip', 'Copiar'); btnCopiar.innerHTML = iconesSVG.copiar;

           const btnShare = document.createElement("button"); 
            btnShare.className = "btn-acao-square h-blue btn-share-ind tooltip-right"; 
            btnShare.setAttribute('aria-label', 'Compartilhar'); 
            btnShare.setAttribute('data-tooltip', 'Compartilhar'); 
            btnShare.innerHTML = iconesSVG.share;

            btnShare.onclick = (e) => { 
                e.stopPropagation(); 
                markAsRead(); 
                if(i.prazoCalculado) i.prazoCalculado.anotacao = txtAreaBusca.value; 
                tituloParaCompartilhar = "Processo " + proc; 
                const mockItem = i.prazoCalculado || { processo: proc, textoCompleto: txt, anotacao: txtAreaBusca.value, siglaTribunal: i.siglaTribunal }; 
                textoParaCompartilhar = gerarTextoCompartilhamento([mockItem], "Aviso de Publicação"); 
                abrirModalCompartilhar('ind'); 
            };
           
            const rightActionsBusca = document.createElement("div"); rightActionsBusca.style.display = "flex"; rightActionsBusca.style.alignItems = "center"; rightActionsBusca.style.gap = "8px"; rightActionsBusca.style.marginLeft = "auto"; 
            
            const menuContainerBusca = document.createElement("div"); 
            menuContainerBusca.className = "card-menu-container"; 
            menuContainerBusca.innerHTML = `<button class="btn-acao-square h-blue btn-opcoes-card tooltip-left" aria-label="Mais Opções" data-tooltip="Mais Opções">${iconesSVG.maisOpcoes}</button><div class="card-dropdown"><button class="btn-editar-apelido" aria-label="Editar Apelido">${iconesSVG.lapis} Editar Apelido</button><hr><button class="btn-marcar-naolido" aria-label="Marcar como Não Lido">${iconesSVG.eyeOff} Marcar como Não Lido</button><button class="btn-remover-prazo" style="color: var(--zen-orange); display: ${isSalvo ? 'flex' : 'none'};" aria-label="Limpar Contagem">${iconesSVG.remover} Limpar Contagem</button></div>`;
            
            rightActionsBusca.appendChild(menuContainerBusca); 
            acoesPills.append(btnCalc, btnTag, btnCopiar, btnShare, rightActionsBusca);

            const clickArea = header.querySelector('.card-click-area'); let openTimer;
            const toggleCard = () => { const isOpening = !card.classList.contains('aberto'); if (isOpening) { document.querySelectorAll('.intimacao-card.aberto').forEach(c => { if (c !== card) { c.classList.remove('aberto'); c.querySelector('.card-click-area').setAttribute('aria-expanded', 'false'); } }); } card.classList.toggle('aberto'); clickArea.setAttribute('aria-expanded', isOpening); if (isOpening) { setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); openTimer = setTimeout(() => { markAsRead(); }, 13000); } else { clearTimeout(openTimer); } };
            clickArea.onclick = (e) => { if (e.target.closest('.hint-apelido')) { e.stopPropagation(); abrirModalApelido(proc, apelidoSalvo, (novoApelido) => { setGlobalApelido(proc, novoApelido.trim(), itemKey); applyFilters(); }); return; } toggleCard(); }; clickArea.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); toggleCard(); } };
            btnTag.onclick = (e) => { e.stopPropagation(); markAsRead(); handleCriarTag(txtAreaBusca); }; btnCopiar.onclick = (e) => { e.stopPropagation(); markAsRead(); if(i.prazoCalculado) i.prazoCalculado.anotacao = txtAreaBusca.value; const mockItem = i.prazoCalculado || { processo: proc, textoCompleto: txt, anotacao: txtAreaBusca.value, siglaTribunal: i.siglaTribunal }; const copyText = gerarTextoCompartilhamento([mockItem], "Cópia do DJEN"); navigator.clipboard.writeText(copyText).then(() => showToast("Copiado com sucesso!", "📎")); }; 
            
            btnFocoMini.onclick = (e) => { 
                e.stopPropagation(); markAsRead(); const ov = document.getElementById('focusModeOverlay'); if(ov) { ov.setAttribute('data-active-key', itemKey); document.getElementById('focusTribunal').textContent = i.siglaTribunal || "TRIBUNAL"; document.getElementById('focusProcesso').textContent = proc; document.getElementById('focusApelido').innerHTML = getHeaderHTML(proc, apelidoSalvo, txtAreaBusca.value, txt); const savedHtml = prazosSalvos[itemKey] && prazosSalvos[itemKey].textoHtml; if(savedHtml) { document.getElementById('focusTeorContent').innerHTML = savedHtml; } else { document.getElementById('focusTeorContent').innerHTML = aplicarHighlighterRadar(txt);}; if(savedHtml) { document.getElementById('focusTeorContent').innerHTML = savedHtml; } else { document.getElementById('focusTeorContent').textContent = txt; } ov.classList.add('show'); }
            };

            const prazoSugerido = extrairPrazoSugerido(txt); const calcPanel = montarCalculadoraForm(i, btnCalc, itemKey, i.data_disponibilizacao, proc, prazoSugerido, true, null, toggleCard);
            if(btnCalc) { btnCalc.onclick = (e) => { e.stopPropagation(); markAsRead(); calcPanel.classList.toggle('ativa'); setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150); }; }

            teorInnerOverflow.append(teorBoxContainer, txtAreaBusca, todoBox, acoesPills, calcPanel); teorWrapper.appendChild(teorInnerOverflow); card.append(header, teorWrapper); fragment.appendChild(card);
        });

        res.appendChild(fragment);
        if (totalRadarEncontrado > 0) {
            setTimeout(() => {
                showToast(`Radar detectou termos em ${totalRadarEncontrado} publicação(ões)!`, "🏷️");
            }, 500); // Pequeno delay para aparecer depois do loading
        }
    }

    function appendCardsToList(chaves, listElement, openKey, emptyMessage) {
        listElement.innerHTML = "";
        if(chaves.length === 0) { 
         const zenIcon = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border-light)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        listElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px 20px; text-align: center; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border-light);">
                ${zenIcon}
                <div style="font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; letter-spacing: -0.3px;">${emptyMessage || "Tudo sob controle"}</div>
                <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px; max-width: 250px; line-height: 1.5;">Você não possui pendências nesta visualização. Respire fundo e foque no que importa.</div>
                <button id="btnEmptyStateNovo" class="btn-pill c-blue" style="font-weight: 600; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Novo Prazo Manual</button>
            </div>`;
            
            setTimeout(() => {
                const btnNovo = document.getElementById('btnEmptyStateNovo');
                if(btnNovo) btnNovo.onclick = () => document.getElementById('btnNovoPrazoManual')?.click();
            }, 100);
            return; 
        }

        const fragment = document.createDocumentFragment();

        chaves.forEach(key => {
            const item = prazosSalvos[key]; const card = document.createElement('div'); card.className = "intimacao-card compact"; 
            if(item.cumprido) card.classList.add('is-cumprido'); 
            if(item.planoEspera) card.classList.add('is-espera'); // NOVO ESTADO
            card.setAttribute('data-key', key); card.setAttribute('data-proc', item.processo);
            if (key === openKey) card.classList.add('aberto');

            const hoje = new Date(); hoje.setHours(12, 0, 0, 0); let corSeloClass = "s-gray"; let iconStr = ''; let txtStatus = "SEM PRAZO";
            if (item.fatal) {
                const dataFatal = parseDateBR(item.fatal); const diffDias = Math.ceil((dataFatal - hoje) / (1000 * 3600 * 24)); iconStr = item.direcao === 'retroativo' ? iconesSVG.retro + ' ' : '';
            if (item.cumprido) { corSeloClass = "s-gray"; txtStatus = `✅ Cumprido • <strong>${item.fatal}</strong>`; } else if (diffDias < 0) { corSeloClass = "s-red"; txtStatus = `${iconStr}Vencido • <strong>${item.fatal}</strong>`; } else if (diffDias === 0) { corSeloClass = "s-red"; txtStatus = `${iconStr}Vence HOJE • <strong>${item.fatal}</strong>`; } else if (diffDias === 1) { corSeloClass = "s-orange"; txtStatus = `${iconStr}Vence amanhã • <strong>${item.fatal}</strong>`; } else { corSeloClass = diffDias <= 5 ? "s-orange" : "s-green"; txtStatus = `${iconStr}Faltam ${diffDias} dias • <strong>${item.fatal}</strong>`; }
            } else { corSeloClass = "s-orange"; txtStatus = `⚠️ CALCULAR PRAZO`; }

            const apelidoSalvo = getGlobalApelido(item.processo); const anotacaoSalva = item.anotacao || ""; const tituloDinamicoHTML = getHeaderHTML(item.processo, apelidoSalvo, anotacaoSalva, item.textoCompleto);
            const trib = item.siglaTribunal || (item.uf ? 'TJ' + item.uf : 'MANUAL'); const dispDate = item.disp || item.pubOrig || (item.data_disponibilizacao ? item.data_disponibilizacao.split('-').reverse().join('/') : '--/--/----');

            const header = document.createElement("div"); 
            header.innerHTML = `
                <div class="card-click-area" tabindex="0" aria-expanded="false" aria-label="Expandir Processo ${item.processo}">
                    <div class="card-top-info">
                        <span class="badge-salvo ${corSeloClass}">${txtStatus}</span>
                        ${item.espera ? `<span style="cursor:help; font-size:14px; margin-left:-4px; margin-right:4px;" class="tooltip-bottom" data-tooltip="Aguardando Parte/Juízo">⏳</span>` : ''}
                        <span class="badge-trib">${trib}</span> • <span>${dispDate}</span>
                    </div>
                    ${tituloDinamicoHTML}
                </div>
            `;

            const teorWrapper = document.createElement("div"); teorWrapper.className = "teor-wrapper"; const teorInnerOverflow = document.createElement("div"); teorInnerOverflow.className = "teor-inner-overflow";
            
            const btnToggleTeor = document.createElement("button"); btnToggleTeor.className = "btn-toggle-teor"; btnToggleTeor.innerHTML = `📄 Ler Teor Completo`;
            const teorBoxContainer = document.createElement("div"); teorBoxContainer.className = "teor-box-container"; teorBoxContainer.style.display = 'none'; 

            const teorInnerBox = document.createElement("div"); teorInnerBox.className = "teor-inner-box"; const fadeOverlay = document.createElement("div"); fadeOverlay.className = "teor-fade-overlay";
if(item.textoHtml) { teorInnerBox.innerHTML = item.textoHtml; } else { teorInnerBox.innerHTML = aplicarHighlighterRadar(item.textoCompleto); }            
            teorBoxContainer.appendChild(teorInnerBox); teorBoxContainer.appendChild(fadeOverlay);
            btnToggleTeor.onclick = (e) => { e.stopPropagation(); if(teorBoxContainer.style.display === 'none') { teorBoxContainer.style.display = 'block'; btnToggleTeor.innerHTML = `📄 Ocultar Teor`; } else { teorBoxContainer.style.display = 'none'; btnToggleTeor.innerHTML = `📄 Ler Teor Completo`; } };

            const btnFocoMini = document.createElement("button"); btnFocoMini.className = "btn-foco-mini tooltip-left"; btnFocoMini.setAttribute('data-tooltip', 'Abrir no Modo Foco'); btnFocoMini.innerHTML = iconesSVG.foco; teorBoxContainer.appendChild(btnFocoMini);
            
            const txtAreaBusca = document.createElement("textarea"); txtAreaBusca.className = "nota-input"; txtAreaBusca.placeholder = "Adicionar notas ou observações do caso (use # para tags)..."; txtAreaBusca.value = anotacaoSalva; txtAreaBusca.setAttribute('aria-label', 'Anotações do Processo');
            txtAreaBusca.onclick = e => e.stopPropagation(); txtAreaBusca.onkeydown = e => { e.stopPropagation(); };
            txtAreaBusca.oninput = e => { header.querySelector('.proc-header').innerHTML = getHeaderHTML(item.processo, getGlobalApelido(item.processo), e.target.value, item.textoCompleto); };
            txtAreaBusca.onchange = e => { item.anotacao = e.target.value; savePrazosSalvos(); };

            const todoBox = criarTodoContainer(key, item.processo, item.textoCompleto, null);

            const acoesPills = document.createElement("div"); acoesPills.className = "card-acoes-pills"; 
            const btnCalc = document.createElement("button"); btnCalc.className = `btn-acao-square btn-recalc tooltip-right ${item.fatal ? 'h-green' : 'h-orange'}`; btnCalc.setAttribute('aria-label', item.fatal ? 'Prazo Salvo (Recalcular)' : 'Calcular Prazo'); btnCalc.setAttribute('data-tooltip', item.fatal ? 'Prazo Salvo (Recalcular)' : 'Calcular Prazo'); btnCalc.innerHTML = iconesSVG.calendario; 
            const btnTag = document.createElement("button"); btnTag.className = "btn-acao-square h-blue btn-tag tooltip-right"; btnTag.setAttribute('aria-label', 'Extrair Tag'); btnTag.setAttribute('data-tooltip', 'Criar #Tag (Selecione o texto)'); btnTag.innerHTML = iconesSVG.tag;
            const btnCopiar = document.createElement("button"); btnCopiar.className = "btn-acao-square h-blue btn-copy tooltip-right"; btnCopiar.setAttribute('aria-label', 'Copiar com notas'); btnCopiar.setAttribute('data-tooltip', 'Copiar'); btnCopiar.innerHTML = iconesSVG.copiar;

            const btnShare = document.createElement("button"); 
            btnShare.className = "btn-acao-square h-blue btn-share-ind tooltip-right"; 
            btnShare.setAttribute('aria-label', 'Compartilhar'); 
            btnShare.setAttribute('data-tooltip', 'Compartilhar'); 
            btnShare.innerHTML = iconesSVG.share;

            btnShare.onclick = (e) => { 
                e.stopPropagation(); 
                item.anotacao = txtAreaBusca.value; 
                tituloParaCompartilhar = "Processo " + item.processo; 
                textoParaCompartilhar = gerarTextoCompartilhamento([item], "Aviso de Prazo"); 
                abrirModalCompartilhar('ind'); 
            };

            const rightActionsSalvos = document.createElement("div"); rightActionsSalvos.style.display = "flex"; rightActionsSalvos.style.alignItems = "center"; rightActionsSalvos.style.gap = "8px"; rightActionsSalvos.style.marginLeft = "auto";            
            
                       const btnCumprir = document.createElement("button");
            if (item.cumprido) { btnCumprir.className = "btn-cumprir-quadrado is-cumprido tooltip-left"; btnCumprir.innerHTML = iconesSVG.retro; btnCumprir.setAttribute('aria-label', 'Reabrir Prazo'); btnCumprir.setAttribute('data-tooltip', 'Reabrir Prazo'); } 
            else { btnCumprir.className = "btn-cumprir-quadrado tooltip-left"; btnCumprir.innerHTML = iconesSVG.check; btnCumprir.setAttribute('aria-label', 'Marcar como Cumprido'); btnCumprir.setAttribute('data-tooltip', 'Marcar como Cumprido (+10 XP)'); }

            // LÓGICA DO MENU INTELIGENTE
            let htmlRemover = '';
            if (item.manual) {
                if (item.fatal) {
                    // Tem prazo calculado: Mostra as DUAS opções (ícones diferentes para não confundir)
                    htmlRemover = `<button class="btn-remover-prazo" style="color: var(--zen-orange);">${iconesSVG.retro} Excluir Prazo</button>
                                   <button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Excluir Card</button>`;
                } else {
                    // Não tem prazo: Mostra SÓ a opção de excluir o card
                    htmlRemover = `<button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Excluir Card</button>`;
                }
            } else {
                htmlRemover = `<button class="btn-remover-card" style="color: var(--zen-red);">${iconesSVG.remover} Excluir Prazo Salvo</button>`;
            }

            const menuContainerSalvos = document.createElement("div"); 
            menuContainerSalvos.className = "card-menu-container"; 
            menuContainerSalvos.innerHTML = `<button class="btn-acao-square h-blue btn-opcoes-card tooltip-left" aria-label="Mais Opções" data-tooltip="Mais Opções">${iconesSVG.maisOpcoes}</button><div class="card-dropdown"><button class="btn-editar-apelido" aria-label="Editar Apelido">${iconesSVG.lapis} Editar Apelido</button><hr>${htmlRemover}</div>`;

            rightActionsSalvos.append(btnCumprir, menuContainerSalvos);
            acoesPills.append(btnCalc, btnTag, btnCopiar, btnShare, rightActionsSalvos);

            const clickArea = header.querySelector('.card-click-area');
            const toggleCard = () => { const isOpening = !card.classList.contains('aberto'); if (isOpening) { document.querySelectorAll('.intimacao-card.aberto').forEach(c => { if (c !== card) { c.classList.remove('aberto'); c.querySelector('.card-click-area').setAttribute('aria-expanded', 'false'); } }); } card.classList.toggle('aberto'); clickArea.setAttribute('aria-expanded', isOpening); if(isOpening) { setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150); } else { if (document.getElementById('viewSalvos')?.style.display !== 'none') setTimeout(renderAgenda, 350); if (document.getElementById('viewCalendario')?.style.display !== 'none') setTimeout(renderCalendar, 250); } };
            clickArea.onclick = (e) => { if (e.target.closest('.hint-apelido')) { e.stopPropagation(); abrirModalApelido(item.processo, apelidoSalvo, (novoApelido) => { setGlobalApelido(item.processo, novoApelido.trim(), key); renderAgenda(); renderCalendar(); }); return; } toggleCard(); }; clickArea.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); toggleCard(); } };
            btnCumprir.onclick = (e) => { e.stopPropagation(); alternarCumprimento(key, card, false); };
            btnTag.onclick = (e) => { e.stopPropagation(); handleCriarTag(txtAreaBusca); }; btnCopiar.onclick = (e) => { e.stopPropagation(); if(item.prazoCalculado) item.prazoCalculado.anotacao = txtAreaBusca.value; const copyText = gerarTextoCompartilhamento([item], "Cópia do DJEN"); navigator.clipboard.writeText(copyText).then(() => showToast("Copiado com sucesso!", "📎")); }; 
            btnFocoMini.onclick = (e) => { 
                e.stopPropagation(); const ov = document.getElementById('focusModeOverlay'); if(ov) { ov.setAttribute('data-active-key', key); document.getElementById('focusTribunal').textContent = item.mat ? `${item.uf} • ${item.mun}` : (item.siglaTribunal || "PRAZO MANUAL"); document.getElementById('focusProcesso').textContent = item.processo; document.getElementById('focusApelido').innerHTML = getHeaderHTML(item.processo, apelidoSalvo, txtAreaBusca.value, item.textoCompleto); if(item.textoHtml) { document.getElementById('focusTeorContent').innerHTML = item.textoHtml; } else { document.getElementById('focusTeorContent').innerHTML = aplicarHighlighterRadar(item.textoCompleto); } ov.classList.add('show'); }
            };

            const calcPanel = montarCalculadoraForm(item, btnCalc, key, item.pubOrig || item.pub || new Date().toISOString().split('T')[0], item.processo, item.dias, false, null, toggleCard);
            if(btnCalc) { btnCalc.onclick = (e) => { e.stopPropagation(); calcPanel.classList.toggle('ativa'); setTimeout(() => { calcPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 150); }; }

            teorInnerOverflow.append(btnToggleTeor, teorBoxContainer, txtAreaBusca, todoBox, acoesPills, calcPanel); 
            teorWrapper.appendChild(teorInnerOverflow); 
            card.append(header, teorWrapper); 
            fragment.appendChild(card);

            if (sessionStorage.getItem('djen_auto_open_calc') === key) {
                card.classList.add('aberto');
                header.querySelector('.card-click-area').setAttribute('aria-expanded', 'true');
                calcPanel.classList.add('ativa');
                setTimeout(() => {
                    calcPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    sessionStorage.removeItem('djen_auto_open_calc');
                }, 300);
            }
        });

        listElement.appendChild(fragment);
    }

    function renderAgenda() {
        const list = document.getElementById('listaSalvos');
        if (!list) return;

        const openCard = document.querySelector('#listaSalvos .intimacao-card.aberto');
        const openKey = openCard ? openCard.getAttribute('data-key') : null;

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
                
                // Se estamos a filtrar os seus prazos (hoje, 5dias, futuros), IGNORA a espera e os cumpridos
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

        appendCardsToList(chaves, list, openKey, "Nenhum prazo localizado para este filtro");
    }

    function renderCalendar() {
        const monthYearEl = document.getElementById('calMonthYear'); const daysContainer = document.getElementById('calDaysContainer');
        if(!monthYearEl || !daysContainer) return;

        const year = currentCalDate.getFullYear(); const month = currentCalDate.getMonth();
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        monthYearEl.textContent = `${monthNames[month]} ${year}`;
        
        daysContainer.innerHTML = '';
        
        const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
        const hojeRef = new Date(); hojeRef.setHours(0,0,0,0);
        const todayStr = `${hojeRef.getFullYear()}-${String(hojeRef.getMonth() + 1).padStart(2, '0')}-${String(hojeRef.getDate()).padStart(2, '0')}`;

        if (!selectedCalDateStr) {
            selectedCalDateStr = todayStr;
        }
        
        const prazoDates = {};
        for (let k in prazosSalvos) {
            const p = prazosSalvos[k];
            if (p && p.fatal) {
                const parts = p.fatal.split('/'); const fStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                if(!prazoDates[fStr]) prazoDates[fStr] = [];
                prazoDates[fStr].push(p);
            }
        }

        for(let i=0; i<firstDay; i++) { const empty = document.createElement('div'); empty.className = 'cal-cell is-muted'; daysContainer.appendChild(empty); }

        for(let d=1; d<=daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const cell = document.createElement('div'); cell.className = 'cal-cell';
            if(dateStr === todayStr) cell.classList.add('is-today');
            if(dateStr === selectedCalDateStr) cell.classList.add('is-selected');
            cell.textContent = d;
            
            const itemsForDay = prazoDates[dateStr] || [];
            if(itemsForDay.length > 0) {
                const dotsWrap = document.createElement('div'); dotsWrap.className = 'cal-dots';
                itemsForDay.slice(0, 3).forEach(p => { 
                    const dot = document.createElement('div'); dot.className = 'cal-dot';
                    if (p.cumprido) { dot.classList.add('d-gray'); }
                    else {
                        const pDate = new Date(year, month, d, 12, 0, 0); const diff = Math.ceil((pDate - hojeRef) / (1000 * 3600 * 24));
                        if(diff <= 0) dot.classList.add('d-red'); else if(diff <= 5) dot.classList.add('d-orange'); else dot.classList.add('d-green');
                    }
                    dotsWrap.appendChild(dot);
                });
                if(itemsForDay.length > 3) { const plus = document.createElement('div'); plus.style.fontSize="8px"; plus.style.lineHeight="4px"; plus.style.fontWeight="bold"; plus.textContent="+"; dotsWrap.appendChild(plus); }
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
        else { const pnl = document.getElementById('calSelectedDatePanel'); if(pnl) pnl.style.display = 'none'; }
    }

    function renderSelectedDateItems(dateStr) {
        const panel = document.getElementById('calSelectedDatePanel'); const container = document.getElementById('calSelectedDateItems'); const title = document.getElementById('calSelectedDateTitle');
        if(panel) panel.style.display = 'block'; const parts = dateStr.split('-'); if(title) title.textContent = `Prazos do dia ${parts[2]}/${parts[1]}/${parts[0]}`;
        
        const openCard = document.querySelector('#calSelectedDateItems .intimacao-card.aberto'); 
        const openKey = openCard ? openCard.getAttribute('data-key') : null;
        const targetBR = `${parts[2]}/${parts[1]}/${parts[0]}`;
        const chaves = Object.keys(prazosSalvos).filter(k => prazosSalvos[k] && prazosSalvos[k].fatal === targetBR);
        
        if(container) appendCardsToList(chaves, container, openKey, "Nenhum prazo fatal para este dia");
    }

    const bCPrev = document.getElementById('btnCalPrev'); if(bCPrev) bCPrev.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() - 1); renderCalendar(); };
    const bCNext = document.getElementById('btnCalNext'); if(bCNext) bCNext.onclick = () => { currentCalDate.setMonth(currentCalDate.getMonth() + 1); renderCalendar(); };

    const btnOnt = document.getElementById('btnOntem'); if(btnOnt) btnOnt.onclick = () => { const ontem = getLocalDate(1); const ini = document.getElementById('dataInicio'); if(ini) ini.value = ontem; const fim = document.getElementById('dataFim'); if(fim) fim.value = ontem; const bBuscar = document.getElementById('btnBuscar'); if(bBuscar) bBuscar.click(); }; 
    const btn7d = document.getElementById('btn7DiasBusca'); if(btn7d) btn7d.onclick = () => { setDate(7); const bBuscar = document.getElementById('btnBuscar'); if(bBuscar) bBuscar.click(); }; 
    const btn15d = document.getElementById('btn15DiasBusca'); if(btn15d) btn15d.onclick = () => { setDate(15); const bBuscar = document.getElementById('btnBuscar'); if(bBuscar) bBuscar.click(); };
    const nOab = document.getElementById('oabNum'); if(nOab) nOab.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const bBuscar = document.getElementById('btnBuscar'); if(bBuscar) bBuscar.click(); } }); 
    const ufOab = document.getElementById('oabUf'); if(ufOab) ufOab.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const bBuscar = document.getElementById('btnBuscar'); if(bBuscar) bBuscar.click(); } });

    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
        btnBuscar.onclick = async () => {
            const dtIni = document.getElementById('dataInicio')?.value; const dtFim = document.getElementById('dataFim')?.value;
            if (!dtIni || !dtFim) { showToast("Preencha as datas corretamente.", "⚠️"); return; } 
            
            let urlsToFetch = []; let oabContexts = []; let numProcesso = '';
            
            // Usando um proxy gratuito para evitar o bloqueio de CORS no celular
            const corsProxy = 'https://corsproxy.io/?'; 

            if (searchMode === 'oab') {
                const n = document.getElementById('oabNum')?.value.trim(); const u = document.getElementById('oabUf')?.value.trim().toUpperCase(); 
                if (!n || !u) { showToast("Informe o número da OAB e o Estado (UF) para buscar.", "⚠️"); return; }
                multiOabSearch = n.includes(',');
                const oabs = n.split(/[\s,;-]+/).filter(Boolean);
                oabs.forEach(oab => {
                    // Adicionamos o proxy antes do link do PJe
                    let linkCNJ = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${oab}&ufOab=${u}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`;
                    urlsToFetch.push(corsProxy + encodeURIComponent(linkCNJ));
                    oabContexts.push(oab);
                });
                const textoResumo = document.getElementById('textoResumoBusca'); if (textoResumo) textoResumo.textContent = `OAB ${n} ${u}`;
            } else {
                const rawProc = document.getElementById('procNumBusca')?.value.trim();
                const procApenasNumeros = rawProc.replace(/\D/g, '');
                
                if (procApenasNumeros.length !== 20) { showToast("Digite o número completo do processo (20 dígitos).", "⚠️"); return; }
                multiOabSearch = false;
                
                let linkCNJ1 = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${procApenasNumeros}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`;
                let linkCNJ2 = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroProcesso=${encodeURIComponent(rawProc)}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`;
                
                urlsToFetch.push(corsProxy + encodeURIComponent(linkCNJ1));
                urlsToFetch.push(corsProxy + encodeURIComponent(linkCNJ2));
                oabContexts.push(null, null);
                
                const textoResumo = document.getElementById('textoResumoBusca'); 
                if (textoResumo) textoResumo.textContent = `Processo ${formatCNJ(procApenasNumeros)}`;
            }

            ; totalBuscas++; SafeStorage.set({'djen_total_buscas': totalBuscas});
            
            // NOVO: Adiciona a busca atual ao Histórico Rápido
            let novoItem = searchMode === 'oab' 
                ? {tipo: 'oab', valor: document.getElementById('oabNum').value.trim()} 
                : {tipo: 'proc', valor: document.getElementById('procNumBusca').value.trim()};
            if (novoItem.valor) {
                historicoBuscas = historicoBuscas.filter(h => h.valor !== novoItem.valor); // Evita repetidos
                historicoBuscas.unshift(novoItem); // Coloca em 1º lugar
                if (historicoBuscas.length > 4) historicoBuscas.pop(); // Guarda apenas as 4 últimas
                SafeStorage.set({'djen_historico_buscas': JSON.stringify(historicoBuscas)});
                if(typeof renderHistoricoBuscas === 'function') renderHistoricoBuscas();
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

            document.getElementById('btnBuscar').disabled = true; const sl = document.getElementById('skeletonLoader'); if(sl) sl.style.display = 'block'; 
            const welcome = document.getElementById('welcomeState'); if (welcome) welcome.style.display = 'none';
            const resEl = document.getElementById('resultados'); if(resEl) resEl.innerHTML = ""; const cf = document.getElementById('containerFiltro'); if(cf) cf.style.display = 'none'; 
            
            let buscaSucesso = false;
            try {
                const fetches = urlsToFetch.map(async (url, idx) => {
                    const r = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json, text/plain, */*' } }); 
                    if(!r.ok) throw new Error(`Erro API CNJ (${r.status})`);
                    const d = await r.json(); 
                    return (d.items || []).map(i => ({ ...i, oabBuscada: oabContexts[idx] }));
                });
                const arrays = await Promise.all(fetches); const mapIds = new Map();
                arrays.flat().forEach(item => { 
                    if(!mapIds.has(item.id)) mapIds.set(item.id, item); 
                    else { let ex = mapIds.get(item.id); if(ex.oabBuscada && item.oabBuscada && !ex.oabBuscada.includes(item.oabBuscada)) ex.oabBuscada += `, ${item.oabBuscada}`; } 
                });
                resultadosGlobais = Array.from(mapIds.values());
                if (resultadosGlobais.length > 0) { SafeStorage.set({'djen_last_search': JSON.stringify(resultadosGlobais)}); }

                const tribs = [...new Set(resultadosGlobais.map(i => i.siglaTribunal))].sort(); 
                const f = document.getElementById('filtroTribunal'); if(f) { f.innerHTML = '<option value="">Tribunal</option>'; tribs.forEach(t => { const o = document.createElement("option"); o.value = t; o.textContent = t; f.appendChild(o); }); }
                if(cf) cf.style.display = 'flex'; 
                buscaSucesso = true;
            } catch(e) { 
                console.error("DJEN - Erro de Rede:", e);
                if(resEl) resEl.innerHTML = `<div style="text-align:center; padding:20px; color: var(--text-muted);"><b>Sem conexão com o CNJ.</b><br>Verifique sua internet ou tente novamente em instantes.</div>`; 
            } finally { 
                document.getElementById('btnBuscar').disabled = false; if(sl) sl.style.display = 'none'; 
            }

            if (buscaSucesso) {
                try { applyFilters(); } catch (err) { console.error("DJEN - Erro ao desenhar os cards:", err); }
            }
        };
    }

    function updateProgressBar() {
        const el = document.getElementById('progressWrapper'); if(!el) return;
        if (!resultadosExibidos || resultadosExibidos.length === 0) { el.style.display = 'none'; return; }
        el.style.display = 'block'; let total = resultadosExibidos.length; let processados = 0;
        resultadosExibidos.forEach(i => { const txt = cleanText(i.texto || i.teor); const proc = formatCNJ(getProc(i, txt)); const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, ''); if (publicacoesLidas.has(itemKey) || (prazosSalvos[itemKey] && prazosSalvos[itemKey].fatal)) processados++; });
        const pct = (processados / total) * 100; const pf = document.getElementById('progressFill'); if(pf) pf.style.width = `${pct}%`; const pt = document.getElementById('progressText'); if(pt) pt.textContent = `${processados} de ${total} publicações triadas`;
    }

    function applyFilters() { 
        const fR = document.getElementById('filtroRapido'); const term = fR ? fR.value.toLowerCase().trim() : ""; 
        const fT = document.getElementById('filtroTribunal'); const trib = fT ? fT.value : ""; 
        resultadosExibidos = resultadosGlobais.filter(i => { const txt = cleanText(i.texto || i.teor).toLowerCase(); const proc = String(getProc(i, txt)).toLowerCase(); return (term === "" || txt.includes(term) || proc.includes(term)) && (trib === "" || i.siglaTribunal === trib); }); 
        const cr = document.getElementById('contadorResultados'); if(cr) cr.textContent = `${resultadosExibidos.length} RESULTADOS`; render(resultadosExibidos, term); updateProgressBar();
    } 
    
    const filtroRapidoEl = document.getElementById('filtroRapido'); 
    if (filtroRapidoEl) { filtroRapidoEl.addEventListener('input', debounce(applyFilters, 300)); }
    
    const fb = document.getElementById('filtroTribunal'); 
    if(fb) fb.onchange = applyFilters;
});

// =========================================================
// MOTOR DE EXPORTAÇÃO DE AUDITORIA EM PNG (CANVAS)
// =========================================================

// O 'true' no final desta função ativa a Fase de Captura, furando o bloqueio do stopPropagation!
document.addEventListener('click', (e) => {
    // 1. Ação de clicar no botão PNG
    const btnPNG = e.target.closest('.btn-exportar-png');
    if (btnPNG) {
        e.preventDefault();
        e.stopPropagation();

        // --- INÍCIO DA MÁGICA PARA A ABA AVULSA ---
        if (btnPNG.closest('#containerCalcAvulsa')) {
            const calcPanel = btnPNG.closest('.calculadora-prazo');
            const inpProc = calcPanel.querySelector('.calc-avulsa-proc');
            const inpApel = calcPanel.querySelector('.calc-avulsa-apelido');

            // Criamos um "Falso Cartão" para a sua função nativa processar a imagem sem crashar!
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
        // --- FIM DA MÁGICA ---

        // Comportamento normal para os cards das outras abas
        const card = btnPNG.closest('.intimacao-card');
        if (card && typeof gerarImagemAuditoria === 'function') {
            gerarImagemAuditoria(card);
        }
        return; 
    }

    // 2. Ação de clicar na caixa para abrir a auditoria (Mostra/Esconde o botão)
    const resBox = e.target.closest('.calc-result-box');
    if (resBox) {
        // Esperamos 150ms para garantir que a extensão já desenhou a grelha de dias
        setTimeout(() => {
            const preview = resBox.querySelector('.calc-preview.audit-flow');
            const btnContainer = resBox.querySelector('.container-btn-png');
            if (preview && btnContainer) {
                // Se a grelha não estiver escondida E tiver quadradinhos lá dentro
                if (preview.style.display !== 'none' && preview.innerHTML.trim() !== '') {
                    btnContainer.style.display = 'block';
                } else {
                    btnContainer.style.display = 'none';
                }
            }
        }, 150);
    }
}, true); 

function gerarImagemAuditoria(card) {
    const calcPanel = card.querySelector('.calculadora-prazo');
    const proc = card.getAttribute('data-proc');
    const dataFatal = calcPanel.querySelector('.resultado-data-fatal')?.textContent || '--/--/----';
    
    let apelido = '';
    const headerText = card.querySelector('.proc-header')?.textContent || '';
    if (headerText.includes('—')) apelido = headerText.split('—')[1].trim();

    let boxContainer = calcPanel.querySelector('.calc-preview.audit-flow');
    if (!boxContainer || boxContainer.style.display === 'none') {
        boxContainer = calcPanel.querySelector('.resultado-alertas');
    }
    
    const boxes = boxContainer ? Array.from(boxContainer.children) : [];
    if(boxes.length === 0) { 
        if(typeof showToast === 'function') showToast("Calcule o prazo antes de exportar a auditoria.", "⚠️"); 
        return; 
    }

    const temAlertaSTJ = calcPanel.innerHTML.includes('Alerta de Jurisprudência') || calcPanel.innerHTML.includes('Feriado Municipal');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const cols = 6; const itemW = 120; const itemH = 140; const gap = 16;
    const padX = 40; const padY = 40;
    const rows = Math.ceil(boxes.length / cols);

    const stjHeight = temAlertaSTJ ? 130 : 0;
    canvas.width = padX * 2 + (cols * itemW) + ((cols - 1) * gap);
    canvas.height = padY + 180 + stjHeight + (rows * itemH) + ((rows - 1) * gap) + 60;

    // Fundo
    ctx.fillStyle = '#fdfcfb'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cabeçalho
    ctx.fillStyle = '#0075de'; ctx.beginPath(); ctx.roundRect(padX, padY, 44, 44, 8); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DJ', padX + 22, padY + 22);
    ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('Buscador DJEN', padX + 60, padY);
    ctx.fillStyle = '#0075de'; ctx.font = '16px sans-serif'; ctx.fillText('www.buscadordjen.com.br', padX + 60, padY + 26);

    ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('Auditoria de Prazo (Contagem)', padX, padY + 70);
    ctx.fillStyle = '#615d59'; ctx.font = '18px sans-serif';
    let pStr = `Processo: ${proc}`; if (apelido) pStr += ` — ${apelido}`;
    ctx.fillText(pStr, padX, padY + 110);

    ctx.fillStyle = '#d44c47'; ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`Prazo Fatal Calculado: ${dataFatal}`, padX, padY + 145);

    let startY = padY + 200;

    // Alerta STJ
    if (temAlertaSTJ) {
        ctx.fillStyle = '#1f1616'; ctx.beginPath(); ctx.roundRect(padX, startY, canvas.width - (padX*2), 100, 8); ctx.fill();
        ctx.strokeStyle = '#3a2020'; ctx.lineWidth = 1; ctx.stroke();
        
        ctx.fillStyle = '#f87171'; ctx.font = 'bold 16px sans-serif';
        ctx.fillText('🚨 Alerta STJ', padX + 20, startY + 25);
        ctx.fillStyle = '#e5baba'; ctx.font = '15px sans-serif';
        ctx.fillText('Prazo coincide com feriado municipal. Anexe certidão ou decreto', padX + 20, startY + 55);
        ctx.fillText('local para comprovar a tempestividade (art. 1.003, § 6º, CPC).', padX + 20, startY + 75);
        startY += 130;
    }

    // Grid
    boxes.forEach((box, idx) => {
        const col = idx % cols; const row = Math.floor(idx / cols);
        const x = padX + (col * (itemW + gap)); const y = startY + (row * (itemH + gap));
        const lines = box.innerText.split('\n').map(t => t.trim()).filter(t => t);
        
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
        ctx.beginPath(); ctx.roundRect(x, y, itemW, itemH, 12); ctx.fill(); ctx.shadowColor = 'transparent';

        let htmlRaw = box.innerHTML.toLowerCase();
        let isFatal = htmlRaw.includes('red') || htmlRaw.includes('fatal') || htmlRaw.includes('🚨');
        let isDisp = htmlRaw.includes('orange') || htmlRaw.includes('disp') || htmlRaw.includes('📥');
        
        if (isFatal) { ctx.strokeStyle = '#ff8080'; ctx.lineWidth = 2; ctx.stroke(); }
        else if (isDisp) { ctx.strokeStyle = '#ffb366'; ctx.lineWidth = 1; ctx.stroke(); }
        else { ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.stroke(); }

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let step = (itemH - 30) / (lines.length || 1);
        let lineY = y + 25 + (step / 2) - (lines.length === 2 ? 10 : 0);
        
        lines.forEach((line) => {
            const regexEmoji = /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/;
            if (regexEmoji.test(line)) { ctx.font = '24px sans-serif'; ctx.fillStyle = '#1a1a1a'; } 
            else if (line.includes('/') && line.length <= 10) { ctx.font = '15px sans-serif'; ctx.fillStyle = '#888888'; } 
            else if (!isNaN(line) || line.includes('Disp') || line.includes('Pub')) { ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#1a1a1a'; } 
            else { ctx.font = '12px sans-serif'; ctx.fillStyle = '#a39e98'; }
            
            let drawLine = line.length > 18 ? line.substring(0,16)+'...' : line;
            ctx.fillText(drawLine, x + itemW/2, lineY); lineY += step;
        });
    });

    ctx.textAlign = 'right'; ctx.fillStyle = '#a39e98'; ctx.font = '12px sans-serif';
    const timestamp = new Date().toLocaleString('pt-BR');
    ctx.fillText(`Auditoria Cível e Criminal • Gerado em ${timestamp}`, canvas.width - padX, canvas.height - padY/2);

    const link = document.createElement('a'); link.download = `Auditoria_DJEN_${proc.replace(/\D/g, '')}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    if(typeof showToast === 'function') showToast("Auditoria Exportada!", "📷");
}

// --- LÓGICA DA NOVA ABA CALCULADORA AVULSA ---
document.addEventListener('DOMContentLoaded', () => {
    const tabCalculadora = document.getElementById('tabCalculadora');
    const viewCalculadora = document.getElementById('viewCalculadora');
    const tabBusca = document.getElementById('tabBusca');
    const tabSalvos = document.getElementById('tabSalvos');
    const tabCalendario = document.getElementById('tabCalendario');
    
    // Função auxiliar: garante que a calculadora some quando clicar nas abas normais
    const esconderCalculadoraAvulsa = () => {
        if (viewCalculadora) viewCalculadora.style.display = 'none';
        if (tabCalculadora) tabCalculadora.classList.remove('active');
    };

    if (tabBusca) tabBusca.addEventListener('click', esconderCalculadoraAvulsa);
    if (tabSalvos) tabSalvos.addEventListener('click', esconderCalculadoraAvulsa);
    if (tabCalendario) tabCalendario.addEventListener('click', esconderCalculadoraAvulsa);

    if (tabCalculadora) {
        tabCalculadora.addEventListener('click', () => {
            // Esconde todas as outras views
            if (document.getElementById('viewBusca')) document.getElementById('viewBusca').style.display = 'none';
            if (document.getElementById('viewSalvos')) document.getElementById('viewSalvos').style.display = 'none';
            if (document.getElementById('viewCalendario')) document.getElementById('viewCalendario').style.display = 'none';
            
            // Remove o 'active' dos outros botões
            if (tabBusca) tabBusca.classList.remove('active');
            if (tabSalvos) tabSalvos.classList.remove('active');
            if (tabCalendario) tabCalendario.classList.remove('active');

            // Mostra a aba da Calculadora Avulsa
            tabCalculadora.classList.add('active');
            viewCalculadora.style.display = 'block';

            // Cria a calculadora limpa dentro do HTML
            const containerCalcAvulsa = document.getElementById('containerCalcAvulsa');
            
            if (containerCalcAvulsa && containerCalcAvulsa.innerHTML.trim() === '') {
                try {
                    // 1. Chamamos a função na ORDEM CERTA: (i, btnCalc, itemKey, dataDispOriginal, numeroFormatado, prazoSugerido...)
                    const calcNode = window.montarCalculadoraForm({}, null, 'avulsa_' + Date.now(), '', '', 15, false, '', null);
                    
                    // 2. Colamos fisicamente o resultado dentro do container na tela
                    if (calcNode) {
                        containerCalcAvulsa.appendChild(calcNode);
                        
                        // 3. Forçamos a exibição (já que o template original vem com display:none)
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
        });
    }
})

// =========================================================
// POWER USER: ATALHOS DE TECLADO E FEEDBACK VISUAL
// =========================================================

// 1. Feedback Visual Global para botões de Copiar
document.addEventListener('click', (e) => {
    const btnCopy = e.target.closest('.btn-copy, #btnCopiarBuscaLote, #btnCopiarSalvosLote, .pix-btn-copy');
    if (btnCopy) {
        const originalHtml = btnCopy.innerHTML;
        const originalColor = btnCopy.style.color;
        const originalBg = btnCopy.style.background;
        
        // Estado de Sucesso (Verde)
        btnCopy.innerHTML = "✅"; 
        btnCopy.style.color = "var(--zen-green)";
        btnCopy.style.background = "var(--zen-green-bg)";
        
        setTimeout(() => {
            btnCopy.innerHTML = originalHtml;
            btnCopy.style.color = originalColor;
            btnCopy.style.background = originalBg;
        }, 1500);
    }
});

// 2. Atalho Global: Alt + F (Windows) ou Option + F (Mac) para Focar na Busca
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault(); 
        
        // Se não estiver na aba de busca, muda para ela
        if (document.getElementById('viewBusca')?.style.display === 'none') {
            document.getElementById('tabBusca')?.click();
        }
        
        // Foca no campo correto dependendo do modo selecionado
        setTimeout(() => {
            if (searchMode === 'oab') document.getElementById('oabNum')?.focus();
            else document.getElementById('procNumBusca')?.focus();
        }, 80);
    }
});

// --- SISTEMA DE ALERTA DE BACKUP (7 DIAS) ---
function verificarLembreteBackup() {
    const dataUltimoBackup = localStorage.getItem('djen_ultimo_backup_data');
    const hoje = new Date();
    
    // Calcula se passou de 7 dias ou se nunca fez backup
    if (!dataUltimoBackup || (hoje - new Date(dataUltimoBackup)) >= 7 * 24 * 60 * 60 * 1000) {
        
        // Espera 1.5 segundos para a tela carregar e aciona o Toast diretamente pelo DOM
        setTimeout(() => {
            const toast = document.getElementById('toastGenerico');
            if (toast) {
                document.getElementById('toastIcone').textContent = "💾"; 
                document.getElementById('toastMensagem').textContent = "Backup Recomendado: Já faz 7 dias, salve seus dados!";
                toast.classList.add('show'); 
                
                // Deixa na tela por 5 segundos (um pouco mais que o normal para dar tempo de ler)
                setTimeout(() => toast.classList.remove('show'), 5000);
            }
        }, 1500);
    }
}

// =========================================================
// SISTEMA INTELIGENTE DE ESC UNIFICADO (CASCATA)
// =========================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        
        // 1. Tira o foco de inputs/textareas para não bugar a digitação
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            document.activeElement.blur();
            return; 
        }

        let algoFechado = false;

        // 2. Fecha Modais e Modo Foco (Camada mais alta)
        const overlays = document.querySelectorAll('.modal-overlay.show, #focusModeOverlay.show');
        if (overlays.length > 0) {
            overlays.forEach(o => o.classList.remove('show'));
            algoFechado = true;
        }
        if (algoFechado) return;

        // 3. Fecha Dropdowns e Menus
        const dropdowns = document.querySelectorAll('.card-dropdown.show, #headerDropdown.show');
        if (dropdowns.length > 0) {
            dropdowns.forEach(d => d.classList.remove('show'));
            algoFechado = true;
        }
        if (algoFechado) return;

        // 4. Fecha Calculadoras Abertas (Reseta estado visual)
        const calcsAbertas = document.querySelectorAll('.calculadora-prazo.ativa');
        if (calcsAbertas.length > 0) {
            calcsAbertas.forEach(calc => {
                calc.classList.remove('ativa');
                // Reseta os painéis internos da calculadora
                calc.querySelectorAll('.calc-acoes-iniciais, .calc-inputs-container').forEach(el => el.style.display = 'flex');
                calc.querySelectorAll('.calc-acoes-finais, .calc-result-box, .calc-preview, .calc-acoes-pos-salvo').forEach(el => el.style.display = 'none');
            });
            algoFechado = true;
        }
        if (algoFechado) return;

        if (cardsAbertos.length > 0) {
            cardsAbertos.forEach(card => {
                card.classList.remove('aberto');
               const clickArea = card.querySelector('.card-click-area');
                if (clickArea) clickArea.setAttribute('aria-expanded', 'false');
            });
        }
    }
});
