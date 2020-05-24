/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import VSSError = require("VSS/Error");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Services = require("VSS/Contributions/Services");
import Q = require("q");
import { WorkItemTypeStateColors } from "TFS/WorkItemTracking/Contracts";

module ModuleExceptions {
    export var FavoriteItemAlreadyExist = "VSS.Service.FavoriteItemAlreadyExist";
}

function Error_favoriteItemAlreadyExist(name: string): Error {
    var err = new Error(Utils_String.format("Favorite item '{0}' already exist.", name));
    err.name = ModuleExceptions.FavoriteItemAlreadyExist;
    return err;
};

/**
* A connection to an Application host (Account or TFS on-prem instance)
*/
export class Application {
    public static getConnection(tfsContext?: TFS_Host_TfsContext.TfsContext): Service.VssConnection {
        var webContext = tfsContext ? tfsContext.contextData : Context.getDefaultWebContext();
        return Service.VssConnection.getConnection(webContext, Contracts_Platform.ContextHostType.Application);
    }

    public static getDefaultConnection(): Service.VssConnection {
        return Service.VssConnection.getConnection(Context.getDefaultWebContext(), Contracts_Platform.ContextHostType.Application);
    }
}

/**
* A connection to an Deployment host (Deployment or TFS on-prem instance)
*/
export class Deployment {
    public static getConnection(tfsContext?: TFS_Host_TfsContext.TfsContext): Service.VssConnection {
        var webContext = tfsContext ? tfsContext.contextData : Context.getDefaultWebContext();
        return Service.VssConnection.getConnection(webContext, Contracts_Platform.ContextHostType.Deployment);
    }

    public static getDefaultConnection(): Service.VssConnection {
        return Service.VssConnection.getConnection(Context.getDefaultWebContext(), Contracts_Platform.ContextHostType.Deployment);
    }
}
/**
* A connection to a ProjectCollection host
*/
export class ProjectCollection {
    public static getConnection(tfsContext?: TFS_Host_TfsContext.TfsContext): Service.VssConnection {
        var webContext = tfsContext ? tfsContext.contextData : Context.getDefaultWebContext();
        return Service.VssConnection.getConnection(webContext, Contracts_Platform.ContextHostType.ProjectCollection);
    }

    public static getDefaultConnection(): Service.VssConnection {
        return Service.VssConnection.getConnection(Context.getDefaultWebContext(), Contracts_Platform.ContextHostType.ProjectCollection);
    }
}

export class FavoriteItem {
    public static readonly FAVITEM_TYPE_WIT_QUERYITEM: string = "Microsoft.TeamFoundation.WorkItemTracking.QueryItem";
    public static readonly FAVITEM_TYPE_WIT_QUERYCHART: string = "Microsoft.TeamFoundation.WorkItemTracking.QueryChart";
    public static readonly FAVITEM_TYPE_VC_PATH: string = "Microsoft.TeamFoundation.VersionControl.Path";
    public static readonly FAVITEM_TYPE_GIT_REPOSITORY: string = "Microsoft.TeamFoundation.Git.Repository";
    public static readonly FAVITEM_TYPE_GIT_REPOSITORY_FORK: string = "Microsoft.TeamFoundation.Git.Repository.Fork";
    public static readonly FAVITEM_TYPE_TFVC_REPOSITORY: string = "Microsoft.TeamFoundation.Tfvc.Repository";
    public static readonly FAVITEM_TYPE_BUILD_DEFINITION: string = "Microsoft.TeamFoundation.Build.Definition";
    public static readonly FAVITEM_TYPE_TESTMANAGEMENT_CHART: string = "Microsoft.Teamfoundation.TestManagement.Charts";
    public static readonly FAVITEM_TYPE_PROJECT: string = "Microsoft.TeamFoundation.Classification.TeamProject";
    public static readonly FAVITEM_TYPE_TEAM: string = "Microsoft.TeamFoundation.Teams.Team";
    public static readonly FAVITEM_TYPE_TEST_PLAN: string = "Microsoft.TeamFoundation.TestManagement.Plan";

    public favStore: FavoriteStore;
    public id: any;
    public name: string;
    public parentId: number;
    public parent: FavoriteFolder;
    public type: string;
    public data: any;
    public artifactIsDeleted: boolean;

    constructor(favStore: FavoriteStore, itemData: IFavoriteItemData) {
        this.favStore = favStore;

        if (itemData) {
            this.id = itemData.id;
            this.name = itemData.name;
            this.parentId = itemData.parentId;
            this.type = itemData.type;
            this.data = itemData.data;
            this.artifactIsDeleted = itemData.artifactIsDeleted;
        }
    }

    public path(includeRoot: boolean) {
        return Utils_UI.calculateTreePath.call(this, includeRoot, "/", "name", "root");
    }

