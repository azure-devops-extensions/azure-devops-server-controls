import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Diag = require("VSS/Diag");

export enum WebSettingsScope {
    User = 1,
    Team = 2,
    UserAndTeam = 3,
    Project = 4,
    ProjectAndUser = 5,
    Collection = 6,
    Root = 7,
}

export class WebSettingsService extends TFS_Service.TfsService {
    /**
     * Checks if the current settings service supports access to team settings.
     *
     * @return true if team-specific settings are accessible with this service; otherwise, false.
     */
    public canAccessTeamSettings(): boolean {
        var tfsContext = this.getTfsContext();
        return Boolean(tfsContext.currentTeam);
    }

    public beginWriteSetting(registryPath: string, value: string, scope?: WebSettingsScope, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any): Ajax.IAjaxRequestContext
    public beginWriteSetting(registryPath: string, value: boolean, scope?: WebSettingsScope, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any): Ajax.IAjaxRequestContext
    public beginWriteSetting(registryPath: string, value: number, scope?: WebSettingsScope, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any): Ajax.IAjaxRequestContext
    /**
     * Write Web Access setting to TFS registry
     *
     * @param registryPath relative registry path
     * @param value value, can be boolean, int, or string. When passed null or undefined the setting value will be removed from registry.
     * @param scope scope, can be one of the enum-defined values.
     * @param ajaxOptions The ajax call options.
     */
    public beginWriteSetting(registryPath: string, value: any, scope?: WebSettingsScope, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any): Ajax.IAjaxRequestContext {
        var action: string;

        if (typeof value === "boolean") {
            action = "setBoolean";
        }
        else if (typeof value === "number") {
            value = Math.floor(value);
            action = "setInteger";
        }
        else {
            action = "setString";
            if (typeof value === "undefined") {
                value = null;
            } else if (value !== null && typeof value !== "string") {
                value = $.param(value);
            }
        }

        if (typeof scope === "undefined") {
            scope = WebSettingsScope.User;
        }

        return Ajax.postMSJSON(this._getApiLocation(action, this._getContext(scope)), {
            path: registryPath,
            value: value,
            scope: scope
        }, callback, errorCallback, ajaxOptions);
    }

    /**
     * Read Web Access TFS registry setting
     *
     * @param hostAddress config server or collection end point
     * @param registryPath relative registry path
     * @param scope scope, can be one of the enum-defined values.
     * @param ajaxOptions The ajax call options.
     */
    public beginReadSetting(registryPath: string, scope: WebSettingsScope, callback: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any): Ajax.IAjaxRequestContext {
        if (typeof scope === "undefined") {
            scope = WebSettingsScope.User;
        }

        return Ajax.getMSJSON(this._getApiLocation("readSetting", this._getContext(scope)), {
            path: registryPath,
            scope: scope
        }, callback, errorCallback, ajaxOptions);
    }

    /**
     * Write a scoped setting to browser local storage
     *
     * @param key Key for the setting to be written
     * @param value Value for the setting to be written
     * @param throws Whether or not to throw any exceptions with local storage
     * @param scope Scope for the setting to be written
     */
    public writeLocalSetting(key: string, value: string, scope: WebSettingsScope, throws?: boolean) {
        Diag.Debug.assertParamIsStringNotEmpty(key, "key");
        Diag.Debug.assertParamIsNotUndefined(scope, "scope");
        Diag.Debug.assertParamIsNotNull(scope, "scope");

        var scopedKey = this._getScopedKey(key, scope);
        if (scopedKey) {
            try {
                window.localStorage.setItem(scopedKey, value);
            } catch (error) {
                if (throws) {
                    throw error;
                }
                else {
                    Diag.logWarning("Local storage write failed.");
                    Diag.logWarning(error);
                }
            }
        }
    }

