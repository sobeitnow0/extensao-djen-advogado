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

    let resultadosGlobais = [];

    // Carregar OAB salva ou usar padrão
    inputOabNum.value = localStorage.getItem('djen_oab_num') || "349457";
    inputOabUf.value = localStorage.getItem('djen_oab_uf') || "SP";

    // Data de hoje como padrão
    const dataLocal = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    inputInicio.value = dataLocal;
    inputFim.value = dataLocal;

    btnBuscar.addEventListener('click', async () => {
        const num = inputOabNum.value.trim();
        const uf = inputOabUf.value.trim().toUpperCase();
        const d1 = inputInicio.value;
        const d2 = inputFim.value;

        if (!num || !uf || !d1 || !d2) return alert("Preencha todos os campos.");
        
        localStorage.setItem('djen_oab_num', num);
        localStorage.setItem('djen_oab_uf', uf);
        
        divResultados.innerHTML = "<p>⏳ Buscando...</p>";
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
                divResultados.innerHTML = items.map(i => `
                    <div class="intimacao">
                        <strong>${i.siglaTribunal}</strong> - ${i.numeroprocesso}<br>
                        <div class="teor">${i.texto || i.teor}</div>
                    </div>
                `).join('');
            }
        } catch (e) {
            divResultados.innerHTML = "<p style='color:red;'>Erro na conexão.</p>";
        }
    });

    btnCopiar.addEventListener('click', () => {
        const txt = resultadosGlobais.map(i => `Processo: ${i.numeroprocesso}\nTexto: ${i.texto || i.teor}`).join('\n\n');
        navigator.clipboard.writeText(txt).then(() => alert("Conteúdo copiado com sucesso!"));
    });
});
