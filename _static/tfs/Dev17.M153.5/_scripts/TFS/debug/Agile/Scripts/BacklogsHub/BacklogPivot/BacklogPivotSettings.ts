import { publishErrorToTelemetry } from "VSS/Error";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { TfsSettingsScopeNames } from "Presentation/Scripts/TFS/Generated/TFS.WebApi.Constants";

export namespace BacklogPivotSettings {
    export function setMRU(setting: string, teamId: string, value: any): void {
        const settingsToUpdate: IDictionaryStringTo<any> = {
            [setting]: value
        };

        getSettingsService().setEntries(settingsToUpdate, SettingsUserScope.Me, TfsSettingsScopeNames.WebTeam, teamId)
            .then(null, (reason): void => {
                publishErrorToTelemetry(new Error(`Could not store settings for Backlogs Hub '${reason}'`));
            });
    }

    export function getSetting<T>(key: string, defaultValue: T): T {
        const settingsService = getSettingsService();
        const value = settingsService.getEntry<T>(key, SettingsUserScope.Me, TfsSettingsScopeNames.WebTeam);
        if (value == null) {
            return defaultValue;
        }
        return value;
    }
}