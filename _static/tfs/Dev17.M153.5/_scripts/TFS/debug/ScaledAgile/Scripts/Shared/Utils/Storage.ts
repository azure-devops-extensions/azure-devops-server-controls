import Service = require("VSS/Service");
import Settings = require("VSS/Settings");

export namespace Storage {
    /**
     * Writes data in local storage at a Project scope.
     * @param key {string} the key
     * @param data {T} data to be stored
     */
    export function write<T>(key: string, data: T) {
        Service.getLocalService(Settings.LocalSettingsService).write(key, data, Settings.LocalSettingsScope.Project);
    }

    /**
     * Reads data from local storage at a Project scope.
     * @param key {string} the key
     * @param defaultValue {T} the default value to be returned if no value exists for the provided key
     */
    export function read<T>(key: string, defaultValue: T = undefined): T {
        return Service.getLocalService(Settings.LocalSettingsService).read<T>(key, defaultValue, Settings.LocalSettingsScope.Project);
    }
}
