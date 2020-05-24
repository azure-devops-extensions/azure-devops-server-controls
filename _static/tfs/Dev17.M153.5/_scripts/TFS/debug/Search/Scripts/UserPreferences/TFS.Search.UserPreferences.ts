// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");

export enum UserPreferenceScope {
    // Account-specific settings for a user
    Account,

    // Project-specific settings for a user
    Project,
}

export class UserPreferences {

    // Returns user preference for the give key if found else sets the preference to default value
    public static getUserPreference(key: string, scope?: any): any {
        if (key) {
            scope = this.getCurrentScopeName(scope);
            return Service.getLocalService(Settings.LocalSettingsService).read(key, null, scope);
        }
    }

    // Sets the user preference for the given key
    public static setUserPreference(key: string, value: any, scope?: any): void {
        if (key) {
            scope = scope || this.getCurrentScopeName(scope);
            Service.getLocalService(Settings.LocalSettingsService).write(key, value, scope);
        }
    }

    private static getCurrentScopeName(scope) {
        if (scope != undefined && scope != null) {
            return scope;
        }
        return Context.SearchContext.isAccountOrCollectionContext() ? UserPreferenceScope.Account : UserPreferenceScope.Project;
    }
}