/**
 * Buscador DJEN - Extensão de Navegador
 * Autor: Amilcar Moreira (@sobeitnow0)
 */

if (chrome.action) chrome.action.setBadgeText({ text: "" });

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

    inputOabNum.value = localStorage.getItem('djen_oab_num') || "";
    inputOabUf.value = localStorage.getItem('djen_oab_uf') || "";
    
    // --- FUNÇÃO DE DATAS RÁPIDAS ---
    function aplicarDataRapida(diasRetroativos) {
        const hoje = new Date();
        const inicio = new Date();
        inicio.setDate(hoje.getDate() - diasRetroativos);
        
        // sv-SE formata estritamente como YYYY-MM-DD mantendo o timezone local
        inputInicio.value = inicio.toLocaleDateString('sv-SE');
        inputFim.value = hoje.toLocaleDateString('sv-SE');
    }

    // Inicializa com a data de hoje
    aplicarDataRapida(0);

    // Eventos dos links de data
    document.getElementById('btnHoje').addEventListener('click', () => aplicarDataRapida(0));
    document.getElementById('btn5Dias').addEventListener('click', () => aplicarDataRapida(5));
    document.getElementById('btn15Dias').addEventListener('click', () => aplicarDataRapida(15));
    document.getElementById('btnMes').addEventListener('click', () => aplicarDataRapida(30));

    function higienizarEFormatador(htmlBruto) {
        if (!htmlBruto) return "";
        let tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlBruto;
        let texto = (tempDiv.textContent || tempDiv.innerText || "").replace(/\s\s+/g, ' ').trim();
        const termosCriticos = /prazo|liminar|tutela|procedente|improcedente|extinto|multa|penhora/gi;
        return texto.replace(termosCriticos, "**$&**");
    }

    function extrairProcesso(item, textoLimpo) {
        let num = item.numeroprocesso || item.numero_processo || item.numeroProcesso;
        if (!num || num === "undefined") {
            const match = textoLimpo.match(/\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/);
            num = match ? match[0] : "0000000-00.0000.0.00.0000";
        }
        return num;
    }

    function renderizarResultados(items) {
        if (items.length === 0) {
            divResultados.innerHTML = "<p>Nenhum resultado corresponde ao filtro.</p>";
            return;
        }
        divResultados.innerHTML = items.map(i => {
            const textoLimpo = higienizarEFormatador(i.texto || i.teor);
            const proc = extrairProcesso(i, textoLimpo);
            return `<div class="intimacao"><strong>${i.siglaTribunal || 'TJ'}</strong> - ${proc}<br><div class="teor">${textoLimpo}</div></div>`;
        }).join('');
    }

    filtroRapido.addEventListener('input', () => {
        const termo = filtroRapido.value.toLowerCase();
        resultadosExibidos = resultadosGlobais.filter(i => {
            const texto = (i.texto || i.teor || "").toLowerCase();
            const proc = extrairProcesso(i, "").toLowerCase();
            return texto.includes(termo) || proc.includes(termo);
        });
        
        if (chrome.action) {
            const qtd = resultadosExibidos.length;
            chrome.action.setBadgeText({ text: qtd > 0 ? qtd.toString() : "0" });
        }

        renderizarResultados(resultadosExibidos);
    });

    btnBuscar.addEventListener('click', async () => {
        const num = inputOabNum.value.trim();
        const uf = inputOabUf.value.trim().toUpperCase();
        const d1 = inputInicio.value;
        const d2 = inputFim.value;

        if (!num || !uf) {
            divResultados.innerHTML = "<p style='color:#d35400;'>⚠️ Preencha a OAB e a UF.</p>";
            return;
        }

        if (num && uf) {
            localStorage.setItem('djen_oab_num', num);
            localStorage.setItem('djen_oab_uf', uf);
        }
        
        // PREVENÇÃO DE DUPLO CLIQUE (UX de Carregamento)
        btnBuscar.disabled = true;
        btnBuscar.innerText = "⏳ Consultando...";
        divResultados.innerHTML = "<p>Processando dados do CNJ...</p>";
        
        btnCopiar.style.display = 'none';
        containerFiltro.style.display = 'none';
        filtroRapido.value = "";

        try {
            const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${num}&ufOab=${uf}&dataDisponibilizacaoInicio=${d1}&dataDisponibilizacaoFim=${d2}`;
            const resp = await fetch(url);
            const dados = await resp.json();
            
            resultadosGlobais = dados.items || [];
            resultadosExibidos = [...resultadosGlobais];
            
            if (resultadosGlobais.length === 0) {
                divResultados.innerHTML = "<p>Nenhuma intimação encontrada no período.</p>";
                chrome.action.setBadgeText({ text: "" }); 
            } else {
                chrome.action.setBadgeText({ text: resultadosGlobais.length.toString() });
                chrome.action.setBadgeBackgroundColor({ color: "#3584e4" });

                btnCopiar.style.display = 'block';
                containerFiltro.style.display = 'block';
                renderizarResultados(resultadosExibidos);
            }
        } catch (e) {
            divResultados.innerHTML = "<p style='color:#f38ba8;'>Erro de conexão com o CNJ.</p>";
        } finally {
            // DEVOLVE O ESTADO DO BOTÃO DE BUSCA
            btnBuscar.disabled = false;
            btnBuscar.innerText = "Consultar Intimações";
        }
    });

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
            const label = btnCopiar.innerText;
            btnCopiar.innerText = "✓ Lista Copiada!";
            chrome.action.setBadgeText({ text: "" }); 
            setTimeout(() => { btnCopiar.innerText = label; }, 2000);
        });
    });
});

window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        chrome.action.setBadgeText({ text: "" });
    }
});

window.addEventListener('unload', () => {
    chrome.action.setBadgeText({ text: "" });
});
