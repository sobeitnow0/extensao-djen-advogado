/**
 * Buscador DJEN - Extensão de Navegador
 * Autor: Amilcar Moreira (@sobeitnow0)
 */

if (typeof chrome !== "undefined" && chrome.action) {
    chrome.action.setBadgeText({ text: "" });
}

document.addEventListener('DOMContentLoaded', () => {
    const inputOabNum = document.getElementById('oabNum');
    const inputOabUf = document.getElementById('oabUf');
    const inputInicio = document.getElementById('dataInicio');
    const inputFim = document.getElementById('dataFim');
    const btnBuscar = document.getElementById('btnBuscar');
    const divResultados = document.getElementById('resultados');
    const btnCopiar = document.getElementById('btnCopiarTodos');
    const filtroRapido = document.getElementById('filtroRapido');
    const containerFiltro = document.getElementById('containerFiltro');

    let resultadosGlobais = [];
    let resultadosExibidos = [];

    // Carregamento de Preferências
    inputOabNum.value = localStorage.getItem('djen_oab_num') || "";
    inputOabUf.value = localStorage.getItem('djen_oab_uf') || "";
    
    // Funções de Data
    function aplicarDataRapida(diasRetroativos) {
        const hoje = new Date();
        const inicio = new Date();
        inicio.setDate(hoje.getDate() - diasRetroativos);
        inputInicio.value = inicio.toISOString().split('T')[0];
        inputFim.value = hoje.toISOString().split('T')[0];
    }

    aplicarDataRapida(0);

  // Eventos de Data (Agora com Busca Dinâmica)
    function dispararBuscaPorAtalho(dias) {
        aplicarDataRapida(dias); // 1. Preenche as datas
        btnBuscar.click();       // 2. Dispara a busca automaticamente
    }

    document.getElementById('btnHoje')?.addEventListener('click', () => dispararBuscaPorAtalho(0));
    document.getElementById('btn5Dias')?.addEventListener('click', () => dispararBuscaPorAtalho(5));
    document.getElementById('btn15Dias')?.addEventListener('click', () => dispararBuscaPorAtalho(15));
    document.getElementById('btnMes')?.addEventListener('click', () => dispararBuscaPorAtalho(30));

    // Sanitização Segura Exigida pelo Firefox (Substitui innerHTML por DOMParser)
    function higienizarEFormatador(htmlBruto) {
        if (!htmlBruto) return "";
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlBruto, 'text/html');
            const texto = (doc.body.textContent || "").replace(/\s\s+/g, ' ').trim();
            const termosCriticos = /prazo|liminar|tutela|procedente|improcedente|extinto|multa|penhora/gi;
            return texto.replace(termosCriticos, "**$&**");
        } catch (e) {
            return htmlBruto.replace(/<[^>]*>?/gm, '').trim();
        }
    }

    function extrairProcesso(item, textoLimpo) {
        let num = item.numeroprocesso || item.numero_processo || item.numeroProcesso;
        if (!num || num === "undefined") {
            const match = textoLimpo.match(/\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/);
            num = match ? match[0] : "0000000-00.0000.0.00.0000";
        }
        return num;
    }

    // Renderização Segura com createElement (Sem innerHTML)
    function renderizarResultados(items) {
        divResultados.textContent = ""; 

        if (items.length === 0) {
            const p = document.createElement("p");
            p.textContent = "Nenhum resultado corresponde ao filtro.";
            divResultados.appendChild(p);
            return;
        }

        items.forEach(i => {
            const textoLimpo = higienizarEFormatador(i.texto || i.teor);
            const proc = extrairProcesso(i, textoLimpo);
            const sigla = i.siglaTribunal || 'TJ';

            const divIntimacao = document.createElement("div");
            divIntimacao.className = "intimacao";
            
            const strong = document.createElement("strong");
            strong.textContent = `${sigla} - ${proc}`;
            
            const divTeor = document.createElement("div");
            divTeor.className = "teor";
            divTeor.textContent = textoLimpo; 

            divIntimacao.appendChild(strong);
            divIntimacao.appendChild(divTeor);
            divResultados.appendChild(divIntimacao);
        });
    }

    // Filtro Dinâmico
    filtroRapido.addEventListener('input', () => {
        const termo = filtroRapido.value.toLowerCase();
        resultadosExibidos = resultadosGlobais.filter(i => {
            const texto = (i.texto || i.teor || "").toLowerCase();
            const proc = extrairProcesso(i, "").toLowerCase();
            return texto.includes(termo) || proc.includes(termo);
        });
        
        if (typeof chrome !== "undefined" && chrome.action) {
            const qtd = resultadosExibidos.length;
            chrome.action.setBadgeText({ text: qtd > 0 ? qtd.toString() : "" });
        }
        renderizarResultados(resultadosExibidos);
    });

    // Busca na API
    btnBuscar.addEventListener('click', async () => {
        const num = inputOabNum.value.trim();
        const uf = inputOabUf.value.trim().toUpperCase();

        if (!num || !uf) {
            divResultados.textContent = "⚠️ Preencha a OAB e a UF.";
            return;
        }

        localStorage.setItem('djen_oab_num', num);
        localStorage.setItem('djen_oab_uf', uf);
        
        btnBuscar.disabled = true;
        btnBuscar.textContent = "⏳ Consultando...";
        divResultados.textContent = "Processando dados do CNJ...";
        btnCopiar.style.display = 'none';
        containerFiltro.style.display = 'none';
        filtroRapido.value = "";

        try {
            const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${num}&ufOab=${uf}&dataDisponibilizacaoInicio=${inputInicio.value}&dataDisponibilizacaoFim=${inputFim.value}`;
            const resp = await fetch(url);
            const dados = await resp.json();
            
            resultadosGlobais = dados.items || [];
            resultadosExibidos = [...resultadosGlobais];
            
            if (resultadosGlobais.length === 0) {
                divResultados.textContent = "Nenhuma intimação encontrada no período.";
                if (typeof chrome !== "undefined" && chrome.action) chrome.action.setBadgeText({ text: "" }); 
            } else {
                if (typeof chrome !== "undefined" && chrome.action) {
                    chrome.action.setBadgeText({ text: resultadosGlobais.length.toString() });
                    chrome.action.setBadgeBackgroundColor({ color: "#3584e4" });
                }
                btnCopiar.style.display = 'block';
                containerFiltro.style.display = 'block';
                renderizarResultados(resultadosExibidos);
            }
        } catch (e) {
            divResultados.textContent = "❌ Erro de conexão com o servidor do CNJ.";
        } finally {
            btnBuscar.disabled = false;
            btnBuscar.textContent = "Consultar Intimações";
        }
    });

    // Exportação para Outlining
    btnCopiar.addEventListener('click', () => {
        if (resultadosExibidos.length === 0) return;
        const dataPesquisa = new Date().toLocaleDateString('pt-BR');
        const txtFinal = resultadosExibidos.map((i) => {
            const textoLimpo = higienizarEFormatador(i.texto || i.teor);
            const proc = extrairProcesso(i, textoLimpo);
            const blocos = textoLimpo.split('\n').map(b => b.trim()).filter(b => b.length > 0);
            return `* Processo: ${proc} | Tribunal: ${i.siglaTribunal} | **Data da pesquisa: ${dataPesquisa}** | Texto: ${blocos[0] || ""}
  * ${blocos.slice(1).join(' ')}`;
        }).join('\n\n');

        navigator.clipboard.writeText(txtFinal).then(() => {
            const label = btnCopiar.textContent;
            btnCopiar.textContent = "✓ Lista Copiada!";
            if (typeof chrome !== "undefined" && chrome.action) chrome.action.setBadgeText({ text: "" }); 
            setTimeout(() => { btnCopiar.textContent = label; }, 2000);
        });
    });
});

window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && typeof chrome !== "undefined" && chrome.action) {
        chrome.action.setBadgeText({ text: "" });
    }
});
