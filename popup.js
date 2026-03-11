/**
 * Buscador DJEN - Extensão de Navegador v1.9.0
 * Funcionalidade de Caixa de Entrada (Lido/Não Lido) e Ajuda Embutida
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
    const btnDownload = document.getElementById('btnDownloadTxt');
    const actionContainer = document.getElementById('actionContainer');
    const filtroRapido = document.getElementById('filtroRapido');
    const filtroTribunal = document.getElementById('filtroTribunal');
    const containerFiltro = document.getElementById('containerFiltro');
    const loader = document.getElementById('loader');
    const contador = document.getElementById('contadorOcorrencias');
    const btnToggleDicionario = document.getElementById('btnToggleDicionario');
    const btnExpandirTodos = document.getElementById('btnExpandirTodos');

    // Configurações e Ajuda
    const btnAbrirConfig = document.getElementById('btnAbrirConfig');
    const btnFecharConfig = document.getElementById('btnFecharConfig');
    const btnSalvarConfig = document.getElementById('btnSalvarConfig');
    const btnCarregarPadrao = document.getElementById('btnCarregarPadrao');
    const painelConfig = document.getElementById('painelConfig');
    const txtTermosCustom = document.getElementById('txtTermosCustom');
    const areaBusca = document.getElementById('areaBusca');

    let resultadosGlobais = [];
    let resultadosExibidos = [];
    let filtroDicionarioAtivo = false;
    let todosExpandidos = false;

    let termosAtivos = [];
    let regexTermosCriticos = null;

    function compilarDicionario() {
        const customString = localStorage.getItem('djen_termos_custom') || "";
        txtTermosCustom.value = customString;

        termosAtivos = customString.split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        termosAtivos = [...new Set(termosAtivos)];

        if (termosAtivos.length > 0) {
            const termosEscapados = termosAtivos.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            regexTermosCriticos = new RegExp(`(${termosEscapados.join('|')})`, 'gi');
        } else {
            regexTermosCriticos = null;
        }
    }

    compilarDicionario(); 

    btnAbrirConfig.addEventListener('click', () => {
        painelConfig.style.display = 'block';
        areaBusca.style.display = 'none';
    });

    btnFecharConfig.addEventListener('click', () => {
        painelConfig.style.display = 'none';
        areaBusca.style.display = 'block';
    });

    // Novo recurso: Preencher dicionário com Starter Pack
    btnCarregarPadrao.addEventListener('click', () => {
        const termosSugeridos = "prazo, apresentar, manifestar, junte, juntar, comprovar, contestar, contrarrazões, audiência, sob pena de, liminar, tutela, procedente, improcedente, extinto, multa, penhora";
        if (txtTermosCustom.value.trim() === "") {
            txtTermosCustom.value = termosSugeridos;
        } else {
            txtTermosCustom.value += ", " + termosSugeridos;
        }
    });

    btnSalvarConfig.addEventListener('click', () => {
        const novosTermos = txtTermosCustom.value;
        localStorage.setItem('djen_termos_custom', novosTermos);
        compilarDicionario(); 
        
        btnSalvarConfig.textContent = "✓ Salvo!";
        setTimeout(() => {
            btnSalvarConfig.textContent = "Salvar Dicionário";
            painelConfig.style.display = 'none';
            areaBusca.style.display = 'block';
            
            if (resultadosGlobais.length > 0) {
                aplicarFiltros();
            }
        }, 1000);
    });

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

    document.getElementById('btnHoje')?.addEventListener('click', () => { aplicarDataRapida(0); btnBuscar.click(); });
    document.getElementById('btn5Dias')?.addEventListener('click', () => { aplicarDataRapida(5); btnBuscar.click(); });
    document.getElementById('btn15Dias')?.addEventListener('click', () => { aplicarDataRapida(15); btnBuscar.click(); });
    document.getElementById('btnMes')?.addEventListener('click', () => { aplicarDataRapida(30); btnBuscar.click(); });

    function limparHTMLBruto(htmlBruto) {
        if (!htmlBruto) return "";
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlBruto, 'text/html');
            return (doc.body.textContent || "").replace(/\s\s+/g, ' ').trim();
        } catch (e) {
            return htmlBruto.replace(/<[^>]*>?/gm, '').trim();
        }
    }

    function verificaSeTemDicionario(textoLower) {
        if (termosAtivos.length === 0) return false;
        return termosAtivos.some(termo => textoLower.includes(termo));
    }

    function formatarCNJ(numStr) {
        let n = numStr.replace(/\D/g, ''); 
        if (n.length === 20) {
            return n.replace(/^(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})$/, "$1-$2.$3.$4.$5.$6");
        }
        return numStr; 
    }

    function formatarParaExportacao(textoLimpo, proc, sigla, dataDisp) {
        const temAcao = verificaSeTemDicionario(textoLimpo.toLowerCase());
        const procExibicao = temAcao ? `⚠️ ${proc}` : proc;
        
        let textoDestacado = textoLimpo;
        if (regexTermosCriticos) {
            textoDestacado = textoLimpo.replace(regexTermosCriticos, "**$&**");
        }
        const blocos = textoDestacado.split('\n').map(b => b.trim()).filter(b => b.length > 0);

        return `* Processo: ${procExibicao} | Tribunal: ${sigla} | **Disp: ${dataDisp}** (⚠️ Confirme no sistema)\n  * Texto: ${blocos[0] || ""}\n  * ${blocos.slice(1).join(' ')}`;
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
        filtroTribunal.textContent = ''; 
        const optTodos = document.createElement('option');
        optTodos.value = "";
        optTodos.textContent = "🏛️ Todos os Tribunais";
        filtroTribunal.appendChild(optTodos);

        tribunais.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            filtroTribunal.appendChild(opt);
        });
    }

    btnToggleDicionario.addEventListener('click', () => {
        if (termosAtivos.length === 0) {
            alert("⚠️ Seu dicionário está vazio. Clique na engrenagem no topo para adicionar os termos que deseja filtrar.");
            return;
        }
        filtroDicionarioAtivo = !filtroDicionarioAtivo;
        btnToggleDicionario.classList.toggle('ativo', filtroDicionarioAtivo);
        aplicarFiltros();
    });

    btnExpandirTodos.addEventListener('click', () => {
        todosExpandidos = !todosExpandidos;
        btnExpandirTodos.textContent = todosExpandidos ? "🔼 Recolher Todos" : "🔽 Expandir Todos";
        const cards = document.querySelectorAll('.intimacao-card');
        cards.forEach(card => {
            if (todosExpandidos) {
                card.classList.add('aberto');
                card.classList.add('lido'); // Marca todos como lidos ao expandir
            } else {
                card.classList.remove('aberto');
            }
        });
    });

    function aplicarFiltros() {
        const termo = filtroRapido.value.toLowerCase();
        const tribunalSelecionado = filtroTribunal.value;

        resultadosExibidos = resultadosGlobais.filter(i => {
            const texto = limparHTMLBruto(i.texto || i.teor);
            const proc = extrairProcesso(i, texto).toLowerCase();
            const sigla = i.siglaTribunal || 'TJ';
            const textoLower = texto.toLowerCase();

            const procFormatado = formatarCNJ(proc).toLowerCase();

            const matchTexto = textoLower.includes(termo) || proc.includes(termo) || procFormatado.includes(termo);
            const matchTribunal = tribunalSelecionado === "" || sigla === tribunalSelecionado;
            const matchDicionario = !filtroDicionarioAtivo || verificaSeTemDicionario(textoLower);

            return matchTexto && matchTribunal && matchDicionario;
        });
        
        if (typeof chrome !== "undefined" && chrome.action) {
            const qtd = resultadosExibidos.length;
            chrome.action.setBadgeText({ text: qtd > 0 ? qtd.toString() : "" });
        }
        renderizarResultados(resultadosExibidos);
        
        if (todosExpandidos) {
            document.querySelectorAll('.intimacao-card').forEach(c => {
                c.classList.add('aberto');
                c.classList.add('lido');
            });
        }
    }

    filtroRapido.addEventListener('input', aplicarFiltros);
    filtroTribunal.addEventListener('change', aplicarFiltros);

    function aplicarMarcaTexto(container, texto) {
        container.textContent = ""; 
        
        if (!regexTermosCriticos) {
            container.appendChild(document.createTextNode(texto));
            return;
        }

        let ultimoIndice = 0;
        let match;
        
        regexTermosCriticos.lastIndex = 0; 
        
        while ((match = regexTermosCriticos.exec(texto)) !== null) {
            if (match.index > ultimoIndice) {
                container.appendChild(document.createTextNode(texto.substring(ultimoIndice, match.index)));
            }
            const mark = document.createElement("mark");
            mark.className = "highlight-term";
            mark.textContent = match[0];
            container.appendChild(mark);
            
            ultimoIndice = regexTermosCriticos.lastIndex;
        }
        
        if (ultimoIndice < texto.length) {
            container.appendChild(document.createTextNode(texto.substring(ultimoIndice)));
        }
    }

    function renderizarResultados(items) {
        divResultados.textContent = ""; 
        let qtdOcorrencias = 0; 

        if (items.length === 0) {
            const p = document.createElement("p");
            p.style.textAlign = "center";
            p.style.padding = "20px";
            p.style.color = "var(--text-muted)";
            p.textContent = filtroDicionarioAtivo ? "Nenhum termo do seu dicionário foi encontrado nesta seleção." : "Nenhuma intimação para exibir.";
            divResultados.appendChild(p);
            contador.style.display = 'none';
            return;
        }

        items.forEach(i => {
            const textoLimpo = limparHTMLBruto(i.texto || i.teor);
            const procCru = extrairProcesso(i, textoLimpo);
            const procFormatado = formatarCNJ(procCru); 
            const sigla = i.siglaTribunal || 'TJ';

            const temAlerta = verificaSeTemDicionario(textoLimpo.toLowerCase());
            if (temAlerta) qtdOcorrencias++;

            const dataBruta = i.data_disponibilizacao || i.dataDisponibilizacao || "";
            let dataDisp = "";
            if (dataBruta) {
                const d = new Date(dataBruta);
                if (!isNaN(d)) dataDisp = d.toLocaleDateString('pt-BR');
            }

            const divCard = document.createElement("div");
            divCard.className = "intimacao-card";
            
            const divCabecalho = document.createElement("div");
            divCabecalho.className = "card-header";
            divCabecalho.title = "Clique para ler a intimação";

            const spanTribunal = document.createElement("span");
            spanTribunal.className = "badge badge-tribunal";
            spanTribunal.textContent = sigla;
            divCabecalho.appendChild(spanTribunal);

            const spanProc = document.createElement("span");
            spanProc.className = "proc-numero";
            spanProc.textContent = procFormatado; 
            divCabecalho.appendChild(spanProc);

            const spanData = document.createElement("span");
            spanData.className = "data-disp";
            spanData.textContent = dataDisp ? `Disp: ${dataDisp}` : "";
            divCabecalho.appendChild(spanData);

            const divAcoes = document.createElement("div");
            divAcoes.className = "acoes-card";

            if (temAlerta) {
                const iconeAlerta = document.createElement("span");
                iconeAlerta.className = "icone-alerta";
                iconeAlerta.textContent = "⚠️"; 
                iconeAlerta.title = "Atenção: Termo do seu dicionário encontrado";
                divAcoes.appendChild(iconeAlerta);
            }

            const btnCopiaUnica = document.createElement("button");
            btnCopiaUnica.className = "btn-copia-individual";
            btnCopiaUnica.textContent = "📋";
            btnCopiaUnica.title = "Copiar intimação";
            
            btnCopiaUnica.addEventListener('click', (e) => {
                e.stopPropagation(); 
                
                // Marca o processo como LIDO visualmente
                divCard.classList.add('lido');
                
                const textoFinal = formatarParaExportacao(textoLimpo, procFormatado, sigla, dataDisp);
                navigator.clipboard.writeText(textoFinal).then(() => {
                    btnCopiaUnica.textContent = "✅";
                    setTimeout(() => { btnCopiaUnica.textContent = "📋"; }, 1500);
                });
            });
            divAcoes.appendChild(btnCopiaUnica);

            const seta = document.createElement("span");
            seta.className = "icone-seta";
            seta.textContent = "🔽";
            divAcoes.appendChild(seta);

            divCabecalho.appendChild(divAcoes); 

            divCabecalho.addEventListener('click', () => {
                divCard.classList.toggle('aberto');
                // Marca o processo como LIDO visualmente ao expandir
                divCard.classList.add('lido');
            });
            
            const divTeorCompleto = document.createElement("div");
            divTeorCompleto.className = "teor";
            aplicarMarcaTexto(divTeorCompleto, textoLimpo); 

            divCard.appendChild(divCabecalho);
            divCard.appendChild(divTeorCompleto);
            divResultados.appendChild(divCard);
        });

        if (qtdOcorrencias > 0) {
            contador.textContent = ""; 
            const iconNode = document.createTextNode("⚠️ ");
            const spanText = document.createElement("span");
            const strongNode = document.createElement("strong");
            strongNode.textContent = `${qtdOcorrencias} processos`;
            spanText.append("Contêm termos do seu dicionário (", strongNode, ").");
            contador.append(iconNode, spanText);
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
        filtroDicionarioAtivo = false;
        btnToggleDicionario.classList.remove('ativo');
        todosExpandidos = false;
        btnExpandirTodos.textContent = "🔽 Expandir Todos";

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

    function gerarTextoExportacaoCompleto() {
        if (resultadosExibidos.length === 0) return "";
        return resultadosExibidos.map((i) => {
            const textoLimpo = limparHTMLBruto(i.texto || i.teor);
            const procCru = extrairProcesso(i, textoLimpo);
            const procFormatado = formatarCNJ(procCru); 
            const sigla = i.siglaTribunal || 'TJ';
            
            const dataBruta = i.data_disponibilizacao || i.dataDisponibilizacao || "";
            let dataDisp = "Não informada";
            if (dataBruta) {
                const d = new Date(dataBruta);
                if (!isNaN(d)) dataDisp = d.toLocaleDateString('pt-BR');
            }
            
            return formatarParaExportacao(textoLimpo, procFormatado, sigla, dataDisp);
        }).join('\n\n');
    }

    btnCopiar.addEventListener('click', () => {
        const txtFinal = gerarTextoExportacaoCompleto();
        if (!txtFinal) return;

        navigator.clipboard.writeText(txtFinal).then(() => {
            const label = btnCopiar.textContent;
            btnCopiar.textContent = "✓ Lista Inteira Copiada!";
            
            // Marca toda a lista visível como lida ao clicar no botão global
            document.querySelectorAll('.intimacao-card').forEach(c => c.classList.add('lido'));

            setTimeout(() => { btnCopiar.textContent = label; }, 2000);
        });
    });

    btnDownload.addEventListener('click', () => {
        const txtFinal = gerarTextoExportacaoCompleto();
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
