/**
 * DJEN State Module — Centraliza todo o estado global da aplicação.
 * 
 * Todos os módulos importam state.js para ler/escrever estado compartilhado.
 * O estado é mutável por design — os objetos são referências compartilhadas.
 */

// =========================================================
// ESTADO GLOBAL DA APLICAÇÃO (Cérebro do DJEN)
// =========================================================
const AppState = {
    dados: {
        publicacoes: [],
        resultadosAtuais: []
    },
    filtros: {
        tribunal: '',
        termoBusca: '',
        apenasUrgentes: false
    },
    config: {
        emailAgenda: '',
        termosRadar: []
    }
};

// --- Estado de dados persistentes ---
let prazosSalvos = {};
function setPrazosSalvos(obj) { prazosSalvos = obj; }

let resultadosGlobais = [];
function setResultadosGlobais(arr) { resultadosGlobais = arr; }

let resultadosExibidos = [];
function setResultadosExibidos(arr) { resultadosExibidos = arr; }

// --- Estado de UI/configuração ---
let temaAtual = 'auto';
function setTemaAtual(v) { temaAtual = v; }

let fontSizeFocoAtual = 15;
function setFontSizeFocoAtual(v) { fontSizeFocoAtual = v; }

let filtroAgendaAtivo = null;
function setFiltroAgendaAtivo(v) { filtroAgendaAtivo = v; }

let searchMode = 'oab';
function setSearchMode(v) { searchMode = v; }

// --- Estado de IA ---
let iaProvider = 'gemini';
function setIaProvider(v) { iaProvider = v; }

let iaApiKey = '';
function setIaApiKey(v) { iaApiKey = v; }

let iaModel = 'gemini-1.5-flash';
function setIaModel(v) { iaModel = v; }

let iaEndpoint = '';
function setIaEndpoint(v) { iaEndpoint = v; }

// --- Estado de sessão ---
let historicoBuscas = [];
function setHistoricoBuscas(arr) { historicoBuscas = arr; }

let historicoControle = [];
function setHistoricoControle(arr) { historicoControle = arr; }

let publicacoesLidas = new Set();
function setPublicacoesLidas(s) { publicacoesLidas = s; }

let customSuspensions = [];
function setCustomSuspensions(arr) { customSuspensions = arr; }

let isNotificarBackground = false;
function setIsNotificarBackground(v) { isNotificarBackground = v; }

// --- Estatísticas ---
let totalCumpridosHistorico = 0;
function setTotalCumpridosHistorico(v) { totalCumpridosHistorico = v; }

let totalBuscas = 0;
function setTotalBuscas(v) { totalBuscas = v; }

let totalLidos = 0;
function setTotalLidos(v) { totalLidos = v; }

let totalSalvos = 0;
function setTotalSalvos(v) { totalSalvos = v; }

// --- Estado de compartilhamento ---
let textoParaCompartilhar = '';
function setTextoParaCompartilhar(v) { textoParaCompartilhar = v; }

let tituloParaCompartilhar = '';
function setTituloParaCompartilhar(v) { tituloParaCompartilhar = v; }

let itensParaCompartilhar = [];
function setItensParaCompartilhar(arr) { itensParaCompartilhar = arr; }

// --- Estado de charts ---
let chartStatusInst = null;
function setChartStatusInst(v) { chartStatusInst = v; }

let chartTribunaisInst = null;
function setChartTribunaisInst(v) { chartTribunaisInst = v; }

// --- Estado de controle ---
let multiOabSearch = false;
function setMultiOabSearch(v) { multiOabSearch = v; }

// --- Caches ---
let cacheMunicipios = {};
let feriadosExtras = {};
function setFeriadosExtras(v) { feriadosExtras = v; }

// --- Constantes ---
const pixCodeText = "50f781e2-9d94-4624-8f08-a9938bb0c4dc";

let palavrasUrgentes = ["penhora", "bloqueio", "revelia", "liminar", "audiência", "audiencia"];
function setPalavrasUrgentes(arr) { palavrasUrgentes = arr; }

const iconesSVG = {
    calendario: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>`,
    copiar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`,
    check: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    remover: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    foco: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`,
    retro: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="2" x2="14" y2="2"></line><line x1="12" y1="14" x2="15" y2="11"></line><circle cx="12" cy="14" r="8"></circle></svg>`,
    maisOpcoes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.5"></circle><circle cx="19" cy="12" r="1.5"></circle><circle cx="5" cy="12" r="1.5"></circle></svg>`,
    lapis: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
    eyeOff: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`,
    sirene: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--zen-red); filter: drop-shadow(0 2px 4px var(--zen-red-bg)); vertical-align: middle;"><path d="M12 2v3M4.93 4.93l2.12 2.12M19.07 4.93l-2.12 2.12"></path><path d="M12 8a6 6 0 0 0-6 6v6h12v-6a6 6 0 0 0-6-6z"></path><path d="M2 20h20"></path></svg>`,
    boxEmpty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 56px; height: 56px; color: var(--border-light); margin-bottom: 16px;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
    tag: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    share: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
    whatsapp: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.446-.272.371-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`
};

// --- Callback de apelido ---
let currentApelidoCallback = null;
function setCurrentApelidoCallback(fn) { currentApelidoCallback = fn; }