    public beginRename(newName: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        var that = this;
        var clone: FavoriteItem;

        if (this.parent && this.parent.findChildItem(newName, this.type, this.data)) {
            VSS.handleError(Error_favoriteItemAlreadyExist(newName), errorCallback, this);
        }
        else {
            clone = <FavoriteItem>$.extend({}, this);
            clone.name = newName;

            this.favStore.beginUpdateItems([clone], function (favItems: FavoriteItem[]) {
                that.name = newName;
                $(window).trigger("favorite-item-renamed", that);
                if ($.isFunction(callback)) {
                    callback.call(that, that);
                }
            }, errorCallback);
        }
    }

    public beginDelete(callback: (items: FavoriteItem[]) => void, errorCallback?: IErrorCallback, fire?: boolean) {
        this.favStore.beginDeleteItems([this], callback, errorCallback, fire);
    }

    public onDelete(fire: boolean, skipRemove?: boolean) {
        if (!skipRemove && this.parent) {
            this.parent.remove(this);
        }

        delete this.favStore.all[this.id];

        if (fire) {
            $(window).trigger("favorite-item-removed", this);
        }
    }
}

export interface IFavoriteItemData {
    id: string;
    parentId: number;
    name: string;
    type: string;
    data: any;
    artifactIsDeleted?: boolean;
}

export class FavoriteFolder extends FavoriteItem {
    public children: FavoriteItem[];
    public root: boolean;

    constructor(favStore: FavoriteStore, itemData: any) {
        super(favStore, itemData);

        this.children = [];
    }

    /**
     * Adds the specified item to the folder's children.
     *
     * @param favItem The item to be added.
     * @param skipSort Opt out to have the element not inserted in the default name sorted order.
     */
    public add(favItem: FavoriteItem, skipSort?: boolean) {
        Diag.Debug.assertIsObject(favItem, "favItem");

        this.children.push(favItem);
        favItem.parent = this;

        if (skipSort !== true) {
            // Sorting children by name
            this.children.sort(function (i1, i2) {
                return Utils_String.localeIgnoreCaseComparer(i1.name, i2.name);
            });
        }
    }

    /**
     * Removes the specified item from the folder's children.
     *
     * @param favItem The child to be removed.
     */
    public remove(favItem: FavoriteItem) {
        Diag.Debug.assertParamIsObject(favItem, "favItem");

        Utils_Array.remove(this.children, favItem);
    }

    /**
     * Clears the Folder of all children.
     */
    public clear() {
        this.children = [];
    }

    /**
     * Searches for a child element associated with the supplied path value
     *
     * @param path The path to be searched using case insensitive search
     */
    public findByPath(path: string): FavoriteItem {
        Diag.Debug.assertParamIsString(path, "path");

        return Utils_UI.findTreeNode.call(this, path, "/", Utils_String.localeIgnoreCaseComparer, "name");
    }

    /**
     * Searches for a matching child element associated with the supplied data value, solely on the basis of the data field.
     *
     * @param data The data to be searched for as an identical string
     */
    public findByData(data: string): FavoriteItem {
        Diag.Debug.assertParamIsString(data, "data");

        var child: FavoriteItem;
        var i: number;
        var l: number;

        for (i = 0, l = this.children.length; i < l; i++) {
            child = this.children[i];
            if (child.data === data) {
                return child;
            }
        }

        return null;
    }

    public beginCreateNewFolder(name: string, callback: IResultCallback, errorCallback?: IErrorCallback) {
        this.beginCreateNewItem(name, null, null, callback, errorCallback);
    }

    public beginCreateNewItem(name: string, type: string, data: any, callback?: IResultCallback, errorCallback?: IErrorCallback, fireEvent?: boolean) {
        var favItem: FavoriteItem;
        var that = this;
        var itemData: IFavoriteItemData;

        if (fireEvent === null || fireEvent === undefined) {
            fireEvent = true;
        }
        if (this.findChildItem(name, type, data)) {
            VSS.handleError(Error_favoriteItemAlreadyExist(name), errorCallback, this);
        }
        else {
            itemData = {
                id: undefined,
                parentId: this.id,
                name: name,
                type: type,
                data: data
            };

            if (type) {
                favItem = new FavoriteItem(this.favStore, itemData);
            }
            else {
                favItem = new FavoriteFolder(this.favStore, itemData);
            }

            this.favStore.beginUpdateItems([favItem], function (favItems: FavoriteItem[]) {
                that.add(favItem);
                that.favStore.all[favItem.id] = favItem;
                if (fireEvent) {
                    $(window).trigger("favorite-item-created", favItem);
                }

                if ($.isFunction(callback)) {
                    callback.call(that, favItem);
                }
            }, errorCallback);
        }
    }

    public onDelete(fire: boolean, skipRemove?: boolean) {
        $.each(this.children, function (i, v) {
            v.onDelete(false, true); //do not fire for children
        });

        super.onDelete(fire, skipRemove);
    }

