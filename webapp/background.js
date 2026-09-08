const extAPI = typeof browser !== 'undefined' ? browser : chrome;

// Em Chrome MV3, o background roda como service worker, e o importScripts DEVE ser invocado globalmente.
if (typeof importScripts !== 'function') { globalThis.importScripts = function() {}; }
if (typeof importScripts === 'function') {
    importScripts('djen_storage.js');
}
let storageInitPromise = Promise.resolve();

// Compatibilidade Universal: Chrome e Firefox
if (extAPI.action && extAPI.sidebarAction) {
    // Modo Firefox: O clique no botão principal alterna a barra lateral
    extAPI.action.onClicked.addListener(() => {
        extAPI.sidebarAction.toggle().catch(console.error);
    });
} else if (extAPI.sidePanel) {
    // Modo Chrome: Configuração nativa do SidePanel
    const sidePanelAPI = extAPI.sidePanel;
    if (typeof sidePanelAPI.setPanelBehavior === 'function') {
        sidePanelAPI.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
    }
}

// --- AUTO-BACKUP EM SEGUNDO PLANO ---
// Fix v50.71: Alarmes extraídos para registrarAlarmes() e chamados tanto em
// onInstalled quanto em onStartup. Em MV3, o service worker é encerrado e
// reiniciado constantemente — sem onStartup os alarmes sumiam silenciosamente.
// Fix adicional: verificar se o alarme já existe antes de recriar com
// delayInMinutes curto, evitando disparos inesperados a cada atualização da extensão.

/**
 * Registra ou reconcilia todos os alarmes da extensão.
 * Deve ser chamada tanto no onInstalled quanto no onStartup.
 * @param {boolean} forceRecreate - Se true, recria mesmo que o alarme já exista (ex: mudança de config)
 */
async function registrarAlarmes(forceRecreate = false) {
    if (!extAPI.alarms) return;

    let data = {};
    if (globalThis.SafeStorage) {
        try {
            data = await new Promise(resolve => globalThis.SafeStorage.getAll(resolve));
        } catch (e) {
            console.warn('DJEN registrarAlarmes: Falha ao ler SafeStorage, usando defaults.', e);
        }
    }

    const enabled = data.djen_config_backup_auto_enabled !== 'false';
    const freq = data.djen_config_backup_auto_period ? parseInt(data.djen_config_backup_auto_period, 10) : 24;
    const periodMinutos = freq * 60;

    if (enabled) {
        // Bug Fix v50.71: Só recria o alarme se ele não existir OU se forceRecreate=true.
        // Isso evita que atualizações da extensão (que disparam onInstalled) recriem o alarme
        // com delayInMinutes=2, causando um backup inesperado logo após cada update.
        const alarmExistente = await extAPI.alarms.get("djen_auto_backup_alarm");
        if (!alarmExistente || forceRecreate) {
            // Usar periodInMinutes como delay inicial também, evitando disparo imediato
            extAPI.alarms.create("djen_auto_backup_alarm", {
                delayInMinutes: periodMinutos,
                periodInMinutes: periodMinutos
            });
            console.log(`DJEN: Alarme de backup automático criado/recriado (${freq}h = ${periodMinutos}min).`);
        } else {
            console.log(`DJEN: Alarme de backup já existe, mantendo programação atual.`);
        }
    } else {
        extAPI.alarms.clear("djen_auto_backup_alarm");
    }

    // Alarme de Varredura em Segundo Plano
    const bgEnabled = data.djen_config_notificar_background_enabled === 'true';
    if (bgEnabled) {
        const bgAlarmExistente = await extAPI.alarms.get("djen_background_check_alarm");
        if (!bgAlarmExistente || forceRecreate) {
            extAPI.alarms.create("djen_background_check_alarm", {
                delayInMinutes: 5,
                periodInMinutes: 12 * 60
            });
            console.log("DJEN: Alarme de varredura em segundo plano (12h) criado/recriado.");
        }
    } else {
        extAPI.alarms.clear("djen_background_check_alarm");
    }

    // Alarme de Prazos Vencendo (Matinal 08h30)
    scheduleMatinalAlarm();
}

