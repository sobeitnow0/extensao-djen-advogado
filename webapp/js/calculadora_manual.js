// Calculadora Manual e Auxiliares
// Responsável por montar o formulário da calculadora e pré-processar dicas

const CalculadoraManual = {
    extrairPrazoSugerido: function(textoLimpo) {
        if (!textoLimpo) return 15;
        let txt = textoLimpo.toLowerCase();
        
        const matchHoras = txt.match(/(?:prazo de|em|no prazo de)\s+(\d{1,3})\s*(?:\([^)]+\)\s*)?horas/i) || txt.match(/(\d{1,3})\s*(?:\([^)]+\)\s*)?horas/i);
        if (matchHoras && matchHoras[1]) {
            return Math.max(1, Math.ceil(parseInt(matchHoras[1], 10) / 24));
        }

        const matchDigito = txt.match(/(\d{1,3})\s*(?:\([^)]+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i);
        if (matchDigito && matchDigito[1]) return parseInt(matchDigito[1], 10);
        const matchExtenso = txt.match(/\b(um|dois|três|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezassete|dezoito|dezanove|vinte|trinta|quarenta|cinquenta|sessenta)\b\s*(?:\(\d+\)\s*)?(?:úteis\s*|uteis\s*|corridos\s*)?dias/i);
        if (matchExtenso && matchExtenso[1]) {
            const mapa = { 'um': 1, 'dois': 2, 'tres': 3, 'três': 3, 'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'catorze': 14, 'quatorze': 14, 'quinze': 15, 'dezesseis': 16, 'vinte': 20, 'trinta': 30 };
            return mapa[matchExtenso[1].toLowerCase().replace('ê', 'e')] || 15;
        }
        return 15;
    },

    autoPreencherTribunal: function(sigla, elUf, elMun) {
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
    },

    montarCalculadoraForm: function(i, btnCalc, itemKey, dataDispOriginal, numeroFormatado, prazoSugerido, isBuscaContext, apelidoForcado, toggleCardCallback) {
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
    
                // --- INÍCIO AUDITORIA CRUZADA DE PRAZOS ESPELHADOS ---
                const atualizarAuditoriaCruzada = () => {
                    const crossAuditContainer = calcPanel.querySelector('.cross-audit-container');
                    if (!crossAuditContainer) return;
                    const crossAuditList = crossAuditContainer.querySelector('.cross-audit-list');
                    if (!crossAuditList) return;
    
                    const savedItem = prazosSalvos[itemKey];
                    if (!savedItem || !savedItem.relacoes) {
                        crossAuditContainer.style.display = 'none';
                        return;
                    }
    
                    const relacoesEspelhadas = savedItem.relacoes.filter(r => r.espelhar);
                    if (relacoesEspelhadas.length === 0) {
                        crossAuditContainer.style.display = 'none';
                        return;
                    }
    
                    let listHtml = '';
                    let count = 0;
    
                    relacoesEspelhadas.forEach(rel => {
                        // Fix Bug #2 v50.71: Comparar número CNJ completo (20 dígitos) em vez de
                        // apenas remover não-dígitos — isso evitava que processos com anos ou
                        // origens diferentes fossem tratados como o mesmo processo.
                        const normalizedRel = String(rel.processo).replace(/\D/g, '');
                        const relKey = normalizedRel.length >= 20
                            ? Object.keys(prazosSalvos).find(k => prazosSalvos[k] && String(prazosSalvos[k].processo).replace(/\D/g, '') === normalizedRel)
                            : null; // Rejeitar matching para números incompletos (< 20 dígitos CNJ)
                        const relSaved = relKey ? prazosSalvos[relKey] : null;
    
                        if (relSaved && relSaved.fatal) {
                            count++;
                            const label = relSaved.apelido || relSaved.processo;
                            const fatal = relSaved.fatal;
                            const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
                            const dataFatal = parseDateBR(fatal);
                            const diffDias = Math.ceil((dataFatal - hoje) / (1000 * 3600 * 24));
                            
                            let statusLabel = "";
                            let corBadge = "s-gray";
                            
                            if (relSaved.cumprido) {
                                statusLabel = "Cumprido";
                                corBadge = "s-gray";
                            } else if (diffDias < 0) {
                                statusLabel = `Atrasado ${Math.abs(diffDias)}d`;
                                corBadge = "s-hoje";
                            } else if (diffDias === 0) {
                                statusLabel = "Hoje";
                                corBadge = "s-hoje";
                            } else if (diffDias === 1) {
                                statusLabel = "Amanhã";
                                corBadge = "s-orange";
                            } else {
                                statusLabel = `${diffDias} dias`;
                                corBadge = diffDias <= 5 ? "s-orange" : "s-green";
                            }
    
                            listHtml += `
                                <div class="cross-audit-item" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-light); font-size: 11px;">
                                    <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; text-align: left;">
                                        <span style="font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${label}</span>
                                        <span style="font-size: 9px; font-family: ui-monospace, monospace; color: var(--text-placeholder);">${relSaved.processo}</span>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <span class="badge-salvo ${corBadge}" style="font-size: 9px; padding: 2px 6px;">${statusLabel} • ${fatal.substring(0, 5)}</span>
                                    </div>
                                </div>
                            `;
                        }
                    });
    
                    if (count > 0) {
                        safeSetInnerHTML(crossAuditList, listHtml);
                        crossAuditContainer.style.display = 'block';
                    } else {
                        crossAuditContainer.style.display = 'none';
                    }
                };
                // --- FIM AUDITORIA CRUZADA ---
    
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
    
                    // --- Tooltip de Referência Legal no Hover ---
                    const legalRefs = {
                        'Cível': 'CPC/2015 art. 219 — Contagem em dias úteis. Excluem-se sábados, domingos, feriados e recesso forense (arts. 219 e 220 do CPC/2015).',
                        'Trabalhista': 'CLT art. 775 — Contagem em dias úteis conforme a CLT (art. 775 com redação da Lei 13.467/2017).',
                        'Criminal': 'CPP art. 798 — Contagem em dias corridos, incluindo sábados, domingos e feriados (art. 798 do CPP).'
                    };
                    
                    customMatWrapper.classList.add('tooltip-bottom');
                    
                    hiddenInput.addEventListener('change', () => {
                        const refDesc = legalRefs[hiddenInput.value];
                        if (refDesc) {
                            customMatWrapper.setAttribute('data-tooltip', refDesc);
                            customMatWrapper.title = refDesc;
                        }
                    });
                    
                    // Mostrar referência inicial
                    const refInicialDesc = legalRefs[hiddenInput.value || 'Cível'];
                    if (refInicialDesc) {
                        customMatWrapper.setAttribute('data-tooltip', refInicialDesc);
                        customMatWrapper.title = refInicialDesc;
                    }
    
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
                                safeSetInnerHTML(hintEl, "A data acima é a <b>Disponibilização</b>.<br>A Publicação ocorre no dia útil seguinte (D+1).");;
                            } else {
                                safeSetInnerHTML(hintEl, "A data acima é a <b>Leitura / Intimação</b>.<br>A Publicação é considerada no mesmo dia.");;
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
                    if (!calcData) { 
                        if (cTrib && cTrib.value) autoPreencherTribunal(cTrib.value, cUf, cMun); 
                        else cUf.value = "SP"; 
                        
                        if (i && i.datajud_uf) cUf.value = i.datajud_uf;
                        if (i && i.datajud_mun) cMun.value = i.datajud_mun;
                    }
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
    
                        if (valUf && valMun && window.cacheMunicipios && window.cacheMunicipios[valUf]) {
                            const normalizar = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                            const cidadeExiste = window.cacheMunicipios[valUf].some(m => normalizar(m) === normalizar(valMun));
                            if (!cidadeExiste) {
                                if (typeof showToast === 'function') showToast(`Erro: Cidade '${valMun}' não encontrada no banco do IBGE. Verifique a ortografia e tente novamente.`, "🚨");
                                if (cMun) { const borderOrig = cMun.style.border; cMun.style.border = "1px solid #d44c47"; cMun.focus(); setTimeout(() => { cMun.style.border = borderOrig; }, 3500); }
                                return;
                            }
                        }
    
                        const textoOriginal = btnExec.innerHTML;
                        safeSetInnerHTML(btnExec, "Calculando...");;
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
                            atualizarAuditoriaCruzada();
    
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
                                containerAlertas.replaceChildren();;
                                let badgesHtml = "";
                                if (lastResult.feriados > 0) badgesHtml += `<span class="badge bg-gray">${lastResult.feriados} Feriados/Suspensões</span>`;
                                if (lastResult.prorrogado) badgesHtml += `<span class="badge bg-orange">Prorrogado</span>`;
                                if (badgesHtml !== "") { safeAppendHTML(containerAlertas, `<div style="display:flex; gap:4px; justify-content:center; width: 100%; margin-bottom: 12px;">${badgesHtml}</div>`);; }
                                if (lastResult.temFeriadoMunicipal) { safeAppendHTML(containerAlertas, `<div style="width: 100%; box-sizing: border-box; background: rgba(212, 76, 71, 0.08); color: #d44c47; padding: 12px; border-radius: 6px; font-size: 11px; text-align: left; border: 1px solid rgba(212, 76, 71, 0.2); line-height: 1.4; margin-bottom: 12px;"><div style="display:flex; align-items:center; gap:4px; margin-bottom: 4px; font-weight: 700; font-size: 12px;">🚨 Alerta de Jurisprudência (STJ)</div>Prazo coincide com <b>Feriado Local, Forense ou Suspensão</b>. Anexe a norma ou certidão do Tribunal para comprovar a tempestividade (art. 1.003, § 6º, CPC).</div>`);; }
                                safeAppendHTML(containerAlertas, `<div style="width: 100%; text-align: center; margin-top: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--primary); cursor: pointer;">🖱️ Clique aqui para abrir a auditoria dia a dia</div><div style="width: 100%; text-align: center; margin-bottom: 4px; font-size: 11px; color: var(--text-muted); opacity: 0.85;">Aviso: Esta contagem é uma previsão. Confirme sempre as suspensões e feriados oficiais.</div>`);;
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
                                    safeSetInnerHTML(bVoltar, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: -3px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Recalcular`);;
                                    bVoltar.style.flex = '1';
                                }
                            }
    
                        } catch (err) {
                            console.error("Erro na Calculadora:", err);
                            if (typeof showToast === 'function') showToast("Não foi possível concluir o cálculo: " + err.message, "❌");
                        } finally {
                            safeSetInnerHTML(btnExec, textoOriginal);;
                            btnExec.disabled = false;
                        }
                    };
                }
    
                const efetivarSalvamento = async () => {
                    if (!cUf || !cUf.value.trim() || !cMun || !cMun.value.trim()) {
                        if (typeof showToast === 'function') showToast("O registro do prazo requer a informação da UF e do Município.", "⚠️");
                        if (cMun && !cMun.value.trim()) { const borderOriginal = cMun.style.border; cMun.style.border = "1px solid #d44c47"; cMun.focus(); setTimeout(() => { cMun.style.border = borderOriginal; }, 2500); }
                        if (cUf && !cUf.value.trim()) { const borderOriginalUf = cUf.style.border; cUf.style.border = "1px solid #d44c47"; setTimeout(() => { cUf.style.border = borderOriginalUf; }, 2500); }
                        return;
                    }
    
                    let apelidoAtual = apelidoForcado || getGlobalApelido(numeroFormatado) || i?.apelido || "";
                    
                    // DataJud Enrichment Before Save - Removido para não atrasar o cálculo
                    let vinculadosTemp = null;
                    const partesBase = getGlobalPartes(numeroFormatado) || {};
    
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
                        tarefas: (prazosSalvos[itemKey] && prazosSalvos[itemKey].tarefas) ? prazosSalvos[itemKey].tarefas : [],
                        datajud_classe: (prazosSalvos[itemKey] && prazosSalvos[itemKey].datajud_classe) ? prazosSalvos[itemKey].datajud_classe : (i.datajud_classe || ''),
                        datajud_orgao: (prazosSalvos[itemKey] && prazosSalvos[itemKey].datajud_orgao) ? prazosSalvos[itemKey].datajud_orgao : (i.datajud_orgao || ''),
                        datajud_sistema: (prazosSalvos[itemKey] && prazosSalvos[itemKey].datajud_sistema) ? prazosSalvos[itemKey].datajud_sistema : (i.datajud_sistema || ''),
                        data_disponibilizacao: i.data_disponibilizacao || (prazosSalvos[itemKey] ? prazosSalvos[itemKey].data_disponibilizacao : '')
                    };
    
                    if (i.manual) i.siglaTribunal = savedSigla;
                    if (isBuscaContext) { i.prazoCalculado = novoPrazoCalculado; prazosSalvos[itemKey] = i.prazoCalculado; }
                    else { prazosSalvos[itemKey] = novoPrazoCalculado; Object.assign(i, novoPrazoCalculado); }
    
                    adicionarEventoHistorico(itemKey, 'calculo', `Prazo fatal calculado: ${lastResult.fatal}`);
                    
                    if (typeof globalThis.enviarParaJurisflow === 'function') {
                        globalThis.enviarParaJurisflow(novoPrazoCalculado);
                    }
                    
                    if (vinculadosTemp && vinculadosTemp.length > 0) {
                        for (const vinc of vinculadosTemp) {
                            adicionarRelacaoProcesso(itemKey, vinc.numeroProcesso, 'vinculado', 'Extraído DataJud', false);
                        }
                    } else {
                        savePrazosSalvos();
                    }
                    
                    setGlobalApelido(numeroFormatado, apelidoAtual);
    
                    const cardTarget = calcPanel.closest('.intimacao-card');
                    if (cardTarget) {
                        cardTarget.classList.add('anim-success-flash');
                        setTimeout(() => cardTarget.classList.remove('anim-success-flash'), 1000);
                        const btnCalcTarget = cardTarget.querySelector('.btn-recalc');
                        if (btnCalcTarget) {
                            btnCalcTarget.classList.add('anim-success-pop', 'anim-success-ring');
                            setTimeout(() => {
                                btnCalcTarget.classList.remove('anim-success-pop');
                                btnCalcTarget.classList.remove('anim-success-ring');
                            }, 1000);
                            btnCalcTarget.className = "btn-acao-square h-green btn-recalc tooltip-right";
                            btnCalcTarget.setAttribute('aria-label', 'Prazo Salvo (Recalcular)');
                            btnCalcTarget.setAttribute('data-tooltip', 'Prazo Salvo (Recalcular)');
                        }
                        
                        cardTarget.classList.remove('lido');
    
                        const header = cardTarget.querySelector('.proc-header') || cardTarget.querySelector('.card-top-info');
                        if (header) {
                            const prazoRef = isBuscaContext ? i.prazoCalculado : i;
                            const dataFatal = parseDateBR(prazoRef.fatal);
                            const hj = new Date();
                            hj.setHours(12, 0, 0, 0);
                            const diffDias = Math.ceil((dataFatal - hj) / (1000 * 3600 * 24));
                            let corSeloClass = diffDias <= 5 ? "s-orange" : "s-green";
                            if (diffDias === 0) corSeloClass = "s-hoje";
                            if (diffDias < 0) corSeloClass = "s-hoje";
                            if (prazoRef.cumprido) corSeloClass = "s-gray";
    
                            if (prazoRef.espera && !prazoRef.cumprido && diffDias >= 0) corSeloClass = "s-purple";
    
                            let iconStr = lastResult.direcao === 'retroativo' ? iconesSVG.retro + ' ' : '';
                            let badgeSalvo = header.querySelector('.badge-salvo');
                            let txtStatus = (!isCalculated || i.manual) ? `📌 Anotado: ${lastResult.fatal.substring(0, 5)}` : `🗓️ Calculado: ${lastResult.fatal.substring(0, 5)}`;
                            if (prazoRef.cumprido) {
                                txtStatus = `✅ Cumprido`;
                            } else if (!isBuscaContext) {
                                if (diffDias < 0) txtStatus = `Atrasado ${Math.abs(diffDias)}d • ${lastResult.fatal.substring(0, 5)}`;
                                else if (diffDias === 0) txtStatus = `Hoje • ${lastResult.fatal.substring(0, 5)}`;
                                else if (diffDias === 1) txtStatus = `Amanhã • ${lastResult.fatal.substring(0, 5)}`;
                                else txtStatus = `${diffDias} DIAS • ${lastResult.fatal.substring(0, 5)}`;
                            }
    
                            txtStatus = iconStr + txtStatus;
    
                            let areaDireita = header.querySelector('.status-urgencia-group') || header.querySelector('.status-urgencia') || header.querySelector('.card-info-right');
    
                            if (areaDireita) {
                                const badgeLido = areaDireita.querySelector('.badge-lido');
                                if (badgeLido) badgeLido.remove();
    
                                if (isCalculated && !i.manual) {
                                    const badgeExpresso = areaDireita.querySelector('.badge-prazo-expresso');
                                    if (badgeExpresso) badgeExpresso.remove();
                                }
                            }
    
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
                            safeSetInnerHTML(badgeSalvo, txtStatus);;
                        }
    
                        const btnRemoverTarget = cardTarget.querySelector('.btn-remover-busca');
                        if (btnRemoverTarget) btnRemoverTarget.style.display = 'flex';
                    }
    
                    if (isNovoSalvamento) { window.totalSalvos++; SafeStorage.set({ 'djen_total_salvos': window.totalSalvos }); }
    
                    atualizarEstatisticas();
                    if (isBuscaContext) updateProgressBar();
    
                    if (divFinais) divFinais.style.display = 'none';
                    if (divPosSalvo) {
                        divPosSalvo.style.display = 'flex';
                        const bsg = calcPanel.querySelector('.btn-salvar-gcal-pos');
                        if (bsg) {
                            safeSetInnerHTML(bsg, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: -3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Exportar para Google Agenda`);
                            bsg.classList.add('c-green');
                        }

                        const bst = calcPanel.querySelector('.btn-salvar-gtasks-pos');
                        if (bst) {
                            safeSetInnerHTML(bst, `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; margin-bottom: -3px;"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> Exportar para Google Tasks`);
                            bst.classList.add('c-green');
                        }
                        
                        // Referência Legal pós-cálculo Removida a pedido do usuário
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
                            containerCalcAvulsa.replaceChildren();;
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
                        let prazoParaAgenda = Object.assign({}, i.prazoCalculado || i);
                        if (!prazoParaAgenda.fatal && typeof lastResult !== 'undefined' && lastResult && lastResult.fatal) {
                            Object.assign(prazoParaAgenda, lastResult);
                        }
                        if (prazoParaAgenda && txtArea) prazoParaAgenda.anotacao = txtArea.innerHTML;
                        window.open(gerarLinkGCal(prazoParaAgenda), '_blank');
                        if (btnSalvarGcalPos) {
                            safeSetInnerHTML(btnSalvarGcalPos, "✅ Exportado!");;
                            btnSalvarGcalPos.classList.remove('c-blue');
                            btnSalvarGcalPos.classList.add('c-green');
                        }
                    };
                }

                const btnSalvarGtasksPos = calcPanel.querySelector('.btn-salvar-gtasks-pos');
                if (btnSalvarGtasksPos) {
                    btnSalvarGtasksPos.onclick = async (e) => {
                        e.stopPropagation();
                        const txtArea = calcPanel.closest('.teor-wrapper')?.querySelector('.nota-input');
                        let prazoParaTasks = Object.assign({}, i.prazoCalculado || i);
                        if (!prazoParaTasks.fatal && typeof lastResult !== 'undefined' && lastResult && lastResult.fatal) {
                            Object.assign(prazoParaTasks, lastResult);
                        }
                        if (prazoParaTasks && txtArea) prazoParaTasks.anotacao = txtArea.innerHTML;

                        const textoOriginal = btnSalvarGtasksPos.innerHTML;
                        btnSalvarGtasksPos.innerHTML = "⏳ Enviando...";
                        btnSalvarGtasksPos.disabled = true;

                        try {
                            if (!window.GoogleTasksService) {
                                throw new Error("Serviço Google Tasks indisponível.");
                            }
                            await window.GoogleTasksService.exportarPrazoParaTasks(prazoParaTasks);
                            safeSetInnerHTML(btnSalvarGtasksPos, "✅ Tarefa Criada!");
                            btnSalvarGtasksPos.style.background = "#10b981";
                            btnSalvarGtasksPos.style.borderColor = "#10b981";
                            if (typeof window.showToast === 'function') {
                                window.showToast("Prazo exportado para o Google Tasks!", "☑️");
                            }
                        } catch (err) {
                            console.error("[GoogleTasks] Erro ao exportar:", err);
                            btnSalvarGtasksPos.innerHTML = textoOriginal;
                            btnSalvarGtasksPos.disabled = false;
                            if (err.message === 'CONFIG_WEBHOOK_URL_REQUIRED') {
                                document.getElementById('agendaModal')?.classList.add('show');
                                if (typeof window.showToast === 'function') {
                                    window.showToast("Informe a URL do Web App nas configurações do Google Tasks.", "⚠️");
                                }
                            } else {
                                if (typeof window.showToast === 'function') {
                                    window.showToast("Erro ao exportar para o Tasks: " + err.message, "❌");
                                }
                            }
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
    
                if (calcData && calcData.fatal) {
                    atualizarAuditoriaCruzada();
                }
    
                return calcPanel;
            } catch (e) {
                console.error("DJEN: Erro fatal ao montar a calculadora", e);
                return document.createElement('div');
            }
    }
};

// Exportar globalmente
globalThis.CalculadoraManual = CalculadoraManual;
globalThis.extrairPrazoSugerido = CalculadoraManual.extrairPrazoSugerido;
globalThis.autoPreencherTribunal = CalculadoraManual.autoPreencherTribunal;
globalThis.montarCalculadoraForm = CalculadoraManual.montarCalculadoraForm;