    /**
     * Searches for a matching child element associated with the supplied data values
     *
     * @param name The child name to be searched for
     * @param type The namespace of the favorite type to be searched for
     * @param data The favorite data value to be searched for.
     */
    public findChildItem(name: string, type: string, data: string): FavoriteItem {
        Diag.Debug.assertParamIsString(name, "name");
        Diag.Debug.assertParamIsString(type, "type");
        Diag.Debug.assertParamIsString(data, "data");

        var child: FavoriteItem;
        var i: number;
        var l: number;

        for (i = 0, l = this.children.length; i < l; i++) {
            child = this.children[i];
            if ((Utils_String.localeIgnoreCaseComparer(name, child.name) === 0) && child.type === type && child.data === data) {
                return child;
            }
        }

        return null;
    }
}

var stores = {};
function getRouteData(tfsContext: TFS_Host_TfsContext.TfsContext, level: TFS_Host_TfsContext.NavigationContextLevels, teamId: string): TFS_Host_TfsContext.IRouteData {
    var routeData: TFS_Host_TfsContext.IRouteData;

    routeData = { area: "api" };

    level = level || tfsContext.navigation.topMostLevel;

    routeData.team = teamId;

    if (level >= TFS_Host_TfsContext.NavigationContextLevels.Application) {
        if (level < TFS_Host_TfsContext.NavigationContextLevels.Team) {
            routeData.ignoreDefaultTeam = true;
            routeData.team = "";
        }
        if (level < TFS_Host_TfsContext.NavigationContextLevels.Project) {
            routeData.project = "";
        }
        if (level < TFS_Host_TfsContext.NavigationContextLevels.Collection) {
            routeData.serviceHost = "";
        }
    }

    return routeData;
}

export class FavoriteStore extends FavoriteFolder {
    public static FAVORITE_STORE_SCOPE_FAVORITE_QUERIES: string = "WorkItemTracking.Queries";
    public static FAVORITE_STORE_SCOPE_FAVORITE_BUILD_DEFINITIONS: string = "Build.Definitions";
    public static FAVORITE_STORE_SCOPE_FAVORITE_PATHS: string = "VersionControl.Paths";
    public static FAVORITE_STORE_SCOPE_FAVORITE_PROJECTS: string = "Classification.TeamProjects";
    public static FAVORITE_STORE_SCOPE_FAVORITE_TEAMS: string = "Team.Teams";
    public static FAVORITE_STORE_SCOPE_FAVORITE_VC_REPOSITORIES: string = "VersionControl.Repositories";
    public static FAVORITE_STORE_SCOPE_FAVORITE_TEST_PLAN: string = "TestManagement.Plans";

    private static computeStoreKey(tfsContext: TFS_Host_TfsContext.TfsContext, identity: string, scope: string, routeData: TFS_Host_TfsContext.IRouteData): string {
        return tfsContext.getActionUrl("list", "favorites", $.extend({}, routeData, { identityId: identity, scope: scope }));
    }

    private static createFavoriteStore(tfsContext: TFS_Host_TfsContext.TfsContext, level: TFS_Host_TfsContext.NavigationContextLevels, identity: string, scope: string, name: string): FavoriteStore {
        var routeData: TFS_Host_TfsContext.IRouteData;
        var storeKey: string;

        if (identity === null) {
            identity = undefined;
        }

        routeData = getRouteData(tfsContext, level, identity);
        storeKey = FavoriteStore.computeStoreKey(tfsContext, identity, scope, routeData);

        return new FavoriteStore(tfsContext, routeData, identity, scope, storeKey, name);
    }

    public static beginGetFavoriteStore(tfsContext: TFS_Host_TfsContext.TfsContext, level: TFS_Host_TfsContext.NavigationContextLevels, identity: string, scope: string, name: string, forceRefresh: boolean, callback: { (FavoriteStore: FavoriteStore) }, errorCallback?: IErrorCallback) {
        // forceRefresh will not used the cached store and will go back to server for favorites
        if (forceRefresh) {
            var store = FavoriteStore.createFavoriteStore(tfsContext, level, identity, scope, name);
            store.beginRefresh(function () {
                callback(store);
            }, errorCallback);
        } else {
            var storeKey = FavoriteStore.computeStoreKey(tfsContext, identity, scope, getRouteData(tfsContext, level, identity));
            VSS.queueRequest(this, stores, storeKey, callback, errorCallback, function (succeeded: IResultCallback, failed: IErrorCallback) {
                var store = FavoriteStore.createFavoriteStore(tfsContext, level, identity, scope, name);
                store.beginRefresh(function () {
                    succeeded(store);
                }, failed);
            });
        }
    }

