// js/ui_cards.js
// Fábrica de Cards de Intimações (Fase 4 Refatoração Tática)
// Extraído do sidebar.js — contém toda a lógica de renderização visual dos cards.

(function() {
    'use strict';

    // Lazy-binding: puxar dependências do escopo global no momento da chamada
    function _getProc(i, txt) { return (window.getProc || window._djenGetProc)(i, txt); }

        const criarIntimacaoCard = (i, index, term) => {
            const txt = window.cleanText(i.texto || i.teor);
            const proc = window.formatCNJ(window.getProc(i, txt));
            const procNum = proc.replace(/\D/g, '');
            const dataProc = new Date(i.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR');
            const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, '');

            
            // Extração automática de partes desativada a pedido do usuário
            const textoBuscaLow = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const caiuNoRadar = palavrasUrgentes.some(p => textoBuscaLow.includes(p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()));
            if (caiuNoRadar) totalRadarEncontrado++;

            if (window.prazosSalvos[itemKey]) {
                i.prazoCalculado = window.prazosSalvos[itemKey];
            } else {
                for (let k in window.prazosSalvos) {
                    const p = window.prazosSalvos[k];
                    if (p && p.processo && p.processo.replace(/\D/g, '') === procNum) {
                        const dataMatches = p.data_disponibilizacao && i.data_disponibilizacao && p.data_disponibilizacao === i.data_disponibilizacao;
                        const txtA = String(p.textoCompleto || '').trim();
                        const txtB = String(i.textoCompleto || window.cleanText(i.texto || i.teor) || '').trim();
                        const textMatches = txtA.length > 0 && txtA === txtB;

                        const isSamePub = (p.data_disponibilizacao && i.data_disponibilizacao) 
                            ? (dataMatches && textMatches)
                            : textMatches;

                        if (isSamePub) {
                            i.prazoCalculado = p;
                            break;
                        }
                    }
                }
            }

            const card = document.createElement("div");
            card.className = "intimacao-card";
            card.setAttribute('data-key', itemKey);
            card.setAttribute('data-proc', proc);

            card.style.opacity = '0';
            card.style.animation = 'entraSuave 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards';
            card.style.animationDelay = `${Math.min(index * 0.04, 1)}s`;



            let seloSalvo = '';
            const isSalvo = i.prazoCalculado && i.prazoCalculado.fatal;
            if (isSalvo) {
                const hj = new Date(); hj.setHours(12, 0, 0, 0);
                const dataFatal = window.parseDateBR(i.prazoCalculado.fatal);
                const diff = Math.ceil((dataFatal - hj) / (1000 * 3600 * 24));
                let corSeloClass = diff <= 5 ? "s-orange" : "s-green";
                if (diff === 0) corSeloClass = "s-hoje";
                if (diff < 0) corSeloClass = "s-hoje";
                if (i.prazoCalculado.cumprido) corSeloClass = "s-gray";
                // 1. Aplica a cor roxa se estiver em espera
                if (i.prazoCalculado.espera && !i.prazoCalculado.cumprido && diff >= 0) corSeloClass = "s-purple";

                // 2. Aplica o texto minimalista inteligente
                let txtStatus = "";
                const dataFormatada = i.prazoCalculado.fatal ? i.prazoCalculado.fatal.substring(0, 5) : "";

                if (i.prazoCalculado.cumprido) {
                    txtStatus = `✅ Cumprido`;
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

            const apelidoSalvo = window.getGlobalApelido(proc);
            const notaBuscaSalva = i.prazoCalculado?.anotacao || window.prazosSalvos[itemKey]?.anotacao || "";
            const siglaTribunalFormatada = i.siglaTribunal || 'TJ';
            
            if (window.publicacoesLidas.has(itemKey) && !isSalvo) card.classList.add('lido');
            
            const lidoTag = window.publicacoesLidas.has(itemKey) ? `<span class="badge-lido">Lido</span>` : '';

            // 1. Variáveis corretas EXCLUSIVAS da aba Busca:
            const badgeSTJBusca = (i.prazoCalculado && i.prazoCalculado.temFeriadoMunicipal) ? `<span class="icon-status tooltip-bottom" data-tooltip="Atenção STJ: Comprove o Feriado Local" style="filter: drop-shadow(0 2px 4px rgba(212, 76, 71, 0.4));">🚨</span>` : ''; const infoOrigem = `${i.siglaTribunal || 'TJ'} ${i.oabBuscada ? '• OAB ' + i.oabBuscada : ''}`;
            const infoData = `• ${dataProc}`;
            let iconeLido = window.publicacoesLidas.has(itemKey) ? `<span class="badge-lido">Lido</span>` : '';
            let statusDireitaHtml = seloSalvo ? seloSalvo : iconeLido;

            const grupoCount = (typeof gruposProcessos !== 'undefined' && gruposProcessos[proc]) ? gruposProcessos[proc].length : 1;
            const badgeDuplicadoHTML = grupoCount > 1 ? `<span class="badge-duplicado tooltip-bottom" data-tooltip="Este processo possui ${grupoCount} publicações nesta busca">📑 ${grupoCount} pub.</span>` : '';

            const numRelations = window.obterRelacoesGlobaisProcesso(proc).length;
            const badgeRelHTML = numRelations > 0 ? `<span class="badge-conexao-rapida tooltip-bottom" data-tooltip="Possui ${numRelations} processo(s) vinculado(s)"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>${numRelations}</span>` : '';

            // Novo: Extrair prazo escrito para badge visual apenas se ainda NÃO foi calculado
            let badgePrazoExpresso = '';
            if (!isSalvo) {
                const matchHorasBadge = txt.match(/(?:prazo de|em|no prazo de)\s+(\d{1,3})\s*(?:\([^)]+\)\s*)?horas/i) || txt.match(/(\d{1,3})\s*(?:\([^)]+\)\s*)?horas/i);
                const matchDiasBadge = txt.match(/(\d{1,3})\s*(?:\([^)]+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i);
                const matchExtensoBadge = txt.match(/\b(um|dois|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezassete|dezoito|dezanove|vinte|trinta|quarenta|cinquenta|sessenta)\b\s*(?:\(\d+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i);
                
                const styleBadge = 'background: transparent !important; border: 1px solid var(--primary) !important; color: var(--primary) !important; padding: 2px 6px !important; border-radius: 4px; display: inline-flex; align-items: center; margin-right: 4px; font-weight: 600; font-size: 11px;';
                const iconeRelogio = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:3px"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

                const mapaExtensoBadge = { 'um': 1, 'dois': 2, 'tres': 3, 'três': 3, 'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'catorze': 14, 'quatorze': 14, 'quinze': 15, 'dezesseis': 16, 'dezassete': 17, 'dezoito': 18, 'dezanove': 19, 'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50, 'sessenta': 60 };

                if (matchHorasBadge && matchHorasBadge[1]) {
                    badgePrazoExpresso = `<span class="tooltip-bottom badge-prazo-expresso" data-tooltip="Prazo expresso identificado no texto" style="${styleBadge}">${iconeRelogio}${matchHorasBadge[1]}h</span>`;
                } else if (matchDiasBadge && matchDiasBadge[1]) {
                    badgePrazoExpresso = `<span class="tooltip-bottom badge-prazo-expresso" data-tooltip="Prazo expresso identificado no texto" style="${styleBadge}">${iconeRelogio}${matchDiasBadge[1]}d</span>`;
                } else if (matchExtensoBadge && matchExtensoBadge[1]) {
                    const textoExtenso = matchExtensoBadge[1].toLowerCase();
                    const numeroConvertido = mapaExtensoBadge[textoExtenso] || textoExtenso;
                    badgePrazoExpresso = `<span class="tooltip-bottom badge-prazo-expresso" data-tooltip="Prazo expresso identificado no texto" style="${styleBadge}">${iconeRelogio}${numeroConvertido}d</span>`;
                }
            }


            const rightSideBadges = `
                ${badgeSTJBusca}
                ${(i.prazoCalculado && i.prazoCalculado.espera) ? '<span class="icon-status tooltip-bottom" data-tooltip="Aguardando Terceiros">⏳</span>' : ''}
                ${badgePrazoExpresso}
                ${statusDireitaHtml}
            `;

            const optsHeader = {
                rightSideHTML: rightSideBadges,
                badgeRelHTML: badgeRelHTML,
                badgeDuplicadoHTML: badgeDuplicadoHTML,
                dataProc: dataProc,
                datajud_classe: window.prazosSalvos[itemKey]?.datajud_classe || i.datajud_classe || '',
                datajud_orgao: window.prazosSalvos[itemKey]?.datajud_orgao || i.datajud_orgao || '',
                datajud_sistema: window.prazosSalvos[itemKey]?.datajud_sistema || i.datajud_sistema || ''
            };

            const tituloDinamicoHTML = window.getHeaderHTML(proc, apelidoSalvo, notaBuscaSalva, txt, siglaTribunalFormatada, optsHeader);
            const header = document.createElement("div");

            // 2. Montagem do HTML com a nova estrutura compacta e integrada
            window.safeSetInnerHTML(header, `
                <div class="card-click-area" tabindex="0" aria-expanded="false" aria-label="Expandir Processo ${proc}">
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

            const conteudoExibicao = (i.prazoCalculado && i.prazoCalculado.textoHtml) ? i.prazoCalculado.textoHtml : window.aplicarHighlighterRadar(txt);

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
                window.safeSetInnerHTML(teorInnerBox, conteudoExibicao);;
            }

            teorBoxContainer.appendChild(teorInnerBox);
            teorBoxContainer.appendChild(fadeOverlay);

            const btnFocoMini = document.createElement("button");
            btnFocoMini.className = "btn-foco-mini tooltip-left";
            btnFocoMini.setAttribute('data-tooltip', 'Abrir no Modo Foco');
            window.safeSetInnerHTML(btnFocoMini, window.iconesSVG.foco);;
            teorBoxContainer.appendChild(btnFocoMini);

            const notionWrapperBusca = document.createElement("div");
            notionWrapperBusca.className = "notion-wrapper";
            
            const toolbarBusca = document.createElement("div");
            toolbarBusca.className = "wysiwyg-toolbar";
            window.safeSetInnerHTML(toolbarBusca, `
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
            txtAreaBusca.setAttribute("placeholder", "Escreva anotações livres...");
            
            let val = notaBuscaSalva || "";
            window.safeSetInnerHTML(txtAreaBusca, val);;
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
            notionWrapperBusca.appendChild(window.AIChecklist.createTasksWrapperUI(itemKey, proc, txt, header));

            txtAreaBusca.onclick = e => e.stopPropagation();
            txtAreaBusca.onkeydown = e => e.stopPropagation();
            const saveAnotacaoBuscaDebounced = debounce((valor) => {
                if (typeof i !== 'undefined') {
                    i.anotacao = valor;
                } else if (window.prazosSalvos[itemKey]) {
                    window.prazosSalvos[itemKey].anotacao = valor;
                }
                window.savePrazosSalvos();
            }, 1000);

            txtAreaBusca.oninput = e => {
                const valor = e.target.innerHTML;
                const siglaTrib = window.prazosSalvos[itemKey]?.siglaTribunal || 'TJ';
                window.safeSetInnerHTML(header.querySelector(".proc-header"), window.getHeaderHTML(proc, window.getGlobalApelido(proc), valor, txt, siglaTrib));;
                
                const newBadgeRel = header.querySelector('.badge-conexao-rapida');
                if (newBadgeRel && typeof badgeRelEl !== 'undefined' && badgeRelEl.onclick) newBadgeRel.onclick = badgeRelEl.onclick;
                const newBtnHist = header.querySelector('.btn-historico-header');
                const oldBtnHist = header.querySelector('.btn-historico-header'); // just for reference or keeping the listener
                if (newBtnHist) {
                    newBtnHist.onclick = (ev) => {
                        ev.stopPropagation();
                        const isOpening = timelineWrapper.style.display !== 'block';
                        if (isOpening) {
                            if (!card.classList.contains('aberto')) { card.classList.add('so-historico'); toggleCard(); }
                            timelineWrapper.style.display = 'block'; newBtnHist.classList.add('active');
                            window.renderTimeline(i || window.prazosSalvos[itemKey], timelineWrapper, itemKey).then(() => { setTimeout(() => timelineWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150); });
                        } else {
                            timelineWrapper.style.display = 'none'; newBtnHist.classList.remove('active');
                            if (card.classList.contains('so-historico')) { toggleCard(); setTimeout(() => card.classList.remove('so-historico'), 300); }
                        }
                    };
                }

                saveAnotacaoBuscaDebounced(valor);
            };

            const markAsRead = () => {
                if (!window.publicacoesLidas.has(itemKey)) {
                    window.publicacoesLidas.add(itemKey);
                    window.salvarPublicacoesLidas();
                    const headerInfo = card.querySelector('.status-urgencia-group') || card.querySelector('.proc-header') || card.querySelector('.card-top-info');
                    if (headerInfo && !headerInfo.querySelector('.badge-lido')) {
                        const seloSalvoEl = headerInfo.querySelector('.badge-salvo');
                        // Se houver selo salvo (prazo calculado), NÃO adicionamos o "Lido", pois o selo assume o lugar.
                        if (!seloSalvoEl) {
                            card.classList.add('lido');
                            const spanLido = document.createElement('span');
                            spanLido.className = 'badge-lido';
                            spanLido.innerHTML = 'Lido';
                            headerInfo.appendChild(spanLido);
                        }
                    }
                    totalLidos++;
                    SafeStorage.set({ 'djen_total_lidos': totalLidos });
                    window.updateProgressBar();
                }
            };

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
            window.safeSetInnerHTML(btnCalc, window.iconesSVG.calendario);;

            const btnCopiar = document.createElement("button");
            btnCopiar.className = "btn-acao-square h-blue btn-copy tooltip-right";
            btnCopiar.setAttribute('aria-label', 'Copiar com notas');
            btnCopiar.setAttribute('data-tooltip', 'Copiar');
            window.safeSetInnerHTML(btnCopiar, window.iconesSVG.copiar);;

            const btnShare = document.createElement("button");
            btnShare.className = "btn-acao-square h-blue btn-share-ind tooltip-right";
            btnShare.setAttribute('aria-label', 'Compartilhar');
            btnShare.setAttribute('data-tooltip', 'Compartilhar');
            window.safeSetInnerHTML(btnShare, window.iconesSVG.share);;

            const btnIcsExport = document.createElement("button");
            btnIcsExport.className = "btn-acao-square h-blue btn-ics-export tooltip-right";
            btnIcsExport.setAttribute('aria-label', 'Exportar Evento (ICS)');
            btnIcsExport.setAttribute('data-tooltip', 'Exportar ICS');
            window.safeSetInnerHTML(btnIcsExport, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M12 14v4"></path><path d="M10 16h4"></path></svg>`);
            btnIcsExport.onclick = (e) => {
                e.stopPropagation();
                const saved = window.prazosSalvos[itemKey] || i.prazoCalculado;
                if (saved && saved.fatal) {
                    window.exportarIcsPrazo(saved);
                } else {
                    window.showToast("Calcule e salve o prazo para exportar o ICS.", "⚠️");
                }
            };
            const btnIcsTodoExport = document.createElement("button");
            btnIcsTodoExport.className = "btn-acao-square h-blue btn-ics-todo-export tooltip-right";
            btnIcsTodoExport.setAttribute('aria-label', 'Exportar como Tarefa (ICS/VTODO)');
            btnIcsTodoExport.setAttribute('data-tooltip', 'Exportar Tarefa (ICS)');
            window.safeSetInnerHTML(btnIcsTodoExport, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`);
            btnIcsTodoExport.onclick = (e) => {
                e.stopPropagation();
                const saved = window.prazosSalvos[itemKey] || i.prazoCalculado;
                if (saved && saved.fatal) {
                    window.exportarIcsTarefa(saved);
                } else {
                    window.showToast("Calcule e salve o prazo para exportar a tarefa.", "⚠️");
                }
            };

            const btnGcalExport = document.createElement("button");
            btnGcalExport.className = "btn-acao-square h-blue btn-gcal-export tooltip-right";
            btnGcalExport.setAttribute('aria-label', 'Abrir no Google Agenda');
            btnGcalExport.setAttribute('data-tooltip', 'Google Agenda');
            window.safeSetInnerHTML(btnGcalExport, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`);
            btnGcalExport.onclick = (e) => {
                e.stopPropagation();
                const saved = window.prazosSalvos[itemKey] || i.prazoCalculado;
                if (!saved || !saved.fatal) {
                    window.showToast("Calcule e salve o prazo para exportar.", "⚠️");
                    return;
                }
                if (typeof window.abrirGoogleCalendar === 'function') {
                    window.abrirGoogleCalendar(saved);
                } else {
                    window.showToast("Função indisponível.", "❌");
                }
            };

            const btnGtasksExport = document.createElement("button");
            btnGtasksExport.className = "btn-acao-square h-blue btn-gtasks-export tooltip-right";
            btnGtasksExport.setAttribute('aria-label', 'Exportar para Google Tasks');
            btnGtasksExport.setAttribute('data-tooltip', 'Exportar para Google Tasks');
            window.safeSetInnerHTML(btnGtasksExport, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`);
            btnGtasksExport.onclick = async (e) => {
                e.stopPropagation();
                const saved = window.prazosSalvos[itemKey] || i.prazoCalculado;
                if (!saved || !saved.fatal) {
                    window.showToast("Calcule e salve o prazo antes de exportar.", "⚠️");
                    return;
                }
                const oldHtml = btnGtasksExport.innerHTML;
                btnGtasksExport.innerHTML = '⏳';
                try {
                    if (!window.GoogleTasksService) throw new Error("Serviço indisponível");
                    await window.GoogleTasksService.exportarPrazoParaTasks(saved);
                    btnGtasksExport.innerHTML = '✅';
                    window.showToast("Prazo exportado para o Google Tasks!", "☑️");
                    setTimeout(() => { btnGtasksExport.innerHTML = oldHtml; }, 2500);
                } catch (err) {
                    if (err.message !== 'CONFIG_WEBHOOK_URL_REQUIRED') {
                        console.error(err);
                    }
                    btnGtasksExport.innerHTML = oldHtml;
                    if (err.message === 'CONFIG_WEBHOOK_URL_REQUIRED') {
                        document.getElementById('agendaModal')?.classList.add('show');
                        window.showToast("Informe a URL do Web App nas configurações do Google Tasks.", "⚠️");
                    } else {
                        window.showToast("Erro no Google Tasks: " + err.message, "❌");
                    }
                }
            };
            btnShare.onclick = (e) => {
                e.stopPropagation();
                markAsRead();
                if (i.prazoCalculado) i.prazoCalculado.anotacao = txtAreaBusca.innerHTML;
                tituloParaCompartilhar = "Processo " + proc;
                const mockItem = i.prazoCalculado || { processo: proc, textoCompleto: txt, anotacao: txtAreaBusca.innerHTML, siglaTribunal: i.siglaTribunal };
                itensParaCompartilhar = [mockItem];
                textoParaCompartilhar = gerarTextoCompartilhamento([mockItem], "Aviso de Publicação");
                abrirModalCompartilhar('ind');
            };

            const btnVincularBusca = document.createElement("button");
            btnVincularBusca.className = "btn-acao-square h-blue btn-vincular-atalho tooltip-right";
            btnVincularBusca.setAttribute('aria-label', 'Vincular Processo');
            btnVincularBusca.setAttribute('data-tooltip', 'Vincular Processo');
            window.safeSetInnerHTML(btnVincularBusca, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"></circle><path d="M6 6v12"></path><path d="M6 12a6 6 0 0 0 6 6h3"></path></svg>`);

            btnVincularBusca.onclick = (e) => {
                e.stopPropagation();
                markAsRead();
                const btnHist = header.querySelector('.btn-historico-header');
                if (btnHist && timelineWrapper.style.display !== 'block') {
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
                } else if (timelineWrapper.style.display === 'block') {
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

            const rightActionsBusca = document.createElement("div");
            rightActionsBusca.style.display = "flex";
            rightActionsBusca.style.alignItems = "center";
            rightActionsBusca.style.gap = "8px";
            rightActionsBusca.style.marginLeft = "auto";

            const menuContainerBusca = document.createElement("div");
            menuContainerBusca.className = "card-menu-container";
            window.safeSetInnerHTML(menuContainerBusca, `<button class="btn-acao-square h-blue btn-opcoes-card tooltip-left" aria-label="Mais opções" data-tooltip="Mais opções">${window.iconesSVG.maisOpcoes}</button><div class="card-dropdown"><button class="btn-editar-apelido" aria-label="Editar identificação">${window.iconesSVG.lapis} Editar identificação</button><button class="btn-recalcular-prazo" style="display: ${isSalvo ? 'flex' : 'none'};" aria-label="Recalcular prazo">🧮 Recalcular prazo</button><hr><button class="btn-marcar-naolido" aria-label="Marcar como não lido">${window.iconesSVG.eyeOff} Marcar como não lido</button><button class="btn-remover-prazo" style="color: var(--zen-orange); display: ${isSalvo ? 'flex' : 'none'};" aria-label="Limpar contagem">${window.iconesSVG.remover} Limpar contagem</button></div>`);;
            rightActionsBusca.appendChild(menuContainerBusca);
            acoesPills.append(btnCalc, btnCopiar, btnShare, btnIcsExport, btnIcsTodoExport, btnGcalExport, btnGtasksExport, btnVincularBusca, rightActionsBusca);

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
                    // triggerAutoSincronizarCNJ desativado a pedido
                } else {
                    clearTimeout(openTimer);
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
                    }
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
                    window.abrirModalApelido(proc, apelidoSalvo, (novoApelido) => {
                        window.setGlobalApelido(proc, novoApelido.trim(), itemKey);
                        window.applyFilters();
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
                copyToClipboard(copyText, () => window.showToast("Copiado com sucesso!", "📎"));
            };

            btnFocoMini.onclick = (e) => {
                e.stopPropagation();
                markAsRead();
                const ov = document.getElementById('focusModeOverlay');
                if (ov) {
                    ov.setAttribute('data-active-key', itemKey);
                    document.getElementById('focusTribunal').textContent = i.siglaTribunal || 'TJ';
                    document.getElementById('focusProcesso').textContent = proc;
                    window.safeSetInnerHTML(document.getElementById('focusApelido'), apelidoSalvo);;
                    const savedHtml = window.prazosSalvos[itemKey] && window.prazosSalvos[itemKey].textoHtml;
                    if (savedHtml) {
                        window.safeSetInnerHTML(document.getElementById('focusTeorContent'), savedHtml);;
                    } else {
                        window.safeSetInnerHTML(document.getElementById('focusTeorContent'), window.aplicarHighlighterRadar(txt));;
                    }
                    ov.classList.add('show');
                    if (typeof inicializarNovosRecursosFoco === 'function') window.inicializarNovosRecursosFoco();
                }
            };

            const prazoSugerido = window.extrairPrazoSugerido(txt);
            const calcPanel = window.montarCalculadoraForm(i, btnCalc, itemKey, i.data_disponibilizacao, proc, prazoSugerido, true, null, toggleCard);

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
                            window.safeSetInnerHTML(containerAlertas, htmlAlertas);;
                        }

                        const prev = calcPanel.querySelector('.calc-preview');
                        if (prev) {
                            window.preencherAuditoriaVisual(prazo.timeline, prev);
                            prev.style.display = 'grid';
                            const btnContainer = calcPanel.querySelector('.container-btn-png');
                            if (btnContainer) btnContainer.style.display = 'block';
                        }

                        const dFin = calcPanel.querySelector('.calc-acoes-finais');
                        if (dFin) {
                            dFin.style.display = 'flex';
                            const bSalvar = dFin.querySelector('.btn-salvar'); if (bSalvar) bSalvar.style.display = 'none';
                            const bVoltar = dFin.querySelector('.btn-voltar-calc'); if (bVoltar) { window.safeSetInnerHTML(bVoltar, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: -3px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Recalcular prazo`);; bVoltar.style.flex = '1'; }
                        }
                        if (typeof window.atualizarAuditoriaCruzada === 'function') window.atualizarAuditoriaCruzada();
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

            const timelineWrapper = document.createElement("div");
            timelineWrapper.className = "timeline-wrapper";
            
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
                        window.renderTimeline(i || window.prazosSalvos[itemKey], timelineWrapper, itemKey).then(() => {
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


            // --- INÍCIO DE DETECÇÃO CNJ E CRIAÇÃO DO BANNER DE SUGESTÃO ---
            const cnjSugerido = window.varrerTeorParaSugestao(txt, proc);
            let sugestaoBanner = null;
            if (cnjSugerido) {
                const jaVinculado = window.prazosSalvos[itemKey]?.relacoes?.some(r => window.formatCNJ(r.processo) === cnjSugerido);
                if (!jaVinculado) {
                    sugestaoBanner = document.createElement("div");
                    sugestaoBanner.className = "sugestao-vinculo-banner";
                    window.safeSetInnerHTML(sugestaoBanner, `
                        <span class="sugestao-vinculo-texto">
                            🔗 Processo relacionado detectado: <strong>${cnjSugerido}</strong>. Deseja vinculá-lo como Incidente/Apenso?
                        </span>
                        <button type="button" class="sugestao-vinculo-btn">Vincular</button>
                    `);
                    
                    const btnVincular = sugestaoBanner.querySelector('.sugestao-vinculo-btn');
                    btnVincular.onclick = (e) => {
                        e.stopPropagation();
                        
                        // Se não existe o itemKey principal salvo localmente, criar placeholder
                        if (!window.prazosSalvos[itemKey]) {
                            window.prazosSalvos[itemKey] = {
                                processo: proc,
                                textoCompleto: txt,
                                siglaTribunal: i.siglaTribunal || 'TJ',
                                data_disponibilizacao: i.data_disponibilizacao,
                                apelido: window.getGlobalApelido(proc) || "",
                                anotacao: "",
                                relacoes: [],
                                historicoAcoes: [{ data: new Date().toISOString(), tipo: 'criacao', descricao: 'Processo adicionado por vínculo' }]
                            };
                        }
                        
                        const res = window.adicionarRelacaoProcesso(itemKey, cnjSugerido, 'Incidente', 'Incidente / Apenso', false);
                        if (res) {
                            window.showToast("Vínculo criado com sucesso!", "🔗");
                            
                            window.safeSetInnerHTML(sugestaoBanner, `
                                <span class="sugestao-vinculo-texto" style="color: var(--zen-green-txt); font-weight: 600;">
                                    ✅ Processo ${cnjSugerido} vinculado com sucesso!
                                </span>
                            `);
                            sugestaoBanner.style.background = 'hsla(120, 70%, 40%, 0.06)';
                            sugestaoBanner.style.borderColor = 'hsla(120, 70%, 40%, 0.25)';
                            setTimeout(() => {
                                sugestaoBanner.style.animation = 'focusExit 0.3s ease forwards';
                                setTimeout(() => sugestaoBanner.remove(), 300);
                            }, 3000);
                            
                            // Atualizar os badges de conexão rápida do card
                            window.atualizarBadgesCard(itemKey);
                            
                            // Atualizar a timeline se aberta
                            if (timelineWrapper.style.display === 'block') {
                                window.renderTimeline(window.prazosSalvos[itemKey], timelineWrapper, itemKey);
                            }
                        } else {
                            window.showToast("Erro ao criar vínculo.", "❌");
                        }
                    };
                }
            }
            // --- FIM DE DETECÇÃO CNJ ---

            const radarNav = window.criarRadarNavigator(teorInnerBox, txt);

            if (sugestaoBanner) {
                if (radarNav) {
                    teorInnerOverflow.append(radarNav, teorBoxContainer, sugestaoBanner, notionWrapperBusca, acoesPills, timelineWrapper, calcPanel);
                } else {
                    teorInnerOverflow.append(teorBoxContainer, sugestaoBanner, notionWrapperBusca, acoesPills, timelineWrapper, calcPanel);
                }
            } else {
                if (radarNav) {
                    teorInnerOverflow.append(radarNav, teorBoxContainer, notionWrapperBusca, acoesPills, timelineWrapper, calcPanel);
                } else {
                    teorInnerOverflow.append(teorBoxContainer, notionWrapperBusca, acoesPills, timelineWrapper, calcPanel);
                }
            }
            window.renderizarSecaoResumoIA(itemKey, txt, teorInnerOverflow);
            teorWrapper.appendChild(teorInnerOverflow);
            card.append(header, teorWrapper);
            return card;
        };

    // Exportar globalmente
    window.UICards = { criarIntimacaoCard: criarIntimacaoCard };
})();
