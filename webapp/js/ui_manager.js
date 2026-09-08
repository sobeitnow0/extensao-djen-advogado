// UI Manager - Utilitários de interface e DOM
// Concentra manipulações puras de DOM e Toasts

const UIManager = {
    /**
     * Define o HTML de um elemento de forma segura usando DOMParser e setHTMLUnsafe/innerHTML.
     */
    safeSetInnerHTML(el, html) {
        if (!el) return;
        if (typeof el.setHTMLUnsafe === 'function') {
            try {
                el.setHTMLUnsafe(html);
                return;
            } catch(e) {}
        }
        if (typeof DOMParser !== 'undefined') {
            try {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                el.replaceChildren();
                Array.from(doc.body.childNodes).forEach(node => {
                    el.appendChild(node.cloneNode(true));
                });
                return;
            } catch(e) {}
        }
        el.innerHTML = html;
    },

    /**
     * Exibe um toast na tela.
     */
    showToast(mensagem, icone = "✅") {
        const toast = document.getElementById('toastGenerico');
        if (!toast) return;

        const iconEl = document.getElementById('toastIcone');
        const msgEl = document.getElementById('toastMensagem');
        if (iconEl) iconEl.textContent = icone;
        if (msgEl) msgEl.textContent = mensagem;

        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    },

    /**
     * Exibe o toast nativo de prazos cumpridos.
     */
    showToastNativo(count) {
        const toast = document.getElementById('toastNativo');
        const countSpan = document.getElementById('toastCount');
        if (!toast || !countSpan) return;
        
        countSpan.textContent = count;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
    },

    /**
     * Alterna a visibilidade das abas principais.
     */
    switchView(targetId) {
        const views = document.querySelectorAll('.view-container');
        const tabs = document.querySelectorAll('.bottom-nav-item');

        views.forEach(v => v.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));

        const tgtView = document.getElementById(`view${targetId.charAt(0).toUpperCase() + targetId.slice(1)}`);
        if (tgtView) tgtView.classList.add('active');

        const tgtTab = document.querySelector(`.bottom-nav-item[data-target="${targetId}"]`);
        if (tgtTab) tgtTab.classList.add('active');
        
        // Scrollar pro topo
        window.scrollTo({ top: 0, behavior: 'auto' });
    },

    /**
     * Aplica o tema visual selecionado (light, dark, sync).
     */
    aplicarTema(tema) {
        document.body.classList.remove('theme-dark', 'theme-light', 'theme-sync');
        let ehDark = false;
        if (tema === 'sync') {
            document.body.classList.add('theme-sync');
            ehDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.documentElement.setAttribute('data-theme', ehDark ? 'dark' : 'light');
        } else {
            document.body.classList.add(`theme-${tema}`);
            document.documentElement.setAttribute('data-theme', tema);
            ehDark = (tema === 'dark' || tema === 'escuro');
        }

        if (ehDark) {
            document.documentElement.classList.add('tema-escuro');
        } else {
            document.documentElement.classList.remove('tema-escuro');
        }

        // Atualiza a UI das opções se estiver na tela de config
        document.querySelectorAll('.btn-theme').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-theme') === tema);
        });
    }
};

// Exportar globalmente temporariamente para compatibilidade com sidebar.js
globalThis.safeSetInnerHTML = UIManager.safeSetInnerHTML;
globalThis.showToast = UIManager.showToast;
globalThis.showToastNativo = UIManager.showToastNativo;
globalThis.switchView = UIManager.switchView;
globalThis.aplicarTema = UIManager.aplicarTema;
