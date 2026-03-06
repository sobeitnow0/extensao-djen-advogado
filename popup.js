/**
 * Buscador DJEN - Extensão de Navegador
 * Autor: Amilcar Moreira (@sobeitnow0)
 * OAB/SP: 349.457
 * Descrição: Extração higienizada de intimações da API nacional do CNJ.
 */

document.addEventListener('DOMContentLoaded', () => {
    const inputOabNum = document.getElementById('oabNum');
    const inputOabUf = document.getElementById('oabUf');
    const inputInicio = document.getElementById('dataInicio');
    const inputFim = document.getElementById('dataFim');
    const btnBuscar = document.getElementById('btnBuscar');
    const divResultados = document.getElementById('resultados');
    const btnCopiar = document.getElementById('btnCopiarTodos');

    let resultadosGlobais = [];

    // Carregar preferências salvas
    inputOabNum.value = localStorage.getItem('djen_oab_num') || "349457";
    inputOabUf.value = localStorage.getItem('djen_oab_uf') || "SP";

    // Data local hoje
    const dataLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    inputInicio.value = dataLocal;
    inputFim.value = dataLocal;

    function higienizarTexto(htmlBruto) {
        if (!htmlBruto) return "";
        let tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlBruto;
        return tempDiv.textContent || tempDiv.innerText || "";
    }

    function extrairProcesso(item, textoLimpo) {
        let num = item.numeroprocesso || item.numero_processo || item.numeroProcesso;
        if (!num || num === "undefined") {
            const match = textoLimpo.match(/\d{7}-\d{2}\.\d{4}\.\d{1,2}\.\d{2}\.\d{4}/);
            num = match ? match[0] : "Não identificado";
        }
        return num;
    }

    btnBuscar.addEventListener('click', async () => {
        const num = inputOabNum.value.trim();
        const uf = inputOabUf.value.trim().toUpperCase();
        const d1 = inputInicio.value;
        const d2 = inputFim.value;

        if (!num || !uf || !d1 || !d2) return alert("Preencha todos os campos.");
        
        localStorage.setItem('djen_oab_num', num);
        localStorage.setItem('djen_oab_uf', uf);
        
        divResultados.innerHTML = "<p>⏳ Consultando...</p>";
        btnCopiar.style.display = 'none';

        try {
            const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${num}&ufOab=${uf}&dataDisponibilizacaoInicio=${d1}&dataDisponibilizacaoFim=${d2}`;
            const resp = await fetch(url);
            const dados = await resp.json();
            const items = dados.items || [];
            
            if (items.length === 0) {
                divResultados.innerHTML = "<p>Nenhuma intimação encontrada.</p>";
            } else {
                resultadosGlobais = items;
                btnCopiar.style.display = 'block';
                divResultados.innerHTML = items.map(i => {
                    const textoLimpo = higienizarTexto(i.texto || i.teor);
                    const proc = extrairProcesso(i, textoLimpo);
                    return `
                        <div class="intimacao">
                            <strong>${i.siglaTribunal}</strong> - ${proc}<br>
                            <div class="teor">${textoLimpo}</div>
                        </div>
                    `;
                }).join('');
            }
        } catch (e) {
            divResultados.innerHTML = "<p style='color:red;'>Erro na conexão com o servidor.</p>";
        }
    });

    btnCopiar.addEventListener('click', () => {
        const txt = resultadosGlobais.map(i => {
            const textoLimpo = higienizarTexto(i.texto || i.teor).trim();
            const proc = extrairProcesso(i, textoLimpo);
            return `Processo: ${proc}\nTribunal: ${i.siglaTribunal}\nTexto: ${textoLimpo}`;
        }).join('\n\n');

        navigator.clipboard.writeText(txt).then(() => {
            const labelOriginal = btnCopiar.innerText;
            btnCopiar.innerText = "✓ Copiado com sucesso!";
            setTimeout(() => { btnCopiar.innerText = labelOriginal; }, 2000);
        });
    });
});
