/**
 * Buscador DJEN - Extensão de Navegador v1.3.0
 

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
    const btnDownload = document.getElementById('btnDownloadTxt');
    const actionContainer = document.getElementById('actionContainer');
    const filtroRapido = document.getElementById('filtroRapido');
    const filtroTribunal = document.getElementById('filtroTribunal');
    const containerFiltro = document.getElementById('containerFiltro');
    const loader = document.getElementById('loader');
    const contador = document.getElementById('contadorOcorrencias');

    let resultadosGlobais = [];
    let resultadosExibidos = [];

    inputOabNum.value = localStorage.getItem('djen_oab_num') || "";
    inputOabUf.value = localStorage.getItem('djen_oab_uf') || "";
    
    function aplicarDataRapida(diasRetroativos) {
        const hoje = new Date();
        const inicio = new Date();
        inicio.setDate(hoje.getDate() - diasRetroativos);
        inputInicio.value = inicio.toISOString().split('T')[0];
        inputFim.value = hoje.toISOString().split('T')[0];
    }

    aplicarDataRapida(0);

    function dispararBuscaPorAtalho(dias) {
        aplicarDataRapida(dias);
        btnBuscar.click();
    }

    document.getElementById('btnHoje')?.addEventListener('click', () => dispararBuscaPorAtalho(0));
    document.getElementById('btn5Dias')?.addEventListener('click', () => dispararBuscaPorAtalho(5));
    document.getElementById('btn15Dias')?.addEventListener('click', () => dispararBuscaPorAtalho(15));
    document.getElementById('btnMes')?.addEventListener('click', () => dispararBuscaPorAtalho(30));

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

    function popularTribunais(items) {
        const tribunais = [...new Set(items.map(i => i.siglaTribunal || 'TJ'))].sort();
        filtroTribunal.innerHTML = '<option value="">🏛️ Todos os Tribunais</option>';
        tribunais.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            filtroTribunal.appendChild(opt);
        });
    }

    function aplicarFiltros() {
        const termo = filtroRapido.value.toLowerCase();
        const tribunalSelecionado = filtroTribunal.value;

        resultadosExibidos = resultadosGlobais.filter(i => {
            const texto = (i.texto || i.teor || "").toLowerCase();
            const proc = extrairProcesso(i, "").toLowerCase();
            const sigla = i.siglaTribunal || 'TJ';

            const matchTexto = texto.includes(termo) || proc.includes(termo);
            const matchTribunal = tribunalSelecionado === "" || sigla === tribunalSelecionado;

            return matchTexto && matchTribunal;
        });
        
        if (typeof chrome !== "undefined" && chrome.action) {
            const qtd = resultadosExibidos.length;
            chrome.action.setBadgeText({ text: qtd > 0 ? qtd.toString() : "" });
        }
        renderizarResultados(resultadosExibidos);
    }

    filtroRapido.addEventListener('input', aplicarFiltros);
    filtroTribunal.addEventListener('change', aplicarFiltros);

    function renderizarResultados(items) {
        divResultados.textContent = ""; 
        let qtdPrazos = 0; 

        if (items.length === 0) {
            const p = document.createElement("p");
            p.style.textAlign = "center";
            p.style.padding = "20px";
            p.style.color = "var(--text-muted)";
            p.textContent = "Nenhuma intimação para exibir.";
            divResultados.appendChild(p);
            contador.style.display = 'none';
            return;
        }

        items.forEach(i => {
            const textoLimpo = higienizarEFormatador(i.texto || i.teor);
            const proc = extrairProcesso(i, textoLimpo);
            const sigla = i.siglaTribunal || 'TJ';

            const temPrazo = textoLimpo.toLowerCase().includes("prazo");
            if (temPrazo) qtdPrazos++;

            const dataBruta = i.data_disponibilizacao || i.dataDisponibilizacao || "";
            let dataDisp = "";
            if (dataBruta) {
                const d = new Date(dataBruta);
                if (!isNaN(d)) dataDisp = d.toLocaleDateString('pt-BR');
            }

            // Construção do Novo Card Premium
            const divCard = document.createElement("div");
            divCard.className = "intimacao-card";
            
            const divCabecalho = document.createElement("div");
            divCabecalho.className = "card-header";

            // Etiqueta (Badge) do Tribunal
            const spanTribunal = document.createElement("span");
            spanTribunal.className = "badge badge-tribunal";
            spanTribunal.textContent = sigla;
            divCabecalho.appendChild(spanTribunal);

            // Etiqueta (Badge) de Prazo (Se houver)
            if (temPrazo) {
                const spanPrazo = document.createElement("span");
                spanPrazo.className = "badge badge-prazo";
                spanPrazo.innerHTML = "⚠️ Prazo";
                divCabecalho.appendChild(spanPrazo);
            }

            // Número do Processo Monospace
            const spanProc = document.createElement("span");
            spanProc.className = "proc-numero";
            spanProc.textContent = proc;
            divCabecalho.appendChild(spanProc);

            // Data alinhada à direita
            const spanData = document.createElement("span");
            spanData.className = "data-disp";
            spanData.textContent = dataDisp ? `Disp: ${dataDisp}` : "";
            divCabecalho.appendChild(spanData);
            
            // Corpo de Texto
            const divTeor = document.createElement("div");
            divTeor.className = "teor";
            divTeor.textContent = textoLimpo; 

            divCard.appendChild(divCabecalho);
            divCard.appendChild(divTeor);
            divResultados.appendChild(divCard);
        });

        // Atualiza a barra de alerta geral
        if (qtdPrazos > 0) {
            contador.innerHTML = `<span>⚠️</span> <span>Existem <strong>${qtdPrazos} prazos</strong> mapeados na lista abaixo.</span>`;
            contador.style.display = 'flex';
        } else {
            contador.style.display = 'none';
        }
    }

    btnBuscar.addEventListener('click', async () => {
        const num = inputOabNum.value.trim();
        const uf = inputOabUf.value.trim().toUpperCase();

        if (!num || !uf) {
            alert("⚠️ Preencha o Número da OAB e a UF antes de consultar.");
            return;
        }

        localStorage.setItem('djen_oab_num', num);
        localStorage.setItem('djen_oab_uf', uf);
        
        btnBuscar.disabled = true;
        btnBuscar.textContent = "⏳ Consultando API...";
        divResultados.textContent = ""; 
        loader.style.display = 'block'; 
        actionContainer.style.display = 'none';
        containerFiltro.style.display = 'none';
        contador.style.display = 'none';
        filtroRapido.value = "";
        filtroTribunal.value = "";

        try {
            const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${num}&ufOab=${uf}&dataDisponibilizacaoInicio=${inputInicio.value}&dataDisponibilizacaoFim=${inputFim.value}`;
            const resp = await fetch(url);
            const dados = await resp.json();
            
            resultadosGlobais = dados.items || [];
            resultadosExibidos = [...resultadosGlobais];
            
            if (resultadosGlobais.length === 0) {
                renderizarResultados([]); 
                if (typeof chrome !== "undefined" && chrome.action) chrome.action.setBadgeText({ text: "" }); 
            } else {
                if (typeof chrome !== "undefined" && chrome.action) {
                    chrome.action.setBadgeText({ text: resultadosGlobais.length.toString() });
                    chrome.action.setBadgeBackgroundColor({ color: "#0f172a" });
                }
                popularTribunais(resultadosGlobais); 
                actionContainer.style.display = 'flex'; 
                containerFiltro.style.display = 'flex'; 
                renderizarResultados(resultadosExibidos);
            }
        } catch (e) {
            divResultados.textContent = "❌ Erro de conexão com o servidor do CNJ.";
        } finally {
            loader.style.display = 'none';
            btnBuscar.disabled = false;
            btnBuscar.textContent = "Consultar Intimações";
        }
    });

    function gerarTextoExportacao() {
        if (resultadosExibidos.length === 0) return "";
        return resultadosExibidos.map((i) => {
            const textoLimpo = higienizarEFormatador(i.texto || i.teor);
            const proc = extrairProcesso(i, textoLimpo);
            const temPrazo = textoLimpo.toLowerCase().includes("prazo");
            
            const dataBruta = i.data_disponibilizacao || i.dataDisponibilizacao || "";
            let dataDisp = "Não informada";
            if (dataBruta) {
                const d = new Date(dataBruta);
                if (!isNaN(d)) dataDisp = d.toLocaleDateString('pt-BR');
            }
            
            const blocos = textoLimpo.split('\n').map(b => b.trim()).filter(b => b.length > 0);
            
            // Mantém a lógica de embutir o ⚠️ no arquivo TXT/Área de Transferência
            const procExibicao = temPrazo ? `⚠️ ${proc}` : proc;

            return `* Processo: ${procExibicao} | Tribunal: ${i.siglaTribunal} | **Disp: ${dataDisp}** (⚠️ Confirme no sistema)\n  * Texto: ${blocos[0] || ""}\n  * ${blocos.slice(1).join(' ')}`;
        }).join('\n\n');
    }

    btnCopiar.addEventListener('click', () => {
        const txtFinal = gerarTextoExportacao();
        if (!txtFinal) return;

        navigator.clipboard.writeText(txtFinal).then(() => {
            const label = btnCopiar.textContent;
            btnCopiar.textContent = "✓ Copiado!";
            setTimeout(() => { btnCopiar.textContent = label; }, 2000);
        });
    });

    btnDownload.addEventListener('click', () => {
        const txtFinal = gerarTextoExportacao();
        if (!txtFinal) return;

        const blob = new Blob([txtFinal], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const num = inputOabNum.value.trim();
        const uf = inputOabUf.value.trim().toUpperCase();
        const dataHoje = new Date().toISOString().split('T')[0];
        
        a.href = url;
        a.download = `Intimacoes_OAB_${num}_${uf}_${dataHoje}.txt`; 
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

}); 

window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && typeof chrome !== "undefined" && chrome.action) {
        chrome.action.setBadgeText({ text: "" });
    }
});
