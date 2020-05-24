

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSS = require("VSS/VSS");

var queueRequest = VSS.queueRequest;

class ProjectsAndTeamsWidgetConstants {
    static MaxMRUResultCount: number = 8;
}

export class Utils {

    /**
     * Checks if we are in account context or not.
     * @param context Tfs context.
     * @return Returns true if we are in account context else false.
     */
    public static isAccountContext(context: TFS_Host_TfsContext.TfsContext): boolean {
        return (context.navigation.serviceHost.hostType === Contracts_Platform.NavigationContextLevels.Application);
    }

    /**
    * Creates a collection host context (provides collection context) for the given collection name
    */
    public static createCollectionHostContext(collectionName: string): Contracts_Platform.HostContext {
        return {
            id: "",
            name: collectionName,
            relativeUri: "/" + collectionName + "/",
            uri: ""
        };
    }
}

export class ProjectsAndTeamsResult {
    totalProjectsAndTeamsCount: number;
    projectsAndTeams: ProjectOrTeam[];
}

export class AllProjectsResult {
    projects: ProjectOrTeam[];
}

export class ProjectOrTeam {
    text: string;
    title: string;
    url: string;
    hashCode: number;
    lastAccessed: string;
    isTeam: boolean;
}

export class ProjectsAndTeamsManager {

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _projectsAndTeamsProperty: any;
    private _allProjectsProperty: any;
    private _removeFromMRUProperty: any;
    private _GetUserPermissionProperty: any;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext) {
        if (!tfsContext) {
            throw new Error("tfsContext is required");
        }

        this._tfsContext = tfsContext;

        // Doing for DefaultCollection for now, accomodate other collections later as needed from ProjectCollection
        if (Utils.isAccountContext(tfsContext)) {
            // Cloning the tfsContext and modifying it to behave like ProjectCollection
            this._tfsContext = <TFS_Host_TfsContext.TfsContext> $.extend(true, {}, tfsContext);
            this._tfsContext.contextData.host.hostType = Contracts_Platform.ContextHostType.ProjectCollection;
            this._tfsContext.contextData.collection = Utils.createCollectionHostContext("defaultcollection");
        }
    }

    public getRecentProjectsAndTeams(): IPromise<ProjectsAndTeamsResult> {
        var that = this;

        var deferred = jQuery.Deferred<ProjectsAndTeamsResult>();

        var callback = (result: any) => { deferred.resolve({ totalProjectsAndTeamsCount: result.entries.length, projectsAndTeams: result.entries }) };
        var errorCallback = (result: any) => { deferred.resolve(deferred.reject(result) as any) };
        this._ensureMruProjectsAndTeams(callback, errorCallback, true);

        return deferred.promise();
    }

    public getAllProjects(): IPromise<AllProjectsResult> {
        var deferred = jQuery.Deferred<AllProjectsResult>();
        var callback = (result: any) => { deferred.resolve({ projects: result.projects }) };
        var errorCallback = (result: any) => { deferred.resolve(deferred.reject(result) as any) };
        this._ensureAllProjectsAndTeams(callback, errorCallback, true);

        return deferred.promise();
    }

    private _ensureAllProjectsAndTeams(callback: IResultCallback, errorCallback?: IErrorCallback, refreshCache?: boolean) {

        if (refreshCache) {
            //delete all entries in the cache so that it is refreshed
            this._allProjectsProperty = null;
        }
        queueRequest(this, this, "_allProjectsProperty", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetAllProjects", "common", true, {}, succeeded, failed);
            });
    }

    public removeProjectOrTeamFromMRU(hashCode: number): IPromise<boolean> {
        var that = this;

        var deferred = jQuery.Deferred<boolean>();

        var callback = (result: any) => { deferred.resolve(true) };
        var errorCallback = (result: any) => { deferred.resolve(deferred.reject(result) as any) };
        this._ensureRemoveFromMRU(hashCode, callback, errorCallback);

        return deferred.promise();
    }

    public getUserPermission(): IPromise<boolean> {
        var that = this;

        var deferred = jQuery.Deferred<boolean>();

        var callback = (result: boolean) => { deferred.resolve(result) };
        var errorCallback = (result: any) => { deferred.resolve(deferred.reject(result) as any) };
        this._ensureGetUserProjectCreatePermission(callback, errorCallback);

        return deferred.promise();
    }

    private _getLocation(action: string, controller: string, isApi: boolean) {
        var routeData = isApi ? { area: "api" } : {};

        return this._tfsContext.getActionUrl(action || "GetTeamProjectMruList", controller, routeData);
    }

    private _ensureMruProjectsAndTeams(callback: IResultCallback, errorCallback ?: IErrorCallback, refreshCache ?: boolean) {
        var that = this;

        if (refreshCache) {
            //delete all entries in the cache so that it is refreshed
            this._projectsAndTeamsProperty = null;
        }
        queueRequest(this, this, "_projectsAndTeamsProperty", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetTeamProjectMruList", "common", true, { maxCount: ProjectsAndTeamsWidgetConstants.MaxMRUResultCount }, succeeded, failed);
            });
    }

    private _ensureRemoveFromMRU(hashCode: number, callback: IResultCallback, errorCallback?: IErrorCallback) {
        var that = this;

        this._removeFromMRUProperty = null;
        queueRequest(this, this, "_removeFromMRUProperty", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxPostHTML("RemoveNavigationMRUEntry", "common", true, { mruEntryHashCode: hashCode }, succeeded, failed);
            });
    }

    private _ensureGetUserProjectCreatePermission(callback: IResultCallback, errorCallback?: IErrorCallback) {
        var that = this;

        this._removeFromMRUProperty = null;
        queueRequest(this, this, "_GetUserPermissionProperty", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetUserCreateProjectPermission", "home", false, {}, succeeded, failed);
            });
    }

    private _ajaxJson(method: string, controller: string, isApi: boolean, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        Ajax.getMSJSON(this._getLocation(method, controller, isApi), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPostHTML(method: string, controller: string, isApi: boolean, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        Ajax.postHTML(this._getLocation(method, controller, isApi), requestParams, callback, errorCallback, ajaxOptions);
    }
}