    public static getFavoriteStore(tfsContext: TFS_Host_TfsContext.TfsContext, level: TFS_Host_TfsContext.NavigationContextLevels, identity: string, scope: string, name: string) {
        return FavoriteStore.createFavoriteStore(tfsContext, level, identity, scope, name);
    }

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _identity: string;
    private _routeData: TFS_Host_TfsContext.IRouteData;
    private _scope: string;

    public root: boolean;
    public all: IDictionaryStringTo<FavoriteItem>;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, routeData: TFS_Host_TfsContext.IRouteData, identity: string, scope: string, id: string, name: string) {
        super(null, { id: id, name: name });

        this.root = true;
        this.favStore = this;
        this._tfsContext = tfsContext;
        this._routeData = routeData;
        this._identity = identity;
        this._scope = scope;
        this.all = {};
    }

    public beginRefresh(callback: IResultCallback, errorCallback?: IErrorCallback) {
        var apiLocation: string;
        var that = this;

        apiLocation = this._tfsContext.getActionUrl("list", "favorites", this._routeData);

        Ajax.getMSJSON(apiLocation, { identityId: this._identity, scope: this._scope }, function (items: FavoriteItem[]) {
            that._populateItems(items);
            if ($.isFunction(callback)) {
                callback.call(that);
            }
        }, errorCallback);
    }

    public beginDeleteItems(favItems: FavoriteItem[], callback: (items: FavoriteItem[]) => void, errorCallback?: IErrorCallback, fire?: boolean) {
        var that = this;
        var favItemIds: number[];
        var apiLocation: string;
        if (fire === null || fire === undefined) {
            fire = true;
        }

        if (favItems && favItems.length) {
            apiLocation = this._tfsContext.getActionUrl("delete", "favorites", this._routeData);

            favItemIds = $.map(favItems, function (favItem: FavoriteItem) {
                return favItem.id;
            });

            Ajax.postMSJSON(apiLocation, { identityId: this._identity, scope: this._scope, favItemIds: favItemIds }, function (result: any) {
                $.each(favItems, function (i: number, favItem: FavoriteItem) {
                    favItem.onDelete(fire);
                });

                if ($.isFunction(callback)) {
                    callback.call(that, favItems);
                }
            }, errorCallback);
        }
    }

    public beginUpdateItems(favItems: FavoriteItem[], callback: IResultCallback, errorCallback?: IErrorCallback) {
        var that = this;
        var favItemJsons: string[];
        var apiLocation: string;

        if (favItems && favItems.length) {
            apiLocation = this._tfsContext.getActionUrl("update", "favorites", this._routeData);

            favItemJsons = $.map(favItems, function (favItem: FavoriteItem) {
                return Utils_Core.stringifyMSJSON({
                    id: favItem.id,
                    parentId: favItem.parentId === that.id ? undefined : favItem.parentId,
                    name: favItem.name,
                    type: favItem.type,
                    data: favItem.data,
                    artifactIsDeleted: favItem.artifactIsDeleted
                });
            });

            Ajax.postMSJSON(apiLocation, { identityId: this._identity, scope: this._scope, favItemJsons: favItemJsons }, function (results: any) {
                $.each(results, function (i: number, result: any) {
                    favItems[result.index].id = result.id;
                });

                if ($.isFunction(callback)) {
                    callback.call(that, favItems);
                }
            }, errorCallback);
        }
    }

    private _populateItems(items: FavoriteItem[]) {
        var all: IDictionaryStringTo<FavoriteItem> = {};
        var id: any; /* for loop below requires any */
        var item: FavoriteItem;
        var parent: any; /* FavoriteItem has no add function? */
        var that = this;

        this.clear();

        if (items) {
            items.sort(function (i1, i2) {
                return Utils_String.localeIgnoreCaseComparer(i1.name, i2.name);
            });

            $.each(items, function (i, item) {
                var favItem: FavoriteItem;

                if (!item.type) {
                    favItem = new FavoriteFolder(that, item);
                }
                else {
                    favItem = new FavoriteItem(that, item);
                }

                all[favItem.id] = favItem;
            });
        }

        for (id in all) {
            if (all.hasOwnProperty(id)) {
                item = all[id];
                parent = all[item.parentId];

                if (parent) {
                    parent.add(item, true);
                }
                else {
                    this.add(item, true);
                }
            }
        }

        this.all = all;
    }
}

/**
 * Represents work item state color settings for a project.
 */
export interface IProjectStateColors {
    projectName: string;
    projectId: string;
    workItemTypeStateColors: IWorkItemTypeStateColors[];
}

/**
 * Represents work item state colors for a workitemtype.
 */
export interface IWorkItemTypeStateColors {
    workItemTypeName: string;
    stateColors: IStateColor[];
}

// IWorkItemStateColor JSON object model
export interface IStateColor {
    name: string;
    color: string;
    category: string;
}

//TODO: DELETE THIS AND USE THE ONE IN Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider
export class WorkItemStatesColorProvider {

