/**
 * Export Worker — Web Worker para geração assíncrona de CSV/Exportações
 * Descarrega o processamento pesado da thread principal, evitando congelamento da interface (UI thread).
 */

self.onmessage = function(e) {
    const { action, payload, taskId } = e.data;

    if (action === 'gerarCSVDados') {
        const { itensArray, nomeArquivoBase, branding } = payload;
        
        if (!itensArray || itensArray.length === 0) {
            self.postMessage({ taskId, error: "Nenhum dado para exportar." });
            return;
        }

        try {
            const brandNome = branding && branding.nome ? branding.nome : "Meu Escritório";
            const brandSlogan = branding && branding.slogan ? " (" + branding.slogan + ")" : "";
            const brandContato = branding && branding.contato ? " | " + branding.contato : "";
            
            let csv = `"Buscador DJEN";"Exportação de Prazos";"Escritório: ${brandNome}${brandSlogan}${brandContato}";"";"";"";"";"";"";"";"";"";"";"";"";"";"";"";"";"";""\n`;
            csv += "Processo;Apelido;Tribunal;UF;Status;Prazo_Fatal;Tarefas_Pendentes;Tarefas_Concluidas;Anotacoes;Texto_Publicacao;Municipio;Feriados_Detectados;Materia;Tipo_Contagem;Inicio_Prazo;Dias_Prazo;Houve_Prorrogacao;Disponibilizacao;Publicacao;Criacao;ID_Sistema\n";

            // Simular carga para mostrar a progressão do worker (opcional se for mt rápido)
            const total = itensArray.length;

            itensArray.forEach((p, idx) => {
                const limpaCSV = (str) => {
                    if (!str) return "";
                    return String(str).replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
                };

                const formataDataStr = (str) => {
                    if (!str) return "";
                    if (str.includes('/')) return str;
                    const parts = str.split('T')[0].split('-');
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                    return str;
                };

                const idSistema = p.idSistema || "";
                const processo = p.processo || "";
                const apelido = limpaCSV(p.apelido);
                const tribunal = p.siglaTribunal || (p.manual ? "MANUAL" : "");
                const uf = p.uf || "";
                const municipio = limpaCSV(p.mun);
                const materia = p.mat || "";
                const criacao = p.manual ? "Manual" : "Captura Automática";
                const tipoContagem = p.mat === 'Criminal' ? "Dias Corridos" : "Dias Úteis";
                const diasPrazo = p.dias || "";
                const disp = formataDataStr(p.disp);
                const pub = formataDataStr(p.pub);
                const inicio = formataDataStr(p.inicio);
                const fatal = p.fatal || ""; 
                const feriados = p.feriados || 0;
                const prorrogado = p.prorrogado ? "SIM" : "NAO";
                
                let status = "SEM PRAZO";
                if (p.cumprido) status = "CUMPRIDO";
                else if (p.fatal) {
                    // Lógica simplificada de diff de dias
                    const parts = p.fatal.split('/');
                    if (parts.length === 3) {
                        const dataFatal = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                        const hjTime = new Date();
                        hjTime.setHours(12, 0, 0, 0);
                        const diff = Math.ceil((dataFatal.getTime() - hjTime.getTime()) / (1000 * 3600 * 24));
                        status = diff < 0 ? "ATRASADO" : (diff === 0 ? "VENCE HOJE" : "PENDENTE");
                    } else {
                        status = "PENDENTE";
                    }
                }
                
                let pendentes = [];
                let concluidas = [];
                if (p.tarefas && Array.isArray(p.tarefas)) {
                    p.tarefas.forEach(t => {
                        if (t.feita) concluidas.push(t.texto);
                        else pendentes.push(t.texto);
                    });
                }
                const tarefasPendentesStr = limpaCSV(pendentes.join(" | "));
                const tarefasConcluidasStr = limpaCSV(concluidas.join(" | "));

                const anotacoes = limpaCSV(p.anotacao);
                const textoPub = limpaCSV(p.textoCompleto || p.teor);

                csv += `"${processo}";"${apelido}";"${tribunal}";"${uf}";"${status}";"${fatal}";"${tarefasPendentesStr}";"${tarefasConcluidasStr}";"${anotacoes}";"${textoPub}";"${municipio}";"${feriados}";"${materia}";"${tipoContagem}";"${inicio}";"${diasPrazo}";"${prorrogado}";"${disp}";"${pub}";"${criacao}";"${idSistema}"\n`;

                // Notificar progresso a cada 100 itens
                if (idx > 0 && idx % 100 === 0) {
                    self.postMessage({ taskId, progress: Math.round((idx / total) * 100) });
                }
            });

            // Retorna o conteúdo final
            self.postMessage({ taskId, result: csv, progress: 100 });

        } catch (error) {
            self.postMessage({ taskId, error: error.message });
        }

    } else if (action === 'gerarRelatorioExecutivo') {
        const { itensArray, advogadoNome, pdfStyles, palavrasUrgentes, branding, dataFiltro } = payload;
        
        if (!itensArray || itensArray.length === 0) {
            self.postMessage({ taskId, error: "Nenhum resultado para gerar o relatório." });
            return;
        }

        try {
            const dataHoje = new Date();
            const dateStr = `${String(dataHoje.getDate()).padStart(2, '0')}/${String(dataHoje.getMonth() + 1).padStart(2, '0')}/${dataHoje.getFullYear()}`;
            
            const brandNome = branding && branding.nome ? branding.nome : "Meu Escritório";
            const brandCor = branding && branding.cor ? branding.cor : "#141413";
            const brandLogo = branding && branding.logo ? branding.logo : "";
            
            const gruposPorTribunal = {};
            let totalUrgentes = 0;
            
            itensArray.forEach(item => {
                const trib = item.siglaTribunal || 'OUTROS';
                if (!gruposPorTribunal[trib]) gruposPorTribunal[trib] = [];
                
                let hasUrgencia = false;
                if (item.textoCompleto || item.teor) {
                    const txtLow = (item.textoCompleto || item.teor).toLowerCase();
                    if (Array.isArray(palavrasUrgentes)) {
                        palavrasUrgentes.forEach(palavra => {
                            if (txtLow.includes(palavra)) hasUrgencia = true;
                        });
                    }
                }
                if (hasUrgencia) totalUrgentes++;
                
                gruposPorTribunal[trib].push({ ...item, hasUrgencia });
            });
            
            const tribunais = Object.keys(gruposPorTribunal).sort();
            
            let html = `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Relatório Executivo Djen</title>
                <style>
                    ${pdfStyles}
                    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');
                    
                    body { font-family: 'Inter', sans-serif; background: #fff; color: #1c1917; margin: 0; padding: 0; }
                    
                    .cover-page { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always; padding: 2rem; background: #f8fafc; border: 8px solid ${brandCor}; box-sizing: border-box; }
                    .cover-logo { max-width: 250px; margin-bottom: 2rem; }
                    .cover-title { font-family: 'Playfair Display', serif; font-size: 3.5rem; font-weight: 700; color: ${brandCor}; margin: 0; line-height: 1.1; }
                    .cover-subtitle { font-size: 1.5rem; color: #475569; margin-top: 1rem; font-weight: 300; }
                    .cover-meta { margin-top: auto; padding-top: 4rem; border-top: 1px solid #cbd5e1; width: 100%; display: flex; justify-content: space-between; font-size: 0.9rem; color: #64748b; }
                    
                    .summary-section { page-break-after: always; padding: 3rem; }
                    .section-title { font-family: 'Playfair Display', serif; font-size: 2.2rem; color: ${brandCor}; border-bottom: 2px solid ${brandCor}; padding-bottom: 0.5rem; margin-bottom: 2rem; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 3rem; }
                    .stat-box { background: #f1f5f9; padding: 1.5rem; border-radius: 8px; text-align: center; border-top: 4px solid ${brandCor}; }
                    .stat-value { font-size: 2.5rem; font-weight: 700; color: #0f172a; }
                    .stat-label { font-size: 0.9rem; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 0.5rem; }
                    
                    .tribunal-section { page-break-before: always; padding: 2rem; }
                    .tribunal-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: ${brandCor}; color: #fff; border-radius: 8px; }
                    .tribunal-name { font-size: 1.8rem; font-weight: 600; margin: 0; }
                    .tribunal-count { background: rgba(255,255,255,0.2); padding: 0.2rem 0.8rem; border-radius: 20px; font-size: 0.9rem; }
                    
                    .pub-card { border-left: 3px solid #cbd5e1; padding-left: 1.5rem; margin-bottom: 2rem; page-break-inside: avoid; }
                    .pub-urgencia { border-left-color: #ef4444; }
                    .pub-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
                    .pub-process { font-family: monospace; font-size: 1rem; font-weight: 600; color: #334155; }
                    .pub-badge-urgente { background: #fee2e2; color: #991b1b; font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; }
                    .pub-teor { font-family: 'Playfair Display', serif; font-size: 0.95rem; line-height: 1.6; color: #1e293b; text-align: justify; }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .cover-page { height: 100vh !important; }
                    }
                </style>
            </head>
            <body>
                <div class="cover-page">
                    ${brandLogo ? `<img src="${brandLogo}" class="cover-logo">` : ''}
                    <h1 class="cover-title">Relatório Executivo<br>de Movimentação Jurídica</h1>
                    <div class="cover-subtitle">Síntese de Publicações e Urgências</div>
                    <div class="cover-meta">
                        <div><strong>Período:</strong> ${dataFiltro || dateStr}</div>
                        <div><strong>Escritório:</strong> ${brandNome}</div>
                        <div><strong>Advogado Resp:</strong> ${advogadoNome || '-'}</div>
                    </div>
                </div>
                
                <div class="summary-section">
                    <h2 class="section-title">Visão Geral</h2>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-value">${itensArray.length}</div>
                            <div class="stat-label">Total de Publicações</div>
                        </div>
                        <div class="stat-box" style="border-top-color: #ef4444;">
                            <div class="stat-value" style="color: #ef4444;">${totalUrgentes}</div>
                            <div class="stat-label">Alertas do Radar</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${tribunais.length}</div>
                            <div class="stat-label">Tribunais Monitorados</div>
                        </div>
                    </div>
                    
                    <h3>Distribuição por Tribunal</h3>
                    <ul style="list-style:none; padding:0; margin-top: 1rem; column-count: 2;">
                        ${tribunais.map(t => `<li style="padding: 0.5rem; border-bottom: 1px solid #e2e8f0; display:flex; justify-content: space-between;"><strong>${t}</strong> <span>${gruposPorTribunal[t].length}</span></li>`).join('')}
                    </ul>
                </div>
            `;
            
            tribunais.forEach((trib, tIdx) => {
                const pubs = gruposPorTribunal[trib];
                html += `<div class="tribunal-section">
                    <div class="tribunal-header">
                        <h2 class="tribunal-name">${trib}</h2>
                        <span class="tribunal-count">${pubs.length} ocorrência(s)</span>
                    </div>`;
                    
                pubs.forEach(p => {
                    const proc = p.processo || 'Sem número';
                    const urgBadge = p.hasUrgencia ? `<span class="pub-badge-urgente">Atenção Necessária</span>` : '';
                    const classUrg = p.hasUrgencia ? ' pub-urgencia' : '';
                    
                    let teorCortado = p.textoCompleto || p.teor || '';
                    if (teorCortado.length > 800) teorCortado = teorCortado.substring(0, 800) + '... [Trecho Resumido]';
                    
                    html += `
                    <div class="pub-card${classUrg}">
                        <div class="pub-header">
                            <div class="pub-process">${proc} ${p.apelido ? `<span style="color:#94a3b8">(${p.apelido})</span>` : ''}</div>
                            ${urgBadge}
                        </div>
                        <div class="pub-teor">${teorCortado.replace(/\n/g, '<br>')}</div>
                    </div>`;
                });
                html += `</div>`;
                
                self.postMessage({ taskId, progress: Math.round(((tIdx+1) / tribunais.length) * 100) });
            });

            html += `
            <script> window.onload = function() { setTimeout(function() { window.print(); }, 500); } </script>
            </body></html>`;

            self.postMessage({ taskId, result: html, progress: 100 });
        } catch (error) {
            self.postMessage({ taskId, error: error.message });
        }

    } else if (action === 'gerarPDFHtml') {
        const { itensArray, mesAnoStr, advogadoNome, pdfStyles, palavrasUrgentes, branding } = payload;
        
        if (!itensArray || itensArray.length === 0) {
            self.postMessage({ taskId, error: "Nenhum prazo registrado." });
            return;
        }

        try {
            const dataHoje = new Date();
            const dateStr = `${String(dataHoje.getDate()).padStart(2, '0')}/${String(dataHoje.getMonth() + 1).padStart(2, '0')}/${dataHoje.getFullYear()}`;
            const timeStr = `${String(dataHoje.getHours()).padStart(2, '0')}:${String(dataHoje.getMinutes()).padStart(2, '0')}`;
            const hjTime = new Date(); hjTime.setHours(12, 0, 0, 0);

            // Recreate parseDateBR inside worker
            const parseDateBR = (str) => {
                if (!str || typeof str !== 'string') return new Date();
                if (str.includes('/')) {
                    const [d, m, y] = str.split('/');
                    if (y && y.length === 4) return new Date(y, parseInt(m) - 1, d);
                }
                const parts = str.split('T')[0].split('-');
                if (parts.length === 3) return new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                return new Date(str);
            };

            let sortedItems = itensArray.sort((a, b) => {
                if (!a.fatal) return 1; if (!b.fatal) return -1;
                return parseDateBR(a.fatal).getTime() - parseDateBR(b.fatal).getTime();
            });
            
            const total = sortedItems.length;
            const cumpridos = sortedItems.filter(p => p.cumprido).length;
            const pendentes = total - cumpridos;
            const taxaEficiencia = total > 0 ? Math.round((cumpridos / total) * 100) : 0;
            
            let atrasados = 0;
            sortedItems.forEach(p => {
                if (!p.cumprido && p.fatal) {
                    const dataFatal = parseDateBR(p.fatal); 
                    const diff = Math.ceil((dataFatal.getTime() - hjTime.getTime()) / (1000 * 3600 * 24));
                    if (diff < 0) atrasados++;
                }
            });

            const nomeArquivoMes = `Agenda_DJEN_${mesAnoStr.replace(/[\/\s]/g, '_')}`;

            const brandNome = branding && branding.nome ? branding.nome : "Meu Escritório";
            const brandSlogan = branding && branding.slogan ? branding.slogan : "";
            const brandContato = branding && branding.contato ? branding.contato : "";
            const brandCor = branding && branding.cor ? branding.cor : "#0075de";
            const brandLogo = branding && branding.logo ? branding.logo : "";

            let html = `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${nomeArquivoMes}</title>
                <style>
                    ${pdfStyles}
                    
                    /* Customização de Branding */
                    .logo-box { background: ${brandCor} !important; }
                    .info-title { color: ${brandCor} !important; }
                    .fatal-date { color: ${brandCor} !important; }
                    .header { border-bottom: 2px solid ${brandCor} !important; }
                    
                    /* Otimização de Quebra de Página */
                    @media print {
                        tr { page-break-inside: avoid !important; }
                        td { page-break-inside: avoid !important; }
                        thead { display: table-header-group !important; }
                        tfoot { display: table-footer-group !important; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header" style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; margin-bottom: 24px;">
                        <div class="brand-area" style="display: flex; align-items: center; gap: 12px;">
                            ${brandLogo ? `<img src="${brandLogo}" style="max-height: 48px; max-width: 120px; object-fit: contain; border-radius: 4px;">` : `<div class="logo-box">${brandNome.substring(0, 2).toUpperCase()}</div>`}
                            <div>
                                <h1 class="brand-title" style="font-size: 18px; font-weight: 700; margin: 0; color: #141413;">${brandNome}</h1>
                                <div class="brand-meta" style="font-size: 11px; color: #6c6a64; margin-top: 2px; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                                    ${brandSlogan ? `<span>✨ ${brandSlogan}</span>` : ''}
                                    ${brandContato ? `<span>📞 ${brandContato}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="info-area" style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                            <h2 class="info-title" style="font-size: 13px; font-weight: 700; text-transform: uppercase;">AGENDA DE PRAZOS: ${mesAnoStr.toUpperCase()}</h2>
                            <p class="info-date" style="font-size: 11px; color: #8e8b82; margin: 4px 0 0 0;">Impresso em ${dateStr} às ${timeStr}</p>
                            <div style="font-size: 9px; color: #a39e98; margin-top: 6px; font-weight: 500; text-align: right; line-height: 1.2;">
                                Advogado: ${advogadoNome}<br>
                                Buscador DJEN • ${brandContato || 'buscadordjen.com.br'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="kpi-board" style="display: flex; gap: 12px; margin-bottom: 24px;">
                        <div class="kpi-card" style="flex: 1; background: #faf8f5; border: 1px solid #e2ddd9; border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #a39e98;  font-weight: 600; letter-spacing: 0.5px;">Total do Mês</div>
                            <div style="font-size: 24px; font-weight: 700; color: #2e2c2a; margin-top: 4px;">${total}</div>
                        </div>
                        <div class="kpi-card" style="flex: 1; background: rgba(56, 161, 105, 0.05); border: 1px solid rgba(56, 161, 105, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #38A169;  font-weight: 600; letter-spacing: 0.5px;">Cumpridos</div>
                            <div style="font-size: 24px; font-weight: 700; color: #38A169; margin-top: 4px;">${cumpridos}</div>
                        </div>
                        <div class="kpi-card" style="flex: 1; background: rgba(221, 107, 32, 0.05); border: 1px solid rgba(221, 107, 32, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #DD6B20;  font-weight: 600; letter-spacing: 0.5px;">Pendentes</div>
                            <div style="font-size: 24px; font-weight: 700; color: #DD6B20; margin-top: 4px;">${pendentes}</div>
                        </div>
                        <div class="kpi-card" style="flex: 1; background: rgba(212, 76, 71, 0.05); border: 1px solid rgba(212, 76, 71, 0.2); border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #D44C47;  font-weight: 600; letter-spacing: 0.5px;">Atrasados</div>
                            <div style="font-size: 24px; font-weight: 700; color: #D44C47; margin-top: 4px;">${atrasados}</div>
                        </div>
                        <div class="kpi-card" style="flex: 1; background: #faf8f5; border: 1px solid #e2ddd9; border-radius: 8px; padding: 12px; text-align: center;">
                            <div style="font-size: 11px; color: #a39e98;  font-weight: 600; letter-spacing: 0.5px;">Eficiência</div>
                            <div style="font-size: 24px; font-weight: 700; color: #2e2c2a; margin-top: 4px;">${taxaEficiencia}%</div>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th class="col-num">Nº</th>
                                <th>Processo / Identificação</th>
                                <th>Tribunal</th>
                                <th>Ciclo do Prazo</th>
                                <th>Prazo Fatal</th>
                                <th>Status</th>
                                <th>Anotações e Tags</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            sortedItems.forEach((p, idx) => {
                let statusBadge = "";
                if (p.cumprido) { statusBadge = `<span class="badge bg-green">✔ Cumprido</span>`; }
                else if (!p.fatal) { statusBadge = `<span class="badge bg-gray">Sem Prazo</span>`; }
                else {
                    const dataFatal = parseDateBR(p.fatal); 
                    const diff = Math.ceil((dataFatal.getTime() - hjTime.getTime()) / (1000 * 3600 * 24));
                    if (diff < 0) statusBadge = `<span class="badge bg-red">Atrasado</span>`; 
                    else if (diff === 0) statusBadge = `<span class="badge bg-orange">Vence Hoje</span>`; 
                    else statusBadge = `<span class="badge bg-orange">Pendente</span>`;
                }

                let tribunal = p.siglaTribunal || (p.manual ? 'MANUAL' : '-');
                let jurisdicao = (p.uf && p.mun) ? `<div style="font-size: 10px; color: #a39e98; margin-top: 6px; font-weight: 500; letter-spacing: 0.2px;">📍 ${p.uf} - ${p.mun}</div>` : '';
                let procBlock = p.apelido ? `<span class="proc-name">${p.apelido}</span><span class="proc-sub">${p.processo}</span>` : `<span class="proc-name">${p.processo}</span>`;

                let datasCiclo = `<div class="datas-secundarias">Disp: <b>${p.disp || '-'}</b></div><div class="datas-secundarias">Início: <b>${p.inicio || '-'}</b></div>`;

                let anotacaoLimpa = p.anotacao || '';
                let anotacaoComTags = anotacaoLimpa.replace(/#([\wÀ-ÿ_]+)/g, '<span class="tag-badge">#$1</span>');

                let radarTags = [];
                if (p.textoCompleto && Array.isArray(palavrasUrgentes)) {
                    const txtLow = p.textoCompleto.toLowerCase();
                    palavrasUrgentes.forEach(palavra => {
                        if (txtLow.includes(palavra)) {
                            const palavraFormatada = palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase();
                            radarTags.push("#" + palavraFormatada);
                        }
                    });
                }
                let radarHtml = radarTags.length > 0 ? radarTags.map(t => `<span class="tag-radar">${t}</span>`).join('') : '';
                let tarefasHtml = '';
                if (p.tarefas && Array.isArray(p.tarefas) && p.tarefas.length > 0) {
                    tarefasHtml = `<div style="margin-top: 8px; font-size: 11px; border: 1px solid #e2ddd9; padding: 6px; border-radius: 4px; background: #faf8f5;"><strong>Tarefas do Prazo:</strong><br>` +
                        p.tarefas.map(t => `<div style="margin-top:4px; display: flex; align-items: flex-start; gap: 4px;"><span>${t.feita ? '☑' : '☐'}</span><span style="${t.feita ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${t.texto}</span></div>`).join('') +
                        `</div>`;
                }

                let blocoAnotacoes = `<div style="color:#615d59; font-size: 12px; margin-bottom: 6px;">${anotacaoComTags || '-'}</div>`;
                if (radarHtml) blocoAnotacoes += `<div>${radarHtml}</div>`;
                if (tarefasHtml) blocoAnotacoes += tarefasHtml;

                const trClass = p.cumprido ? ' class="row-cumprido" style="opacity: 0.6; background: #fdfdfc;"' : '';
                html += `<tr${trClass}><td class="col-num">${idx + 1}</td><td>${procBlock}</td><td><span class="badge bg-trib">${tribunal}</span>${jurisdicao}</td><td>${datasCiclo}</td><td class="fatal-date">${p.fatal || '-'}</td><td>${statusBadge}</td><td>${blocoAnotacoes}</td></tr>`;
            
                if (idx > 0 && idx % 50 === 0) {
                    self.postMessage({ taskId, progress: Math.round((idx / total) * 100) });
                }
            });

            html += `</tbody></table></div>
            <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #a39e98; letter-spacing: 0.2px;">
                Aviso: Esta contagem é uma previsão. Confirme sempre as suspensões e feriados nos canais oficiais do tribunal.<br>
                <span style="font-size: 10px; color: #c0bab3; margin-top: 4px; display: inline-block;">Gerado via <strong>Buscador DJEN</strong> (${brandContato || 'buscadordjen.com.br'})</span>
            </div>
            <script> window.onload = function() { setTimeout(function() { window.print(); }, 500); } </script>
            </body></html>`;

            self.postMessage({ taskId, result: html, progress: 100 });
        } catch (error) {
            self.postMessage({ taskId, error: error.message });
        }
    } else if (action === 'gerarPDFHtmlAuditoria') {
        const { item, timeline, branding, pdfStyles } = payload;
        
        if (!item || !timeline || timeline.length === 0) {
            self.postMessage({ taskId, error: "Nenhum dado de auditoria recebido." });
            return;
        }

        try {
            const dataHoje = new Date();
            const dateStr = `${String(dataHoje.getDate()).padStart(2, '0')}/${String(dataHoje.getMonth() + 1).padStart(2, '0')}/${dataHoje.getFullYear()}`;
            const timeStr = `${String(dataHoje.getHours()).padStart(2, '0')}:${String(dataHoje.getMinutes()).padStart(2, '0')}`;
            
            const brandNome = branding && branding.nome ? branding.nome : "Buscador DJEN";
            const brandSlogan = branding && branding.slogan ? branding.slogan : "";
            const brandContato = branding && branding.contato ? branding.contato : "";
            const brandCor = branding && branding.cor ? branding.cor : "#3a72b5";
            const brandLogo = branding && branding.logo ? branding.logo : "";

            let html = `<!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Auditoria de Prazo - ${item.processo || 'Manual'}</title>
                <style>
                    ${pdfStyles}
                    
                    /* Customização de Branding */
                    .logo-box { background: ${brandCor} !important; }
                    .info-title { color: ${brandCor} !important; }
                    .header { border-bottom: 2px solid ${brandCor} !important; }
                    
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; color: #1c1e21; margin: 0; padding: 20px; }
                    .container { max-width: 1000px; margin: 0 auto; }
                    
                    .proc-box { background: #faf8f5; border: 1px solid #e2ddd9; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
                    .proc-box h2 { margin: 0 0 8px 0; font-size: 16px; color: #2e2c2a; }
                    .proc-box p { margin: 4px 0; font-size: 13px; color: #5c626a; }
                    .fatal-highlight { display: inline-block; background: rgba(212, 76, 71, 0.1); color: #d44c47; font-weight: 700; padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(212, 76, 71, 0.2); }
                    
                    .timeline-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 20px; }
                    .audit-day { border: 1px solid #cdd3da; border-radius: 8px; padding: 12px; text-align: center; background: #fff; page-break-inside: avoid; }
                    .audit-day.is-fatal { background: #fbe4e4; border-color: rgba(212, 76, 71, 0.4); }
                    .audit-day.is-pulo { background: #f3f5f8; border-color: transparent; }
                    .audit-day .day-icon { font-size: 20px; margin-bottom: 8px; display: block; }
                    .audit-day .day-num { font-size: 24px; font-weight: bold; color: #1c1e21; margin-bottom: 4px; display: block; }
                    .audit-day.is-fatal .day-num { color: #d44c47; }
                    .audit-day .day-date { font-size: 13px; color: #5c626a; display: block; margin-bottom: 6px; }
                    .audit-day .day-desc { font-size: 11px; color: #5c626a; line-height: 1.3; }
                    
                    @media print {
                        .audit-day { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header" style="display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 16px; margin-bottom: 24px;">
                        <div class="brand-area" style="display: flex; align-items: center; gap: 12px;">
                            ${brandLogo ? `<img src="${brandLogo}" style="max-height: 48px; max-width: 120px; object-fit: contain; border-radius: 4px;">` : `<div class="logo-box">${brandNome.substring(0, 2).toUpperCase()}</div>`}
                            <div>
                                <h1 class="brand-title" style="font-size: 18px; font-weight: 700; margin: 0; color: #141413;">${brandNome}</h1>
                                <div class="brand-meta" style="font-size: 11px; color: #6c6a64; margin-top: 2px; display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                                    ${brandSlogan ? `<span>✨ ${brandSlogan}</span>` : ''}
                                    ${brandContato ? `<span>📞 ${brandContato}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="info-area" style="text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                            <h2 class="info-title" style="font-size: 13px; font-weight: 700; text-transform: uppercase;">AUDITORIA DE PRAZO</h2>
                            <p class="info-date" style="font-size: 11px; color: #8e8b82; margin: 4px 0 0 0;">Gerado em ${dateStr} às ${timeStr}</p>
                        </div>
                    </div>
                    
                    <div class="proc-box">
                        <h2>Processo: ${item.processo || 'Manual'}</h2>
                        ${item.apelido ? `<p><strong>Identificação:</strong> ${item.apelido}</p>` : ''}
                        <p><strong>Tribunal:</strong> ${item.siglaTribunal || 'MANUAL'}</p>
                        <p style="margin-top: 12px;">Prazo Calculado: <span class="fatal-highlight">${item.fatal || '-'}</span></p>
                    </div>

                    <h3 style="font-size: 14px; color: #2e2c2a; margin-bottom: 12px;">Linha do Tempo da Contagem</h3>
                    <div class="timeline-grid">
            `;

            timeline.forEach(dia => {
                let classFatal = dia.fatal ? 'is-fatal' : '';
                let classPulo = dia.pulo ? 'is-pulo' : '';
                
                let numDisplay = dia.num ? dia.num : '-';
                if (dia.num === 'D0') numDisplay = 'D0';

                html += `
                    <div class="audit-day ${classFatal} ${classPulo}">
                        <span class="day-icon">${dia.icon || '📅'}</span>
                        <span class="day-num">${numDisplay}</span>
                        <span class="day-date">${dia.data}</span>
                        <div class="day-desc">${dia.desc}</div>
                    </div>
                `;
            });

            html += `
                    </div>
                    <div style="margin-top: 32px; text-align: center; font-size: 11px; color: #a39e98; letter-spacing: 0.2px; border-top: 1px dashed #e2ddd9; padding-top: 16px;">
                        Aviso: Esta auditoria é uma previsão baseada na contagem paramétrica de dias úteis/corridos e regras mapeadas. Confirme sempre as suspensões e feriados nos canais oficiais do tribunal.<br>
                        <span style="font-size: 10px; color: #c0bab3; margin-top: 4px; display: inline-block;">Gerado via <strong>Buscador DJEN</strong> (buscadordjen.com.br)</span>
                    </div>
                </div>
                <script> window.onload = function() { setTimeout(function() { window.print(); }, 500); } </script>
            </body>
            </html>`;

            self.postMessage({ taskId, result: html, progress: 100 });
        } catch (error) {
            self.postMessage({ taskId, error: error.message });
        }
    }
};
