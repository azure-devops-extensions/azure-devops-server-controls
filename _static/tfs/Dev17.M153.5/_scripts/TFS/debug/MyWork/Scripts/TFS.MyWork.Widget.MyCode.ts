

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VSS = require("VSS/VSS");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");


var queueRequest = VSS.queueRequest;

class MyCodeWidgetConstants {
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

export class ReposResult {
    totalReposCount: number;
    repos: RepoMruItem[];
}

export class AllReposResult {
    repos: RepoMruItem[];
}

export class RepoMruItem {
    text: string;
    title: string;
    url: string;
    hashCode: number;
    lastAccessed: string;
    isGit: boolean;
}

export class MyCodeManager {
    
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _reposProperty: any;
    private _allReposProperty: any;
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

    public getRecentRepos(): IPromise<ReposResult> {
        var that = this;

        var deferred = jQuery.Deferred<ReposResult>();

        var callback = (result: any) => { deferred.resolve({ totalReposCount: result.entries.length, repos: result.entries }) };
        var errorCallback = (result: any) => { deferred.resolve(deferred.reject(result) as any) };
        this._ensureMruRepos(callback, errorCallback, true);

        return deferred.promise();
    }

    public removeRepoFromMRU(hashCode: number): IPromise<boolean> {
        var that = this;

        var deferred = jQuery.Deferred<boolean>();

        var callback = (result: any) => { deferred.resolve(true) };
        var errorCallback = (result: any) => { deferred.resolve(deferred.reject(result) as any) };
        this._ensureRemoveFromMRU(hashCode, callback, errorCallback);

        return deferred.promise();
    }

    private _getLocation(action: string, controller: string, isApi: boolean) {
        var routeData = isApi ? { area: "api" } : {};

        return this._tfsContext.getActionUrl(action || "GetRepoMruList", controller, routeData);
    }

    private _ensureMruRepos(callback: IResultCallback, errorCallback ?: IErrorCallback, refreshCache ?: boolean) {
        var that = this;

        if (refreshCache) {
            //delete all entries in the cache so that it is refreshed
            this._reposProperty = null;
        }
        queueRequest(this, this, "_reposProperty", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxJson("GetRepoMruList", "common", true, { maxCount: MyCodeWidgetConstants.MaxMRUResultCount }, succeeded, failed);
            });
    }

    private _ensureRemoveFromMRU(hashCode: number, callback: IResultCallback, errorCallback?: IErrorCallback) {
        var that = this;

        this._removeFromMRUProperty = null;
        queueRequest(this, this, "_removeFromMRUProperty", callback, errorCallback,
            function (succeeded, failed) {
                this._ajaxPostHTML("RemoveRepoNavigationMRUEntry", "common", true, { mruEntryHashCode: hashCode }, succeeded, failed);
            });
    }

    private _ajaxJson(method: string, controller: string, isApi: boolean, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        Ajax.getMSJSON(this._getLocation(method, controller, isApi), requestParams, callback, errorCallback, ajaxOptions);
    }

    private _ajaxPostHTML(method: string, controller: string, isApi: boolean, requestParams?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: any) {
        Ajax.postHTML(this._getLocation(method, controller, isApi), requestParams, callback, errorCallback, ajaxOptions);
    }
}
