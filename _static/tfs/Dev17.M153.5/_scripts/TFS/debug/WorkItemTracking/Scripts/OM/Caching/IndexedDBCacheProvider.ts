import * as Diag from "VSS/Diag";
import { ICacheProvider, ICacheData } from "WorkItemTracking/Scripts/OM/Caching/Interfaces";
import { handleError } from "VSS/VSS";
import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import { WITCustomerIntelligenceArea } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { delay, DelayedFunction } from "VSS/Utils/Core";
import { traceMessage } from "WorkItemTracking/Scripts/Trace";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { publishErrorToTelemetry } from "VSS/Error";

/** Timespan after which items will be removed from the cache */
const maximumAgeOfCachedItemsInDays = 4;

/** Time to wait after initializating the cache provider before we run a job to evict old cache entries */
const waitBeforeEvictionInMs = 3000;

/** WIT metadata version   */
const witIndexedDBVersion = 5;

export class IndexedDBCacheProvider implements ICacheProvider, IDisposable {
    public static isSupported(): boolean {
        // tslint:disable-next-line:triple-equals
        return window.indexedDB != null;
    }

    private _disposed = false;
    private _store: KeyValueStore;
    private _openPromise: Promise<void>;
    private _eviction: DelayedFunction;

    constructor() {
        this._store = new KeyValueStore();

        this._openPromise = this._store
            .open("wit", "metaDataCache")
            .then(() => {
                this._openPromise = null;
            })
            .then(() => this._scheduleEviction())
            .catch(error => {
                // Publish error to CI
                traceMessage(
                    WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    "Caching",
                    CIConstants.WITCustomerIntelligenceFeature.WIT_CACHE_PROVIDER_INIT,
                    error.message
                );

                // Opening the store failed
                this._store = null;
                this._disposed = true;
            });
    }

    public dispose(): void {
        if (this._disposed) {
            return;
        }

        this._disposed = true;

        if (this._store) {
            this._openPromise = null;
            this._store.close();
            this._store = null;
        }

        if (this._eviction) {
            this._eviction.cancel();
            this._eviction = null;
        }
    }

    public store<T>(projectId: string, key: string, data: ICacheData<T>): Promise<void> {
        return this._ensureStore(() => this._store.set(this._getKey(projectId, key), data));
    }

    public delete(projectId: string, key: string): Promise<void> {
        return this._ensureStore(() => this._store.delete(this._getKey(projectId, key)));
    }

    public read<T>(projectId: string, key: string): Promise<ICacheData<T>> {
        return this._ensureStore<ICacheData<T>>(() => this._store.get(this._getKey(projectId, key)));
    }

    public update<T>(projectId: string, key: string, data: (data: ICacheData<T>) => ICacheData<T>): Promise<void> {
        return this._ensureStore(() => this._store.getAndSet(this._getKey(projectId, key), data));
    }

    /**
     * Ensure that the connection to the store is open. If it's not, ignore the operation.
     */
    private _ensureStore<T = void>(operation: () => Promise<T>): Promise<T> {
        if (!this._store || this._disposed) {
            // Ignore the operation
            return Promise.resolve(null);
        }

        if (this._openPromise) {
            return this._openPromise.then(() => {
                if (!this._store) {
                    // Store was disposed, ignore this operation
                    return;
                }

                return operation();
            });
        }

        return operation();
    }

    private _getKey(projectId: string, key: string): string {
        return `wit/${witIndexedDBVersion}/${projectId}/${key}`;
    }

    private _scheduleEviction() {
        // Evict old cache entries after TTI in order to not interfere with page loading
        this._eviction = delay(this, waitBeforeEvictionInMs, this._evictEntries);
    }

    private _evictEntries() {
        const maxAgeInMS = maximumAgeOfCachedItemsInDays * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - maxAgeInMS;

        this._ensureStore(
            // Get all items in the store
            () =>
                this._store
                    .getAll<ICacheData<Object>>()
                    // Filter to expired items
                    .then(contents => Object.keys(contents).filter(key => contents[key].cachedAt < cutoff))
                    // Serially delete items from the store
                    .then(keysToDelete => {
                        if (keysToDelete.length > 0) {
                            publishEvent(
                                new TelemetryEventData(WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, "Caching", {
                                    numberOfEvictedItems: keysToDelete.length
                                })
                            );
                        }

                        return keysToDelete.reduce((prev, key) => prev.then(() => this._store.delete(key)), Promise.resolve(null));
                    })
        );
    }
}