// onInstalled: extensão instalada ou atualizada
extAPI.runtime.onInstalled.addListener(async (details) => {
    await storageInitPromise;
    // Em update/install, forçar recriação para garantir período correto
    await registrarAlarmes(true);
    console.log(`DJEN: onInstalled (reason=${details.reason}) — alarmes registrados.`);
});

// onStartup: navegador iniciado, service worker reiniciado
// Sem este listener, os alarmes sumiam a cada reinício do Chrome em MV3.
extAPI.runtime.onStartup.addListener(async () => {
    await storageInitPromise;
    await registrarAlarmes(false); // Não recriar se já existem
    console.log('DJEN: onStartup — alarmes reconciliados.');
});

extAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateAutoBackupAlarm') {
        if (extAPI.alarms) {
            extAPI.alarms.clear("djen_auto_backup_alarm", () => {
                if (request.enabled) {
                    extAPI.alarms.create("djen_auto_backup_alarm", {
                        delayInMinutes: request.periodInMinutes,
                        periodInMinutes: request.periodInMinutes
                    });
                    console.log(`DJEN: Alarme de backup automático atualizado para ${request.periodInMinutes} min.`);
                } else {
                    console.log("DJEN: Alarme de backup automático desativado.");
                }
            });
        }
        sendResponse({ success: true });
    } else if (request.action === 'updateBackgroundScan') {
        if (extAPI.alarms) {
            extAPI.alarms.clear("djen_background_check_alarm", () => {
                if (request.enabled) {
                    extAPI.alarms.create("djen_background_check_alarm", {
                        delayInMinutes: 1, // Inicializa em 1 minuto para dar feedback ao usuário
                        periodInMinutes: 12 * 60 // a cada 12 horas
                    });
                    console.log("DJEN: Alarme de varredura em segundo plano ativado.");
                } else {
                    console.log("DJEN: Alarme de varredura em segundo plano desativado.");
                }
            });
        }
        sendResponse({ success: true });
    }
});

// Ouvir o alarme
if (extAPI.alarms) {
    extAPI.alarms.onAlarm.addListener((alarm) => {
        storageInitPromise.then(() => {
            if (alarm.name === "djen_auto_backup_alarm") {
                console.log("DJEN: Disparando backup automático agendado...");
                realizarBackupEmSegundoPlano().catch(err => {
                    console.error("DJEN: Falha no backup automático em segundo plano:", err);
                });
            } else if (alarm.name === "djen_background_check_alarm") {
                console.log("DJEN: Disparando varredura em segundo plano agendada...");
                realizarVarreduraEmSegundoPlano().catch(err => {
                    console.error("DJEN: Falha na varredura em segundo plano:", err);
                });
            } else if (alarm.name === "djen_prazo_check_alarm") {
                console.log("DJEN: Verificando prazos vencendo/atrasados...");
                verificarPrazosPendentesNotificacao();
            }
        });
    });
}

function scheduleMatinalAlarm() {
    // #16 — Notificação Matinal Estruturada (08h30)
    const now = new Date();
    const next830 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0, 0);
    if (now.getTime() > next830.getTime()) {
        next830.setDate(next830.getDate() + 1); // Se já passou das 08:30, agenda para amanhã
    }
    const delayMinutes = Math.max(1, (next830.getTime() - now.getTime()) / 60000);
    
    if (extAPI.alarms) {
        extAPI.alarms.create("djen_prazo_check_alarm", {
            delayInMinutes: delayMinutes,
            periodInMinutes: 24 * 60 // A cada 24 horas (diariamente)
        });
        console.log(`DJEN: Alarme matinal agendado para ${next830.toLocaleString()}`);
    }
}

