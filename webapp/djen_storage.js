window.SafeStorage = (function() {
    const DB_NAME = 'DjenDatabase';
    const STORE_NAME = 'DjenStore';
    let dbInstance = null;

    const initDB = () => {
        return new Promise((resolve, reject) => {
            if (dbInstance) {
                resolve(dbInstance);
                return;
            }
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                dbInstance.onclose = () => { dbInstance = null; };
                dbInstance.onversionchange = () => { dbInstance.close(); dbInstance = null; };
                resolve(dbInstance);
            };
            request.onerror = () => reject(request.error);
        });
    };

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
                        req.onsuccess = () => {
                            result[key] = req.result || null;
                            res();
                        };
                        req.onerror = () => res();
                    });
                });
                await Promise.all(promises);
                cb(result);
            } catch (e) {
                console.error("DJEN: Falha no IndexedDB. Usando fallback.", e);
                let d = {};
                keys.forEach(k => d[k] = localStorage.getItem(k));
                cb(d);
            }
        },
        set: async (obj) => {
            try {
                const db = await initDB();
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                Object.keys(obj).forEach(key => {
                    store.put(obj[key], key);
                });
            } catch (e) {
                console.error("DJEN: Erro de escrita no IndexedDB.", e);
                Object.keys(obj).forEach(k => localStorage.setItem(k, obj[k]));
            }
        }
    };
})();
