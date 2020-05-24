
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

/**
* Scope at which the local user setting applies
*/
export enum LocalSettingsScope {

    /**
    * Global (account-specific) settings for a user
    */
    Global,

    /**
    * Project-specific settings for a user
    */
    Project,

    /**
    * Team-specific settings for a user
    */
    Team
}

/**
* Service for reading and writing to local storage
*/
export class LocalSettingsService implements Service.ILocalService {

    private static GLOBAL_SETTING_KEY = "global";
    private static PROJECT_SETTING_KEY = "project";
    private static TEAM_SETTING_KEY = "team";

    private _webContext: Contracts_Platform.WebContext;

    constructor(webContext?: Contracts_Platform.WebContext) {
        this._webContext = webContext;
    }

    /**
     * Write a settings value to browser local storage
     * 
     * @param key Key for the setting to be written. This key will be prefixed with a scope.
     * @param value Value for the setting to be written
     * @param scope Scope for the setting to apply to. This will determine the prefix to use at the beginning of the setting key.
     */
    public write(key: string, value: any, scope: LocalSettingsScope = LocalSettingsScope.Global) {
        Diag.Debug.assertParamIsStringNotEmpty(key, "key");

        var scopedKey = this._getScopedKey(key, scope);
        if (scopedKey) {
            try {
                window.localStorage.setItem(scopedKey, JSON.stringify({ v: value }));
            } catch (error) {
                Diag.logError("Failed to write to local storage: " + VSS.getErrorMessage(error));
            }
        }
    }

    /**
     * Read a setting from browser local storage.
     * 
     * @param key Key for the setting to be written. This key will be prefixed with a scope.
     * @param defaultValue The value to return in case no setting exists
     * @param scope Scope for the setting to apply to. This will determine the prefix to use at the beginning of the setting key.
     * @return Value read from the setting or undefined if no value stored
     */
    public read<T>(key: string, defaultValue: T = undefined, scope: LocalSettingsScope = LocalSettingsScope.Global): T {
        Diag.Debug.assertParamIsStringNotEmpty(key, "key");

        var scopedKey = this._getScopedKey(key, scope);
        if (scopedKey) {
            try {
                var value = window.localStorage.getItem(scopedKey);
                if (value && typeof value === "string") {
                    return <T>(JSON.parse(value)).v;
                }
            } catch (error) {
                Diag.logWarning("Failed to read from local storage: " + VSS.getErrorMessage(error));
            }
        }
        return defaultValue;
    }

    private _getScopedKey(key: string, scope: LocalSettingsScope): string {
        var webContext = this._webContext;

        switch (scope) {
            case LocalSettingsScope.Global:
                return LocalSettingsService.GLOBAL_SETTING_KEY + "/" + key;

            case LocalSettingsScope.Project:
                if (!webContext.project) {
                    Diag.logWarning("Project scope requested for key '" + key + "' but no project scope in context.");
                    return null;
                }
                return LocalSettingsService.PROJECT_SETTING_KEY + "/" + webContext.project.id + "/" + key;

            case LocalSettingsScope.Team:
                if (!webContext.team) {
                    Diag.logWarning("Team scope requested for key '" + key + "' but no team scope in context.");
                    return null;
                }
                return LocalSettingsService.TEAM_SETTING_KEY + "/" + webContext.team.id + "/" + key;

            default:
                Diag.Debug.fail("Local storage: unknown scope");
                return null;
        }
    }
}