function verificarPrazosPendentesNotificacao() {
    globalThis.SafeStorage.get(['djen_prazos_salvos'], (data) => {
        if (!data.djen_prazos_salvos) return;
        try {
            const prazos = typeof data.djen_prazos_salvos === 'string' ? JSON.parse(data.djen_prazos_salvos) : data.djen_prazos_salvos;
            let vencendoHoje = 0;
            let atrasados = 0;
            let espera = 0;
            const hoje = new Date();
            hoje.setHours(0,0,0,0);

            for (const key in prazos) {
                const prazo = prazos[key];
                if (!prazo || prazo.cumprido) continue;
                
                if (prazo.espera) {
                    espera++;
                    continue;
                }

                if (prazo.fatal) {
                    const parts = prazo.fatal.split('/');
                    if (parts.length === 3) {
                        const prazoData = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                        if (prazoData.getTime() === hoje.getTime()) vencendoHoje++;
                        else if (prazoData.getTime() < hoje.getTime()) atrasados++;
                    }
                }
            }

            if (vencendoHoje > 0 || atrasados > 0) {
                let msg = `Bom dia! Resumo dos seus prazos:\n`;
                if (vencendoHoje > 0) msg += `\n⏰ ${vencendoHoje} vencendo hoje`;
                if (atrasados > 0) msg += `\n🚨 ${atrasados} atrasados`;
                if (espera > 0) msg += `\n⏳ ${espera} aguardando publicação`;
                
                extAPI.notifications.create("djen_prazo_pendente_notif", {
                    type: "basic",
                    iconUrl: "djen-128.png",
                    title: "Buscador DJEN - Radar Matinal",
                    message: msg,
                    priority: 2
                });
                atualizarBadgeIconeBg();
            } else {
                atualizarBadgeIconeBg();
            }
        } catch(e) {
            console.error("DJEN: Erro ao verificar prazos pendentes:", e);
        }
    });
}

function safeJSONParse(str, fallback) {
    if (!str) return fallback;
    try {
        return typeof str === 'string' ? JSON.parse(str) : str;
    } catch (e) {
        return fallback;
    }
}

async function realizarBackupEmSegundoPlano() {
    if (!extAPI.downloads) {
        console.error("DJEN: API de downloads indisponível no navegador.");
        return;
    }

    if (!globalThis.SafeStorage) {
        console.error("DJEN: SafeStorage indisponível no background.");
        return;
    }

    // Bug Fix #4: Usar await em vez de callback aninhado dentro de uma função async.
    // O padrão anterior silenciava erros — nenhum erro dentro do callback chegava ao .catch() do chamador.
    const data = await new Promise(resolve => globalThis.SafeStorage.getAll(resolve));

    if (data.djen_config_backup_auto_enabled === 'false') {
        console.log("DJEN: Backup automático cancelado. Configuração desativada pelo usuário.");
        return;
    }

    // Se não há dados de prazos salvos, evita baixar backups vazios
    if (!data.djen_prazos_salvos) {
        console.log("DJEN: Backup automático cancelado. Não há prazos salvos no IndexedDB.");
        return;
    }

    const oab = (data.djen_oab_numero || "000000").replace(/\D/g, '');
    const uf = (data.djen_oab_estado || "SP").trim().toUpperCase();
    const agora = new Date();
    const dataStr = `${String(agora.getDate()).padStart(2, '0')}-${String(agora.getMonth() + 1).padStart(2, '0')}-${agora.getFullYear()}`;
    const horaStr = `${String(agora.getHours()).padStart(2, '0')}h${String(agora.getMinutes()).padStart(2, '0')}`;
    const nomeArquivo = `DJEN_BackupAuto_OAB${uf}${oab}_${dataStr}_${horaStr}.json`;

    const backupData = {
        versao: 4,
        metadados: { data_geracao: agora.toISOString(), djen_versao_app: (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().version : '50.68'), auto: true },
        prazosSalvos: safeJSONParse(data.djen_prazos_salvos, {}),
        estatisticas: {
            totalBuscas: Number(data.djen_total_buscas || 0),
            totalLidos: Number(data.djen_total_lidos || 0),
            totalSalvos: Number(data.djen_total_salvos || 0),
            totalCumpridosHistorico: Number(data.djen_cumpridos_total || 0)
        },
        configuracoes: {
            oabNum: data.djen_oab_numero || "",
            oabUf: data.djen_oab_estado || "SP",
            tema: data.djen_theme || "azul-profundo",
            fontFocus: Number(data.djen_font_focus || 16),
            termosRadar: data.djen_termos_radar ? (typeof data.djen_termos_radar === 'string' ? data.djen_termos_radar.split(',') : data.djen_termos_radar) : [],
            emailGcal: data.djen_email_gcal || "",
            googleTasksClientId: data.djen_gtasks_client_id || ""
        },
        prazos_arquivados: [],
        // Bug Fix: dicionario_apelidos agora lido do IndexedDB (era sempre {} antes)
        dicionario_apelidos: safeJSONParse(data.djen_dicionario_apelidos, {}),
        historico_buscas: safeJSONParse(data.djen_historico_buscas, [])
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);

    // Bug Fix #4: Erros do download agora são propagados como exceções (await + Promise wrapper)
    await new Promise((resolve, reject) => {
        extAPI.downloads.download({
            url: dataUrl,
            filename: nomeArquivo,
            saveAs: false // Salva silenciosamente sem abrir pop-ups
        }, (downloadId) => {
            if (extAPI.runtime.lastError) {
                reject(new Error(`DJEN: Falha no download do backup automático: ${extAPI.runtime.lastError.message}`));
            } else {
                console.log("DJEN: Backup automático iniciado com sucesso. ID de download:", downloadId);
                resolve(downloadId);
            }
        });
    });
}

