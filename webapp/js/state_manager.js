// js/state_manager.js
// Gerenciador Global de Estado (Fase 2 Refatoração Tática)

window.DjenState = {
    prazosSalvos: {},
    resultadosGlobais: [],
    resultadosExibidos: [],
    historicoControle: [],
    processosTentadosCNJ: new Set(),
    processosBuscandoCNJ: new Set(),
    publicacoesLidas: new Set(),
    resultadosExibidos: [],
    searchMode: 'oab',
    multiOabSearch: false,
    palavrasUrgentes: [],
    totalBuscas: 0,
    filtroApenasNaoLidos: false,
    historicoBuscas: []
};

// Expor na raiz do window para retrocompatibilidade com closures (sem precisar reescrever milhares de linhas)
window.prazosSalvos = window.DjenState.prazosSalvos;
window.resultadosGlobais = window.DjenState.resultadosGlobais;
window.resultadosExibidos = window.DjenState.resultadosExibidos;
window.historicoControle = window.DjenState.historicoControle;
window.processosTentadosCNJ = window.DjenState.processosTentadosCNJ;
window.processosBuscandoCNJ = window.DjenState.processosBuscandoCNJ;
window.publicacoesLidas = window.DjenState.publicacoesLidas;
window.resultadosExibidos = window.DjenState.resultadosExibidos;
window.searchMode = window.DjenState.searchMode;
window.multiOabSearch = window.DjenState.multiOabSearch;
window.palavrasUrgentes = window.DjenState.palavrasUrgentes;
window.totalBuscas = window.DjenState.totalBuscas;
window.filtroApenasNaoLidos = window.DjenState.filtroApenasNaoLidos;
window.historicoBuscas = window.DjenState.historicoBuscas;

window.debounceCustom = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

window._savePrazosSalvosImediato = function() {
    try {
        const strData = JSON.stringify(window.prazosSalvos);
        if (window.SafeStorage) window.SafeStorage.set({ 'djen_prazos_salvos': strData });
        if (typeof window.atualizarBadgeIcone === 'function') window.atualizarBadgeIcone(window.prazosSalvos);
        
        if (strData.length > 4 * 1024 * 1024 && !globalThis.storageWarningShown) {
            globalThis.storageWarningShown = true;
            if (typeof window.showToast === 'function') window.showToast("O banco de dados está ficando cheio (acima de 4MB). Para manter a extensão rápida, considere arquivar prazos antigos.", "⚠️");
        }
    } catch (e) {
        console.error("Erro ao salvar os prazos no state_manager:", e);
        if (typeof window.showToast === 'function') window.showToast("Falha ao salvar o registro. Tente novamente.", "❌");
    }
};

window.savePrazosSalvos = window.debounceCustom(window._savePrazosSalvosImediato, 300);