    /**
     * Read a scoped setting from browser local storage.
     *
     * @param key Key for the setting to be written
     * @param scope Scope for the setting to be written
     * @return Value for the setting to be read
     */
    public readLocalSetting(key: string, scope: WebSettingsScope, throws?: boolean): string {
        Diag.Debug.assertParamIsStringNotEmpty(key, "key");
        Diag.Debug.assertParamIsNotUndefined(scope, "scope");
        Diag.Debug.assertParamIsNotNull(scope, "scope");

        var scopedKey = this._getScopedKey(key, scope);
        if (scopedKey) {
            try {
                return window.localStorage.getItem(scopedKey);
            } catch (error) {
                if (throws) {
                    throw error;
                }
                else {
                    Diag.logWarning("Local storage read failed.");
                    Diag.logWarning(error);
                }
            }
        }
        return null;
    }

    /**
     * Clear a scoped setting from browser local storage.
     *
     * @param key Key for the setting to be written
     * @param scope Scope for the setting to be written
     * @return Value for the setting to be read
     */
    public removeLocalSetting(key: string, scope: WebSettingsScope, throws?: boolean) {
        Diag.Debug.assertParamIsStringNotEmpty(key, "key");
        Diag.Debug.assertParamIsNotUndefined(scope, "scope");
        Diag.Debug.assertParamIsNotNull(scope, "scope");

        var scopedKey = this._getScopedKey(key, scope);
        if (scopedKey) {
            try {
                window.localStorage.removeItem(scopedKey);
            } catch (error) {
                if (throws) {
                    throw error;
                }
                else {
                    Diag.logWarning("Local storage removal failed.");
                    Diag.logWarning(error);
                }
            }
        }
        return null;
    }

    private _getScopedKey(key: string, scope: WebSettingsScope): string {
        var tfsContext = this.getTfsContext();
        var user = tfsContext.currentIdentity ? tfsContext.currentIdentity.id : null;
        var team = tfsContext.currentTeam ? tfsContext.currentTeam.identity.id : null;

        switch (scope) {
            case WebSettingsScope.User:
                {
                    Diag.Debug.assertIsNotNull(user, "Local storage: no current user");
                    return user + key;
                }

            case WebSettingsScope.Team:
                {
                    Diag.Debug.assertIsNotNull(team, "Local storage: no current team");
                    return team + key;
                }

            case WebSettingsScope.UserAndTeam:
                {
                    Diag.Debug.assertIsNotNull(user, "Local storage: no current user");
                    Diag.Debug.assertIsNotNull(team, "Local storage: no current team");
                    return user + "/" + team + key;
                }

            case WebSettingsScope.Project:
                {
                    var project = tfsContext.navigation ? tfsContext.navigation.projectId : null;
                    var collection = tfsContext.navigation ? tfsContext.navigation.collection.instanceId : null;

                    Diag.Debug.assertIsNotNull(collection, "Local storage: no current host");
                    Diag.Debug.assertIsNotNull(project, "Local storage: no current project");
                    return collection + "/" + project + key;
                }

            case WebSettingsScope.ProjectAndUser:
                {
                    var project = tfsContext.navigation ? tfsContext.navigation.projectId : null;

                    Diag.Debug.assertIsNotNull(user, "Local storage: no current user");
                    Diag.Debug.assertIsNotNull(project, "Local storage: no current project");

                    return project + "/" + user + key;
                }

            default:
                Diag.Debug.fail("Local storage: unknown scope");
                return null;
        }
    }

    /**
     * @param action
     * @return
     */
    private _getApiLocation(action: string, context: { team: string; project?: string }): string {
        return this.getTfsContext().getActionUrl(action, "webSettings", {
            area: "api",
            team: context.team,
            project: context.project,
            serviceHost: this.getCurrentServiceHost()
        });
    }

    private _getContext(scope: WebSettingsScope): { team: string; project?: string } {
        let context: { team: string; project?: string };

        if (scope === WebSettingsScope.User || scope === WebSettingsScope.Collection || scope === WebSettingsScope.Root) {
            context = {
                team: "",
                project: ""
            };
        } else if (scope === WebSettingsScope.Project) {
            context = {
                team: "",
                project: this.getTfsContext().contextData.project.id
            };
        } else {
            Diag.Debug.assert(this.canAccessTeamSettings(), "team settings are inaccessible");
            context = {
                team: this.getTfsContext().currentTeam.identity.id
            };
        }
        return context;
    }
}