    public static DEFAULT_STATE_COLOR: string = "transparent";
    private static _workItemStatesColorProvider: WorkItemStatesColorProvider;

    private _settingsBeingFetched: IDictionaryStringTo<IPromise<void>>;
    private _projectNameToColorSettingsMap: IDictionaryStringTo<IDictionaryStringTo<IDictionaryStringTo<string>>>;
    private _projectIdToColorSettingsMap: IDictionaryStringTo<IDictionaryStringTo<IDictionaryStringTo<string>>>;

    constructor() {
        this._projectNameToColorSettingsMap = {};
        this._projectIdToColorSettingsMap = {};
        this._settingsBeingFetched = {};
        let project = TFS_Host_TfsContext.TfsContext.getDefault().contextData.project;

        if (project && project.name) {
            let pageDataService = Service.getService(Contributions_Services.WebPageDataService);
            let stateColors: IDictionaryStringTo<IStateColor[]> = pageDataService.getPageData("ms.vss-work-web.work-item-states-color-data-provider");

            if (!!stateColors) {
                this._setWorkItemStateColorsData({
                    projectName: project.name,
                    projectId: project.id,
                    workItemTypeStateColors: this._mapWorkItemStatesColors(stateColors)
                });
            }
        }
    }

    private _mapWorkItemStatesColors(witColors: IDictionaryStringTo<IStateColor[]>): WorkItemTypeStateColors[] {
        const translatedColors: WorkItemTypeStateColors[] = [];
        for (let key in witColors) {
            if (witColors.hasOwnProperty(key)) {
                let colors: IStateColor[] = witColors[key];
                translatedColors.push({
                    workItemTypeName: key,
                    stateColors: colors
                });
            }
        }
        return translatedColors;
    }

    /**
     * gets the default states color provider
     */
    public static getDefault(): WorkItemStatesColorProvider {
        if (!WorkItemStatesColorProvider._workItemStatesColorProvider) {
            WorkItemStatesColorProvider._workItemStatesColorProvider = new WorkItemStatesColorProvider();
        }
        return WorkItemStatesColorProvider._workItemStatesColorProvider;
    }

    /**
     * Check if workitem state colors are defined for the project
     * @param projectNameOrId project name or id
     */
    public isPopulated(projectNameOrId: string): boolean {
        projectNameOrId = this._getNormalizedString(projectNameOrId);
        if (this._projectIdToColorSettingsMap.hasOwnProperty(projectNameOrId) || this._projectNameToColorSettingsMap.hasOwnProperty(projectNameOrId)) {
            return true;
        }
        return false;
    }

    /**
     * Get workitem state color synchronously from page data. Returns default color is settings not found
     * @param projectNameOrId project name or id to get color settings
     * @param typeName Workitemtype name
     * @param state workitem state name
     */
    public getWorkItemStateColor(projectNameOrId: string, typeName: string, state: string): string {
        // WorkItems can exist without any states. Even though its invalid, we want to make this helper resilient to calls from these workItems
        if (!state) {
            return WorkItemStatesColorProvider.DEFAULT_STATE_COLOR;
        }

        projectNameOrId = this._getNormalizedString(projectNameOrId);
        typeName = this._getNormalizedString(typeName);
        state = this._getNormalizedString(state);

        // get work item state color if it is defined.
        let typeToColors = this._projectIdToColorSettingsMap[projectNameOrId] || this._projectNameToColorSettingsMap[projectNameOrId];
        if (!!typeToColors) {
            // The work item can have states without color specified, we fallback to give default color.
            let stateToColors = typeToColors[typeName];
            if (!!stateToColors && !!stateToColors[state]) {
                return "#" + stateToColors[state];
            }
        }

        return WorkItemStatesColorProvider.DEFAULT_STATE_COLOR;
    }

