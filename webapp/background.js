// Compatibilidade Universal: Chrome e Firefox
if (typeof browser !== 'undefined' && browser.action && browser.sidebarAction) {
    // Modo Firefox: O clique no botão principal alterna a barra lateral
    browser.action.onClicked.addListener(() => {
        browser.sidebarAction.toggle().catch(console.error);
    });
} else if (typeof chrome !== 'undefined' && chrome['sidePanel']) {
    // Modo Chrome: Configuração nativa do SidePanel
    const sidePanelAPI = chrome['sidePanel'];
    if (sidePanelAPI && typeof sidePanelAPI['setPanelBehavior'] === 'function') {
        sidePanelAPI['setPanelBehavior']({ openPanelOnActionClick: true }).catch(console.error);
    }
}