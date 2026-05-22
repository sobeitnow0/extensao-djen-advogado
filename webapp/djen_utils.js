// Utilitarios Puros - DJEN

function debounce(func, wait) {
    let timeout;
    return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}

function moverLinhaLiquida() {
    const abaAtiva = document.querySelector('.view-switcher button.active');
    const linha = document.querySelector('.linha-liquida');

    if (!abaAtiva || !linha) return;

    linha.style.left = abaAtiva.offsetLeft + 'px';
    linha.style.width = abaAtiva.offsetWidth + 'px';
}

function verificarLembreteBackup() {
    const dataUltimoBackup = localStorage.getItem('djen_ultimo_backup_data');
    const hoje = new Date();

    if (!dataUltimoBackup || (hoje - new Date(dataUltimoBackup)) >= 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => {
            const toast = document.getElementById('toastGenerico');
            if (toast) {
                document.getElementById('toastIcone').textContent = "💾";
                document.getElementById('toastMensagem').textContent = "Backup Recomendado: Já faz 7 dias, salve seus dados!";
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 5000);
            }
        }, 1500);
    }
}

function extrairTarefasTexto(texto) {
    if (!texto) return [];
    const txt = texto.toLowerCase();
    let auto = [];
    if (txt.match(/audi[eê]ncia/)) auto.push({ feita: false, texto: "Anotar data da audiência e contatar cliente" });
    if (txt.match(/penhora|bloqueio|sisbajud|bacenjud/)) auto.push({ feita: false, texto: "Verificar extensão do bloqueio e prazo para embargos" });
    if (txt.match(/liminar|tutela/)) auto.push({ feita: false, texto: "Analisar deferimento/indeferimento de tutela" });
    if (txt.match(/contrarraz[oõ]es/)) auto.push({ feita: false, texto: "Apresentar contrarrazões ao recurso" });
    if (txt.match(/contesta[cç][aã]o|contestar/)) auto.push({ feita: false, texto: "Elaborar e protocolar contestação" });
    if (txt.match(/alega[cç][oõ]es finais|memoriais/)) auto.push({ feita: false, texto: "Apresentar alegações finais por memoriais" });
    if (txt.match(/per[ií]cia|perito|prontu[aá]rio/)) auto.push({ feita: false, texto: "Formular quesitos, analisar prontuário e indicar assistente técnico" });
    if (txt.match(/inpi|marca|patente|autoral/)) auto.push({ feita: false, texto: "Verificar status no INPI / analisar documentação do registro" });
    if (txt.match(/provedor|marco civil|dados cadastrais/)) auto.push({ feita: false, texto: "Notificar provedor de aplicação/conexão" });
    return auto;
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