    /**
     * Get colors settings for a project asynchronously
     * @param projectNameOrId project name or id to get color settings
     */
    public beginGetWorkItemStateColor(projectNameOrId: string): IPromise<void> {
        projectNameOrId = this._getNormalizedString(projectNameOrId);

        if (!projectNameOrId) {
            Diag.Debug.fail("Invalid Project Name or Id provided to beginGetWorkItemStateColor");

            // Log invalid project so that we know who is calling us with bad data
            try {
                // Need to throw because stack trace will not be set in some browsers (IE/Edge) otherwise
                throw new Error("Invalid Project Name or Id provided to beginGetWorkItemStateColor");
            }
            catch (e) {
                e.name = "WorkItemStateColorsInvalidProject";
                VSSError.publishErrorToTelemetry(e);
            }
        }

        if (this.isPopulated(projectNameOrId)) {
            return Q<void>(null);
        }

        if (this._settingsBeingFetched.hasOwnProperty(projectNameOrId)) {
            return this._settingsBeingFetched[projectNameOrId];
        }

        let deferred = Q.defer<void>();
        let context = TFS_Host_TfsContext.TfsContext.getDefault();
        let url = context.getActionUrl("WorkItemStatesColorData", "wit", { area: "api", project: projectNameOrId });

        this._settingsBeingFetched[projectNameOrId] = deferred.promise;

        Ajax.getMSJSON(
            url, {}, (data: IProjectStateColors) => {
                this._setWorkItemStateColorsData(data);
                deferred.resolve(null);
                delete this._settingsBeingFetched[projectNameOrId];
            },
            (reason) => {
                VSSError.publishErrorToTelemetry({
                    name: "GetWorkItemStateColorsForProjectException",
                    message: Utils_String.format("Failed to fetch state color data for a project. : {0}", JSON.stringify(reason))
                });
                var emptyColorsPayload: IProjectStateColors = {
                    workItemTypeStateColors: [],
                    projectId: projectNameOrId,
                    projectName: projectNameOrId
                };
                this._setWorkItemStateColorsData(emptyColorsPayload);
                deferred.resolve(null);
                delete this._settingsBeingFetched[projectNameOrId];
            });

        return deferred.promise;
    }

    /**
     * Set workitem state color data
     * @param colors color data of type IWorkItemStateColorSettings
     */
    private _setWorkItemStateColorsData(colors: IProjectStateColors): void {

        Diag.Debug.assert(colors && colors.projectName && !!colors.workItemTypeStateColors, "Colors cannot be empty");
        Diag.Debug.assert(!this.isPopulated(colors.projectName), "State colors for specified project are already populated.")

        if (!this.isPopulated(colors.projectName)) {
            let workItemTypeToColor: IDictionaryStringTo<IDictionaryStringTo<string>> = {};
            let normalizedWorkItemProjectName = this._getNormalizedString(colors.projectName);
            var normalizedWorkItemProjectId: string;
            if (colors.projectId) { //TODO: remove these guards in s107
                normalizedWorkItemProjectId = this._getNormalizedString(colors.projectId);
            }
            for (let item of colors.workItemTypeStateColors) {
                let stateToColor: IDictionaryStringTo<string> = {};
                let normalizedWorkItemTypeName = this._getNormalizedString(item.workItemTypeName);

                for (let color of item.stateColors) {
                    let normalizedState = this._getNormalizedString(color.name);
                    let normalizedColor = this._getNormalizedString(color.color);
                    stateToColor[normalizedState] = normalizedColor;
                }
                workItemTypeToColor[normalizedWorkItemTypeName] = stateToColor;
            }
            this._projectNameToColorSettingsMap[normalizedWorkItemProjectName] = workItemTypeToColor;
            if (normalizedWorkItemProjectId) { //TODO: remove these guards in s107
                this._projectIdToColorSettingsMap[normalizedWorkItemProjectId] = workItemTypeToColor;
            }
        }
    }

    private _getNormalizedString(value: string): string {
        return value.trim().toLowerCase();
    }
}

export namespace ContextUtils {
    /**
     * Save a per team and user setting to server. The function will use TFSContext to get the team.
     * @param teamId Id of the team
     * @param name name of the setting
     * @param value value of the setting
     * @param callback The callback to invoke on completion
     */
    function _saveTeamUserSetting(teamId: string, name: string, value: any, callback?: IResultCallback) {
        const tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        // Qualify the name with the team ID.
        name = teamId + name;

        Service.getCollectionService(TFS_WebSettingsService.WebSettingsService)
            .beginWriteSetting("/" + name, value, TFS_WebSettingsService.WebSettingsScope.User, callback);
    }

    /**
     * Save a per team and user setting to server.  The function will use TFSContext to get the team.
     * @param teamId Id of the team
     * @param name name of the setting
     * @param value value of the setting
     * @param callback The callback to invoke on completion
     */
    export function saveTeamUserStringSetting(teamId: string, name: string, value: string, callback?: IResultCallback) {
        Diag.Debug.assertParamIsString(name, "name");
        Diag.Debug.assertParamIsString(value, "value");
        _saveTeamUserSetting(teamId, name, value, callback);
    }

    /**
     * Save a per team and user setting to server. The function will use TFSContext to get the team.
     * @param teamId Id of the team
     * @param name name of the setting
     * @param value value of the setting
     * @param callback The callback to invoke on completion
     */
    export function saveTeamUserNumberSetting(teamId: string, name: string, value: number, callback?: IResultCallback) {
        Diag.Debug.assertParamIsString(name, "name");
        Diag.Debug.assertParamIsNumber(value, "value");
        _saveTeamUserSetting(teamId, name, value, callback);
    }

