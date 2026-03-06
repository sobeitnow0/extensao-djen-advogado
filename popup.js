/**
 * Buscador DJEN - Extensão de Navegador
 * Autor: Amilcar Moreira (@sobeitnow0)
 * OAB/SP: 349.457
 */

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

    // Configuração inicial
    inputOabNum.value = localStorage.getItem('djen_oab_num') || "349457";
    inputOabUf.value = localStorage.getItem('djen_oab_uf') || "SP";
    const hoje = new Date().toLocaleDateString('sv-SE');
    inputInicio.value = hoje;
    inputFim.value = hoje;

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

    filtroRapido.addEventListener('input', () => {
        const termo = filtroRapido.value.toLowerCase();
        const filtrados = resultadosGlobais.filter(i => {
            const texto = (i.texto || i.teor || "").toLowerCase();
            const proc = extrairProcesso(i, "").toLowerCase();
            return texto.includes(termo) || proc.includes(termo);
        });
        renderizarResultados(filtrados);
    });

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

    btnBuscar.addEventListener('click', async () => {
        const num = inputOabNum.value.trim();
        const uf = inputOabUf.value.trim().toUpperCase();
        const d1 = inputInicio.value;
        const d2 = inputFim.value;

        localStorage.setItem('djen_oab_num', num);
        localStorage.setItem('djen_oab_uf', uf);
        
        divResultados.innerHTML = "<p>⏳ Consultando API do CNJ...</p>";
        btnCopiar.style.display = 'none';
        containerFiltro.style.display = 'none';

        try {
            const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${num}&ufOab=${uf}&dataDisponibilizacaoInicio=${d1}&dataDisponibilizacaoFim=${d2}`;
            const resp = await fetch(url);
            const dados = await resp.json();
            resultadosGlobais = dados.items || [];
            
            if (resultadosGlobais.length === 0) {
                divResultados.innerHTML = "<p>Nenhuma intimação encontrada.</p>";
                chrome.action.setBadgeText({ text: "" }); 
            } else {
                // Ativa o Badge com a quantidade de resultados
                chrome.action.setBadgeText({ text: resultadosGlobais.length.toString() });
                chrome.action.setBadgeBackgroundColor({ color: "#3584e4" });

                btnCopiar.style.display = 'block';
                containerFiltro.style.display = 'block';
                renderizarResultados(resultadosGlobais);
            }
        } catch (e) {
            divResultados.innerHTML = "<p style='color:red;'>Erro na conexão.</p>";
        }
    });

    btnCopiar.addEventListener('click', () => {
        const dataPesquisa = new Date().toLocaleDateString('pt-BR');
        const txtFinal = resultadosGlobais.map((i) => {
            const textoLimpo = higienizarEFormatador(i.texto || i.teor);
            const proc = extrairProcesso(i, textoLimpo);
            const blocos = textoLimpo.split('\n').map(b => b.trim()).filter(b => b.length > 0);
            return `* Processo: ${proc} | Tribunal: ${i.siglaTribunal} | **Data da pesquisa: ${dataPesquisa}** | Texto: ${blocos[0] || ""}
  * ${blocos.slice(1).join(' ')}`;
        }).join('\n\n');

        navigator.clipboard.writeText(txtFinal).then(() => {
            const label = btnCopiar.innerText;
            btnCopiar.innerText = "✓ Copiado!";
            
            // CASO 1: Limpa o badge ao clicar em copiar
            chrome.action.setBadgeText({ text: "" });
            
            setTimeout(() => { btnCopiar.innerText = label; }, 2000);
        });
    });
});

// CASO 2: Limpa o badge se a extensão for fechada
window.addEventListener('pagehide', () => {
    chrome.action.setBadgeText({ text: "" });
});
