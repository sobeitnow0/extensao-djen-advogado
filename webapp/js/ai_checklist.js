// js/ai_checklist.js
// Módulo de Checklist e IA (Fase 3 Refatoração Tática)

window.AIChecklist = {
    createTasksWrapperUI: function(itemKey, proc, txtComGatilhos, headerEl) {
        const tasksWrapper = document.createElement("div");
        tasksWrapper.className = "tasks-wrapper";
        tasksWrapper.style.marginTop = "8px";

        function getTarefasLocais() {
            if (window.prazosSalvos[itemKey] && window.prazosSalvos[itemKey].tarefas) {
                return window.prazosSalvos[itemKey].tarefas;
            }
            const geradas = (typeof window.extrairTarefasTexto === 'function') 
                            ? window.extrairTarefasTexto(txtComGatilhos) 
                            : (typeof extrairTarefasTexto === 'function' ? extrairTarefasTexto(txtComGatilhos) : []);
            return geradas || [];
        }

        let localTarefas = getTarefasLocais();
        localTarefas = localTarefas.map(t => {
            if (typeof t === 'string') {
                return { feita: t.includes('[x]'), texto: t.replace("- [ ] ", "").replace("- [x] ", "").trim() };
            }
            return t;
        }).filter(t => t && t.texto);

        function saveTarefasLocais() {
            if (!window.prazosSalvos[itemKey]) {
                window.prazosSalvos[itemKey] = { processo: proc, textoCompleto: txtComGatilhos, tarefas: localTarefas };
            } else {
                window.prazosSalvos[itemKey].tarefas = localTarefas;
            }
            if (typeof window.savePrazosSalvos === 'function') window.savePrazosSalvos();
            atualizarBadge();
        }

        function atualizarBadge() {
            const badge = headerEl.querySelector('.badge-tarefas');
            if (!badge) return;
            if (localTarefas.length > 0) {
                const completas = localTarefas.filter(t => t.feita).length;
                if (typeof window.safeSetInnerHTML === 'function') {
                    window.safeSetInnerHTML(badge, `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="9 11 12 14 22 4"></polyline></svg>${completas}/${localTarefas.length}`);
                } else {
                    badge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="9 11 12 14 22 4"></polyline></svg>${completas}/${localTarefas.length}`;
                }
                badge.style.display = 'inline-flex';
                if (completas === localTarefas.length) {
                    badge.style.opacity = '0.7';
                } else {
                    badge.style.opacity = '';
                }
            } else {
                badge.style.display = 'none';
            }
        }

        function renderTarefasUI() {
            if (typeof window.safeSetInnerHTML === 'function') {
                tasksWrapper.replaceChildren();
            } else {
                tasksWrapper.innerHTML = '';
            }
            atualizarBadge();
            
            localTarefas.forEach((t, idx) => {
                const row = document.createElement("div");
                row.className = "task-item";
                
                const checkedStr = t.feita ? 'checked' : '';
                const feitaStr = t.feita ? 'feita' : '';
                const htmlContent = `
                    <label class="custom-checkbox">
                        <input type="checkbox" ${checkedStr}>
                        <span class="checkmark"></span>
                    </label>
                    <span class="task-text ${feitaStr}">${t.texto}</span>
                    <button class="btn-del-task" title="Remover Tarefa">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                
                if (typeof window.safeSetInnerHTML === 'function') {
                    window.safeSetInnerHTML(row, htmlContent);
                } else {
                    row.innerHTML = htmlContent;
                }
                
                row.querySelector('input').onchange = (e) => {
                    localTarefas[idx].feita = e.target.checked;
                    if (typeof window.adicionarEventoHistorico === 'function') {
                        window.adicionarEventoHistorico(itemKey, 'tarefa', `Tarefa '${localTarefas[idx].texto}' ${e.target.checked ? 'concluída' : 'reaberta'}`);
                    }
                    saveTarefasLocais();
                    renderTarefasUI();
                };
                row.querySelector('.btn-del-task').onclick = () => {
                    localTarefas.splice(idx, 1);
                    saveTarefasLocais();
                    renderTarefasUI();
                };
                tasksWrapper.appendChild(row);
            });

            const addRow = document.createElement("div");
            addRow.className = "task-add-row";
            if (typeof window.safeSetInnerHTML === 'function') {
                window.safeSetInnerHTML(addRow, `<input type="text" placeholder="+ Adicionar tarefa..." autocomplete="off">`);
            } else {
                addRow.innerHTML = `<input type="text" placeholder="+ Adicionar tarefa..." autocomplete="off">`;
            }
            
            addRow.querySelector('input').onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = e.target.value.trim();
                    if (val) {
                        localTarefas.push({ feita: false, texto: val });
                        if (typeof window.adicionarEventoHistorico === 'function') {
                            window.adicionarEventoHistorico(itemKey, 'tarefa', `Tarefa adicionada: '${val}'`);
                        }
                        saveTarefasLocais();
                        renderTarefasUI();
                    }
                }
            };
            tasksWrapper.appendChild(addRow);
        }
        
        renderTarefasUI();
        return tasksWrapper;
    }
};