    /**
     * Save a per team and user setting to server. The function will use TFSContext to get the team.
     * @param teamId Id of the team
     * @param name name of the setting
     * @param value value of the setting
     * @param callback The callback to invoke on completion
     */
    export function saveTeamUserBoolSetting(teamId: string, name: string, value: boolean, callback?: IResultCallback) {
        Diag.Debug.assertParamIsString(name, "name");
        Diag.Debug.assertParamIsBool(value, "value");
        _saveTeamUserSetting(teamId, name, value, callback);
    }
}

export interface IAlmUriBuilderNameValuePair {
    name: string;
    value: string;
    doNotEncode?: boolean;
}

export class AlmUriBuilder {
    /**
     * Combines two parts into a uri.
     *
     * @param part1 First part of the uri.
     * @param part2 Second part of the uri.
     * @return The combined uri.
     */
    private static _combineUri(part1: string, part2: string): string {
        Diag.Debug.assertParamIsStringNotEmpty(part1, "part1");
        Diag.Debug.assertParamIsStringNotEmpty(part2, "part2");

        return AlmUriBuilder._ensureUriReadyForAppend(part1) + part2;
    }

    /**
     * Normalizes a uri so that it's suffixed with '/'
     *
     * @param originalUri The uri to be normalized.
     * @return The normalized uri.
     */
    private static _ensureUriReadyForAppend(originalUri: string): string {
        Diag.Debug.assertParamIsStringNotEmpty(originalUri, "originalUri");

        return originalUri.lastIndexOf("/") === originalUri.length - 1 ? originalUri : originalUri + "/";
    }

    public static ALM_SCHEME: string = "tfs://";
    public static COLLECTION_PARAM_NAME: string = "cn";
    public static PROJECT_PARAM_NAME: string = "p";
    public static WORK_ITEM_ID_PARAM_NAME: string = "wid";
    public static MFBCLIENT_SCHEME: string = "mfbclient://";
    public static MFBCLIENTS_SCHEME: string = "mfbclients://";
    public static FEEDBACK_REQUEST_IDS_PARAM_NAME: string = "rid";
    public static ENCODED_PARAM_NAME: string = "__params";

    /**
     * Gets a boolean value indicating whether or not query string encoding for parameters containing URLs
     * is required for the current browser.
     *
     * @return TRUE if the current browser requires query string encoding, false otherwise.
     */
    public static browserRequiresParamEncoding(): boolean {
        return Utils_UI.BrowserCheckUtils.isMsie() && (parseInt(Utils_UI.BrowserCheckUtils.getVersion(), 10) < 10);
    }

    /**
     * Builds an external URI in the form TFS://{areaName}/{actionName}?{parameters}.
     *
     * @param areaName The name of the subsystem providing context to the specified action name. (e.g. "Requirements").
     * @param actionName The name of an action optionally containing a relative path providing more context. (e.g. "CreateStoryboard")
     * @param includeTfsContext Set to True to include collection and project name in the request.
     * @param parameters An optional collection of name/value pairs used as query parameters in the newly formed URI.
     * @param completionCallback Function invoked when the URI has been constructed.
     * @param errorCallback Function invoked if an error is generated while constructing the URI.
     */
    public static beginBuildUri(areaName: string, actionName: string, includeTfsContext: boolean, parameters?: any[], completionCallback?: IResultCallback, errorCallback?: IErrorCallback) {
        Diag.Debug.assertParamIsString(areaName, "areaName");
        Diag.Debug.assertParamIsString(actionName, "actionName");
        Diag.Debug.assertParamIsBool(includeTfsContext, "includeTfsContext");
        Diag.Debug.assertParamIsFunction(completionCallback, "completionCallback");

        // Optional, but if specified make sure it is an array
        if (parameters) {
            Diag.Debug.assertParamIsArray(parameters, "parameters");
        }

        // IE8/9 do not preserve the encoding of UNICODE collection URLs passed through in the TFS://
        // protocol URI.  This problem has been fixed in IE10 and IE is the only browser with the problematic
        // behavior.  To that end, for IE8/9, ask the server for a base64 encoded URL which IE will not
        // tamper with.

        var newUri = AlmUriBuilder.ALM_SCHEME + areaName + "/" + actionName;
        var tfsContext: TFS_Host_TfsContext.TfsContext;
        var paramStr: string;
        var base64EncodeParams: boolean = AlmUriBuilder.browserRequiresParamEncoding();

        parameters = parameters || [];

        // Prepend the connection and project information if requested
        if (includeTfsContext) {
            tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

            Diag.Debug.assert(Boolean(tfsContext.navigation.collection && tfsContext.navigation.collection.uri), "Collection uri not available in context");
            parameters.splice(0, 0, {
                name: AlmUriBuilder.COLLECTION_PARAM_NAME,
                value: tfsContext.navigation.collection.uri
            });
        }

        paramStr = AlmUriBuilder.buildQueryParameterString(parameters);

        if (base64EncodeParams) {
            Ajax.getMSJSON(
                tfsContext.getActionUrl('Base64EncodeValue', 'common', { area: 'api' }),
                { value: AlmUriBuilder.buildQueryParameterString(parameters, base64EncodeParams) },
                function (encodedParamStr: string) {
                    completionCallback.call(this, newUri + paramStr + "&" + AlmUriBuilder.ENCODED_PARAM_NAME + "=" + encodedParamStr);
                }, errorCallback);
        }
        else {
            completionCallback.call(this, newUri + paramStr);
        }
    }

