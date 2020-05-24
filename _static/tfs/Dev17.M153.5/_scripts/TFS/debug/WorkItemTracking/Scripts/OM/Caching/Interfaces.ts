
export interface ICacheData<T> {
    /** Etag/cachestamp for the cached data */
    cachestamp: string;

    /** UTC timestamp when the data was cached */
    cachedAt: number;

    /** Cached data */
    data: IDictionaryStringTo<T>;
}

export interface ICacheProvider {
    /**
     * Store data for given project and cache key
     * @param projectId Project id
     * @param key Cache key
     * @param data Data to cache
     */
    store<T>(projectId: string, key: string, data: ICacheData<T>): Promise<void>;

    /**
     * Read and store data in a single transaction (if supported by the store)
     * @param projectId Project id
     * @param key Cache key
     * @param data Data to cache
     */
    update<T>(projectId: string, key: string, data: (data: ICacheData<T>) => ICacheData<T>): Promise<void>;

    /**
     * Delete data from the cache
     * @param projectId Project id
     * @param key Cache key
     */
    delete(projectId: string, key: string): Promise<void>;

    /**
     * Read data from the cache
     * @param projectId Project id
     * @param key Cache key
     */
    read<T>(projectId: string, key: string): Promise<ICacheData<T>>;
}