/**
 * IndexedDB backed key value store
 */
class KeyValueStore {
    private _db: IDBDatabase;
    private _dbName: string;
    private _storeName: string;

    /**
     * Open a connection for the given database and keyvalue store
     * @param dbName Name of database
     * @param storeName Name of key value store
     */
    open(dbName: string, storeName: string): Promise<void> {
        this._dbName = dbName;
        this._storeName = storeName;

        // Prevent upgrades for now
        const version = 1;
        const request = window.indexedDB.open(dbName, version);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = event => {
                Diag.logInfo(`Upgrading from ${event.oldVersion} to ${event.newVersion}`);

                if (event.oldVersion < 1) {
                    // Initial creation of database
                    request.result.createObjectStore(storeName);
                } else {
                    Diag.Debug.fail("Upgrade not supported yet");
                }
            };
        }).then(() => {
            this._db = request.result;

            this._sendQuotaInformation();
        });
    }

    /**
     * Close connection to database and keyvalue store
     */
    close(): Promise<void> {
        return new Promise(resolve => {
            if (this._db) {
                this._db.close();
                this._db = null;
            }
        });
    }

    getAll<T>(): Promise<{ [key: string]: T }> {
        return new Promise((resolve, reject) => {
            const contents: { [key: string]: T } = {};

            this._usingTransaction<T>("readonly", store => {
                const cursorRequest = store.openCursor();
                cursorRequest.onsuccess = (event: any) => {
                    const cursor: IDBCursorWithValue = event.target.result;
                    if (cursor) {
                        contents[cursor.key as string] = cursor.value;
                        cursor.continue();
                    } else {
                        // No more results
                        resolve(contents);
                    }
                };
            }).then(null, reject);
        });
    }

    get<T>(key: string): Promise<T> {
        return this._usingTransaction<T>("readonly", store => store.get(key));
    }

    set<T>(key: string, value: T): Promise<void> {
        return this._usingTransaction("readwrite", store => store.put(value, key));
    }

    getAndSet<T>(key: string, data: (data: T) => T): Promise<void> {
        return this._usingTransaction<void>("readwrite", store => {
            const readRequest = store.get(key);
            readRequest.onsuccess = () => {
                // Read data first
                const cacheData = readRequest.result;

                // Pass to caller
                const dataToCache = data(cacheData);

                // Issue put request
                return store.put(dataToCache, key);
            };
        });
    }

    delete(key: string): Promise<void> {
        return this._usingTransaction("readwrite", store => store.delete(key));
    }

    private _usingTransaction<T = void>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest | void): Promise<T | null> {
        return new Promise((resolve, reject) => {
            if (!this._db) {
                reject(new Error("KeyValueStore: DB not ready"));
                return;
            }

            const transaction = this._db.transaction(this._storeName, mode);

            let request: IDBRequest = null;

            transaction.oncomplete = ev => {
                resolve(request);
            };

            // When an error occurs or the transaction is aborted we want to reject the returned promise
            const errorHandler = (error: any) => {
                if (error && error.target && error.target.error) {
                    reject(error.target.error);
                } else {
                    reject(error);
                }
            };

            transaction.onabort = errorHandler;
            transaction.onerror = errorHandler;

            const store = transaction.objectStore(this._storeName);
            request = operation(store) || null;

            if (request) {
                // Also reject promise when the store request fails
                request.onerror = e => {
                    reject(e);
                };
            }
        }).then((request: IDBRequest | null) => {
            if (request) {
                return request.result as T;
            }

            return null;
        });
    }

    private _sendQuotaInformation() {
        try {
            const untypedNavigator = navigator as any;
            if (untypedNavigator && untypedNavigator.webkitTemporaryStorage && untypedNavigator.webkitTemporaryStorage.queryUsageAndQuota) {
                untypedNavigator.webkitTemporaryStorage.queryUsageAndQuota((usedQuota: number, availableQuota: number) => {
                    publishEvent(
                        new TelemetryEventData(WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, "IndexedDB", {
                            usedQuota,
                            availableQuota
                        })
                    );
                });
            }
        } catch (e) {
            // Swallow and continue
        }
    }
}