    /**
     * Builds an external "create storyboard" client specific URI using the specified work item IDs.
     *
     * @param workItemIds An array of user story work item IDs used to indicate which work items to link to the storyboard.
     * @param completionCallback Function invoked when the URI has been constructed.
     * @param errorCallback Function invoked if an error is generated while constructing the URI.
     */
    public static beginBuildCreateStoryboardUri(workItemIds: any[], completionCallback: IResultCallback, errorCallback?: IErrorCallback) {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertParamIsFunction(completionCallback, "completionCallback");

        AlmUriBuilder.beginBuildUri(Artifacts_Constants.ToolNames.Requirements, "CreateStoryboard", true, [
            {
                name: AlmUriBuilder.WORK_ITEM_ID_PARAM_NAME,
                value: workItemIds.join(",")
            }], completionCallback, errorCallback);
    }

    /**
     * Builds an external feedback client specific URI in the form mfbclient://SERVERPATH/COLLECTION/p:TEAMPROJECT?rid={workItemIds}.
     *
     * @param workItemIds An array of user story work item IDs used to indicate which user stories to request feedback.
     */
    public static buildFeedbackClientUri(workItemIds: number[]): string {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        Diag.Debug.assert(workItemIds.length > 0, "You must pass at least one work item id");

        var newUri: string;
        var parameters: any[] = [];
        var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        // Scheme
        newUri = tfsContext.navigation.publicAccessPoint.scheme === "https" ? AlmUriBuilder.MFBCLIENTS_SCHEME : AlmUriBuilder.MFBCLIENT_SCHEME;

        // Server path and collection
        newUri += tfsContext.navigation.publicAccessPoint.authority + tfsContext.navigation.collection.vDir;

        // Team project
        newUri += AlmUriBuilder.PROJECT_PARAM_NAME + ":" + tfsContext.navigation.project;

        // Parameters
        parameters.push({ name: AlmUriBuilder.FEEDBACK_REQUEST_IDS_PARAM_NAME, value: workItemIds.join(",") });

        return newUri + AlmUriBuilder.buildQueryParameterString(parameters);
    }

    /**
     * Builds a query string with the specified array of name value pairs in the form {name: foo, value: bar}.
     *
     * @param nameValuePairs An array of name value pairs used to produce a query string.
     * @param doNotEncode A boolean value indicating that the parameters are not to be encoded.
     * @return A string that may be appended to a URI including each name/value pair in the specified array.
     */
    public static buildQueryParameterString(nameValuePairs: IAlmUriBuilderNameValuePair[], doNotEncode?: boolean): string {
        Diag.Debug.assertParamIsArray(nameValuePairs);

        var paramStr: string = "";
        var nameValuePair: IAlmUriBuilderNameValuePair;

        $.each(nameValuePairs, function (index, row) {
            nameValuePair = nameValuePairs[index];
            paramStr += ((index === 0) ? "?" : "&");
            paramStr += encodeURIComponent(nameValuePair.name) + "=";

            if (doNotEncode || nameValuePair.doNotEncode) {
                paramStr += nameValuePair.value;
            }
            else {
                paramStr += encodeURIComponent(nameValuePair.value);
            }
        });

        return paramStr;
    }

    constructor() {
    }
}

export class AlmUriManager {
    /**
     * Launches the specified URI such that the client operating system may handle it.
     *
     * @param almUri An ALM URI to be handled by the client.
     */
    public static launchUri(almUri: string) {
        Diag.Debug.assertParamIsString(almUri, "almUri");

        // IF we are using a browser that supports "navigate" use it instead of open() because it will
        // cause the new "blank" window to be automatically closed after the URI is transitioned to the operating system.

        // IE 10 changes the way in which custom protocol URIs are lauched from JavaScript.  Specifically, setting the current page
        // URL is the only supported mechanism to launch a custom URI in IE 10.  This does not affect page navigation or history but
        // to be safe, only use this approach when needed.

        var launchInline: boolean = Utils_UI.BrowserCheckUtils.isMsie() && (parseInt(Utils_UI.BrowserCheckUtils.getVersion(), 10) >= 10);

        if (launchInline || (<any>window).navigate) {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: almUri
            });
        }
        else {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: almUri,
                target: "_blank"
            });
        }
    }

    constructor() {
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.OM.Common", exports);