// --- VARREDURA EM SEGUNDO PLANO E NOTIFICAÇÕES (OAB) ---

async function fetchComRetryBg(url, tentativas = 3) {
    let tempoEspera = 2000;
    const urlLimpa = new URL(url);
    urlLimpa.searchParams.append('_t', Date.now().toString());

    for (let i = 0; i < tentativas; i++) {
        try {
            const r = await fetch(urlLimpa.toString());
            if (!r.ok) {
                throw new Error(`Erro API CNJ (${r.status})`);
            }
            return await r.json();
        } catch (erro) {
            console.warn(`DJEN Background: Falha na tentativa ${i + 1} de ${tentativas}. URL: ${urlLimpa.toString()}`);
            if (i === tentativas - 1) {
                throw new Error(`Falha definitiva após ${tentativas} tentativas. Erro: ${erro.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, tempoEspera));
            tempoEspera *= 1.5;
        }
    }
}

async function realizarVarreduraEmSegundoPlano() {
    if (!globalThis.SafeStorage) {
        console.error("DJEN Background: SafeStorage indisponível para varredura.");
        return;
    }

    // Bug Fix: await em vez de async callback dentro de função async — mesmo padrão do backup.
    // O padrão anterior executava corretamente mas silenciava erros —
    // qualquer exceção dentro do callback async void nunca chegava ao .catch() do chamador.
    const data = await new Promise(resolve => globalThis.SafeStorage.getAll(resolve));

    const bgEnabled = data.djen_config_notificar_background_enabled === 'true';
    if (!bgEnabled) {
        console.log("DJEN Background: Varredura em segundo plano desativada nas configurações.");
        if (extAPI.alarms) {
            extAPI.alarms.clear("djen_background_check_alarm");
        }
        return;
    }

    const oabInput = data.djen_oab_numero || "";
    const oabs = oabInput.split(/[\s,;-]+/).filter(Boolean);
    const uf = (data.djen_oab_estado || "SP").trim().toUpperCase();

    if (oabs.length === 0) {
        console.log("DJEN Background: Nenhuma OAB configurada para varredura em segundo plano.");
        return;
    }

    const dHoje = new Date();
    const formatISO = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const dtFim = formatISO(dHoje);
    const dIni = new Date(dHoje);
    dIni.setDate(dIni.getDate() - 5);
    const dtIni = formatISO(dIni);

    console.log(`DJEN Background: Iniciando varredura para OABs ${oabs.join(',')} (${uf}) de ${dtIni} a ${dtFim}`);

    let novasPublicacoes = [];
    let seenIds = safeJSONParse(data.djen_last_search_seen_ids, []);
    if (!Array.isArray(seenIds)) {
        seenIds = [];
    }
    const seenIdsSet = new Set(seenIds.map(String));

    for (const oab of oabs) {
        const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${oab}&ufOab=${uf}&dataDisponibilizacaoInicio=${dtIni}&dataDisponibilizacaoFim=${dtFim}`;
        try {
            const res = await fetchComRetryBg(url, 3);
            const items = res.items || [];
            for (const item of items) {
                const idStr = String(item.id);
                if (!seenIdsSet.has(idStr)) {
                    novasPublicacoes.push(item);
                    seenIdsSet.add(idStr);
                }
            }
        } catch (err) {
            console.error(`DJEN Background: Erro ao varrer OAB ${oab}-${uf}:`, err);
        }
    }

    if (novasPublicacoes.length > 0) {
        console.log(`DJEN Background: Encontradas ${novasPublicacoes.length} novas publicações!`);
        
        let title = "Nova publicação encontrada!";
        let message = `Temos ${novasPublicacoes.length} novas intimações para a OAB ${oabs.join(',')} (${uf}).`;
        if (novasPublicacoes.length === 1) {
            const p = novasPublicacoes[0];
            const numProc = p.numeroProcesso || p.numero || p.processo || "Processo sem número";
            const trib = p.siglaTribunal || "Tribunal não informado";
            title = `Nova Intimação - ${trib}`;
            message = `Processo: ${numProc}`;
        }

        extAPI.notifications.create("djen_nova_publicacao_notif", {
            type: "basic",
            iconUrl: "djen-128.png",
            title: title,
            message: message,
            priority: 2
        });

        const novosVistos = Array.from(seenIdsSet).slice(-1000);
        globalThis.SafeStorage.set({ 'djen_last_search_seen_ids': JSON.stringify(novosVistos) });
    } else {
        console.log("DJEN Background: Nenhuma nova publicação encontrada nesta execução.");
    }
}

// Tratar clique na notificação para focar/abrir a extensão
if (extAPI.notifications) {
    extAPI.notifications.onClicked.addListener((notificationId) => {
        if (notificationId === "djen_nova_publicacao_notif") {
            if (extAPI.sidePanel && typeof extAPI.sidePanel.open === 'function') {
                extAPI.windows.getCurrent((win) => {
                    const windowId = win ? win.id : null;
                    if (windowId) {
                        extAPI.sidePanel.open({ windowId }).catch(() => {
                            extAPI.tabs.create({ url: "sidebar.html" });
                        });
                    } else {
                        extAPI.tabs.create({ url: "sidebar.html" });
                    }
                });
            } else if (extAPI.sidebarAction && typeof extAPI.sidebarAction.open === 'function') {
                extAPI.sidebarAction.open().catch(() => {
                    extAPI.tabs.create({ url: "sidebar.html" });
                });
            } else {
                extAPI.tabs.create({ url: "sidebar.html" });
            }
        }
    });
}

function atualizarBadgeIconeBg() {
    const extAPI = typeof browser !== 'undefined' ? browser : chrome;
    if (!extAPI.action || !extAPI.action.setBadgeText) return;
    globalThis.SafeStorage.get(['djen_prazos_salvos'], (data) => {
        if (!data.djen_prazos_salvos) {
            extAPI.action.setBadgeText({ text: '' });
            return;
        }
        try {
            const prazos = safeJSONParse(data.djen_prazos_salvos, {});
            let vencendoHoje = 0;
            let atrasados = 0;
            const hoje = new Date();
            hoje.setHours(0,0,0,0);

            for (const key in prazos) {
                const prazo = prazos[key];
                if (!prazo || prazo.cumprido || prazo.espera) continue;
                
                if (prazo.fatal) {
                    const parts = prazo.fatal.split('/');
                    if (parts.length === 3) {
                        const prazoData = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`);
                        if (prazoData.getTime() === hoje.getTime()) vencendoHoje++;
                        else if (prazoData.getTime() < hoje.getTime()) atrasados++;
                    }
                }
            }

            const totalAlertas = vencendoHoje + atrasados;
            if (totalAlertas > 0) {
                extAPI.action.setBadgeText({ text: String(totalAlertas) });
                extAPI.action.setBadgeBackgroundColor({ color: '#D44C47' });
            } else {
                extAPI.action.setBadgeText({ text: '' });
            }
        } catch (e) {
            console.error("DJEN Bg: Erro ao atualizar badge:", e);
        }
    });
}

// Inicializa o badge na carga do Service Worker
atualizarBadgeIconeBg();