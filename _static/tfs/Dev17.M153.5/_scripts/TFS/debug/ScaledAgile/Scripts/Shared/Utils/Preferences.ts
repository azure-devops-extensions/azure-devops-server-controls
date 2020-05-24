import {Storage} from "ScaledAgile/Scripts/Shared/Utils/Storage";

export abstract class Preferences<T> {

    /**
     * Constructor
     * @param prefix {string} the key prefix to be used for storing values
     * @param defaultValue {() =>T} function to return the default preferences value 
     */
    constructor(private prefix: string, private defaultValue: () => T) {
    }

    /**
     * Get the preferences
     * @param id {string} the id to be used to retrieve the preferences
     * @eturn {T} the preferences
     */
    public get(id: string): T {
        return Storage.read<any>(this._getKey(id), this.defaultValue());
    }

    /**
     * Set/update the preferences
     * @param id {string} the id to be used to retrieve the preferences
     * @param update {(settings: T) => void} function responsible for updating the settings
     * @eturn {T} the updated preferences
     */
    public set(id: string, update: (settings: T) => void): T {
        let value = this.get(id);
        update(value);
        Storage.write(this._getKey(id), value);
        return value;
    }

    private _getKey(id: string): string {
        return `${this.prefix}/${id}`;
    }
}
