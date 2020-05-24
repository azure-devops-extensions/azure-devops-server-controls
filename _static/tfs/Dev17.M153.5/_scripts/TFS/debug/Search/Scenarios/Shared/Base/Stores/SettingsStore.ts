import { Store } from "VSS/Flux/Store";
import * as Service from "VSS/Service";
import * as Settings from "VSS/Settings";

export class SettingsStore<T> extends Store {
    constructor(
        private settingKey: string,
        private localSettingsService: Settings.LocalSettingsService) {
        super();
        this.localSettingsService = this.localSettingsService || Service.getLocalService(Settings.LocalSettingsService);
    }

    protected readSetting = (defaultValue?: T, scope?: Settings.LocalSettingsScope): T => {
        return this.localSettingsService.read<T>(this.settingKey, defaultValue, scope);
    }

    protected writeSetting = (value: T, scope?: Settings.LocalSettingsScope): void => {
        this.localSettingsService.write(this.settingKey, value, scope);
    }
}