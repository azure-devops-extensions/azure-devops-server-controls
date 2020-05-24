// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Service = require("VSS/Service");
import Settings = require("VSS/Settings");

export class MultiEntitySearchPreference {
    private static SearchEntityKeyPrefix: string = "SearchEntity";

    /**
    * Returns user preference for the given key if found else return the default value.(null)
    */
    public static getUserPreference(controllerName: string, useProjectScope: boolean): any {
        var value: string,
            scope: number = useProjectScope ? Settings.LocalSettingsScope.Project : Settings.LocalSettingsScope.Global;

        if (controllerName) {
            var key: string = MultiEntitySearchPreference.getKey(controllerName);
            value = Service.getLocalService(Settings.LocalSettingsService).read(key, null, scope);
        }

        var preference = value || null;
        return preference;
    }

    // Sets the user preference for the given key
    public static setUserPreference(controllerName: string, value: string, useProjectScope: boolean): void {
        var scope: number = useProjectScope ? Settings.LocalSettingsScope.Project : Settings.LocalSettingsScope.Global;

        if (controllerName) {
            var key: string = MultiEntitySearchPreference.getKey(controllerName);
            Service.getLocalService(Settings.LocalSettingsService).write(key, value, scope);
        }
    }

    private static getKey(controllerName: string): string {
        return MultiEntitySearchPreference.SearchEntityKeyPrefix.concat("/", controllerName);
    }
}