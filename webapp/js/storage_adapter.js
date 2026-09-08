/**
 * StorageAdapter — Camada de abstração sobre SafeStorage.
 * 
 * Fornece uma API baseada em Promises sobre o SafeStorage existente (IndexedDB + localStorage).
 * Preparado para futura migração para PouchDB sem alterar os consumidores.
 * 
 * Uso:
 *   await StorageAdapter.getAsync(['djen_prazos_salvos']);
 *   await StorageAdapter.setAsync({ 'djen_prazos_salvos': JSON.stringify(data) });
 * 
 * Compatível com Chrome e Firefox (MV3).
 */

globalThis.StorageAdapter = (function () {
    'use strict';

    // ========================================
    // CAMADA DE CACHE EM MEMÓRIA (L1)
    // ========================================
    const _cache = new Map();
    let _cacheWarmed = false;

    /**
     * Pré-carrega todas as chaves do SafeStorage para cache em memória.
     * Chamado uma vez na inicialização para acelerar leituras subsequentes.
     */
    async function warmCache() {
        if (_cacheWarmed) return;
        return new Promise((resolve) => {
            if (!globalThis.SafeStorage) {
                console.warn('StorageAdapter: SafeStorage não disponível para warm cache.');
                _cacheWarmed = true;
                resolve();
                return;
            }
            globalThis.SafeStorage.getAll((data) => {
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([k, v]) => _cache.set(k, v));
                }
                _cacheWarmed = true;
                resolve();
            });
        });
    }

    // ========================================
    // API PÚBLICA BASEADA EM PROMISES
    // ========================================

    /**
     * Lê uma ou mais chaves do storage.
     * @param {string[]} keys - Chaves a ler.
     * @returns {Promise<Object>} Objeto { chave: valor }.
     */
    function getAsync(keys) {
        // Tentar resolver do cache L1 primeiro
        if (_cacheWarmed) {
            const allCached = keys.every(k => _cache.has(k));
            if (allCached) {
                const result = {};
                keys.forEach(k => { result[k] = _cache.get(k); });
                return Promise.resolve(result);
            }
        }

        return new Promise((resolve, reject) => {
            if (!globalThis.SafeStorage) {
                reject(new Error('SafeStorage não disponível'));
                return;
            }
            try {
                globalThis.SafeStorage.get(keys, (data) => {
                    // Atualizar cache
                    if (data && typeof data === 'object') {
                        Object.entries(data).forEach(([k, v]) => _cache.set(k, v));
                    }
                    resolve(data || {});
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Grava um ou mais pares chave/valor no storage.
     * @param {Object} obj - Objeto { chave: valor } a gravar.
     * @returns {Promise<void>}
     */
    async function setAsync(obj) {
        const changes = {};
        
        // Atualizar cache L1 imediatamente (write-through)
        Object.entries(obj).forEach(([k, v]) => {
            const oldVal = _cache.get(k);
            if (oldVal !== v) {
                changes[k] = { oldValue: oldVal, newValue: v };
                _cache.set(k, v);
            }
        });

        if (!globalThis.SafeStorage) {
            console.warn('StorageAdapter: SafeStorage não disponível para escrita.');
            _notifyListeners(changes);
            return;
        }

        // SafeStorage.set já é async, mas não retorna Promise explícita 
        // que possamos esperar. Delegamos e confiamos no mecanismo interno.
        const result = globalThis.SafeStorage.set(obj);
        _notifyListeners(changes);
        return result;
    }

    /**
     * Lê todas as chaves do storage.
     * @returns {Promise<Object>}
     */
    function getAllAsync() {
        return new Promise((resolve, reject) => {
            if (!globalThis.SafeStorage) {
                reject(new Error('SafeStorage não disponível'));
                return;
            }
            try {
                globalThis.SafeStorage.getAll((data) => {
                    // Atualizar cache completo
                    if (data && typeof data === 'object') {
                        _cache.clear();
                        Object.entries(data).forEach(([k, v]) => _cache.set(k, v));
                        _cacheWarmed = true;
                    }
                    resolve(data || {});
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Remove uma ou mais chaves do storage.
     * @param {string[]} keys - Chaves a remover.
     * @returns {Promise<void>}
     */
    async function removeAsync(keys) {
        // SafeStorage não tem método remove nativo — gravamos null
        // setAsync atualizará o cache e notificará os listeners
        const nullObj = {};
        keys.forEach(k => { nullObj[k] = null; });
        return setAsync(nullObj);
    }

    // ========================================
    // HELPERS DE CONVENIÊNCIA
    // ========================================

    /**
     * Lê uma única chave do IndexedDB.
     * Substitui localStorage.getItem() para dados críticos.
     *
     * @param {string} key - Chave a ler.
     * @param {*} [fallback=null] - Valor retornado se a chave não existir.
     * @returns {Promise<*>} Valor armazenado ou fallback.
     *
     * @example
     *   const email = await StorageAdapter.getFromStorage('djen_email_gcal', '');
     *   const prazos = JSON.parse(await StorageAdapter.getFromStorage('djen_prazos_arquivados') ?? '[]');
     */
    async function getFromStorage(key, fallback = null) {
        try {
            const result = await getAsync([key]);
            const val = result[key];
            return (val !== undefined && val !== null) ? val : fallback;
        } catch (e) {
            console.warn(`StorageAdapter.getFromStorage('${key}'): IndexedDB falhou, fallback localStorage.`, e);
            // Fallback emergencial — não é a fonte de verdade
            return localStorage.getItem(key) ?? fallback;
        }
    }

    /**
     * Lê múltiplas chaves do IndexedDB de uma vez.
     * Substitui várias chamadas localStorage.getItem() encadeadas.
     *
     * @param {string[]} keys - Chaves a ler.
     * @returns {Promise<Object>} Objeto { chave: valor }.
     *
     * @example
     *   const { djen_email_gcal, djen_prazos_arquivados } =
     *     await StorageAdapter.getMultiFromStorage(['djen_email_gcal', 'djen_prazos_arquivados']);
     */
    async function getMultiFromStorage(keys) {
        try {
            return await getAsync(keys);
        } catch (e) {
            console.warn('StorageAdapter.getMultiFromStorage: IndexedDB falhou, fallback localStorage.', e);
            const result = {};
            keys.forEach(k => { result[k] = localStorage.getItem(k); });
            return result;
        }
    }

    /**
     * Limpa todo o cache L1 (não apaga dados do storage).
     */
    function clearCache() {
        _cache.clear();
        _cacheWarmed = false;
    }

    /**
     * Retorna estatísticas do cache para debug.
     */
    function getCacheStats() {
        return {
            size: _cache.size,
            warmed: _cacheWarmed,
            keys: Array.from(_cache.keys())
        };
    }

    // ========================================
    // LISTENERS DE MUDANÇAS
    // ========================================
    const _listeners = new Set();

    /**
     * Registra um listener para observar mudanças no storage.
     * @param {Function} callback - Função chamada com objeto de changes.
     * @returns {Function} Função para remover o listener.
     */
    function onChange(callback) {
        if (typeof callback === 'function') {
            _listeners.add(callback);
        }
        return () => _listeners.delete(callback);
    }

    function _notifyListeners(changes) {
        if (_listeners.size === 0 || Object.keys(changes).length === 0) return;
        _listeners.forEach(cb => {
            try { cb(changes); } catch (e) { console.error('StorageAdapter listener erro:', e); }
        });
    }

    // ========================================
    // COMPATIBILIDADE COM API CALLBACK LEGADA
    // ========================================
    // Mantém 100% de compatibilidade com o SafeStorage original.
    // Código legado pode usar StorageAdapter.get(keys, cb) normalmente.

    function get(keys, cb) {
        getAsync(keys).then(cb).catch(() => cb({}));
    }

    function set(obj) {
        setAsync(obj).catch(e => {
            console.error('StorageAdapter: Erro ao gravar:', e);
        });
    }

    function getAll(cb) {
        getAllAsync().then(cb).catch(() => cb({}));
    }

    // ========================================
    // INTERFACE PÚBLICA
    // ========================================
    return {
        // API Promise (nova)
        getAsync,
        setAsync,
        getAllAsync,
        removeAsync,
        warmCache,
        clearCache,
        getCacheStats,
        onChange,

        // Helpers de conveniência (substitutos do localStorage para dados críticos)
        getFromStorage,
        getMultiFromStorage,

        // API Callback (compatibilidade legada — drop-in para SafeStorage)
        get,
        set,
        getAll
    };
})();
