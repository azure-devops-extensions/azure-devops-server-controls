import { ICacheData, ICacheProvider } from "WorkItemTracking/Scripts/OM/Caching/Interfaces";

export class LocalStorageCacheProvider implements ICacheProvider {
    public static isSupported(): boolean {
        // tslint:disable-next-line:triple-equals
        return window.localStorage != null;
    }

    public store<T>(projectId: string, key: string, data: ICacheData<T>): Promise<void> {
        return new Promise(resolve => resolve(localStorage.setItem(this._getKey(projectId, key), JSON.stringify(data))));
    }

    public update<T>(projectId: string, key: string, data: (data: ICacheData<T>) => ICacheData<T>): Promise<void> {
        return this.read<T>(projectId, key)
            .then(cacheData => {
                const dataToCache = data(cacheData);

                return this.store(projectId, key, dataToCache);
            });
    }

    public delete(projectId: string, key: string): Promise<void> {
        return new Promise(resolve => resolve(localStorage.removeItem(this._getKey(projectId, key))));
    }

    public read<T>(projectId: string, key: string): Promise<ICacheData<T>> {
        return new Promise<ICacheData<T>>(resolve => {
            const stringifiedData = localStorage.getItem(this._getKey(projectId, key));

            resolve(JSON.parse(stringifiedData) as ICacheData<T>);
        });
    }

    private _getKey(projectId: string, key: string): string {
        return `wit/${projectId}/${key}`;
    }
}
