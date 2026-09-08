// Serviço de Exportação e Compartilhamento
// Contém rotinas de geração de PDF, TXT, CSV, Links para o Google Agenda e modal de compartilhamento

const ExportService = {

    gerarRelatorioExecutivo: function (itens, advogadoNome, branding, dataFiltro) {
        if (!itens || itens.length === 0) {
            if (typeof showToast === 'function') showToast("Sem resultados para o relatório.", "⚠️");
            return;
        }
        if (typeof showToast === 'function') showToast("Gerando Relatório Executivo...", "⏳");
        
        try {
            const taskId = Date.now().toString();
            const worker = new Worker(chrome.runtime.getURL('workers/exportWorker.js'));

            worker.onmessage = function(e) {
                if (e.data.taskId === taskId) {
                    if (e.data.error) {
                        if (typeof showToast === 'function') showToast("Erro no Relatório.", "❌");
                        worker.terminate();
                        return;
                    }
                    if (e.data.result) {
                        const blob = new Blob([e.data.result], { type: "text/html;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        if (typeof showToast === 'function') showToast("Relatório Executivo gerado!", "📑");
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                        worker.terminate();
                    }
                }
            };

            worker.onerror = function(err) {
                if (typeof showToast === 'function') showToast("Erro interno.", "❌");
                worker.terminate();
            };

            worker.postMessage({
                action: 'gerarRelatorioExecutivo',
                payload: { 
                    itensArray: itens,
                    advogadoNome: advogadoNome || '',
                    branding: branding || {},
                    pdfStyles: typeof getPdfStyles === 'function' ? getPdfStyles() : '',
                    palavrasUrgentes: typeof palavrasUrgentes !== 'undefined' ? palavrasUrgentes : [],
                    dataFiltro: dataFiltro
                },
                taskId
            });
        } catch (err) {
            if (typeof showToast === 'function') showToast("Falha ao iniciar worker.", "⚠️");
        }
    },
    gerarPDFMes: function (mesAnoStr, itens) {
        if (itens.length === 0) { showToast(`Nenhum prazo registrado em ${mesAnoStr}.`, "⚠️"); return; }
        
        showToast("Gerando PDF...", "⏳");

        try {
            const workerUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('workers/exportWorker.js') : 'workers/exportWorker.js';
            const worker = new Worker(workerUrl);
            const taskId = Date.now().toString();

            worker.onmessage = function(e) {
                const { error, result, progress } = e.data;
                if (error) {
                    showToast("Erro ao gerar PDF: " + error, "❌");
                    worker.terminate();
                } else if (result) {
                    const blob = new Blob([result], { type: 'text/html' }); 
                    const url = URL.createObjectURL(blob);
                    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) { 
                        chrome.tabs.create({ url: url }); 
                    } else { 
                        window.open(url, '_blank'); 
                    }
                    showToast("PDF gerado com sucesso!", "✅");
                    worker.terminate();
                } else if (progress) {
                    // console.log(`DJEN PDF Export: ${progress}%`);
                }
            };

            worker.onerror = function(err) {
                showToast("Erro no processamento do PDF.", "❌");
                worker.terminate();
            };

            const defBranding = {
                nome: (typeof brandingNome !== 'undefined' && brandingNome) ? brandingNome : 'Buscador DJEN',
                slogan: (typeof brandingSlogan !== 'undefined' && brandingSlogan) ? brandingSlogan : 'Seus prazos sob controle',
                contato: (typeof brandingContato !== 'undefined' && brandingContato) ? brandingContato : 'www.buscadordjen.com.br',
                cor: (typeof brandingCor !== 'undefined' && brandingCor) ? brandingCor : '#3a72b5',
                logo: (typeof brandingLogo !== 'undefined' && brandingLogo) ? brandingLogo : 'https://www.buscadordjen.com.br/wp-content/uploads/2024/02/DJEN_03-1024x455.png'
            };

            worker.postMessage({
                action: 'gerarPDFHtml',
                payload: { 
                    itensArray: itens, 
                    mesAnoStr: mesAnoStr,
                    advogadoNome: defBranding.nome,
                    branding: defBranding,
                    pdfStyles: typeof getPdfStyles === 'function' ? getPdfStyles() : '',
                    palavrasUrgentes: typeof palavrasUrgentes !== 'undefined' ? palavrasUrgentes : []
                },
                taskId
            });
        } catch (err) {
            console.error("Falha ao iniciar worker:", err);
            showToast("Falha ao usar o processador em background.", "⚠️");
        }
    },

    gerarPDFAuditoria: function (item, timeline, brandingData) {
        if (!item || !timeline) {
            if (typeof showToast === 'function') showToast("Calcule o prazo primeiro para exportar a auditoria.", "⚠️");
            return;
        }

        if (typeof showToast === 'function') showToast("Gerando PDF da Auditoria...", "⏳");

        try {
            const taskId = Date.now().toString();
            const worker = new Worker(chrome.runtime.getURL('workers/exportWorker.js'));

            worker.onmessage = function (e) {
                if (e.data.taskId === taskId) {
                    if (e.data.error) {
                        console.error("DJEN: Erro no exportWorker (Auditoria):", e.data.error);
                        if (typeof showToast === 'function') showToast("Erro ao gerar PDF.", "❌");
                        worker.terminate();
                        return;
                    }

                    if (e.data.result) {
                        const blob = new Blob([e.data.result], { type: "text/html;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        if (typeof showToast === 'function') showToast("PDF da Auditoria gerado!", "📑");
                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                        worker.terminate();
                    }
                }
            };

            worker.onerror = function (err) {
                console.error("DJEN: Erro de script no exportWorker:", err);
                if (typeof showToast === 'function') showToast("Erro interno na exportação.", "❌");
                worker.terminate();
            };

            const defBranding = {
                nome: (brandingData && brandingData.nome) ? brandingData.nome : 'Buscador DJEN',
                slogan: (brandingData && brandingData.slogan) ? brandingData.slogan : 'Seus prazos sob controle',
                contato: (brandingData && brandingData.contato) ? brandingData.contato : 'www.buscadordjen.com.br',
                cor: (brandingData && brandingData.cor) ? brandingData.cor : '#3a72b5',
                logo: (brandingData && brandingData.logo) ? brandingData.logo : 'https://www.buscadordjen.com.br/wp-content/uploads/2024/02/DJEN_03-1024x455.png'
            };

            worker.postMessage({
                action: 'gerarPDFHtmlAuditoria',
                payload: { 
                    item: item, 
                    timeline: timeline,
                    branding: defBranding,
                    pdfStyles: typeof getPdfStyles === 'function' ? getPdfStyles() : ''
                },
                taskId
            });
        } catch (e) {
            console.error("DJEN: Erro ao instanciar worker de exportação:", e);
            if (typeof showToast === 'function') showToast("Erro ao carregar módulo de exportação.", "❌");
        }
    },

    gerarLinkGCal: function (p) {
        if (!p || !p.fatal) return '';
        const partesData = p.fatal.split('/'); const ano = partesData[2]; const mes = partesData[1]; const dia = partesData[0];
        const horaConfig = document.getElementById('horaNotificacao')?.value || "08:30";
        const [h, min] = horaConfig.split(':');
        const dataObj = new Date(ano, mes - 1, dia, parseInt(h), parseInt(min));
        const dataInicio = `${ano}${mes}${dia}T${h}${min}00`;
        dataObj.setHours(dataObj.getHours() + 1);
        const nextAno = dataObj.getFullYear(); const nextMes = String(dataObj.getMonth() + 1).padStart(2, '0'); const nextDia = String(dataObj.getDate()).padStart(2, '0'); const nextH = String(dataObj.getHours()).padStart(2, '0'); const nextMin = String(dataObj.getMinutes()).padStart(2, '0');
        const dataFim = `${nextAno}${nextMes}${nextDia}T${nextH}${nextMin}00`;
        const alias = p.apelido ? `[${p.apelido}] ` : '';
        const title = encodeURIComponent(`🚨 PRAZO FATAL: ${alias}${p.processo}`);

        let descStr = `Processo: ${p.processo}\nDisponibilizado: ${p.disp || p.pub}\nPublicação: ${p.pub}\nInício do Prazo: ${p.inicio}`;

        let tagsAutom = [];
        if (p.textoCompleto) {
            const textoLow = p.textoCompleto.toLowerCase();
            (window.palavrasUrgentes || []).forEach(palavra => {
                if (textoLow.includes(palavra)) {
                    const palavraFormatada = palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
                    tagsAutom.push("#" + palavraFormatada);
                }
            });
        }

        if (tagsAutom.length > 0) {
            descStr += `\n\n🎯 RADAR AUTOMÁTICO:\n${tagsAutom.join(' ')}`;
        }

        if (p.anotacao) {
            descStr += `\n\n📌 Notas Manuais:\n${p.anotacao}`;
        }

        if (p.feriados > 0 || p.prorrogado) { descStr += `\n\n⚠️ AUDITORIA DO CÁLCULO:`; if (p.feriados > 0) descStr += `\n- ${p.feriados} dias não úteis/feriados desviados.`; if (p.prorrogado) descStr += `\n- O prazo fatal caiu num dia não útil e foi prorrogado para o dia útil seguinte.`; }
        if (p.temFeriadoMunicipal) { descStr += `\n\n🚨 ATENÇÃO SJT:\nPrazo coincide com feriado municipal. Anexe certidão ou decreto local para comprovar a tempestividade (art. 1.003, § 6º, CPC).`; }

        descStr += `\n\n---\n🤖 Calculado pelo Buscador DJEN\n🌐 www.buscadordjen.com.br`;

        if (descStr.length > 1500) { descStr = descStr.substring(0, 1500) + "\n\n... [Texto truncado devido a limite da URL]"; }

        // Modifica a URL para usar a sub-rota do e-mail configurado, se houver
        const emailGcal = document.getElementById('inputEmailGcal')?.value.trim() || localStorage.getItem('djen_email_gcal');
        const urlParams = `text=${title}&dates=${dataInicio}/${dataFim}&details=${encodeURIComponent(descStr)}`;

        // Se não houver, ele abre na conta padrão normalmente, sem risco de erro 404.
        if (emailGcal && emailGcal.trim() !== "") {
            return `https://calendar.google.com/calendar/render?action=TEMPLATE&authuser=${encodeURIComponent(emailGcal.trim())}&${urlParams}`;
        }

        // Se não houver e-mail, mantemos a rota clássica padrão
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&${urlParams}`;
    },

    gerarTextoCompartilhamento: function (arr, tituloContexto = "Publicação") {
        if (!Array.isArray(arr)) arr = [arr];
        let txtBase = "";
        
        if (arr.length > 1) {
            txtBase += `🗓️ *${tituloContexto || 'Controle de Prazos DJEN'}*\n\n`;
            const pendentes = arr.filter(p => !p.cumprido);
            const cumpridos = arr.filter(p => p.cumprido);
            const atrasados = pendentes.filter(p => p.fatal && (globalThis.parseDateBR(p.fatal).getTime() - new Date().setHours(12,0,0,0)) < 0);
            
            txtBase += `📊 *RESUMO:*\n`;
            txtBase += `• Total listados: ${arr.length}\n`;
            txtBase += `• Pendentes: ${pendentes.length} ${atrasados.length > 0 ? `(🚨 ${atrasados.length} Atrasado${atrasados.length > 1 ? 's' : ''})` : ''}\n`;
            txtBase += `• Cumpridos: ${cumpridos.length}\n\n`;
            txtBase += `--------------------------------------------------\n\n`;
        }

        arr.forEach((p, index) => {
            let num = arr.length > 1 ? `*${index + 1}.* ` : "";
            let txtRaw = p.textoCompleto || p.teor || "";
            let proc = globalThis.getProc(p, globalThis.cleanText(txtRaw)); if (proc !== "Processo s/ número") proc = globalThis.formatCNJ(proc);
            let tituloProc = p.apelido ? `*${p.apelido}*\n${proc}` : `*${proc}*`;
            let status = "";
            let objPrazo = p.prazoCalculado || p;

            if (objPrazo.cumprido) status = "✅ Cumprido";
            else if (!objPrazo.fatal) status = "⚠️ Sem prazo";
            else {
                const diff = Math.ceil((globalThis.parseDateBR(objPrazo.fatal).getTime() - new Date().setHours(12, 0, 0, 0)) / (1000 * 3600 * 24));
                status = diff < 0 ? "🚨 Atrasado" : (diff === 0 ? "⚠️ Vence Hoje" : `⏳ Pendente (${diff} dias)`);
            }

            txtBase += `${num}${tituloProc}\n`;
            txtBase += `🏢 Tribunal: ${p.siglaTribunal || (objPrazo.mat || 'MANUAL')}\n`;
            if (objPrazo.fatal) txtBase += `📅 Prazo Fatal: ${objPrazo.fatal} (${status})\n`;
            else txtBase += `📅 Status: ${status}\n`;

            let tarefas = objPrazo.tarefas || p.tarefas || [];
            if (tarefas && tarefas.length > 0) {
                txtBase += `\n📋 *Tarefas:*\n`;
                tarefas.forEach(t => {
                    txtBase += `${t.feita ? '✅' : '☐'} ${t.texto}\n`;
                });
            }

            if (p.anotacao) {
                let cleanNotes = p.anotacao.replace(/#[\wÀ-ÿ_]+/g, '').trim();
                if (cleanNotes) txtBase += `\n📝 *Anotações:*\n${cleanNotes}\n`;
            }

            if (txtRaw) txtBase += `\n📄 Teor: ${globalThis.cleanText(txtRaw)}\n`;

            if (arr.length > 1) txtBase += `\n--------------------------------------------------\n\n`;
        });

        const defNome = (typeof brandingNome !== 'undefined' && brandingNome) ? brandingNome : 'Advogado(a)';
        const defSite = (typeof brandingContato !== 'undefined' && brandingContato) ? brandingContato : 'www.buscadordjen.com.br';

        if (arr.length > 1) {
            txtBase += `---\n🤖 *Buscador DJEN*\n🌐 ${defSite}\n👤 Advogado: ${defNome}`;
        } else {
            txtBase += `\n---\n🤖 *Buscador DJEN* | 🌐 ${defSite} | 👤 Advogado: ${defNome}`;
        }
        return txtBase.trim();
    },

    exportarTxtLote: function (arr, titulo) {
        if (!arr || arr.length === 0) { showToast("Nenhum item para copiar.", "⚠️"); return; }
        const txtBase = ExportService.gerarTextoCompartilhamento(arr, titulo);
        const fallbackCopy = (text) => { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); showToast("Resultados copiados em lote!", "📎"); };
        if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txtBase).then(() => { ; showToast("Resultados copiados em lote!", "📎"); }).catch(() => fallbackCopy(txtBase)); } else { fallbackCopy(txtBase); }
    },

    limparMarkdownEEmojis: function (text) {
        if (!text) return "";
        let semEmoji = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]/gu, '');
        let semMd = semEmoji
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            .replace(/-{10,}/g, '')
            .replace(/^[ \t]*•[ \t]*/gm, '- ')
            .replace(/☐/g, '[ ]')
            ;
        return semMd.replace(/\n{3,}/g, '\n\n').trim();
    },

    baixarTxtLote: function (arr, titulo) {
        if (!arr || arr.length === 0) { showToast("Nenhum item para exportar.", "⚠️"); return; }
        const txtBase = ExportService.gerarTextoCompartilhamento(arr, titulo);
        const blob = new Blob([txtBase], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${titulo.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.txt`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Relatório TXT baixado!", "📥");
    },

    exportarCsvLote: function (arr) {
        if (!arr || arr.length === 0) { showToast("Nenhum item para exportar.", "⚠️"); return; }
        
        // Aplicação de Segmentação por Período (Data Início / Data Fim)
        const dInicio = document.getElementById('dataInicio')?.value;
        const dFim = document.getElementById('dataFim')?.value;
        let filteredArr = arr;
        
        if (dInicio || dFim) {
            filteredArr = arr.filter(p => {
                let dt = null;
                if (p.data_disponibilizacao) {
                    dt = new Date(p.data_disponibilizacao + 'T12:00:00');
                } else if (p.prazoCalculado && p.prazoCalculado.fatal) {
                    dt = globalThis.parseDateBR(p.prazoCalculado.fatal);
                } else if (p.fatal) {
                    dt = globalThis.parseDateBR(p.fatal);
                }
                
                if (!dt || isNaN(dt.getTime())) return true;
                
                if (dInicio) {
                    const dtI = new Date(dInicio + 'T00:00:00');
                    if (dt < dtI) return false;
                }
                if (dFim) {
                    const dtF = new Date(dFim + 'T23:59:59');
                    if (dt > dtF) return false;
                }
                return true;
            });
        }
        
        if (filteredArr.length === 0) { showToast("Nenhum item no período selecionado.", "⚠️"); return; }

        const headers = ["Processo", "Apelido", "Tribunal", "Prazo Fatal", "Status", "Cumprido", "Anotacoes", "Teor"];
        const rows = filteredArr.map(p => {
            let txtRaw = p.textoCompleto || p.teor || "";
            let proc = globalThis.getProc(p, globalThis.cleanText(txtRaw));
            if (proc !== "Processo s/ número") proc = globalThis.formatCNJ(proc);
            let objPrazo = p.prazoCalculado || p;
            let status = "";
            if (objPrazo.cumprido) status = "Cumprido";
            else if (!objPrazo.fatal) status = "Sem prazo";
            else {
                const diff = Math.ceil((globalThis.parseDateBR(objPrazo.fatal).getTime() - new Date().setHours(12, 0, 0, 0)) / (1000 * 3600 * 24));
                status = diff < 0 ? "Atrasado" : (diff === 0 ? "Vence Hoje" : `Pendente (${diff} dias)`);
            }
            let fatal = objPrazo.fatal || "";
            let apelido = p.apelido || "";
            let tribunal = p.siglaTribunal || (objPrazo.mat || 'MANUAL');
            let cumprido = objPrazo.cumprido ? "Sim" : "Não";
            let anotacoes = "";
            if (p.anotacao) {
                anotacoes = p.anotacao.replace(/#[\wÀ-ÿ_]+/g, '').trim();
            }
            let teor = globalThis.cleanText(txtRaw);
            return [proc, apelido, tribunal, fatal, status, cumprido, anotacoes, teor].map(val => {
                let s = String(val).replace(/"/g, '""');
                if (s.includes(",") || s.includes("\n") || s.includes('"')) {
                    return `"${s}"`;
                }
                return s;
            });
        });
        
        const defNome = (typeof brandingNome !== 'undefined' && brandingNome) ? brandingNome : 'Advogado(a)';
        const defSite = (typeof brandingContato !== 'undefined' && brandingContato) ? brandingContato : 'www.buscadordjen.com.br';

        rows.push([]);
        rows.push(["Gerado por:", "Buscador DJEN"]);
        rows.push(["Site:", defSite]);
        rows.push(["Advogado:", defNome]);

        const csvContent = "\uFEFF" + [headers.join(",")].concat(rows.map(r => r.join(","))).join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_prazos_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Planilha CSV baixada!", "📊");
    },

    abrirModalCompartilhar: function (tipo) {
        const modal = document.getElementById('shareModal');
        const title = document.getElementById('shareModalTitle');
        if (tipo === 'lote') {
            if (title) title.textContent = "Exportar & Compartilhar Lote";
        } else {
            if (title) title.textContent = "Compartilhar Publicação";
        }
        if (modal) modal.classList.add('show');
    }
};

globalThis.gerarPDFMes = ExportService.gerarPDFMes;
globalThis.gerarLinkGCal = ExportService.gerarLinkGCal;
globalThis.gerarTextoCompartilhamento = ExportService.gerarTextoCompartilhamento;
globalThis.exportarTxtLote = ExportService.exportarTxtLote;
globalThis.limparMarkdownEEmojis = ExportService.limparMarkdownEEmojis;
globalThis.baixarTxtLote = ExportService.baixarTxtLote;
globalThis.exportarCsvLote = ExportService.exportarCsvLote;
globalThis.abrirModalCompartilhar = ExportService.abrirModalCompartilhar;

globalThis.copyToClipboard = function (text, successCallback) {
    const fallbackCopy = (txt) => {
        const ta = document.createElement("textarea");
        ta.value = txt;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => {
                if (successCallback) successCallback();
            })
            .catch(() => {
                fallbackCopy(text);
                if (successCallback) successCallback();
            });
    } else {
        fallbackCopy(text);
        if (successCallback) successCallback();
    }
};


globalThis.gerarRelatorioExecutivo = ExportService.gerarRelatorioExecutivo;