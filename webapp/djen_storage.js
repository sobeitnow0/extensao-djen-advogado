globalThis.SafeStorage = (function() {
    const DB_NAME = 'DjenDatabase';
    const STORE_NAME = 'DjenStore';
    let dbInstance = null;
    let dbPromise = null;

    const initDB = () => {
        if (dbInstance) return Promise.resolve(dbInstance);
        if (dbPromise) return dbPromise;
        
        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 2);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                dbInstance.onclose = () => { dbInstance = null; dbPromise = null; };
                dbInstance.onversionchange = () => { dbInstance.close(); dbInstance = null; dbPromise = null; };
                resolve(dbInstance);
            };
            request.onerror = () => {
                dbPromise = null;
                reject(request.error);
            };
        });
        return dbPromise;
    };

    const cloneSafe = (obj) => {
        try {
            return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
        } catch(e) {
            return obj;
        }
    };

    // --- Native Compression Utils ---
    const isCompressionSupported = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

    const decompressValueIfNeeded = async (val) => {
        if (typeof val === 'string' && val.startsWith('__GZIP__') && isCompressionSupported) {
            try {
                const base64Str = val.substring(8);
                const res = await fetch('data:application/octet-stream;base64,' + base64Str);
                const buffer = await res.arrayBuffer();
                const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
                return await new Response(stream).text();
            } catch (e) {
                console.error("DJEN: Erro ao descomprimir dado", e);
                return val;
            }
        }
        return val;
    };

    const compressValueIfNeeded = async (val) => {
        if (typeof val === 'string' && val.length > 2048 && isCompressionSupported) {
            try {
                const stream = new Blob([val]).stream().pipeThrough(new CompressionStream('gzip'));
                const buffer = await new Response(stream).arrayBuffer();
                
                // Conversão buffer para base64 que funciona em Service Workers (sem FileReader)
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return '__GZIP__' + btoa(binary);
            } catch (e) {
                console.warn("DJEN: Falha ao comprimir dado longo, salvando normal", e);
                return val;
            }
        }
        return val;
    };
    // --------------------------------

    return {
        get: async (keys, cb) => {
            try {
                const db = await initDB();
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                let result = {};
                const promises = keys.map(key => {
                    return new Promise((res) => {
                        const req = store.get(key);
                        req.onsuccess = async () => {
                            let val = req.result;
                            // Fallback para localStorage se não existir no IndexedDB ou se for um objeto/string vazio
                            const isValEmpty = val === undefined || val === null || val === '{}' || val === '[]' || val === '' || (typeof val === 'object' && Object.keys(val).length === 0);
                            
                            if (isValEmpty && typeof localStorage !== 'undefined') {
                                const localVal = localStorage.getItem(key);
                                const isLocalEmpty = localVal === undefined || localVal === null || localVal === '{}' || localVal === '[]' || localVal === '';
                                
                                // Só faz o fallback se tivermos algo real no localStorage
                                if (localVal && !isLocalEmpty) {
                                    val = localVal;
                                }
                            }
                            result[key] = await decompressValueIfNeeded(val) || null;
                            res();
                        };
                        req.onerror = () => res();
                    });
                });
                await Promise.all(promises);
                if (typeof cb === 'function') cb(result);
                return result;
            } catch (e) {
                let d = {};
                for (const k of keys) {
                    const val = typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null;
                    let parsedVal = val;
                    try { parsedVal = val ? JSON.parse(val) : null; } catch(err) { parsedVal = val; }
                    d[k] = await decompressValueIfNeeded(parsedVal);
                }
                if (typeof cb === 'function') cb(d);
                return d;
            }
        },
        getAll: async (cb) => {
            try {
                const db = await initDB();
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const allKeysRequest = store.getAllKeys();
                
                return new Promise((resolve) => {
                    allKeysRequest.onsuccess = () => {
                        const keys = allKeysRequest.result;
                        let result = {};
                        const promises = keys.map(key => {
                            return new Promise((res) => {
                                const req = store.get(key);
                                req.onsuccess = async () => {
                                    let val = req.result;
                                    const isValEmpty = val === undefined || val === null || val === '{}' || val === '[]' || val === '' || (typeof val === 'object' && Object.keys(val).length === 0);
                                    if (isValEmpty && typeof localStorage !== 'undefined') {
                                        const localVal = localStorage.getItem(key);
                                        const isLocalEmpty = localVal === undefined || localVal === null || localVal === '{}' || localVal === '[]' || localVal === '';
                                        if (localVal && !isLocalEmpty) val = localVal;
                                    }
                                    result[key] = await decompressValueIfNeeded(val) || null;
                                    res();
                                };
                                req.onerror = () => res();
                            });
                        });
                        
                        Promise.all(promises).then(() => {
                            if (typeof localStorage !== 'undefined') {
                                for (let i = 0; i < localStorage.length; i++) {
                                    let k = localStorage.key(i);
                                    if (k.startsWith('djen_') && result[k] === undefined) {
                                        let val = localStorage.getItem(k);
                                        let parsedVal = val;
                                        try { parsedVal = val ? JSON.parse(val) : null; } catch(err) { parsedVal = val; }
                                        if (parsedVal) result[k] = parsedVal;
                                    }
                                }
                            }
                            if (typeof cb === 'function') cb(result);
                            resolve(result);
                        }).catch(() => {
                            if (typeof cb === 'function') cb({});
                            resolve({});
                        });
                    };
                    allKeysRequest.onerror = () => {
                        if (typeof cb === 'function') cb({});
                        resolve({});
                    };
                });
            } catch (e) {
                let d = {};
                if (typeof localStorage !== 'undefined') {
                    for (let i = 0; i < localStorage.length; i++) {
                        let k = localStorage.key(i);
                        if (k.startsWith('djen_')) {
                            let val = localStorage.getItem(k);
                            let parsedVal = val;
                            try { parsedVal = val ? JSON.parse(val) : null; } catch(err) { parsedVal = val; }
                            d[k] = await decompressValueIfNeeded(parsedVal);
                        }
                    }
                }
                if (typeof cb === 'function') cb(d);
                return d;
            }
        },
        set: async (obj) => {
            const safeObj = {};
            for (const k of Object.keys(obj)) {
                safeObj[k] = await compressValueIfNeeded(cloneSafe(obj[k]));
            }

            try {
                const db = await initDB();
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                Object.keys(safeObj).forEach(key => {
                    store.put(safeObj[key], key);
                });
            } catch (e) {
                Object.keys(safeObj).forEach(k => {
                    try {
                        if (typeof localStorage !== 'undefined') {
                            localStorage.setItem(k, JSON.stringify(safeObj[k]));
                        }
                    } catch (err) {}
                });
            }
        },
        remove: async (keys) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            try {
                const db = await initDB();
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                arr.forEach(k => {
                    store.delete(k);
                });
            } catch (e) {}

            if (typeof localStorage !== 'undefined') {
                arr.forEach(k => {
                    try { localStorage.removeItem(k); } catch (e) {}
                });
            }
        }
    };
})();
