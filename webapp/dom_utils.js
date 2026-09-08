// Utilitários de DOM - DJEN

function moverLinhaLiquida() {
    // Abas agora são 100% declarativas em CSS (KISS)
}

function verificarLembreteBackup() {
    const dataUltimoBackup = localStorage.getItem('djen_ultimo_backup_data');
    const hoje = new Date();

    if (!dataUltimoBackup || (hoje - new Date(dataUltimoBackup)) >= 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => {
            if (typeof showToast === 'function') {
                showToast("Backup Recomendado: Já faz 7 dias, salve seus dados!", "💾");
            } else {
                const toast = document.getElementById('toastGenerico');
                if (toast) {
                    const icone = document.getElementById('toastIcone');
                    if (icone) icone.textContent = "💾";
                    const msg = document.getElementById('toastMensagem');
                    if (msg) msg.textContent = "Backup Recomendado: Já faz 7 dias, salve seus dados!";
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 5000);
                }
            }
        }, 1500);
    }
}

function djenPedirLink(callback) {
    const modal = document.getElementById('linkModal');
    if (!modal) return callback(null);
    const input = document.getElementById('linkModalField');
    const btnOk = document.getElementById('linkModalOk');
    const btnCancel = document.getElementById('linkModalCancel');
    const btnClose = document.getElementById('linkModalClose');

    input.value = '';
    modal.classList.add('show');
    setTimeout(() => input.focus(), 50);

    const cleanup = () => {
        modal.classList.remove('show');
        btnOk.onclick = null;
        btnCancel.onclick = null;
        if (btnClose) btnClose.onclick = null;
        input.onkeydown = null;
    };

    btnOk.onclick = () => {
        const val = input.value.trim();
        cleanup();
        callback(val);
    };

    const cancelAction = () => {
        cleanup();
        callback(null);
    };

    btnCancel.onclick = cancelAction;
    if (btnClose) btnClose.onclick = cancelAction;

    input.onkeydown = (e) => {
        if (e.key === 'Enter') btnOk.click();
        else if (e.key === 'Escape') btnCancel.click();
    };
}

// Funções de injeção seguras
function safeSetInnerHTML(element, htmlString) {
    if (!element) return;
    if (!htmlString || htmlString.trim() === '') {
        element.replaceChildren();
        return;
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    element.replaceChildren(...Array.from(doc.body.childNodes));
}

function safeAppendHTML(element, htmlString) {
    if (!element) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    element.append(...Array.from(doc.body.childNodes));
}
