/**
 * Buscador DJEN v3.5.1
 * Motor Forense + Cache + Exportação + Semaforização Ajustada (5/4/1)
 */

function obterFeriadosForenses(ano) {
    const format = (data) => data.toISOString().split('T')[0];
    const addDias = (data, dias) => {
        const nd = new Date(data);
        nd.setDate(nd.getDate() + dias);
        return nd;
    };

    const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    
    const pascoa = new Date(ano, mes - 1, dia, 12, 0, 0);

    const feriados = [
        `${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-08-11`, 
        `${ano}-09-07`, `${ano}-10-12`, `${ano}-11-01`, `${ano}-11-02`, 
        `${ano}-11-15`, `${ano}-12-08`, `${ano}-12-25`,
        format(addDias(pascoa, -47)), format(addDias(pascoa, -46)), 
        format(addDias(pascoa, -3)),  format(addDias(pascoa, -2)),  
        format(addDias(pascoa, 60))
    ];

    return feriados;
}

function isRecessoForense(dataObj) {
    const m = dataObj.getMonth();
    const d = dataObj.getDate();
    if (m === 11 && d >= 20) return true; 
    if (m === 0 && d <= 20) return true;  
    return false;
}

function calcularProcessual(dataDispStr, dias, tipoContagem, suspensoesExtras) {
    const dataObj = new Date(dataDispStr + 'T12:00:00');
    const ano = dataObj.getFullYear();
    const listaFeriados = [...obterFeriadosForenses(ano), ...obterFeriadosForenses(ano + 1)];

    function isDiaUtil(d) {
        const diaSemana = d.getDay();
        if (diaSemana === 0 || diaSemana === 6) return false;
        
        const anoStr = d.getFullYear();
        const mesStr = String(d.getMonth() + 1).padStart(2, '0');
        const diaStr = String(d.getDate()).padStart(2, '0');
        if (listaFeriados.includes(`${anoStr}-${mesStr}-${diaStr}`)) return false;
        
        return true;
    }

    let data = new Date(dataDispStr + 'T12:00:00'); 
    
    data.setDate(data.getDate() + 1);
    while (!isDiaUtil(data) || (tipoContagem === 'cpc' && isRecessoForense(data))) { 
        data.setDate(data.getDate() + 1); 
    }
    const strPub = data.toLocaleDateString('pt-BR');
    
    data.setDate(data.getDate() + 1);
    while (!isDiaUtil(data) || (tipoContagem === 'cpc' && isRecessoForense(data))) { 
        data.setDate(data.getDate() + 1); 
    }
    const strInicio = data.toLocaleDateString('pt-BR');
    
    let diasAdicionados = 1;
    
    while (diasAdicionados < dias) {
        data.setDate(data.getDate() + 1);
        if (tipoContagem === 'cpc') {
            if (isDiaUtil(data) && !isRecessoForense(data)) diasAdicionados++;
        } else if (tipoContagem === 'cpp') {
            diasAdicionados++;
        }
    }
    
    if (suspensoesExtras > 0) {
        let compensados = 0;
        while(compensados < suspensoesExtras) {
            data.setDate(data.getDate() + 1);
            if (tipoContagem === 'cpc') {
                if (isDiaUtil(data) && !isRecessoForense(data)) compensados++;
            } else {
                compensados++;
            }
        }
    }
    
    while (!isDiaUtil(data) || (tipoContagem === 'cpc' && isRecessoForense(data))) { 
        data.setDate(data.getDate() + 1); 
    }
    
    return { pub: strPub, inicio: strInicio, fatal: data.toLocaleDateString('pt-BR') };
}

// Analisa a urgência do prazo para colorir o botão (Nova Regra: 5 / 4 a 2 / 1 a 0)
function obterCorSemaforo(dataFatalStr) {
    const partes = dataFatalStr.split('/');
    if (partes.length !== 3) return "var(--primary)"; 
    
    const dataFatal = new Date(partes[2], partes[1] - 1, partes[0], 12, 0, 0);
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    
    const diffTempo = dataFatal.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffTempo / (1000 * 3600 * 24));
    
    if (diffDias <= 1) return "#e01b24"; // Vermelho: Urgente (Vence hoje, atrasado ou falta 1 dia)
    if (diffDias <= 4) return "#ff7800"; // Laranja: Atenção (Faltam 2, 3 ou 4 dias)
    return "#26a269";                    // Verde: Seguro (Faltam 5 dias ou mais)
}

