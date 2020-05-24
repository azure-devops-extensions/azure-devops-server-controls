/**
 * Interface for SkypeTeamTabRequestCache.
 */
export interface ISkypeTeamTabRequestCache {
    /**
     * Return the value stored given the key.
     * @param {string} key - unique key used to get value.
     * @return the value mapped to the given key.
     */
    get(key: string): string;

    /**
     * Set the given key to map to the given value.
     * @param {string} key - unique key used to store value.
     * @param {string} value - value to be stored.
     */
    set(key: string, value: string): void;

    /**
     * Delete the record mapped to the given key.
     * @param {string} key - unique key.
     */
    delete(key: string): void;
}

/**
 * This class acts as cache storing lastest server request.
 */
export class SkypeTeamTabRequestCache implements ISkypeTeamTabRequestCache {
    // A map containing key as setting id, and value as lastest project id being retrieved from server.
    private _settingIdTolastestProjectId: IDictionaryStringTo<string>;

    constructor() {
        this._settingIdTolastestProjectId = {};
    }

    /**
     * Return the value stored given the key.
     * @param {string} key - unique key used to get value.
     */
    public get(key: string): string {
        return this._settingIdTolastestProjectId[key];
    }

    /**
     * Set the given key to map to the given value.
     * @param {string} key - unique key used to store value.
     * @param {string} value - value to be stored.
     */
    public set(key: string, value: string) {
        if (key != null) {
            // replace the value corresponding to the key.
            this._settingIdTolastestProjectId[key] = value;
        }
    }

    /**
     * Delete the record mapped to the given key.
     * @param {string} key - unique key.
     */
    public delete(key: string) {
        if (this.get(key)) {
            delete this._settingIdTolastestProjectId[key];
        }
    }
}