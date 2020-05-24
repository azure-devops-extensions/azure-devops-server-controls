import * as Service from "VSS/Service";
import * as Settings from "VSS/Settings";

/**
 * Exposes a layer on top of the local browser storage. Extend this class if there is a requirement
 * to persist a value as a local setting which is not a part of VSS Store implementation.
 * Instantiate an implementation of this base class to read/write the setting wherever required.
 */
export class ReadWriteSettingsStorage<T> {
    private localSettingsService: Settings.LocalSettingsService = Service.getLocalService(Settings.LocalSettingsService);

    constructor(private key: string, private isProjectContext: boolean) { }

    protected writeLocalPreference(value: T): void {
        return this.localSettingsService.write(this.key, value, this.getScope());
    }

    protected readLocalPreference(defaultValue?: T): T {
        return this.localSettingsService.read<T>(this.key, defaultValue, this.getScope());
    }

    private getScope(): Settings.LocalSettingsScope {
        return this.isProjectContext
            ? Settings.LocalSettingsScope.Project
            : Settings.LocalSettingsScope.Global;
    }
}