document.addEventListener('DOMContentLoaded', () => {
    const ids = ['oabNum', 'oabUf', 'dataInicio', 'dataFim', 'btnBuscar', 'resultados', 'btnCopiarTodos', 'btnDownloadTxt', 'filtroRapido', 'filtroTribunal', 'containerFiltro', 'skeletonLoader', 'btnExpandirTodos', 'btnExportarMenu', 'dropdownExportar', 'contadorResultados'];
    const el = {}; ids.forEach(id => el[id] = document.getElementById(id));

    let resultadosGlobais = [], resultadosExibidos = [], todosExpandidos = false;

    // INICIALIZA O CACHE DE PRAZOS
    let prazosSalvos = {};
    try {
        prazosSalvos = JSON.parse(localStorage.getItem('djen_prazos_salvos')) || {};
    } catch (e) {
        prazosSalvos = {};
    }

    el.oabNum.value = localStorage.getItem('djen_oab_num') || "";
    el.oabUf.value = localStorage.getItem('djen_oab_uf') || "";

    const setDate = (d) => {
        const h = new Date(); const s = new Date(); s.setDate(h.getDate() - d);
        el.dataInicio.value = s.toISOString().split('T')[0];
        el.dataFim.value = h.toISOString().split('T')[0];
    };
    setDate(0);

    document.getElementById('btnHoje').onclick = () => { setDate(0); el.btnBuscar.click(); };
    document.getElementById('btn5Dias').onclick = () => { setDate(5); el.btnBuscar.click(); };
    document.getElementById('btnMes').onclick = () => { setDate(30); el.btnBuscar.click(); };

    el.btnExportarMenu.onclick = (e) => { e.stopPropagation(); el.dropdownExportar.classList.toggle('show'); };
    window.onclick = () => el.dropdownExportar.classList.remove('show');

    function cleanText(html) {
        if (!html) return "";
        let t = new DOMParser().parseFromString(html, 'text/html').body.textContent || html.replace(/<[^>]*>?/gm, '');
        t = t.toLowerCase();
        t = t.replace(/(^\s*\w|[.!?]\n*\s*\w)/g, c => c.toUpperCase());
        t = t.replace(/^[>»"']\s*/gm, '').replace(/fls?\.\s*\d+/gi, '');
        t = t.replace(/\bartigo\b/gi, 'art.').replace(/\bpar[aá]grafo\b/gi, '§');
        return t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    }

    function formatCNJ(n) {
        if(!n) return "0000000-00.0000.0.00.0000";
        let digits = String(n).replace(/\D/g, '');
        return digits.length === 20 ? digits.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, "$1-$2.$3.$4.$5.$6") : n;
    }

    function getProcessNumber(item, text) {
        let p = item.numeroProcesso || item.numero_processo || item.numeroprocesso || item.numero;
        if (!p || p === "undefined") {
            const match = text.match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/);
            p = match ? match[0] : "Processo s/ número";
        }
        return p;
    }

    function gerarTextoExportacao(i) {
        let txtBase = `* Processo: ${formatCNJ(getProcessNumber(i, cleanText(i.texto||i.teor)))} | ${i.siglaTribunal}\n  * Texto: ${cleanText(i.texto || i.teor)}`;
        
        if (i.prazoCalculado) {
            txtBase += `\n\n  --- CONTROLE DE PRAZO ---\n  * Regra: ${i.prazoCalculado.dias} dias em ${i.prazoCalculado.tipo}`;
            if (i.prazoCalculado.susp > 0) txtBase += ` (+${i.prazoCalculado.susp} dias suspensos)`;
            txtBase += `\n  * Publicação: ${i.prazoCalculado.pub}\n  * Início: ${i.prazoCalculado.inicio}\n  * DATA FATAL: ${i.prazoCalculado.fatal}`;
        }
        return txtBase;
    }

    el.btnExpandirTodos.onclick = () => {
        todosExpandidos = !todosExpandidos;
        el.btnExpandirTodos.textContent = todosExpandidos ? "Recolher" : "Expandir Tudo";
        document.querySelectorAll('.intimacao-card').forEach(c => {
            if (todosExpandidos) { c.classList.add('aberto', 'lido'); } else { c.classList.remove('aberto'); }
        });
    };

    function applyFilters() {
        const term = el.filtroRapido.value.toLowerCase().trim();
        const trib = el.filtroTribunal.value;
        resultadosExibidos = resultadosGlobais.filter(i => {
            const txt = cleanText(i.texto || i.teor).toLowerCase();
            const rawProc = String(getProcessNumber(i, txt)).toLowerCase();
            const cnj = formatCNJ(rawProc).toLowerCase();
            return (term === "" || txt.includes(term) || rawProc.includes(term) || cnj.includes(term)) && (trib === "" || i.siglaTribunal === trib);
        });
        el.contadorResultados.textContent = resultadosExibidos.length === 1 ? "1 intimação" : `${resultadosExibidos.length} intimações`;
        render(resultadosExibidos, term);
    }

    el.filtroRapido.oninput = applyFilters;
    el.filtroTribunal.onchange = applyFilters;

    function safeHighlight(container, text, term) {
        container.textContent = "";
        if (!term) { container.textContent = text; return; }
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts = text.split(regex);
        parts.forEach(part => {
            if (part.toLowerCase() === term.toLowerCase()) {
                const mark = document.createElement('mark');
                mark.className = 'highlight-term'; mark.textContent = part;
                container.appendChild(mark);
            } else {
                container.appendChild(document.createTextNode(part));
            }
        });
    }

    function render(items, term) {
        el.resultados.textContent = ""; 
        const hojeLocal = new Date().toLocaleDateString('pt-BR');

        if (!items.length) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "empty-state";
            const title = document.createElement("div");
            title.className = "empty-state-title";
            title.style.padding = "20px"; title.style.textAlign = "center";
            title.textContent = "Nada encontrado";
            emptyDiv.append(title); el.resultados.appendChild(emptyDiv);
            return;
        }

        items.forEach(i => {
            const txt = cleanText(i.texto || i.teor);
            const proc = formatCNJ(getProcessNumber(i, txt));
            const dataProc = new Date(i.data_disponibilizacao + 'T12:00:00').toLocaleDateString('pt-BR');
            
            // CHAVE ÚNICA PARA O CACHE
            const itemKey = (i.id || (proc + '_' + i.data_disponibilizacao)).toString().replace(/\s/g, '');
            
            // RECUPERA DO CACHE SE EXISTIR
            if (prazosSalvos[itemKey]) {
                i.prazoCalculado = prazosSalvos[itemKey];
            }

            const card = document.createElement("div");
            card.className = "intimacao-card";
            if (dataProc === hojeLocal) card.classList.add('hoje');

            const header = document.createElement("div");
            header.className = "card-header";

            const bTrib = document.createElement("span"); bTrib.className = "badge badge-tribunal"; bTrib.textContent = i.siglaTribunal || 'TJ';
            const sProc = document.createElement("span"); sProc.className = "proc-numero"; sProc.textContent = proc;
            const sData = document.createElement("span"); sData.className = "data-disp"; sData.textContent = dataProc;
            const sSeta = document.createElement("span"); sSeta.className = "icone-seta"; sSeta.textContent = "🔽";

            header.append(bTrib, sProc, sData, sSeta);

            const teorContainer = document.createElement("div");
            teorContainer.className = "teor-container";

            const teorTexto = document.createElement("div");
            teorTexto.className = "teor-texto";
            safeHighlight(teorTexto, txt, term);

            const acoesDiv = document.createElement("div");
            acoesDiv.className = "card-acoes";

            const botoesAcaoDiv = document.createElement("div");
            botoesAcaoDiv.className = "botoes-acao";

            const btnCalc = document.createElement("button");
            btnCalc.className = "btn-acao-lista btn-abrir-calc";
            
            // SEMAFORIZAÇÃO NO BOTÃO SE O PRAZO JÁ ESTIVER NO CACHE
            if (i.prazoCalculado) {
                const corAlerta = obterCorSemaforo(i.prazoCalculado.fatal);
                btnCalc.innerHTML = `⏱️ Fatal: <b style="color:${corAlerta}">${i.prazoCalculado.fatal}</b>`;
            } else {
                btnCalc.textContent = "⏱️ Calcular Prazo";
            }

            const btnCopiarInd = document.createElement("button");
            btnCopiarInd.className = "btn-acao-lista";
            btnCopiarInd.textContent = "📋 Copiar";
            
            btnCopiarInd.onclick = (e) => {
                e.stopPropagation();
                const textoFinal = gerarTextoExportacao(i);
                navigator.clipboard.writeText(textoFinal);
                
                btnCopiarInd.textContent = "✅ Copiado!";
                btnCopiarInd.style.color = "var(--primary)";
                
                setTimeout(() => {
                    btnCopiarInd.textContent = "📋 Copiar";
                    btnCopiarInd.style.color = "";
                }, 1500);
            };

            botoesAcaoDiv.append(btnCalc, btnCopiarInd);

            const calcPanel = document.createElement("div");
            calcPanel.className = "calculadora-prazo";
            
            // PREENCHE A CALCULADORA COM OS DADOS DO CACHE
            const dCached = i.prazoCalculado ? i.prazoCalculado.dias : '';
            const tCached = i.prazoCalculado ? (i.prazoCalculado.tipo.includes('CPC') ? 'cpc' : 'cpp') : 'cpc';
            const sCached = (i.prazoCalculado && i.prazoCalculado.susp > 0) ? i.prazoCalculado.susp : '';

            calcPanel.innerHTML = `
                <div class="calc-row">
                    <input type="number" class="calc-dias" placeholder="Prazo" title="Dias do prazo" value="${dCached}" min="1" style="width: 60px;">
                    <select class="calc-tipo" style="width: 140px; font-size: 11px; padding: 8px;">
                        <option value="cpc" ${tCached === 'cpc' ? 'selected' : ''}>CPC (Dias Úteis)</option>
                        <option value="cpp" ${tCached === 'cpp' ? 'selected' : ''}>CPP (Corridos)</option>
                    </select>
                    <input type="number" class="calc-susp" placeholder="Feriado Local" title="Dias extras" value="${sCached}" min="0" style="flex:1;">
                </div>
                <div class="calc-row" style="justify-content: space-between; margin-top: 10px; align-items: flex-end;">
                     <div class="resultado-prazo" style="text-align: left;"></div>
                     <button class="btn-acao-lista btn-exec" style="background-color: var(--primary); color: white;">Salvar</button>
                </div>
            `;

            const resDiv = calcPanel.querySelector('.resultado-prazo');

            // MOSTRA O RESULTADO SALVO COM CORES NO PAINEL
            if (i.prazoCalculado) {
                const corAlerta = obterCorSemaforo(i.prazoCalculado.fatal);
                resDiv.innerHTML = `
                    <div class="resultado-aux">Publicou: ${i.prazoCalculado.pub} | Inicia: ${i.prazoCalculado.inicio}</div>
                    <div style="font-size: 14px; margin-top: 4px;">Data Fatal: <b style="color: ${corAlerta};">${i.prazoCalculado.fatal}</b></div>
                `;
            }

            btnCalc.onclick = (e) => {
                e.stopPropagation(); 
                calcPanel.classList.toggle('ativa');
            };

            const btnExec = calcPanel.querySelector('.btn-exec');
            
            btnExec.onclick = (e) => {
                e.stopPropagation();
                const dias = parseInt(calcPanel.querySelector('.calc-dias').value);
                const tipo = calcPanel.querySelector('.calc-tipo').value;
                const susp = parseInt(calcPanel.querySelector('.calc-susp').value) || 0; 
                
                if (!dias) return;

                const resultado = calcularProcessual(i.data_disponibilizacao, dias, tipo, susp);
                
                const msgConfirmacao = `RESUMO DO CÁLCULO:\n\n` +
                                       `• Publicação: ${resultado.pub}\n` +
                                       `• Início do Prazo: ${resultado.inicio}\n` +
                                       `• DATA FATAL: ${resultado.fatal}\n\n` +
                                       `Deseja confirmar e atrelar este prazo à intimação?`;

                if (!confirm(msgConfirmacao)) return; 
                
                // ATUALIZA O OBJETO
                i.prazoCalculado = {
                    dias: dias,
                    tipo: tipo === 'cpc' ? 'CPC (Úteis)' : 'CPP (Corridos)',
                    susp: susp,
                    pub: resultado.pub,
                    inicio: resultado.inicio,
                    fatal: resultado.fatal
                };

                // SALVA NO CACHE DO NAVEGADOR
                prazosSalvos[itemKey] = i.prazoCalculado;
                localStorage.setItem('djen_prazos_salvos', JSON.stringify(prazosSalvos));
                
                // ATUALIZA A INTERFACE COM A COR CORRETA
                const corAlerta = obterCorSemaforo(resultado.fatal);
                btnCalc.innerHTML = `⏱️ Fatal: <b style="color:${corAlerta}">${resultado.fatal}</b>`;
                
                resDiv.innerHTML = `
                    <div class="resultado-aux">Publicou: ${resultado.pub} | Inicia: ${resultado.inicio}</div>
                    <div style="font-size: 14px; margin-top: 4px;">Data Fatal: <b style="color: ${corAlerta};">${resultado.fatal}</b></div>
                `;

                // Recolhe o painel suavemente após salvar
                setTimeout(() => calcPanel.classList.remove('ativa'), 400);
            };

            acoesDiv.append(botoesAcaoDiv, calcPanel);
            teorContainer.append(teorTexto, acoesDiv);

            header.onclick = () => { 
                card.classList.toggle('aberto'); 
                card.classList.add('lido'); 
            };
            
            card.append(header, teorContainer);
            el.resultados.appendChild(card);
        });
    }

    el.btnBuscar.onclick = async () => {
        const n = el.oabNum.value.trim(); const u = el.oabUf.value.trim().toUpperCase();
        if (!n || !u) return alert("Preencha OAB e UF");
        localStorage.setItem('djen_oab_num', n); localStorage.setItem('djen_oab_uf', u);
        el.btnBuscar.disabled = true; el.skeletonLoader.style.display = 'block'; 
        el.resultados.textContent = ""; el.containerFiltro.style.display = 'none';
        
        try {
            const r = await fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${n}&ufOab=${u}&dataDisponibilizacaoInicio=${el.dataInicio.value}&dataDisponibilizacaoFim=${el.dataFim.value}`);
            const d = await r.json(); resultadosGlobais = d.items || [];
            const tribs = [...new Set(resultadosGlobais.map(i => i.siglaTribunal))].sort();
            el.filtroTribunal.textContent = "";
            const optDefault = document.createElement("option");
            optDefault.value = ""; optDefault.textContent = "Tribunal";
            el.filtroTribunal.appendChild(optDefault);
            tribs.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t; opt.textContent = t;
                el.filtroTribunal.appendChild(opt);
            });
            el.containerFiltro.style.display = 'flex'; applyFilters();
        } catch (e) { 
            el.resultados.textContent = "Erro de conexão com o servidor do CNJ."; 
        } finally { 
            el.btnBuscar.disabled = false; el.skeletonLoader.style.display = 'none'; 
        }
    };

    const getExportTxt = () => resultadosExibidos.map(i => gerarTextoExportacao(i)).join('\n\n================================================\n\n');

    el.btnCopiarTodos.onclick = () => {
        navigator.clipboard.writeText(getExportTxt());
        document.querySelectorAll('.intimacao-card').forEach(c => c.classList.add('lido'));
        const labelOriginal = el.btnExportarMenu.textContent;
        el.btnExportarMenu.textContent = "✅ Copiado!";
        el.btnExportarMenu.style.color = "#3584e4";
        setTimeout(() => {
            el.btnExportarMenu.textContent = labelOriginal;
            el.btnExportarMenu.style.color = "";
            el.dropdownExportar.classList.remove('show');
        }, 1200);
    };

    el.btnDownloadTxt.onclick = () => {
        const blob = new Blob([getExportTxt()], {type:'text/plain;charset=utf-8'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Djen_${el.oabNum.value}.txt`; a.click();
        el.dropdownExportar.classList.remove('show');
    };
});
