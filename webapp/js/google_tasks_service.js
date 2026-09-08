/**
 * google_tasks_service.js
 * Módulo de Integração com Google Tasks via Web App (Google Apps Script)
 * Solução livre de OAuth, Client IDs e tokens.
 */

(function () {
    let _customWebAppUrl = '';

    const GoogleTasksService = {
        STORAGE_KEY_WEBHOOK_URL: 'djen_gtasks_webhook_url',

        /**
         * Inicializa as configurações salvas do Tasks
         */
        init: async function () {
            try {
                if (typeof SafeStorage !== 'undefined') {
                    const data = await new Promise((resolve) => {
                        SafeStorage.get([this.STORAGE_KEY_WEBHOOK_URL], (res) => resolve(res || {}));
                    });

                    if (data && data[this.STORAGE_KEY_WEBHOOK_URL]) {
                        _customWebAppUrl = String(data[this.STORAGE_KEY_WEBHOOK_URL]).trim();
                    }
                }
            } catch (e) {
                console.warn('[GoogleTasksService] Erro ao carregar configurações:', e);
            }
        },

        getWebhookUrl: async function () {
            if (typeof SafeStorage !== 'undefined') {
                const data = await new Promise((resolve) => {
                    SafeStorage.get([this.STORAGE_KEY_WEBHOOK_URL], (res) => resolve(res || {}));
                });
                if (data && data[this.STORAGE_KEY_WEBHOOK_URL]) {
                    _customWebAppUrl = String(data[this.STORAGE_KEY_WEBHOOK_URL]).trim();
                }
            }
            if (!_customWebAppUrl && typeof localStorage !== 'undefined') {
                try {
                    const localData = localStorage.getItem(this.STORAGE_KEY_WEBHOOK_URL);
                    if (localData) {
                        const parsed = JSON.parse(localData);
                        _customWebAppUrl = String(parsed).trim();
                    }
                } catch(e) {}
            }
            return _customWebAppUrl || '';
        },

        setWebhookUrl: async function (url) {
            _customWebAppUrl = (url || '').trim();
            if (typeof SafeStorage !== 'undefined') {
                await SafeStorage.set({ [this.STORAGE_KEY_WEBHOOK_URL]: _customWebAppUrl });
            }
        },

        /**
         * Verifica status de conexão (neste caso, se a URL está configurada)
         */
        estaConectado: async function () {
            const url = await this.getWebhookUrl();
            return !!url && url.startsWith('https://script.google.com/macros/s/');
        },

        /**
         * Cria uma tarefa no Google Tasks a partir de um objeto de prazo do DJEN
         * disparando a requisição para a URL do Web App do usuário.
         * @param {Object} prazo - Objeto de prazo ou intimação
         */
        exportarPrazoParaTasks: async function (prazo) {
            if (!prazo) throw new Error('Dados do prazo não fornecidos.');

            // Recarrega configuração do storage para garantir sincronia entre popup e content script
            await this.init();

            const webhookUrl = await this.getWebhookUrl();
            if (typeof window.showToast === 'function') {
                window.showToast("DEBUG URL Lida: " + (webhookUrl ? webhookUrl.substring(0,25) + "..." : "VAZIA"), "🔍");
            }
            if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/macros/s/')) {
                throw new Error('CONFIG_WEBHOOK_URL_REQUIRED');
            }

            // Montagem do título da tarefa
            const alias = prazo.apelido ? `[${prazo.apelido}] ` : '';
            const numProc = prazo.processo ? prazo.processo : 'Processo sem número';
            let title = `🚨 PRAZO FATAL: ${alias}${numProc}`;
            if (prazo.fatal) {
                title += ` (${prazo.fatal})`;
            }

            // Montagem do corpo/notas
            let notas = `Processo: ${numProc}\n`;
            if (prazo.siglaTribunal) notas += `Tribunal: ${prazo.siglaTribunal}\n`;
            if (prazo.disp || prazo.pub) notas += `Disponibilização / Publicação: ${prazo.disp || prazo.pub}\n`;
            if (prazo.inicio) notas += `Início do Prazo: ${prazo.inicio}\n`;
            if (prazo.fatal) notas += `Prazo Fatal: ${prazo.fatal}\n`;
            if (prazo.dias) notas += `Contagem: ${prazo.dias} dias (${prazo.mat === 'Criminal' ? 'corridos' : 'úteis'})\n`;

            if (prazo.anotacao) {
                const tmp = document.createElement('div');
                tmp.innerHTML = prazo.anotacao;
                const txtNotas = tmp.textContent || tmp.innerText || '';
                if (txtNotas.trim()) {
                    notas += `\n📌 Anotações:\n${txtNotas.trim()}\n`;
                }
            }

            if (prazo.feriados > 0 || prazo.prorrogado) {
                notas += `\n⚠️ Auditoria do Cálculo:`;
                if (prazo.feriados > 0) notas += `\n- ${prazo.feriados} dia(s) não útil(eis) / feriado(s) desviado(s).`;
                if (prazo.prorrogado) notas += `\n- Prorrogado para o primeiro dia útil seguinte (art. 224, § 1º, CPC).`;
            }

            notas += `\n\n---\n🤖 Exportado pelo Buscador DJEN\n🌐 www.buscadordjen.com.br`;

            const payload = {
                title: title,
                notes: notas
            };

            // Tenta adicionar a data fatal como data de encerramento (due)
            if (prazo.fatal) {
                const parts = prazo.fatal.split('/');
                if (parts.length === 3) {
                    const dt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`);
                    if (!isNaN(dt.getTime())) {
                        payload.due = dt.toISOString();
                    }
                }
            }

            // Dispara via fetch usando text/plain para evitar bloqueio de CORS pré-flight
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`Erro na comunicação com o Web App do Google Apps Script (${res.status})`);
            }

            const data = await res.json();
            if (data.status !== 'sucesso') {
                throw new Error(data.mensagem || 'Erro desconhecido retornado pelo script.');
            }

            return data;
        }
    };

    // Inicializa ao carregar
    GoogleTasksService.init();

    // Expõe globalmente
    globalThis.GoogleTasksService = GoogleTasksService;
})();
