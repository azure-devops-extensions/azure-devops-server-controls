import { ICacheProvider, ICacheData } from "WorkItemTracking/Scripts/OM/Caching/Interfaces";

/**
 * Cache provider which no-ops for every operation
 */
export class NullCacheProvider implements ICacheProvider {
    delete(projectId: string, key: string): Promise<void> {
        return Promise.resolve(null);
    }

    store<T>(projectId: string, key: string, data: ICacheData<T>): Promise<void> {
        return Promise.resolve(null);
    }

    update<T>(projectId: string, key: string, data: (data: ICacheData<T>) => ICacheData<T>): Promise<void> {
        return Promise.resolve(null);
    }

    read<T>(projectId: string, key: string): Promise<T> {
        return Promise.resolve(null);
    }
}