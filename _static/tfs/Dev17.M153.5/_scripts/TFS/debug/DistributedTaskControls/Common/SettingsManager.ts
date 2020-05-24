import { Singleton } from "DistributedTaskControls/Common/Factory";

import * as Diag from "VSS/Diag";
import { getService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";
import * as Utils_String from "VSS/Utils/String";

type SettingValue<T> = {
    value: T,
    isFetched: boolean
};

export class SettingsManager extends Singleton {

    public static instance(): SettingsManager {
        return super.getInstance<SettingsManager>(SettingsManager);
    }

    public static dispose(): void {
        this.instance()._settingsByScope = {};
        this.instance()._settingsService = null;
        return super.dispose();
    }

    public getSettingsService(): ISettingsService {
        return this._settingsService;
    }

    public getSetting<T>(key: string, scope: SettingsUserScope = SettingsUserScope.Me): T {
        const localValue = this._getLocalSetting(key, scope);
        if (localValue !== undefined) {
            return localValue as T;
        }

        try {
            const value =
                this._settingsService.getEntry<T>(
                    key,
                    scope
                );
            this._setLocalSetting(key, value, scope);
            return value;
        }
        catch (e) {
            Diag.logError(Utils_String.format("Error {0} while getting service setting", e));
        }

        return null;
    }

    public setSetting<T>(key: string, value: T, scope: SettingsUserScope = SettingsUserScope.Me): void {
        const localValue = this._getLocalSetting(key, scope);
        if (localValue !== undefined && localValue === value) {
            return;
        }

        try {
            this._settingsService.setEntries({
                [key]: value,
            }, scope);

            this._setLocalSetting(key, value, scope);
        }
        catch (e) {
            Diag.logError(Utils_String.format("Error {0} while setting service setting", e));
        }
    }

    private _getLocalSetting<T>(key: string, scope: SettingsUserScope): T {
        if (this._settingsByScope[scope] && this._settingsByScope[scope][key] && this._settingsByScope[scope][key].isFetched) {
            return this._settingsByScope[scope][key].value;
        }

        return undefined;
    }

    private _setLocalSetting<T>(key: string, value: T, scope: SettingsUserScope) {
        this._settingsByScope[scope] = this._settingsByScope[scope] ? this._settingsByScope[scope] : {};
        this._settingsByScope[scope][key] = { value: value, isFetched: true };
    }

    private _settingsByScope: IDictionaryNumberTo<IDictionaryStringTo<SettingValue<any>>> = {};
    private _settingsService: ISettingsService = getService();
}